var combatUtils = require('combatUtils');
var squadManager = require('squadManager');

// Leads the squad simply by being the member that closes to melee range
// first - no explicit formation math needed.
var roleTank = {

    /** @param {Creep} creep **/
    run: function (creep) {
        if (combatUtils.shouldRetreat(creep, 0.2)) {
            creep.memory.combatState = 'retreat';
            creep.say('Retreat');
            var spawn = creep.pos.findClosestByRange(FIND_MY_SPAWNS);
            if (spawn) {
                creep.moveTo(spawn, { visualizePathStyle: { stroke: '#3333ff' } });
            }
            return;
        }

        var squad = creep.memory.squadId ? Memory.squads[creep.memory.squadId] : null;

        // No squad assigned (or it's disbanded) - hold near spawn.
        if (!squad || squad.status == 'disbanded') {
            creep.memory.combatState = 'idle';
            creep.say('Idle');
            var homeSpawn = creep.pos.findClosestByRange(FIND_MY_SPAWNS);
            if (homeSpawn && !creep.pos.inRangeTo(homeSpawn, 3)) {
                creep.moveTo(homeSpawn, { visualizePathStyle: { stroke: '#888888' } });
            }
            return;
        }

        if (squad.status == 'forming') {
            creep.memory.combatState = 'idle';
            creep.say('Forming');
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

        // engage
        creep.memory.combatState = 'engage';
        creep.say('Engage');
        var target = combatUtils.findPriorityTarget(creep.room, creep.pos);
        if (!target) {
            var rallyFallback = squadManager.getRallyPos(squad);
            if (rallyFallback) {
                creep.moveTo(rallyFallback, { visualizePathStyle: { stroke: '#ff0000' } });
            }
            return;
        }

        if (creep.attack(target) == ERR_NOT_IN_RANGE) {
            creep.moveTo(target, { visualizePathStyle: { stroke: '#ff0000' } });
        }
    }
};

module.exports = roleTank;
