var combatUtils = require('combatUtils');
var squadManager = require('squadManager');

var roleHealer = {

    /** @param {Creep} creep **/
    run: function (creep) {
        // Higher retreat threshold than other roles - losing the healer collapses
        // the squad's sustain, so it breaks off earlier.
        if (combatUtils.shouldRetreat(creep, 0.4)) {
            creep.memory.combatState = 'retreat';
            creep.say('Retreat');
            var spawn = creep.pos.findClosestByRange(FIND_MY_SPAWNS);
            if (spawn) {
                creep.moveTo(spawn, { visualizePathStyle: { stroke: '#3333ff' } });
            }
            return;
        }

        var squad = creep.memory.squadId ? Memory.squads[creep.memory.squadId] : null;

        // No squad assigned - fall back to healing whoever's hurt in the room.
        if (!squad || squad.status == 'disbanded') {
            creep.memory.combatState = 'idle';
            var roomPatient = combatUtils.findMostInjuredInRoom(creep.room);
            if (roomPatient) {
                creep.say('Heal');
                if (creep.heal(roomPatient) == ERR_NOT_IN_RANGE) {
                    if (creep.rangedHeal(roomPatient) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(roomPatient, { visualizePathStyle: { stroke: '#00ff00' } });
                    }
                }
                return;
            }
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
        var squadPatient = combatUtils.findMostInjuredSquadMate(squad.id);
        if (squadPatient) {
            creep.say('Heal');
            if (creep.heal(squadPatient) == ERR_NOT_IN_RANGE) {
                if (creep.rangedHeal(squadPatient) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(squadPatient, { visualizePathStyle: { stroke: '#00ff00' } });
                }
            }
            return;
        }

        // Nobody hurt - stay close behind the tank rather than sitting idle.
        creep.say('Follow');
        var byRole = squadManager.getMembersByRole(squad.id);
        var followPos = byRole.tank.length > 0 ? byRole.tank[0].pos : squadManager.getRallyPos(squad);
        if (followPos && !combatUtils.isNear(creep.pos, followPos, 2)) {
            creep.moveTo(followPos, { visualizePathStyle: { stroke: '#00ff00' } });
        }
    }
};

module.exports = roleHealer;
