var sourceAssignment = {
    assignSource: function (roomName) {
        var room = Game.rooms[roomName];
        if (!room) {
            return '';
        }

        var sources = room.find(FIND_SOURCES);

        // Keep source indexes stable across ticks by ordering on source.id.
        sources = _.sortBy(sources, function (source) {
            return source.id;
        });

        if (sources.length === 0) {
            return '';
        }

        // Exact caps by source.id (stable and explicit).
        // Fill these with the source IDs from your room(s).
        var maxCreepsBySourceId = {
            '5bbcaa0b9099fc012e630b36': 4
            // 'SOURCE_ID_2': 6,
            // 'SOURCE_ID_3': 2
        };

        // If a source.id is missing above, this fallback is used.
        var defaultMaxCreepsPerSource = 0;

        // Build source occupancy data without assuming a fixed source count.
        var sourceData = _.map(sources, function (source, index) {
            var assignedCreeps = _.filter(Game.creeps, function (creep) {
                return creep.memory.sourceId == source.id;
            });

            return {
                id: source.id,
                index: index,
                assignedCount: assignedCreeps.length,
                maxCount: Object.prototype.hasOwnProperty.call(maxCreepsBySourceId, source.id)
                    ? maxCreepsBySourceId[source.id]
                    : defaultMaxCreepsPerSource
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