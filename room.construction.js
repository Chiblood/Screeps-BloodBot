var roomConstruction = {

    RUN_INTERVAL: 25,
    CPU_THRESHOLD: 10,
    MAX_SITES_PER_RUN: 3,
    ROAD_RCL: 2,
    STORAGE_RCL: 4,

    run: function() {
        if (!Memory.roomConstruction) {
            Memory.roomConstruction = {};
        }

        if ((Game.cpu.limit - Game.cpu.getUsed()) < this.CPU_THRESHOLD) {
            return;
        }

        if (Object.keys(Game.constructionSites).length >= MAX_CONSTRUCTION_SITES) {
            return;
        }

        for (var roomName in Game.rooms) {
            var room = Game.rooms[roomName];
            this.runRoom(room);
        }
    },

    runRoom: function(room) {
        if (!room || !room.controller || !room.controller.my) {
            return;
        }

        var controllerLevel = room.controller.level;
        if (controllerLevel < this.ROAD_RCL) {
            return;
        }

        var state = this.getRoomState(room.name);
        if (state.lastRun && state.plannedRcl === controllerLevel && (Game.time - state.lastRun) < this.RUN_INTERVAL) {
            return;
        }

        if ((Game.cpu.limit - Game.cpu.getUsed()) < this.CPU_THRESHOLD) {
            return;
        }

        var spawns = room.find(FIND_MY_SPAWNS);
        var sources = room.find(FIND_SOURCES);
        if (spawns.length === 0 || sources.length === 0) {
            return;
        }

        if (!state.plan || state.plannedRcl !== controllerLevel || !this.isPlanValid(room, state.plan)) {
            state.plan = this.createPlan(room, spawns, sources);
            state.plannedRcl = controllerLevel;
            state.lastPlannedAt = Game.time;

            if (!state.plan) {
                state.lastRun = Game.time;
                return;
            }

            console.log('[Construction] Refreshed plan for ' + room.name + ' at RCL ' + controllerLevel);
        }

        var createdSites = 0;
        createdSites += this.placeRoads(room, state.plan.roads, this.MAX_SITES_PER_RUN - createdSites);

        if (createdSites < this.MAX_SITES_PER_RUN) {
            createdSites += this.placeLimitedStructures(
                room,
                STRUCTURE_CONTAINER,
                state.plan.sourceContainers,
                CONTROLLER_STRUCTURES[STRUCTURE_CONTAINER][controllerLevel] || 0,
                this.MAX_SITES_PER_RUN - createdSites
            );
        }

        if (createdSites < this.MAX_SITES_PER_RUN) {
            createdSites += this.placeLimitedStructures(
                room,
                STRUCTURE_EXTENSION,
                state.plan.extensions,
                CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][controllerLevel] || 0,
                this.MAX_SITES_PER_RUN - createdSites
            );
        }

        if (controllerLevel >= this.STORAGE_RCL && createdSites < this.MAX_SITES_PER_RUN && state.plan.storage) {
            createdSites += this.placeLimitedStructures(
                room,
                STRUCTURE_STORAGE,
                [state.plan.storage],
                CONTROLLER_STRUCTURES[STRUCTURE_STORAGE][controllerLevel] || 0,
                this.MAX_SITES_PER_RUN - createdSites
            );
        }

        state.lastRun = Game.time;
    },

    getRoomState: function(roomName) {
        if (!Memory.roomConstruction[roomName]) {
            Memory.roomConstruction[roomName] = {};
        }

        return Memory.roomConstruction[roomName];
    },

    isPlanValid: function(room, plan) {
        if (!plan || !plan.upgraderAnchor || !plan.sourceContainers || plan.sourceContainers.length === 0) {
            return false;
        }

        var terrain = room.getTerrain();

        if (!this.isWalkable(room, plan.upgraderAnchor.x, plan.upgraderAnchor.y, terrain)) {
            return false;
        }

        for (var i = 0; i < plan.sourceContainers.length; i++) {
            var containerPos = plan.sourceContainers[i];
            if (!this.isWalkable(room, containerPos.x, containerPos.y, terrain)) {
                return false;
            }
        }

        return true;
    },

    createPlan: function(room, spawns, sources) {
        var terrain = room.getTerrain();
        var anchorSpawn = spawns[0];
        var upgraderAnchor = this.chooseUpgraderAnchor(room, anchorSpawn.pos, terrain);
        if (!upgraderAnchor) {
            return null;
        }

        var sourceContainers = this.chooseSourceContainers(room, sources, anchorSpawn.pos, terrain);
        if (sourceContainers.length === 0) {
            return null;
        }

        var roads = this.buildRoadPlan(room, anchorSpawn.pos, sourceContainers, upgraderAnchor);
        var reserved = this.createReservedMap(room, roads, sourceContainers, upgraderAnchor, null);
        var storage = this.chooseStoragePosition(room, anchorSpawn.pos, reserved, terrain);

        if (storage) {
            reserved[this.posKey(storage.x, storage.y)] = true;
        }

        var extensions = this.generateExtensionCandidates(room, anchorSpawn.pos, reserved, terrain);

        return {
            upgraderAnchor: upgraderAnchor,
            sourceContainers: sourceContainers,
            roads: roads,
            storage: storage,
            extensions: extensions
        };
    },

    chooseUpgraderAnchor: function(room, anchorPos, terrain) {
        if (!room.controller) {
            return null;
        }

        return this.findBestAdjacentPosition(room, room.controller.pos, anchorPos, null, terrain);
    },

    chooseSourceContainers: function(room, sources, anchorPos, terrain) {
        var positions = [];

        for (var i = 0; i < sources.length; i++) {
            var containerPos = this.findBestAdjacentPosition(room, sources[i].pos, anchorPos, positions, terrain);
            if (containerPos) {
                positions.push(containerPos);
            }
        }

        return positions;
    },

    findBestAdjacentPosition: function(room, targetPos, anchorPos, reservedPositions, terrain) {
        var bestPosition = null;
        var bestRange = Infinity;
        var reserved = {};

        if (reservedPositions) {
            for (var i = 0; i < reservedPositions.length; i++) {
                reserved[this.posKey(reservedPositions[i].x, reservedPositions[i].y)] = true;
            }
        }

        for (var dx = -1; dx <= 1; dx++) {
            for (var dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) {
                    continue;
                }

                var x = targetPos.x + dx;
                var y = targetPos.y + dy;
                if (x <= 0 || x >= 49 || y <= 0 || y >= 49) {
                    continue;
                }

                if (reserved[this.posKey(x, y)]) {
                    continue;
                }

                if (!this.isWalkable(room, x, y, terrain)) {
                    continue;
                }

                var range = anchorPos.getRangeTo(x, y);
                if (range < bestRange) {
                    bestRange = range;
                    bestPosition = { x: x, y: y };
                }
            }
        }

        return bestPosition;
    },

    buildRoadPlan: function(room, spawnPos, sourceContainers, upgraderAnchor) {
        var seen = {};
        var roads = [];

        for (var i = 0; i < sourceContainers.length; i++) {
            var sourceContainerPos = this.toRoomPosition(room.name, sourceContainers[i]);
            var upgraderAnchorPos = this.toRoomPosition(room.name, upgraderAnchor);

            this.appendPathPositions(room.findPath(spawnPos, sourceContainerPos, {
                ignoreCreeps: true,
                range: 0,
                maxRooms: 1
            }), seen, roads, {
                skipLast: true
            });

            this.appendPathPositions(room.findPath(sourceContainerPos, upgraderAnchorPos, {
                ignoreCreeps: true,
                range: 0,
                maxRooms: 1
            }), seen, roads);
        }

        return roads;
    },

    appendPathPositions: function(path, seen, output, options) {
        var limit = path.length;
        if (options && options.skipLast && limit > 0) {
            limit--;
        }

        for (var i = 0; i < limit; i++) {
            var step = path[i];
            var key = this.posKey(step.x, step.y);
            if (!seen[key]) {
                seen[key] = true;
                output.push({ x: step.x, y: step.y });
            }
        }
    },

    createReservedMap: function(room, roads, sourceContainers, upgraderAnchor, storage) {
        var reserved = {};

        for (var i = 0; i < roads.length; i++) {
            reserved[this.posKey(roads[i].x, roads[i].y)] = true;
        }

        for (var j = 0; j < sourceContainers.length; j++) {
            reserved[this.posKey(sourceContainers[j].x, sourceContainers[j].y)] = true;
        }

        if (upgraderAnchor) {
            reserved[this.posKey(upgraderAnchor.x, upgraderAnchor.y)] = true;
        }

        if (storage) {
            reserved[this.posKey(storage.x, storage.y)] = true;
        }

        if (room.controller) {
            reserved[this.posKey(room.controller.pos.x, room.controller.pos.y)] = true;
        }

        var sources = room.find(FIND_SOURCES);
        for (var k = 0; k < sources.length; k++) {
            reserved[this.posKey(sources[k].pos.x, sources[k].pos.y)] = true;
        }

        var spawns = room.find(FIND_MY_SPAWNS);
        for (var m = 0; m < spawns.length; m++) {
            reserved[this.posKey(spawns[m].pos.x, spawns[m].pos.y)] = true;
        }

        return reserved;
    },

    chooseStoragePosition: function(room, anchorPos, reserved, terrain) {
        var candidates = this.generateRingPositions(anchorPos, 2, 4);

        for (var i = 0; i < candidates.length; i++) {
            var candidate = candidates[i];
            var key = this.posKey(candidate.x, candidate.y);

            if (reserved[key]) {
                continue;
            }

            if (!this.isWalkable(room, candidate.x, candidate.y, terrain)) {
                continue;
            }

            if (this.evaluateTile(room, candidate.x, candidate.y, STRUCTURE_STORAGE).blocked) {
                continue;
            }

            return candidate;
        }

        return null;
    },

    generateExtensionCandidates: function(room, anchorPos, reserved, terrain) {
        var candidates = [];
        var positions = this.generateRingPositions(anchorPos, 2, 8);

        for (var i = 0; i < positions.length; i++) {
            var candidate = positions[i];
            var key = this.posKey(candidate.x, candidate.y);

            if (reserved[key]) {
                continue;
            }

            if (!this.isWalkable(room, candidate.x, candidate.y, terrain)) {
                continue;
            }

            if (this.evaluateTile(room, candidate.x, candidate.y, STRUCTURE_EXTENSION).blocked) {
                continue;
            }

            reserved[key] = true;
            candidates.push(candidate);
        }

        return candidates;
    },

    generateRingPositions: function(anchorPos, minRadius, maxRadius) {
        var positions = [];
        var seen = {};

        for (var radius = minRadius; radius <= maxRadius; radius++) {
            for (var dx = -radius; dx <= radius; dx++) {
                for (var dy = -radius; dy <= radius; dy++) {
                    if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) {
                        continue;
                    }

                    var x = anchorPos.x + dx;
                    var y = anchorPos.y + dy;
                    if (x <= 1 || x >= 48 || y <= 1 || y >= 48) {
                        continue;
                    }

                    var key = this.posKey(x, y);
                    if (!seen[key]) {
                        seen[key] = true;
                        positions.push({ x: x, y: y });
                    }
                }
            }
        }

        return positions;
    },

    placeRoads: function(room, positions, remainingBudget) {
        if (remainingBudget <= 0 || !positions || positions.length === 0) {
            return 0;
        }

        var created = 0;

        for (var i = 0; i < positions.length && created < remainingBudget; i++) {
            var position = positions[i];
            var occupancy = this.evaluateTile(room, position.x, position.y, STRUCTURE_ROAD);

            if (occupancy.alreadyPlaced || occupancy.blocked) {
                continue;
            }

            var result = room.createConstructionSite(position.x, position.y, STRUCTURE_ROAD);
            if (result === OK) {
                created++;
                console.log('[Construction] Road site placed in ' + room.name + ' at ' + position.x + ',' + position.y);
            }
            else if (result === ERR_FULL) {
                break;
            }
        }

        return created;
    },

    placeLimitedStructures: function(room, structureType, plannedPositions, allowedCount, remainingBudget) {
        if (remainingBudget <= 0 || allowedCount <= 0 || !plannedPositions || plannedPositions.length === 0) {
            return 0;
        }

        var existingCount = this.countStructuresAndSites(room, structureType);
        if (existingCount >= allowedCount) {
            return 0;
        }

        var created = 0;
        var missingAllowed = Math.min(allowedCount - existingCount, remainingBudget);

        for (var i = 0; i < plannedPositions.length && created < missingAllowed; i++) {
            var position = plannedPositions[i];
            var occupancy = this.evaluateTile(room, position.x, position.y, structureType);

            if (occupancy.alreadyPlaced || occupancy.blocked) {
                continue;
            }

            var result = room.createConstructionSite(position.x, position.y, structureType);
            if (result === OK) {
                created++;
                console.log('[Construction] ' + structureType + ' site placed in ' + room.name + ' at ' + position.x + ',' + position.y);
            }
            else if (result === ERR_FULL) {
                break;
            }
        }

        return created;
    },

    countStructuresAndSites: function(room, structureType) {
        var structures = room.find(FIND_STRUCTURES, {
            filter: function(structure) {
                return structure.structureType === structureType;
            }
        }).length;

        var sites = room.find(FIND_CONSTRUCTION_SITES, {
            filter: function(site) {
                return site.structureType === structureType;
            }
        }).length;

        return structures + sites;
    },

    // Single lookForAt pass per layer (structures + sites) that answers both
    // "is this exact structure already here" and "is something incompatible
    // occupying this tile" in one go, instead of the two separate helpers
    // this replaces, which each re-ran both lookForAt calls independently.
    evaluateTile: function(room, x, y, structureType) {
        var alreadyPlaced = false;
        var blocked = false;

        var structures = room.lookForAt(LOOK_STRUCTURES, x, y);
        for (var i = 0; i < structures.length; i++) {
            var existingType = structures[i].structureType;
            if (existingType === structureType) {
                alreadyPlaced = true;
            } else if (!this.canShareTile(existingType, structureType)) {
                blocked = true;
            }
        }

        var sites = room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y);
        for (var j = 0; j < sites.length; j++) {
            if (sites[j].structureType === structureType) {
                alreadyPlaced = true;
            } else {
                blocked = true;
            }
        }

        return { alreadyPlaced: alreadyPlaced, blocked: blocked };
    },

    canShareTile: function(existingType, plannedType) {
        if (existingType === plannedType) {
            return true;
        }

        if (existingType === STRUCTURE_RAMPART) {
            return true;
        }

        if ((existingType === STRUCTURE_ROAD && plannedType === STRUCTURE_CONTAINER) ||
            (existingType === STRUCTURE_CONTAINER && plannedType === STRUCTURE_ROAD)) {
            return true;
        }

        return false;
    },

    isWalkable: function(room, x, y, terrain) {
        var roomTerrain = terrain || room.getTerrain();
        if (roomTerrain.get(x, y) === TERRAIN_MASK_WALL) {
            return false;
        }

        var structures = room.lookForAt(LOOK_STRUCTURES, x, y);
        for (var i = 0; i < structures.length; i++) {
            if (structures[i].structureType !== STRUCTURE_ROAD &&
                structures[i].structureType !== STRUCTURE_CONTAINER &&
                structures[i].structureType !== STRUCTURE_RAMPART) {
                return false;
            }
        }

        return true;
    },

    toRoomPosition: function(roomName, position) {
        return new RoomPosition(position.x, position.y, roomName);
    },

    posKey: function(x, y) {
        return x + ':' + y;
    }
};

module.exports = roomConstruction;