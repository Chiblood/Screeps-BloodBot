var sourceAssignment = {
    assignSource: function (roomName) {
        var room = Game.rooms[roomName];
        if (!room) {
            return '';
        }

        var sources = room.find(FIND_SOURCES);

        if (sources.length === 0) {
            return '';
        }

        // Max creeps per source index.
        var maxCreepsBySourceIndex = [4, 6, 0, 2];

        // Build source occupancy data without assuming a fixed source count.
        var sourceData = _.map(sources, function (source, index) {
            var assignedCreeps = _.filter(Game.creeps, function (creep) {
                return creep.memory.sourceId == source.id;
            });

            return {
                id: source.id,
                index: index,
                assignedCount: assignedCreeps.length,
                maxCount: maxCreepsBySourceIndex[index] || 0
            };
        });

        var sourceSummary = _.map(sourceData, function (item) {
            return 'source' + item.index + 'Creeps: ' + item.assignedCount;
        }).join(' ');
        console.log(sourceSummary);

        // Spawned creep will be assigned to the first source below its cap.
        for (var i = 0; i < sourceData.length; i++) {
            var data = sourceData[i];
            if (data.assignedCount < data.maxCount) {
                console.log(
                    'source' + data.index + 'Creeps: ' + data.assignedCount +
                    ' < maxCreepsSource' + data.index + ': ' + data.maxCount +
                    ' so assigning to Source' + data.index + '.' + data.id
                );
                return data.id;
            }
        }

        return '';
    }        
 }            
module.exports = sourceAssignment;