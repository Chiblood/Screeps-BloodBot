# Screeps Console Commands Cheat Sheet

Quick commands to run in the Screeps in-game console for debugging and management.

## Room Intel Commands

```javascript
// Generate intel report for nearby rooms
require('intel.roomIntel').generateReport('W1N1', 2);

// Scan a specific room
require('intel.roomIntel').scanRoom('W1N2');

// Get cached room data
require('intel.roomIntel').getRoomData('W1N1');

// Find all neutral rooms with 2+ sources
var intel = require('intel.roomIntel');
intel.getScannedRooms({ status: 'neutral', minSources: 2 });

// CPU-aware scanning with results
var result = require('intel.roomIntel').updateVisibleRoomsIfCPU(10);
console.log('Scanned: ' + result.scanned + ', CPU used: ' + result.cpuCost);

// Priority scanning (scans oldest data first)
var result = require('intel.roomIntel').updateWithPriority(5);
console.log('Scanned ' + result.scanned + ' of ' + result.queued + ' queued rooms');

// Force update all visible rooms (ignores CPU)
require('intel.roomIntel').updateVisibleRooms();

// Clear all intel cache
delete Memory.intel;

// Calculate distance between rooms
require('intel.roomIntel').getRoomDistance('W1N1', 'W3N2');
```

## Memory Management

```javascript
// Check memory usage
console.log('Memory: ' + RawMemory.get().length + ' / 2097152 bytes');

// Clear dead creeps
for(var name in Memory.creeps) {
    if(!Game.creeps[name]) {
        delete Memory.creeps[name];
    }
}

// View all memory
JSON.stringify(Memory);

// Clear specific memory sections
delete Memory.creeps;
delete Memory.intel;

// Clear ALL memory (WARNING!)
Memory = {};
```

## CPU Monitoring

```javascript
// Check CPU usage
console.log('CPU: ' + Game.cpu.getUsed() + ' / ' + Game.cpu.limit);
console.log('Bucket: ' + Game.cpu.bucket);

// Measure function performance
var start = Game.cpu.getUsed();
// ... your code here ...
console.log('CPU used: ' + (Game.cpu.getUsed() - start));
```

## Creep Management

```javascript
// Count creeps by role
_.countBy(Game.creeps, 'memory.role');

// List all creeps
for(var name in Game.creeps) {
    var creep = Game.creeps[name];
    console.log(name + ': ' + creep.memory.role + ' in ' + creep.room.name);
}

// Kill a specific creep
Game.creeps['Harvester1'].suicide();

// Kill all creeps of a role
for(var name in Game.creeps) {
    if(Game.creeps[name].memory.role === 'harvester') {
        Game.creeps[name].suicide();
    }
}
```

## Room Information

```javascript
// Your rooms
for(var name in Game.rooms) {
    var room = Game.rooms[name];
    console.log(room.name + ': RCL ' + room.controller.level);
}

// Room energy status
var room = Game.spawns.Spawn1.room;
console.log('Energy: ' + room.energyAvailable + ' / ' + room.energyCapacityAvailable);

// Find sources
Game.spawns.Spawn1.room.find(FIND_SOURCES);

// Find construction sites
Game.spawns.Spawn1.room.find(FIND_CONSTRUCTION_SITES);

// Find hostiles
Game.spawns.Spawn1.room.find(FIND_HOSTILE_CREEPS);
```

## Spawning

```javascript
// Spawn a harvester
Game.spawns.Spawn1.spawnCreep([WORK, CARRY, MOVE], 'Harvester1', 
    { memory: { role: 'harvester' } });

// Check what's spawning
Game.spawns.Spawn1.spawning;

// Cancel spawn
Game.spawns.Spawn1.spawning.cancel();

// Check if spawn is available
!Game.spawns.Spawn1.spawning;
```

## Source Assignment

```javascript
// Check source assignments
var sourceAI = require('core.sourceAssignment.AI');
sourceAI.assignSource();

// View all creeps per source
for(var name in Game.creeps) {
    console.log(name + ' -> ' + Game.creeps[name].memory.sourceId);
}

// Show canonical source intel for a room
require('roomIntel').getRoomSources('W1N1');

// Show effective source intel (includes per-source overrides)
require('roomIntel').getEffectiveSources('W1N1');

// Set per-source override (replace with your source id)
Memory.sourceConfig['SOURCE_ID_HERE'] = { desiredCreepsOverride: 8 };

// Clear per-source override
delete Memory.sourceConfig['SOURCE_ID_HERE'];

// Show desired creep config for each source in a room
var intel = require('roomIntel').getEffectiveSources('W1N1');
for (var i = 0; i < intel.length; i++) {
    console.log(intel[i].id + ' free=' + intel[i].freeSlots + ' desired=' + intel[i].desiredCreeps);
}
```

## Market & Economy (Advanced)

```javascript
// Check resource amounts
Game.spawns.Spawn1.room.storage.store;

// Terminal transactions
Game.market.orders;

// Check market prices
Game.market.getHistory('H');
```

## Utilities

```javascript
// Global reset
for(var name in Memory.creeps) {
    delete Memory.creeps[name];
}
delete Memory.intel;

// Get object by ID
Game.getObjectById('5982fcd838dc4a917e455ac6');

// Find path
Game.spawns.Spawn1.room.findPath(
    new RoomPosition(10, 10, 'W1N1'),
    new RoomPosition(40, 40, 'W1N1')
);

// Get game time
Game.time;

// Get shard name
Game.shard.name;
```

## Quick Debugging

```javascript
// Log all creep positions
for(var name in Game.creeps) {
    var c = Game.creeps[name];
    console.log(name + ' at ' + c.pos.x + ',' + c.pos.y + ' in ' + c.room.name);
}

// Check if creeps are idle
for(var name in Game.creeps) {
    var c = Game.creeps[name];
    if(!c.memory.working) {
        console.log(name + ' is idle!');
    }
}

// Force update intel
require('intel.roomIntel').updateVisibleRooms();
```

## Visual Debugging

```javascript
// Draw circle on position
Game.rooms['W1N1'].visual.circle(25, 25);

// Draw line between positions
Game.rooms['W1N1'].visual.line(10, 10, 40, 40);

// Draw text
Game.rooms['W1N1'].visual.text('Hello!', 25, 25);
```

## Tips

?? Use `Tab` for autocomplete in console  
?? Use `Shift+Enter` for multi-line commands  
?? Store frequently used commands as functions in Memory  
?? Use `JSON.stringify(obj, null, 2)` for pretty printing  

## Emergency Commands

```javascript
// Kill all creeps
for(var name in Game.creeps) Game.creeps[name].suicide();

// Wipe memory
Memory = {};

// Stop spawning
for(var name in Game.spawns) {
    if(Game.spawns[name].spawning) {
        Game.spawns[name].spawning.cancel();
    }
}
```
