var roleDefense = {
    defendMe: function() {

        for (var roomName in Game.rooms) {
            var room = Game.rooms[roomName];

            if (!room.controller || !room.controller.my) {
                continue; // Skip rooms that are not owned by the player
            }

            var hostiles = room.find(FIND_HOSTILE_CREEPS);
            if (hostiles.length > 0) {
                var username = hostiles[0].owner.username;
            }

            // Reactive-defense trigger signal for spawnAI/squadManager - cheaper
            // and fresher than roomIntel's 500-tick-stale cache since it reuses
            // the hostiles find() already done here for the towers.
            Memory.combat = Memory.combat || {};
            Memory.combat.threats = Memory.combat.threats || {};
            Memory.combat.threats[roomName] = {
                hasThreat: hostiles.length > 0,
                hostileCount: hostiles.length,
                updatedAt: Game.time
            };

            var towers = room.find(FIND_MY_STRUCTURES, {
                filter: function (s) { return s.structureType == STRUCTURE_TOWER; }
            });
            
            // If there are hostiles, log the attack
            if (hostiles.length > 0) {
                // console.log('Room ' + roomName + ' is under attack by hostile creeps owned by ' + username);
            }

            // Have each tower attack the closest hostile creep or repair damaged structures if no hostiles are present
            for (var i = 0; i < towers.length; i++) {
                var tower = towers[i];

                // Prioritize attacking hostile creeps
                if (hostiles.length > 0) {
                    var closestHostile = tower.pos.findClosestByRange(hostiles);
                    if (closestHostile) {
                        tower.attack(closestHostile);
                        // print('Tower in room ' + roomName + ' is attacking hostile creep owned by ' + username);
                    }
                }
                // If no hostiles, repair damaged structures
                else {
                    var closestDamagedStructure = tower.pos.findClosestByRange(FIND_STRUCTURES, {
                        filter: function (structure) { return structure.hits < structure.hitsMax; }
                    });
                    
                    if(closestDamagedStructure) {
                    tower.repair(closestDamagedStructure);
                    }
                }
            }
        }
    
    }
};    

module.exports = roleDefense;