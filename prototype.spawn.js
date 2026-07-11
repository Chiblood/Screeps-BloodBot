var sourceAssignment = require('sourceAssignment.AI');
var creepBodies = require('creepBodies');

module.exports = function () {
    var spawnErrorText = {};
    spawnErrorText[OK] = 'OK';
    spawnErrorText[ERR_NOT_OWNER] = 'ERR_NOT_OWNER';
    spawnErrorText[ERR_NAME_EXISTS] = 'ERR_NAME_EXISTS';
    spawnErrorText[ERR_BUSY] = 'ERR_BUSY';
    spawnErrorText[ERR_NOT_ENOUGH_ENERGY] = 'ERR_NOT_ENOUGH_ENERGY';
    spawnErrorText[ERR_INVALID_ARGS] = 'ERR_INVALID_ARGS';
    spawnErrorText[ERR_RCL_NOT_ENOUGH] = 'ERR_RCL_NOT_ENOUGH';

    // Military roles don't harvest, so they skip sourceAssignment entirely.
    var militaryRoles = { tank: true, archer: true, healer: true, rogue: true };

    /** @param {roleName, newName, knownHarvesterCount, squadOpts} roleName ex 'harvester', 'tank', etc;
     * newName = creep Name; squadOpts = {squadId} - optional, tags the new creep into a squad **/

    StructureSpawn.prototype.createCustomCreep =
        function (roleName, newName, knownHarvesterCount, squadOpts) {

            console.log('Running createCustomCreep.');
            var energyPool = this.room.energyAvailable;
            var harvesterCount = typeof knownHarvesterCount === 'number'
                ? knownHarvesterCount
                : _.filter(Game.creeps, (creep) => creep.memory.role == 'harvester').length;

            if (energyPool < 300) {
                return ERR_NOT_ENOUGH_ENERGY;
            }

            var desiredParts = creepBodies.build(roleName, energyPool, harvesterCount);
            console.log('The desiredParts are: '+desiredParts);

            if (!desiredParts || desiredParts.length === 0) {
                return ERR_NOT_ENOUGH_ENERGY;
            }

            var assignedSource = '';
            if (!militaryRoles[roleName]) {
                try {
                    assignedSource = sourceAssignment.assignSource(this.room.name);
                }
                catch (err) {
                    console.log('assignSource failed in room ' + this.room.name + ': ' + err);
                }
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

            var memory = { role: roleName, sourceId: assignedSource };
            if (squadOpts && squadOpts.squadId) {
                memory.squadId = squadOpts.squadId;
                memory.combatState = 'rally';
            }

            return this.createCreep(desiredParts, newName, memory);
        };
};