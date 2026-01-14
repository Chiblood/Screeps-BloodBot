# Screeps Bot

A JavaScript-based bot for the Screeps MMO strategy game.

## Documentation

?? **Guides:**
- [Room Intel Usage](roomIntel-usage.md) - How to use the intelligence system
- [CPU Management](cpu-management.md) - CPU optimization strategies
- [Console Commands](console-commands.md) - Quick reference for console commands
- [API Reference](screeps-api-reference.md) - Screeps API cheat sheet
- [Copilot Instructions](copilot_instructions.md) - Project coding standards

## Quick Reference

### Resource Limits
- **CPU**: ~20-30 per tick (check `Game.cpu.limit`)
- **Memory**: 2MB max (`RawMemory.get().length`)
- **Bucket**: Up to 10,000 accumulated CPU

### Performance Monitoring
```javascript
// Check CPU usage
console.log('CPU Used:', Game.cpu.getUsed(), '/', Game.cpu.limit);
console.log('Bucket:', Game.cpu.bucket);

// Check memory usage
console.log('Memory:', RawMemory.get().length, '/ 2097152 bytes');
```

### Optimization Tips
1. **Cache expensive operations**: Store pathfinding results
2. **Limit searches**: Use `Game.getObjectById()` with stored IDs
3. **Batch operations**: Process similar tasks together
4. **Early returns**: Exit functions early when conditions aren't met
5. **Clean memory**: Remove dead creeps regularly (already implemented)

## Project Structure
```
/roles/              - Creep behavior modules
  role.harvester.js
  role.upgrader.js
  role.builder.js
  role.repairer.js
  role.defense.js
/core/               - Core systems
  spawn.AI.js           - Spawn management
  prototype.spawn.js    - Spawn extensions
  sourceAssignment.AI.js - Source allocation
/intel/              - Intelligence & scouting
  roomIntel.js          - Room scanning & data cache
/docs/               - Documentation (not uploaded)
main.js              - Main game loop
```

## Current Roles
- **Harvester**: Energy collection
- **Upgrader**: Controller upgrading
- **Builder**: Construction
- **Repairer**: Structure maintenance
- **Defender**: Defense against hostiles

## Useful Screeps Constants
- `OK` = 0 (success)
- `ERR_NOT_IN_RANGE` = -9
- `ERR_NOT_ENOUGH_ENERGY` = -6
- `FIND_SOURCES` - Energy sources
- `FIND_STRUCTURES` - All structures
- `FIND_MY_SPAWNS` - Your spawns
- `STRUCTURE_SPAWN` - Spawn structure type

## Next Steps
1. Implement creep role switching based on colony needs
2. Add remote harvesting for additional rooms
3. Implement tower defense
4. Add market trading logic
5. Create road construction planner
