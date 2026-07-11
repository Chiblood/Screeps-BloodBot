var combatUtils = require('combatUtils');
var squadManager = require('squadManager');

// True while any squad tank is already adjacent to a hostile - the archer
// only opens fire once this is true, enforcing "supported, not solo". If the
// squad has no tank in its composition, don't block the archer on one.
function tankIsEngaged(squadId, room) {
    var tanks = squadManager.getMembersByRole(squadId).tank;
    if (tanks.length === 0) {
        return true;
    }
    for (var i = 0; i < tanks.length; i++) {
        var target = combatUtils.findPriorityTarget(room, tanks[i].pos);
        if (target && combatUtils.isNear(tanks[i].pos, target.pos, 1)) {
            return true;
        }
    }
    return false;
}

var roleArcher = {

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

        if (!tankIsEngaged(squad.id, creep.room)) {
            creep.say('Support');
            var byRole = squadManager.getMembersByRole(squad.id);
            var followPos = byRole.tank.length > 0 ? byRole.tank[0].pos : squadManager.getRallyPos(squad);
            if (followPos && !combatUtils.isNear(creep.pos, followPos, 3)) {
                creep.moveTo(followPos, { visualizePathStyle: { stroke: '#00ffff' } });
            }
            return;
        }

        var target = combatUtils.findPriorityTarget(creep.room, creep.pos);
        if (!target) {
            creep.say('Engage');
            return;
        }

        var range = creep.pos.getRangeTo(target);
        if (range <= 3) {
            creep.say('Engage');
            var inRange3 = creep.pos.findInRange(FIND_HOSTILE_CREEPS, 3);
            if (inRange3.length >= 2) {
                creep.rangedMassAttack();
            }
            else {
                creep.rangedAttack(target);
            }
            if (range <= 2) {
                combatUtils.kiteAwayFrom(creep, target);
            }
        }
        else {
            creep.say('Approach');
            creep.moveTo(target, { visualizePathStyle: { stroke: '#00ffff' } });
        }
    }
};

module.exports = roleArcher;
