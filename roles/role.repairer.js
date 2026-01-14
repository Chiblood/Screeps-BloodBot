var roleBuilder = require('role.builder');

var roleRepairer = {

    /** @param {Creep} creep **/
    run: function(creep) {
	    if(creep.memory.repairing == true && creep.store[RESOURCE_ENERGY] == 0) {
            creep.memory.repairing = false;
             creep.say('Harvesting');
	    }
	    if(!creep.memory.repairing && creep.store.getFreeCapacity() == 0) {
	        creep.memory.repairing = true;
	        creep.say('Repairing');
	    }
	    
	    if(!creep.memory.repairing) {
	        // if creep is assigned a source
            if(creep.memory.sourceId) {
                if(creep.harvest(Game.getObjectById(creep.memory.sourceId)) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(Game.getObjectById(creep.memory.sourceId), {visualizePathStyle: {stroke: '#ffaa00'}});
                }
            }
            else {
                var sources = creep.room.find(FIND_SOURCES_ACTIVE);
                if(creep.harvest(sources[0]) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(sources[0], {visualizePathStyle: {stroke: '#ffaa00'}});
                    creep.memory.repairing = false;
                }
            }
        }
        else {
            // at the suggestion of th_pion excluding walls from repairer cue
            var targets = creep.room.find(FIND_STRUCTURES, {
                    filter: (structure) => {
                        return (structure.hits < structure.hitsMax) && structure.structureType != STRUCTURE_WALL }});
            // console.log(creep.name + 'is attempting to repair ' + targets);
            
            if(targets.length > 0) {
                if(creep.repair(targets[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(targets[0], {visualizePathStyle: {stroke: '#ffffff'}});
                    creep.memory.repairing = true;
                    // console.log(creep.name + 'attempting to repair ' + targets);
                }
            }
            else {
                // console.log(creep.name + 'is found nothing to repair, switching to building.');
                roleBuilder.run(creep);
            }
        
        }
	}
};

module.exports = roleRepairer;