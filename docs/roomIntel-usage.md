# Room Intel System Usage Guide

## Overview
The `roomIntel.js` module provides intelligent room scanning with memory caching to minimize CPU usage.

## Quick Start

### 1. CPU-Aware Scanning (Recommended)
Already integrated in `main.js` - only scans when you have spare CPU:

```javascript
// Only scans if >10 CPU available
roomIntel.updateVisibleRoomsIfCPU(10);
```

### 2. Automatic Scanning
Scans all stale rooms regardless of CPU usage:

```javascript
roomIntel.updateVisibleRooms();
```

### 3. Priority Scanning (Advanced)
Scans oldest data first, stops when CPU runs low:

```javascript
// Prioritizes most stale data, stops at 10 CPU threshold
roomIntel.updateWithPriority(10);
```

### 4. Manual Room Scanning
Scan a specific room (if you have vision):

```javascript
var roomIntel = require('intel.roomIntel');
var data = roomIntel.scanRoom('W1N1');
```

### 5. Get Cached Data
Retrieve previously scanned room data (instant, no CPU cost):

```javascript
var data = roomIntel.getRoomData('W1N1');
if (data) {
    console.log('Room has ' + data.sourceCount + ' sources');
    console.log('Minerals: ' + data.minerals[0].mineralType);
}
```

### 6. Generate Intel Report
Print a detailed report of nearby rooms:

```javascript
// Generate report for rooms within 2 range of your spawn
roomIntel.generateReport('W1N1', 2);
```

Example output:
```
===== Room Intel Report =====
Home Room: W1N1
Scan Range: 2

W1N1 [0 rooms away]
  Status: owned
  Sources: 2
  Minerals: H
  Controller: RCL 3 (owned by YourUsername)
  Last scanned: 10 ticks ago

W1N2 [1 rooms away]
  Status: neutral
  Sources: 3
  Minerals: U
  Controller: RCL 0
  Last scanned: 150 ticks ago

W2N1 [1 rooms away] - Not scanned yet
=============================
```

### 7. Find Good Remote Mining Targets
Filter rooms by criteria:

```javascript
// Find neutral rooms with 2+ sources within 3 rooms
var targets = roomIntel.getScannedRooms({
    status: 'neutral',
    minSources: 2,
    fromRoom: 'W1N1',
    maxDistance: 3
});

for (var i = 0; i < targets.length; i++) {
    console.log('Good target: ' + targets[i].name + 
                ' has ' + targets[i].sourceCount + ' sources');
}
```

### 8. Calculate Room Distance

```javascript
var distance = roomIntel.getRoomDistance('W1N1', 'W3N2');
console.log('Distance: ' + distance + ' rooms');
```

## Data Structure

Each scanned room contains:

```javascript
{
    name: "W1N1",
    scannedAt: 12345,           // Game tick
    
    sources: [
        {
            id: "source_id",
            pos: { x: 10, y: 20 },
            energyCapacity: 3000
        }
    ],
    sourceCount: 2,
    
    minerals: [
        {
            id: "mineral_id",
            mineralType: "H",
            pos: { x: 25, y: 35 },
            mineralAmount: 150000
        }
    ],
    
    controller: {
        id: "controller_id",
        level: 3,
        pos: { x: 20, y: 30 },
        my: true,
        owner: "YourUsername",
        reservation: null
    },
    
    hostiles: {
        creeps: 0,
        structures: 0,
        hasThreat: false
    },
    
    status: "owned"  // owned, enemy, neutral, reserved, hostile, highway
}
```

## Console Commands

Run these in the Screeps console:

```javascript
// Scan your current room
require('intel.roomIntel').scanRoom(Game.spawns.Spawn1.room.name);

// Generate report for nearby 2 rooms
require('intel.roomIntel').generateReport(Game.spawns.Spawn1.room.name, 2);

// Find all neutral rooms
var intel = require('intel.roomIntel');
var neutralRooms = intel.getScannedRooms({ status: 'neutral' });
console.log('Found ' + neutralRooms.length + ' neutral rooms');


// Clear all cached intel (if needed)
delete Memory.intel;

// Test CPU-aware scanning
var result = require('intel.roomIntel').updateVisibleRoomsIfCPU(10);
console.log('Scanned: ' + result.scanned + ', CPU: ' + result.cpuCost);

// Test priority scanning
var result = require('intel.roomIntel').updateWithPriority(5);
console.log('Scanned ' + result.scanned + ' of ' + result.queued + ' queued');
```

## Performance

? **CPU Efficient**: Scans only stale data (>500 ticks old)  
? **Memory Light**: ~200-500 bytes per room  
? **Cached**: Instant lookups after initial scan  
? **CPU-Aware**: Only scans when spare CPU is available  
? **Adaptive**: Stops scanning if CPU limit is approaching  

## CPU Management Strategies

### Strategy 1: CPU Threshold (Default)
Only scan if you have spare CPU:
```javascript
// In main.js - scans only if >10 CPU remaining
roomIntel.updateVisibleRoomsIfCPU(10);

// Returns: { scanned: 2, cpuCost: 1.5, cpuAvailable: 15.2 }
// Or: { skipped: true, reason: 'Insufficient CPU', cpuAvailable: 3.2 }
```

### Strategy 2: Priority Scanning
Scans oldest data first, stops when CPU runs low:
```javascript
// Prioritizes most outdated intel
var result = roomIntel.updateWithPriority(10);
console.log('Scanned ' + result.scanned + ' of ' + result.queued);
```

### Strategy 3: Always Scan (No Throttling)
For when intel is critical (uses more CPU):
```javascript
// Scans all stale rooms regardless of CPU
roomIntel.updateVisibleRooms();
```

### Strategy 4: Manual Control
Check CPU yourself before scanning:
```javascript
var cpuAvailable = Game.cpu.limit - Game.cpu.getUsed();
if (cpuAvailable > 15) {
    roomIntel.updateVisibleRooms();
}
```

### Recommended Approach
Place intel updates **at the end of your main loop** after critical operations:
```javascript
module.exports.loop = function() {
    // 1. High priority: Defense
    defendRoom();
    
    // 2. High priority: Spawning
    spawnCreeps();
    
    // 3. Medium priority: Creep actions
    runCreeps();
    
    // 4. Low priority: Intel (only if CPU available)
    roomIntel.updateVisibleRoomsIfCPU(10);
};
```

### CPU Usage Examples
Typical CPU costs per scan:
- **Empty room**: ~0.3-0.5 CPU
- **Active room**: ~0.5-1.0 CPU
- **Complex room**: ~1.0-2.0 CPU

With default settings (10 CPU threshold), you'll scan 5-10 rooms if you have spare CPU.

## Integration Examples

### Remote Mining
```javascript
// Find best remote mining target
var targets = roomIntel.getScannedRooms({
    status: 'neutral',
    minSources: 2,
    fromRoom: 'W1N1',
    maxDistance: 2
});

if (targets.length > 0) {
    var best = targets[0];
    // Spawn remote harvesters to best.name
}
```

### Expansion Planning
```javascript
// Find rooms suitable for claiming
var candidates = roomIntel.getScannedRooms({
    status: 'neutral',
    minSources: 2
});

for (var i = 0; i < candidates.length; i++) {
    var room = candidates[i];
    if (room.hostiles.hasThreat) continue;
    console.log('Good expansion: ' + room.name);
}
```

### Threat Detection
```javascript
var data = roomIntel.getRoomData('W1N1');
if (data && data.hostiles.hasThreat) {
    console.log('?? ALERT: Hostiles in ' + data.name);
    // Trigger defense protocol
}
```

## Configuration

Adjust scan interval in `intel/roomIntel.js`:

```javascript
SCAN_INTERVAL: 500,  // Ticks between rescans (default: 500)
```

Lower = more up-to-date, higher = less CPU usage
