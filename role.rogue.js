var combatUtils = require('combatUtils');
var squadManager = require('squadManager');

// "Scouting" in this phase means room-local presence only - Phase 2 will
// repoint the idle state at Memory.war.targetRoom for actual cross-room
// recon once multiroom travel exists.
var roleRogue = {

    /** @param {Creep} creep **/
    run: function (creep) {
        if (combatUtils.shouldRetreat(creep, 0.25)) {
            creep.memory.combatState = 'retreat';
            creep.say('Retreat');
            var spawn = creep.pos.findClosestByRange(FIND_MY_SPAWNS);
            if (spawn) {
                creep.moveTo(spawn, { visualizePathStyle: { stroke: '#3333ff' } });
            }
            return;
        }

        var squad = creep.memory.squadId ? Memory.squads[creep.memory.squadId] : null;

        if (!squad || squad.status == 'disbanded' || squad.status == 'forming') {
            creep.memory.combatState = 'idle';
            creep.say('Idle');
            var homeSpawn = creep.pos.findClosestByRange(FIND_MY_SPAWNS);
            if (homeSpawn && !creep.pos.inRangeTo(homeSpawn, 3)) {
                creep.moveTo(homeSpawn, { visualizePathStyle: { stroke: '#888888' } });
            }
            return;
        }

        if (squad.status == 'rally') {
            creep.memory.combatState = 'rally';
            creep.say('Rally');
            var rallyPos = squadManager.getRallyPos(squad);
            if (rallyPos) {
                creep.moveTo(rallyPos, { visualizePathStyle: { stroke: '#ffff00' } });
            }
            return;
        }

        // engage - harass an already-weakened hostile, hold near rally otherwise
        creep.memory.combatState = 'engage';
        var hostiles = creep.room.find(FIND_HOSTILE_CREEPS);
        var weakened = _.filter(hostiles, function (h) { return h.hits < h.hitsMax; });
        var target = weakened.length > 0 ? creep.pos.findClosestByRange(weakened) : null;

        if (target) {
            creep.say('Harass');
            if (creep.attack(target) == ERR_NOT_IN_RANGE) {
                creep.moveTo(target, { visualizePathStyle: { stroke: '#ff00ff' } });
            }
            return;
        }

        creep.say('Reserve');
        var rallyFallback = squadManager.getRallyPos(squad);
        if (rallyFallback) {
            creep.moveTo(rallyFallback, { visualizePathStyle: { stroke: '#888888' } });
        }
    }
};

module.exports = roleRogue;
