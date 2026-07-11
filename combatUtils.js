var combatUtils = {

    // Prefers armed hostiles (ATTACK/RANGED_ATTACK parts) over healers/workers.
    // Pass fromPos to get the closest match in that pool instead of the first one found.
    findPriorityTarget: function (room, fromPos) {
        var hostiles = room.find(FIND_HOSTILE_CREEPS);
        if (hostiles.length === 0) {
            return null;
        }

        var armed = _.filter(hostiles, function (h) {
            return h.getActiveBodyparts(ATTACK) > 0 || h.getActiveBodyparts(RANGED_ATTACK) > 0;
        });
        var pool = armed.length > 0 ? armed : hostiles;

        if (fromPos) {
            return fromPos.findClosestByRange(pool);
        }
        return pool[0];
    },

    // Squad-scoped heal targeting for Milestone 2+ (once creep.memory.squadId is in use).
    findMostInjuredSquadMate: function (squadId) {
        var mates = _.filter(Game.creeps, function (c) {
            return c.memory.squadId == squadId && c.hits < c.hitsMax;
        });
        if (mates.length === 0) {
            return null;
        }
        return _.min(mates, function (c) { return c.hits / c.hitsMax; });
    },

    // Room-scoped heal targeting used by role.healer.js until squads exist.
    findMostInjuredInRoom: function (room) {
        var injured = _.filter(room.find(FIND_MY_CREEPS), function (c) {
            return c.hits < c.hitsMax;
        });
        if (injured.length === 0) {
            return null;
        }
        return _.min(injured, function (c) { return c.hits / c.hitsMax; });
    },

    isNear: function (pos, targetPos, range) {
        if (!pos || !targetPos || pos.roomName !== targetPos.roomName) {
            return false;
        }
        return pos.getRangeTo(targetPos) <= range;
    },

    shouldRetreat: function (creep, threshold) {
        return creep.hits / creep.hitsMax < threshold;
    },

    // Simple one-tile step directly away from the hostile, clamped to room bounds.
    // No PathFinder flee logic - good enough for a kite-away nudge, not a chase escape.
    kiteAwayFrom: function (creep, hostile) {
        var dx = creep.pos.x - hostile.pos.x;
        var dy = creep.pos.y - hostile.pos.y;
        var stepX = dx > 0 ? 1 : (dx < 0 ? -1 : 0);
        var stepY = dy > 0 ? 1 : (dy < 0 ? -1 : 0);
        var targetX = Math.max(0, Math.min(49, creep.pos.x + stepX));
        var targetY = Math.max(0, Math.min(49, creep.pos.y + stepY));
        var fleePos = new RoomPosition(targetX, targetY, creep.pos.roomName);
        creep.moveTo(fleePos, { visualizePathStyle: { stroke: '#ff0000' } });
    }
};

module.exports = combatUtils;
