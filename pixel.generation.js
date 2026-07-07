function shouldGeneratePixel() {
    if (!Game.cpu || typeof Game.cpu.generatePixel !== 'function') {
        return false;
    }

    if (Game.cpu.bucket < 10000) {
        return false;
    }

    // Prevent frequent condition scans on every tick.
    if (Game.time % PIXEL_INTERVAL !== 0) {
        return false;
    }

    for (var roomName in Game.rooms) {
        var room = Game.rooms[roomName];

        if (!room.controller || !room.controller.my) {
            continue;
        }

        // Wait until owned controller reaches level 3.
        if (room.controller.level < 3) {
            continue;
        }

        var hostiles = room.find(FIND_HOSTILE_CREEPS);
        if (hostiles.length > 0) {
            continue;
        }

        // Ignore walls/ramparts because they are intentionally not kept at max hits.
        var damagedStructures = room.find(FIND_STRUCTURES, {
            filter: function (structure) {
                if (structure.structureType === STRUCTURE_WALL || structure.structureType === STRUCTURE_RAMPART) {
                    return false;
                }
                return structure.hits < structure.hitsMax;
            }
        });

        if (damagedStructures.length === 0) {
            return true;
        }
    }

    return false;
}