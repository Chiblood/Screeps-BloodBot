require('prototype.spawn')();

var spawnAI = {
     /** @param {} **/
     run: function() {
        var desiredByRole = {
            harvester: 6,
            upgrader: 2,
            builder: 4,
            repairer: 2
        };

        var roleCounts = {
            harvester: _.filter(Game.creeps, (creep) => creep.memory.role == 'harvester').length,
            upgrader: _.filter(Game.creeps, (creep) => creep.memory.role == 'upgrader').length,
            builder: _.filter(Game.creeps, (creep) => creep.memory.role == 'builder').length,
            repairer: _.filter(Game.creeps, (creep) => creep.memory.role == 'repairer').length
        };

        var spawnOrder = ['harvester', 'upgrader', 'builder', 'repairer'];

        for (var roomName in Game.rooms) {
            var room = Game.rooms[roomName];
            var roomSpawns = _.filter(Game.spawns, (spawn) => spawn.room.name == roomName && !spawn.spawning);

            if (roomSpawns.length == 0) {
                continue;
            }

            if (room.energyAvailable != room.energyCapacityAvailable) {
                continue;
            }

            for (var i = 0; i < spawnOrder.length; i++) {
                var roleName = spawnOrder[i];

                while (roleCounts[roleName] < desiredByRole[roleName] && roomSpawns.length > 0) {
                    var spawn = roomSpawns.shift(); // Get the first available spawn in the room
                    var newName = roleName.charAt(0).toUpperCase() + roleName.slice(1) + Game.time;
                    var result = spawn.createCustomCreep(roleName, newName);

                    if (result == OK) {
                        console.log('Spawning new ' + roleName + ': ' + newName + ' from ' + spawn.name);
                        roleCounts[roleName]++;
                    }
                    else if (result == ERR_NOT_ENOUGH_ENERGY) {
                        roomSpawns.unshift(spawn);
                        break;
                    }
                    else if (result == ERR_BUSY) {
                        console.log('Spawn ' + spawn.name + ' is busy.');
                        roomSpawns.push(spawn); // Put the busy spawn back to the end of the queue
                        continue;
                    }
                    else {
                        console.log('Spawn failed for ' + newName + ' with code ' + result);
                    }
                }
            }
        }
     }
}
module.exports = spawnAI;