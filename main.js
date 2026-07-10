var spawnAI = require('spawn.AI');
var roleHarvester = require('role.harvester');
var roleUpgrader = require('role.upgrader');
var roleBuilder = require('role.builder');
var roleRepairer = require('role.repairer');
var roleDefender = require('role.defense');
var roomConstruction = require('room.construction');
var roomIntel = require('roomIntel');

//var PIXEL_INTERVAL = 25;

module.exports.loop = function () {
    
    // Defense call (high priority)
    roleDefender.defendMe();
        
    // Spawn Controller call (high priority)
    spawnAI.run();

    roomConstruction.run();
    
    // Clearing dead creeps from memory
    for(var name in Memory.creeps) {
          if(!Game.creeps[name]) {
              delete Memory.creeps[name];
              console.log('Clearing non-existing creep memory:', name);
          }
    }

    // Run creep roles
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
    
    /*
    if (shouldGeneratePixel()) {
        var result = Game.cpu.generatePixel();
        if (result === OK) {
            console.log('[CPU] Pixel generated at tick ' + Game.time);
        }
    }
    */
}