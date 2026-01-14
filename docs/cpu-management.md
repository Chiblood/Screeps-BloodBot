# CPU Management in Screeps

## Understanding CPU in Screeps

### CPU Limits
- **CPU per tick**: Your limit per game tick (default: 20-30 for new players)
- **CPU Bucket**: Accumulates unused CPU (max 10,000)
- **Bucket usage**: Can use up to 500 CPU in one tick if bucket is full

### Checking CPU Usage

```javascript
// Current CPU used this tick
Game.cpu.getUsed();

// Your CPU limit per tick
Game.cpu.limit;

// CPU bucket (accumulated surplus)
Game.cpu.bucket;

// Available CPU remaining
var available = Game.cpu.limit - Game.cpu.getUsed();
```

## CPU Monitoring Patterns

### Pattern 1: Simple Check
```javascript
module.exports.loop = function() {
    console.log('CPU: ' + Game.cpu.getUsed() + ' / ' + Game.cpu.limit);
    
    // Your code...
};
```

### Pattern 2: Function Profiling
```javascript
function profileFunction(name, func) {
    var start = Game.cpu.getUsed();
    func();
    var cost = Game.cpu.getUsed() - start;
    console.log(name + ' used ' + cost.toFixed(2) + ' CPU');
}

// Usage
profileFunction('Spawn AI', function() {
    spawnAI.run();
});
```

### Pattern 3: Conditional Execution
```javascript
module.exports.loop = function() {
    // Critical operations (always run)
    defendRoom();
    spawnCreeps();
    
    // Check if we have CPU budget left
    var cpuRemaining = Game.cpu.limit - Game.cpu.getUsed();
    
    if (cpuRemaining > 10) {
        // Optional operations
        roomIntel.updateVisibleRoomsIfCPU(10);
    }
    
    if (cpuRemaining > 5) {
        // Low priority operations
        planRoadConstruction();
    }
};
```

### Pattern 4: Priority Queue
```javascript
module.exports.loop = function() {
    var tasks = [
        { priority: 1, name: 'Defense', func: defendRoom, cpuBudget: 5 },
        { priority: 2, name: 'Spawning', func: spawnCreeps, cpuBudget: 3 },
        { priority: 3, name: 'Creeps', func: runCreeps, cpuBudget: 10 },
        { priority: 4, name: 'Intel', func: updateIntel, cpuBudget: 5 }
    ];
    
    for (var i = 0; i < tasks.length; i++) {
        var task = tasks[i];
        var remaining = Game.cpu.limit - Game.cpu.getUsed();
        
        if (remaining < task.cpuBudget) {
            console.log('Skipping ' + task.name + ' - insufficient CPU');
            break;
        }
        
        task.func();
    }
};
```

## CPU Optimization Techniques

### 1. Cache Expensive Operations
```javascript
// BAD - searches every tick
var sources = room.find(FIND_SOURCES);

// GOOD - cache in Memory
if (!Memory.sources) {
    Memory.sources = room.find(FIND_SOURCES).map(s => s.id);
}
var sources = Memory.sources.map(id => Game.getObjectById(id));
```

### 2. Early Returns
```javascript
// BAD
function harvestEnergy(creep) {
    var target = creep.pos.findClosestByPath(FIND_SOURCES);
    if (creep.store.getFreeCapacity() === 0) {
        return; // Wasted CPU finding target first
    }
    creep.harvest(target);
}

// GOOD
function harvestEnergy(creep) {
    if (creep.store.getFreeCapacity() === 0) {
        return; // Exit early
    }
    var target = creep.pos.findClosestByPath(FIND_SOURCES);
    creep.harvest(target);
}
```

### 3. Limit Pathfinding
```javascript
// BAD - pathfinding every tick
creep.moveTo(target);

// GOOD - cache path
if (!creep.memory.path || creep.memory.pathAge > 50) {
    creep.memory.path = creep.pos.findPathTo(target);
    creep.memory.pathAge = 0;
}
creep.moveByPath(creep.memory.path);
creep.memory.pathAge++;
```

### 4. Batch Similar Operations
```javascript
// BAD - individual lookups
for (var name in Game.creeps) {
    var spawn = Game.spawns.Spawn1; // Repeated lookup
    // ...
}

// GOOD - lookup once
var spawn = Game.spawns.Spawn1;
for (var name in Game.creeps) {
    // Use cached spawn
}
```

### 5. Use getObjectById() Instead of Searching
```javascript
// BAD - expensive search
var source = creep.room.find(FIND_SOURCES)[0];

// GOOD - store ID, use getObjectById
if (!creep.memory.sourceId) {
    creep.memory.sourceId = creep.room.find(FIND_SOURCES)[0].id;
}
var source = Game.getObjectById(creep.memory.sourceId);
```

## CPU Throttling Strategies

### Strategy 1: Skip-Tick Pattern
```javascript
// Run expensive operations every N ticks
if (Game.time % 10 === 0) {
    updateRoomPlanning(); // Only every 10 ticks
}
```

### Strategy 2: CPU-Aware Execution
```javascript
function expensiveOperation() {
    var cpuAvailable = Game.cpu.limit - Game.cpu.getUsed();
    
    if (cpuAvailable < 5) {
        return { skipped: true };
    }
    
    // Do expensive work
    return { completed: true };
}
```

### Strategy 3: Gradual Processing
```javascript
// Process only N items per tick
if (!Memory.processQueue) Memory.processQueue = [];

var itemsPerTick = 5;
var processed = 0;

while (Memory.processQueue.length > 0 && processed < itemsPerTick) {
    var item = Memory.processQueue.shift();
    processItem(item);
    processed++;
}
```

### Strategy 4: Bucket Management
```javascript
module.exports.loop = function() {
    // Use bucket for expensive operations
    if (Game.cpu.bucket > 5000) {
        // We have surplus, can afford expensive operations
        performExpensiveOptimizations();
    }
    
    if (Game.cpu.bucket < 1000) {
        // Low bucket, minimal operations only
        console.log('?? Low CPU bucket - running minimal code');
        return;
    }
    
    // Normal operations
    runNormalCode();
};
```

## CPU Budget Example

```javascript
var cpuBudgets = {
    defense: 5,
    spawning: 3,
    creeps: 12,
    intel: 5,
    planning: 3
};

module.exports.loop = function() {
    var startCpu = Game.cpu.getUsed();
    
    // Track each system
    var defenseStart = Game.cpu.getUsed();
    defendRoom();
    var defenseCost = Game.cpu.getUsed() - defenseStart;
    
    var spawnStart = Game.cpu.getUsed();
    spawnCreeps();
    var spawnCost = Game.cpu.getUsed() - spawnStart;
    
    // Log if over budget
    if (defenseCost > cpuBudgets.defense) {
        console.log('?? Defense over budget: ' + defenseCost.toFixed(2));
    }
    
    if (spawnCost > cpuBudgets.spawning) {
        console.log('?? Spawning over budget: ' + spawnCost.toFixed(2));
    }
    
    // Total tick cost
    var totalCost = Game.cpu.getUsed() - startCpu;
    console.log('Total CPU: ' + totalCost.toFixed(2) + ' / ' + Game.cpu.limit);
};
```

## Monitoring Dashboard

```javascript
// Add to main.js for continuous monitoring
module.exports.loop = function() {
    var startCpu = Game.cpu.getUsed();
    
    // Your code...
    
    var totalCpu = Game.cpu.getUsed() - startCpu;
    var percentage = (totalCpu / Game.cpu.limit * 100).toFixed(1);
    
    // Visual warning
    if (percentage > 90) {
        console.log('?? CPU CRITICAL: ' + percentage + '%');
    } else if (percentage > 70) {
        console.log('?? CPU HIGH: ' + percentage + '%');
    } else {
        console.log('?? CPU OK: ' + percentage + '%');
    }
    
    console.log('Bucket: ' + Game.cpu.bucket);
};
```

## Console Commands for CPU Debugging

```javascript
// Profile all creep roles
var roles = {};
for (var name in Game.creeps) {
    var role = Game.creeps[name].memory.role;
    if (!roles[role]) roles[role] = 0;
    roles[role]++;
}
console.log('Creeps by role:', JSON.stringify(roles));

// Find expensive creeps
for (var name in Game.creeps) {
    var start = Game.cpu.getUsed();
    // Run creep logic
    var cost = Game.cpu.getUsed() - start;
    if (cost > 0.5) {
        console.log(name + ' used ' + cost.toFixed(2) + ' CPU');
    }
}

// Check if bucket is being drained
console.log('Bucket rate: ' + (Memory.lastBucket - Game.cpu.bucket) + ' per tick');
Memory.lastBucket = Game.cpu.bucket;
```

## Tips

?? **Aim for 80% CPU usage** - leaves headroom for spikes  
?? **Cache everything** - Memory lookups are cheap, searches are expensive  
?? **Profile regularly** - Measure which systems use most CPU  
?? **Use bucket wisely** - Save it for emergencies or major operations  
?? **Optimize hot paths** - Code that runs every tick for every creep matters most
