var sourceAssignment = {
    assignSource: function (roomName) {
        var room = Game.rooms[roomName];
        if (!room) {
            return '';
        }

        var sources = room.find(FIND_SOURCES);
        var source0 = sources[0].id;
        var source1 = sources[1].id;
        var source2 = sources[2].id;
        var source3 = sources[3].id;
        //var source4 = sources[4].id;
        
        // Max creeps per source (if needed) max planned creeps is 12
        var maxCreepsSource0 = 4;
        var maxCreepsSource1 = 6; 
        var maxCreepsSource2 = 0; 
        var maxCreepsSource3 = 2; 
        //var maxCreepsSource4 = 0;
        
        // array of creeps assigned to each source
        var source0Creeps = _.filter(Game.creeps, (creep) => creep.memory.sourceId == source0);
        var source1Creeps = _.filter(Game.creeps, (creep) => creep.memory.sourceId == source1);
        var source2Creeps = _.filter(Game.creeps, (creep) => creep.memory.sourceId == source2);
        var source3Creeps = _.filter(Game.creeps, (creep) => creep.memory.sourceId == source3);
        //var source4Creeps = _.filter(Game.creeps, (creep) => creep.memory.sourceId == source4);
            
        console.log('source0Creeps: ' + source0Creeps.length + ' source1Creeps: ' + source1Creeps.length + ' source2Creeps: ' + source2Creeps.length +' source3Creeps: ' + source3Creeps.length);
            
        // Spawned creep will be assigned to these sources
        var assignedSource = '';
        if (source0Creeps.length < maxCreepsSource0) {
            console.log('source0Creeps: ' + source0Creeps.length + ' < maxCreepsSource0: ' + maxCreepsSource0+ ' so assigning to Source0.'+source0);
            assignedSource = source0;
        }
        else if (source1Creeps.length < maxCreepsSource1) {
            console.log('source1Creeps: ' + source1Creeps.length + ' < maxCreepsSource1: ' + maxCreepsSource1+ ' so assigning to Source1.'+source1);
            assignedSource = source1;
        }
        else if (source2Creeps.length < maxCreepsSource2) {
            console.log('source2Creeps: ' + source2Creeps.length + ' < maxCreepsSource2: ' + maxCreepsSource2 + ' so assigning to Source2: ' +source2);
            assignedSource = source2;
        }
        else if (source3Creeps.length < maxCreepsSource3) {
            console.log('source3Creeps: ' + source3Creeps.length + ' < maxCreepsSource3: ' + maxCreepsSource3+ ' so assigning to Source3.'+source3);
            assignedSource = source3;
        }
/*        else if (source4Creeps.length < maxCreepsSource4) {
            console.log('source4Creeps: ' + source4Creeps.length + ' < maxCreepsSource4: ' + maxCreepsSource4+ ' so assigning to Source4.'+source4);
            assignedSource = source4;
        } */
        return assignedSource;
    }        
 }            
module.exports = sourceAssignment;