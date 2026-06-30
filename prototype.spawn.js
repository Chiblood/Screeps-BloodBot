var sourceAssignment = require('sourceAssignment.AI');

module.exports = function () { 
    
    /** @param {roleName, newName} roleName ex 'harvester', 'builder', ect; newName = creep Name **/
    
    StructureSpawn.prototype.createCustomCreep =
        function (roleName, newName) {
            
            console.log('Running createCustomCreep.');
            var energyPool = this.room.energyCapacityAvailable;
            var maxParts = Math.floor(energyPool / 200);
            var harvesters = _.filter(Game.creeps, (creep) => creep.memory.role == 'harvester');
            
            // Assuming costs 100 for WORK, 50 for CARRY, and 50 for MOVE. Energy Capacity(energyPool) / sum = max # of parts
            
            // The desired parts for an average energy collecting creep, special case at start, copied from th_pion tutorial
            var desiredParts = [];
            if (this.room.energyCapacityAvailable == 300 || harvesters.length == 0) {
                desiredParts = [WORK, CARRY,CARRY, MOVE, MOVE];
            }
            else {
                while(energyPool >0) {
                    desiredParts.push('WORK');
                    energyPool -= 100;
                    if (energyPool == 0) break;
                    desiredParts.push('MOVE');
                    energyPool -= 50;
                    if (energyPool == 0) break;
                    desiredParts.push('CARRY');
                    energyPool -= 50;
                }
            }
            console.log('The desiredParts are: '+desiredParts);
            var assignedSource = sourceAssignment.assignSource(this.room.name);
            return this.createCreep(desiredParts, newName, {role:roleName, sourceId: assignedSource});
        };
};