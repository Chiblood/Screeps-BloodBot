# Copilot Instructions for Screeps Bot

## Project Overview
This is a Screeps bot written in JavaScript. The bot manages a colony with various creep roles.

## Code Style Preferences
- Use descriptive variable names
- Cache expensive operations (pathfinding, room scans)
- Always clean up dead creeps from Memory
- Prefer performance over readability when CPU is critical

## Project Structure
- `/roles/` - All creep role behavior modules
- `/core/` - Core game logic (spawning, prototypes, source assignment)
- `/intel/` - Intelligence gathering and room scanning
- `/docs/` - Documentation (not uploaded to Screeps)
- `main.js` - Main game loop

## Screeps-Specific Guidelines
- Always consider CPU usage (aim for <20 CPU per tick in early game)
- Cache paths and reuse them
- Use `Game.getObjectById()` over searching when possible
- Minimize pathfinding calls (expensive operation)
- Clean up Memory regularly to avoid memory limit issues

## Role Descriptions
- **Harvester**: Collects energy from sources
- **Upgrader**: Upgrades room controller
- **Builder**: Constructs structures
- **Repairer**: Repairs damaged structures
- **Defender**: Defends against hostile creeps
