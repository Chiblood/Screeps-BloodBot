var sourceAssignment = {
    assignSource: function (roomName) {
        var room = Game.rooms[roomName];
        if (!room) {
            return '';
        }

        var sources = room.find(FIND_SOURCES);

        sources = _.sortBy(sources, function (source) {
            return source.id;
        });

        if (sources.length === 0) {
            return '';
        }

        if (!Memory.sourceConfig) {
            Memory.sourceConfig = {};
        }

        var defaultMaxCreepsPerSource = 2;

        // Seed missing source entries so they become console-editable.
        for (var s = 0; s < sources.length; s++) {
            var source = sources[s];
            if (!Memory.sourceConfig[source.id]) {
                Memory.sourceConfig[source.id] = {
                    roomName: room.name,
                    maxCreeps: defaultMaxCreepsPerSource
                };
            }
        }

        var sourceData = _.map(sources, function (source, index) {
            var assignedCreeps = _.filter(Game.creeps, function (creep) {
                return creep.memory.sourceId == source.id;
            });

            var config = Memory.sourceConfig[source.id];

            return {
                id: source.id,
                index: index,
                assignedCount: assignedCreeps.length,
                maxCount: config && config.maxCreeps != null
                    ? config.maxCreeps
                    : defaultMaxCreepsPerSource
            };
        });

        for (var i = 0; i < sourceData.length; i++) {
            var data = sourceData[i];
            if (data.assignedCount < data.maxCount) {
                return data.id;
            }
        }

        return '';
    }
};

module.exports = sourceAssignment;