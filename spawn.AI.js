require('prototype.spawn')();
var squadManager = require('squadManager');

var spawnAI = {
     /** @param {} **/
     run: function() {
        var desiredByRole = {
            harvester: 4,
            upgrader: 2,
            builder: 2,
            repairer: 1
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

            // Reactive defense: hostiles in this room ensure an active defense
            // squad exists before anything else spawns this tick. The generic
            // squad-topping loop right below then fills its roles first,
            // preempting civilians off the same roomSpawns queue - no separate
            // priority-number system needed, just ordering.
            var threat = Memory.combat && Memory.combat.threats && Memory.combat.threats[roomName];
            if (threat && threat.hasThreat) {
                squadManager.getOrCreateDefenseSquad(roomName, threat.hostileCount);
            }

            // Top up any active (forming/rally) squad in this room with its
            // missing composition roles, tagging squadId at creation. Squad
            // creation itself is manual via squadManager.createSquad(...) from
            // console until Milestone 3/4 wire up automatic defense/offense
            // triggers. Squads in 'engage' don't get replenished here - a squad
            // that loses a member mid-fight fights shorthanded (see squadManager.js).
            for (var squadId in Memory.squads) {
                var squad = Memory.squads[squadId];
                if (!squad || squad.homeRoom != roomName) {
                    continue;
                }
                if (squad.status != 'forming' && squad.status != 'rally') {
                    continue;
                }

                var missing = squadManager.getMissingRoles(squadId);
                for (var missingRole in missing) {
                    var need = missing[missingRole];
                    while (need > 0 && roomSpawns.length > 0) {
                        var squadSpawn = roomSpawns.shift();
                        var squadCreepName = missingRole.charAt(0).toUpperCase() + missingRole.slice(1) + Game.time;
                        var squadResult = squadSpawn.createCustomCreep(missingRole, squadCreepName, roleCounts.harvester, { squadId: squadId });

                        if (typeof squadResult === 'string' || squadResult == OK) {
                            console.log('[Squad] Spawning ' + missingRole + ' for ' + squadId + ': ' + squadCreepName + ' from ' + squadSpawn.name);
                            need--;
                        }
                        else if (squadResult == ERR_NOT_ENOUGH_ENERGY) {
                            roomSpawns.unshift(squadSpawn);
                            break;
                        }
                        else if (squadResult == ERR_BUSY) {
                            roomSpawns.push(squadSpawn);
                            continue;
                        }
                        else {
                            console.log('[Squad] Spawn failed for ' + squadCreepName + ' with code ' + squadResult);
                            break;
                        }
                    }
                }
            }

            // Iterate through the spawn order and spawn creeps as needed
            for (var i = 0; i < spawnOrder.length; i++) {
                var roleName = spawnOrder[i];

                while (roleCounts[roleName] < desiredByRole[roleName] && roomSpawns.length > 0) {
                    var spawn = roomSpawns.shift(); // Get the first available spawn in the room
                    var newName = roleName.charAt(0).toUpperCase() + roleName.slice(1) + Game.time;
                    var result = spawn.createCustomCreep(roleName, newName, roleCounts.harvester);

                    if (typeof result === 'string' || result == OK) {
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