# Screeps API Quick Reference

## Game Object
- `Game.time` - Current game tick
- `Game.cpu.getUsed()` - CPU used this tick
- `Game.cpu.limit` - Your CPU limit
- `Game.cpu.bucket` - Accumulated CPU (max 10,000)
- `Game.creeps` - All your creeps {name: Creep}
- `Game.spawns` - All your spawns {name: Spawn}
- `Game.rooms` - All visible rooms {name: Room}

## Memory
- `Memory` - Persistent object (2MB limit)
- `Memory.creeps[name]` - Creep-specific memory
- `RawMemory.get()` - Get raw memory string
- Clean dead creeps: `if(!Game.creeps[name]) delete Memory.creeps[name]`

## Creep Actions
- `creep.moveTo(target)` - Move to target
- `creep.harvest(source)` - Harvest energy
- `creep.transfer(target, RESOURCE_ENERGY)` - Transfer energy
- `creep.upgradeController(controller)` - Upgrade controller
- `creep.build(constructionSite)` - Build structure
- `creep.repair(structure)` - Repair structure
- `creep.attack(target)` - Melee attack
- `creep.rangedAttack(target)` - Ranged attack

## Finding Objects
- `room.find(FIND_SOURCES)` - Find energy sources
- `room.find(FIND_MY_SPAWNS)` - Find your spawns
- `room.find(FIND_STRUCTURES)` - Find all structures
- `room.find(FIND_CONSTRUCTION_SITES)` - Find construction sites
- `room.find(FIND_HOSTILE_CREEPS)` - Find enemies
- `Game.getObjectById(id)` - Get object by ID (fast!)

## Spawning
```javascript
Game.spawns['Spawn1'].spawnCreep(
    [WORK, CARRY, MOVE],  // body parts
    'Harvester1',          // name
    { memory: { role: 'harvester' } }  // options
);
```

## Body Parts & Costs
- `MOVE` - 50 energy
- `WORK` - 100 energy (harvest, build, repair, upgrade)
- `CARRY` - 50 energy (carry resources)
- `ATTACK` - 80 energy (melee)
- `RANGED_ATTACK` - 150 energy
- `HEAL` - 250 energy
- `TOUGH` - 10 energy (absorb damage)

## Return Codes
- `OK` = 0
- `ERR_NOT_OWNER` = -1
- `ERR_NO_PATH` = -2
- `ERR_NAME_EXISTS` = -3
- `ERR_BUSY` = -4
- `ERR_NOT_FOUND` = -5
- `ERR_NOT_ENOUGH_ENERGY` = -6
- `ERR_INVALID_TARGET` = -7
- `ERR_FULL` = -8
- `ERR_NOT_IN_RANGE` = -9
- `ERR_INVALID_ARGS` = -10
- `ERR_TIRED` = -11
- `ERR_NO_BODYPART` = -12
- `ERR_RCL_NOT_ENOUGH` = -14
- `ERR_GCL_NOT_ENOUGH` = -15

## Performance Tips
1. Cache `room.find()` results (expensive!)
2. Store target IDs in creep memory, use `Game.getObjectById()`
3. Reuse paths (store in creep memory)
4. Limit pathfinding calls per tick
5. Use early returns to skip unnecessary logic

## Official Documentation
https://docs.screeps.com/api/
