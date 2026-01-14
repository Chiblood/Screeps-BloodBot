require ('prototype.spawn')();

var spawnAI = {
     /** @param {} **/
     run: function() {
        // Arrary's of creeps with specific roles in memory 
        var harvesters = _.filter(Game.creeps, (creep) => creep.memory.role == 'harvester');
        var upgraders = _.filter(Game.creeps, (creep) => creep.memory.role == 'upgrader');
        var builders = _.filter(Game.creeps, (creep) => creep.memory.role == 'builder');
        var repairers = _.filter(Game.creeps, (creep) => creep.memory.role == 'repairer');
        
        // Define the number "desired" for each role 
        var desiredHarvesters = 6;
        var desiredUpgraders = 2;
        var desiredBuilders = 4;
        var desiredRepairers = 2;
        
        // Determine if a creep is needed
        var needCreep = true;
        if ((harvesters.length >= desiredHarvesters) && (upgraders.length >= desiredUpgraders) && (builders.length >= desiredBuilders) && (repairers.length >= desiredRepairers)) {
            needCreep = false;
            // console.log('Creep not Needed: ' + !needCreep);
        }
        
        var energyPool = Game.spawns.Spawn1.room.energyCapacityAvailable;
        
        // CPU saving 
        if ((Game.spawns.Spawn1.room.energyAvailable == energyPool) && needCreep == true) { 
            console.log('Running screeps spawn and source assignment');
                
            // role.harvester 
            if(harvesters.length < desiredHarvesters) {
                var newName = 'Harvester' + Game.time;
                if(!(Game.spawns.Spawn1.createCustomCreep('harvester', newName) == ERR_NOT_ENOUGH_ENERGY)) {
                    console.log('Spawning new harvester: ' + newName);
                }
            }
            
            // role.upgrader
            else if(upgraders.length < desiredUpgraders) {
                var newName = 'Upgrader' + Game.time;
                if(!(Game.spawns['Spawn1'].createCustomCreep('upgrader', newName) == ERR_NOT_ENOUGH_ENERGY)) {
                    console.log('Spawning new upgrader: ' + newName);
                }
            }
            
            // role.builder
            else if(builders.length < desiredBuilders) {
                var newName = 'Builder' + Game.time;
                if(!(Game.spawns['Spawn1'].createCustomCreep('builder', newName) == ERR_NOT_ENOUGH_ENERGY)) {
                    console.log('Spawning new builder: ' + newName);
                }
            }
            
            // role.repairer
            else if(repairers.length < desiredRepairers) {
                var newName = 'Repairer' + Game.time;
                if(!(Game.spawns['Spawn1'].createCustomCreep('repairer', newName) == ERR_NOT_ENOUGH_ENERGY)) {
                    console.log('Spawning new repairer: ' + newName);
                }
            }
            // role.defender
            else {
               // placeholder for spawning defensive creeps, call a separate module
            } 
        }
     }
}
module.exports = spawnAI;