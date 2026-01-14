var spawnAI = require('core.spawn.AI');
var roleHarvester = require('roles.role.harvester');
var roleUpgrader = require('roles.role.upgrader');
var roleBuilder = require('roles.role.builder');
var roleRepairer = require('roles.role.repairer');
var roleDefender = require('roles.role.defense');
var roomIntel = require('intel.roomIntel');

module.exports.loop = function () {
    
// Defense call (high priority)
roleDefender.defendMe();
    
// Spawn Controller call (high priority)
spawnAI.run();
    
    // Clearing dead creeps from memory
    for(var name in Memory.creeps) {
          if(!Game.creeps[name]) {
              delete Memory.creeps[name];
              console.log('Clearing non-existing creep memory:', name);
          }
    }
    for(var name in Game.creeps) {
        var creep = Game.creeps[name];
        if(creep.memory.role == 'harvester') {
            roleHarvester.run(creep);
        }
        if(creep.memory.role == 'upgrader') {
            roleUpgrader.run(creep);
        }
        if(creep.memory.role == 'builder') {
            roleBuilder.run(creep);
        }
        if(creep.memory.role == 'repairer') {
            roleRepairer.run(creep);
        }
    }
    
    // Update intel only if we have spare CPU (runs at end of tick)
    // Only scans if >10 CPU available (configurable)
    roomIntel.updateVisibleRoomsIfCPU(10);
}