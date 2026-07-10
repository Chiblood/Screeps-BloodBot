var sourceAssignment = require('sourceAssignment.AI');

module.exports = function () { 
    var spawnErrorText = {};
    spawnErrorText[OK] = 'OK';
    spawnErrorText[ERR_NOT_OWNER] = 'ERR_NOT_OWNER';
    spawnErrorText[ERR_NAME_EXISTS] = 'ERR_NAME_EXISTS';
    spawnErrorText[ERR_BUSY] = 'ERR_BUSY';
    spawnErrorText[ERR_NOT_ENOUGH_ENERGY] = 'ERR_NOT_ENOUGH_ENERGY';
    spawnErrorText[ERR_INVALID_ARGS] = 'ERR_INVALID_ARGS';
    spawnErrorText[ERR_RCL_NOT_ENOUGH] = 'ERR_RCL_NOT_ENOUGH';
    
    /** @param {roleName, newName} roleName ex 'harvester', 'builder', ect; newName = creep Name **/
    
    StructureSpawn.prototype.createCustomCreep =
        function (roleName, newName) {
            
            console.log('Running createCustomCreep.');
            var energyPool = this.room.energyAvailable;
            var harvesters = _.filter(Game.creeps, (creep) => creep.memory.role == 'harvester');

            if (energyPool < 300) {
                return ERR_NOT_ENOUGH_ENERGY;
            }
            
            // Assuming costs 100 for WORK, 50 for CARRY, and 50 for MOVE. Energy Capacity(energyPool) / sum = max # of parts
            
            // The desired parts for an average energy collecting creep, special case at start, copied from th_pion tutorial
            var desiredParts = [];
            if (energyPool < 400 || harvesters.length == 0) {
                desiredParts = [WORK, CARRY,CARRY, MOVE, MOVE];
            }
            else {
                while(energyPool >0) {
                    desiredParts.push(WORK);
                    energyPool -= 100;
                    if (energyPool == 0) break;
                    desiredParts.push(MOVE);
                    energyPool -= 50;
                    if (energyPool == 0) break;
                    desiredParts.push(CARRY);
                    energyPool -= 50;
                }
            }
            console.log('The desiredParts are: '+desiredParts);
            var assignedSource = '';
            try {
                assignedSource = sourceAssignment.assignSource(this.room.name);
            }
            catch (err) {
                console.log('assignSource failed in room ' + this.room.name + ': ' + err);
            }

            // Validate spawn request before creating creep to get a clear failure reason.
            var canCreateResult = this.canCreateCreep(desiredParts, newName);
            if (canCreateResult !== OK) {
                console.log('[SpawnCheck] Cannot spawn ' + newName + ' in ' + this.room.name +
                    ' | role: ' + roleName +
                    ' | code: ' + canCreateResult +
                    ' (' + (spawnErrorText[canCreateResult] || 'UNKNOWN') + ')' +
                    ' | body: ' + desiredParts.join(','));
                return canCreateResult;
            }

            return this.createCreep(desiredParts, newName, {role:roleName, sourceId: assignedSource});
        };
};