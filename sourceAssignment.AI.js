var roomIntel = require('roomIntel');

var sourceAssignment = {
    assignSource: function (roomName) {
        var room = Game.rooms[roomName];
        if (!room) {
            return '';
        }

        var sources = roomIntel.getEffectiveSources(roomName);
        if (!sources || sources.length === 0) {
            var liveSources = room.find(FIND_SOURCES);
            if (!liveSources || liveSources.length === 0) {
                return '';
            }
            return liveSources[0].id;
        }

        var sourceCounts = {};
        for (var i = 0; i < sources.length; i++) {
            sourceCounts[sources[i].id] = 0;
        }

        for (var creepName in Game.creeps) {
            var creep = Game.creeps[creepName];
            var sourceId = creep.memory && creep.memory.sourceId;
            if (sourceId && Object.prototype.hasOwnProperty.call(sourceCounts, sourceId)) {
                sourceCounts[sourceId]++;
            }
        }

        for (var j = 0; j < sources.length; j++) {
            var source = sources[j];
            var currentAssigned = sourceCounts[source.id] || 0;
            var desired = typeof source.desiredCreeps === 'number' ? source.desiredCreeps : 1;
            if (currentAssigned < desired) {
                console.log('[SourceAssign] room=' + roomName + ' source=' + source.id + ' assigned=' + currentAssigned + '/' + desired);
                return source.id;
            }
        }

        var leastLoadedSource = sources[0];
        var leastCount = sourceCounts[leastLoadedSource.id] || 0;
        for (var k = 1; k < sources.length; k++) {
            var candidate = sources[k];
            var candidateCount = sourceCounts[candidate.id] || 0;
            if (candidateCount < leastCount) {
                leastLoadedSource = candidate;
                leastCount = candidateCount;
            }
        }

        console.log('[SourceAssign] room=' + roomName + ' all sources at desired cap, fallback=' + leastLoadedSource.id + ' assigned=' + leastCount);
        return leastLoadedSource.id;
    }        
 }            
module.exports = sourceAssignment;