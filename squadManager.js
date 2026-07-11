var combatUtils = require('combatUtils');

var ROLE_LIST = ['tank', 'archer', 'healer', 'rogue'];
var DEFAULT_RALLY_TIMEOUT = 50;
var DEFAULT_MAX_ENGAGE_TICKS = 300;
var RALLY_ASSEMBLY_RANGE = 3;
var RALLY_ASSEMBLY_FRACTION = 0.6;

// Squad membership is never cached in Memory - it's recomputed live from
// Game.creeps every tick via creep.memory.squadId. Cheap at single-room/
// small-squad scale, and avoids desync when a member dies mid-tick.
var squadManager = {

    init: function () {
        if (!Memory.squads) {
            Memory.squads = {};
        }
    },

    // Manual/console entry point for creating a squad. getOrCreateDefenseSquad
    // below builds on this for automatic threat-driven creation; Milestone 4
    // will add getOrCreateOffenseSquad for Memory.war-driven creation.
    createSquad: function (type, homeRoom, composition, rallyFlagName) {
        this.init();
        var id = type + '_' + homeRoom + '_' + Game.time;
        Memory.squads[id] = {
            id: id,
            type: type,
            status: 'forming',
            homeRoom: homeRoom,
            targetRoom: null,
            rallyFlagName: rallyFlagName || null,
            rallyPos: null,
            composition: composition || { tank: 1, archer: 1, healer: 1, rogue: 0 },
            createdAt: Game.time,
            rallyStartedAt: null,
            rallyTimeout: DEFAULT_RALLY_TIMEOUT,
            maxEngageTicks: DEFAULT_MAX_ENGAGE_TICKS,
            engageAt: null
        };
        console.log('[Squad] Created ' + id + ' (' + type + ') in ' + homeRoom);
        return id;
    },

    // Releases members back to idle (rather than killing them) and removes the
    // registry entry - role files treat "no entry" the same as "disbanded".
    disbandSquad: function (squadId) {
        this.init();
        var squad = Memory.squads[squadId];
        if (!squad) {
            return;
        }
        var members = this.getMembers(squadId);
        for (var i = 0; i < members.length; i++) {
            members[i].memory.squadId = null;
            members[i].memory.combatState = 'idle';
        }
        console.log('[Squad] Disbanded ' + squadId + ' (' + members.length + ' member(s) released)');
        delete Memory.squads[squadId];
    },

    getMembers: function (squadId) {
        return _.filter(Game.creeps, function (c) { return c.memory.squadId == squadId; });
    },

    getMembersByRole: function (squadId) {
        var members = this.getMembers(squadId);
        var byRole = { tank: [], archer: [], healer: [], rogue: [] };
        for (var i = 0; i < members.length; i++) {
            var role = members[i].memory.role;
            if (byRole[role]) {
                byRole[role].push(members[i]);
            }
        }
        return byRole;
    },

    // Roles still short of the squad's composition target - spawn.AI.js uses
    // this to decide what to spawn next for a forming/rally squad.
    getMissingRoles: function (squadId) {
        this.init();
        var squad = Memory.squads[squadId];
        if (!squad || squad.status == 'disbanded') {
            return {};
        }
        var byRole = this.getMembersByRole(squadId);
        var missing = {};
        for (var i = 0; i < ROLE_LIST.length; i++) {
            var role = ROLE_LIST[i];
            var desired = squad.composition[role] || 0;
            var have = byRole[role].length;
            if (have < desired) {
                missing[role] = desired - have;
            }
        }
        return missing;
    },

    getActiveSquad: function (homeRoom, type) {
        this.init();
        for (var id in Memory.squads) {
            var squad = Memory.squads[id];
            if (squad.homeRoom == homeRoom && squad.type == type && squad.status != 'disbanded') {
                return squad;
            }
        }
        return null;
    },

    // Reuses an in-progress defense squad if one already exists for the room;
    // otherwise creates one sized off the current hostile count.
    getOrCreateDefenseSquad: function (roomName, hostileCount) {
        var existing = this.getActiveSquad(roomName, 'defense');
        if (existing) {
            return existing;
        }

        var archerCount = 2 + Math.min(Math.floor((hostileCount || 0) / 3), 3);
        var composition = { tank: 1, archer: archerCount, healer: 1, rogue: 0 };
        var id = this.createSquad('defense', roomName, composition, 'RallyDefense');
        return Memory.squads[id];
    },

    // Resolves the squad's rally point, preferring a flag (so the operator can
    // drag it in-game) and falling back to a stored position, then a spawn.
    getRallyPos: function (squad) {
        if (squad.rallyFlagName) {
            var flag = Game.flags[squad.rallyFlagName];
            if (flag) {
                return flag.pos;
            }
        }
        if (squad.rallyPos) {
            return new RoomPosition(squad.rallyPos.x, squad.rallyPos.y, squad.rallyPos.roomName);
        }
        var spawns = _.filter(Game.spawns, function (s) { return s.room.name == squad.homeRoom; });
        return spawns.length > 0 ? spawns[0].pos : null;
    },

    run: function () {
        this.init();
        var ids = Object.keys(Memory.squads);
        for (var i = 0; i < ids.length; i++) {
            var squad = Memory.squads[ids[i]];
            if (squad) {
                this.tick(squad);
            }
        }
    },

    tick: function (squad) {
        // Defense squads stand down the instant the threat clears, regardless
        // of status or remaining composition - no point finishing a war band
        // for a fight that's already over.
        if (squad.type == 'defense') {
            var threat = Memory.combat && Memory.combat.threats && Memory.combat.threats[squad.homeRoom];
            if (threat && !threat.hasThreat) {
                this.disbandSquad(squad.id);
                return;
            }
        }

        var members = this.getMembers(squad.id);

        if (members.length === 0 && squad.status != 'forming') {
            this.disbandSquad(squad.id);
            return;
        }

        if (squad.status == 'forming') {
            var missing = this.getMissingRoles(squad.id);
            if (Object.keys(missing).length === 0 && members.length > 0) {
                squad.status = 'rally';
                squad.rallyStartedAt = Game.time;
                console.log('[Squad] ' + squad.id + ' fully spawned, moving to rally');
            }
            return;
        }

        if (squad.status == 'rally') {
            var rallyPos = this.getRallyPos(squad);
            if (!rallyPos) {
                return;
            }

            var assembled = _.filter(members, function (c) {
                return combatUtils.isNear(c.pos, rallyPos, RALLY_ASSEMBLY_RANGE);
            });
            var assembledFraction = members.length > 0 ? assembled.length / members.length : 0;
            var timedOut = (Game.time - squad.rallyStartedAt) >= squad.rallyTimeout;

            if (assembledFraction >= RALLY_ASSEMBLY_FRACTION || timedOut) {
                squad.status = 'engage';
                squad.engageAt = Game.time;
                console.log('[Squad] ' + squad.id + ' assembled (' + assembled.length + '/' + members.length + ')' +
                    (timedOut ? ' - rally timeout' : '') + ', engaging');
            }
            return;
        }

        if (squad.status == 'engage') {
            if (squad.maxEngageTicks && (Game.time - squad.engageAt) >= squad.maxEngageTicks) {
                console.log('[Squad] ' + squad.id + ' hit maxEngageTicks safety valve');
                this.disbandSquad(squad.id);
            }
            return;
        }
    }
};

module.exports = squadManager;
