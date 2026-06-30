var sourceIntel = {
    MIN_DESIRED_CREEPS: 1,

    /**
     * Initialize source override memory bucket if missing.
     * @returns {void}
     */
    initMemory: function() {
        if (!Memory.sourceConfig) {
            Memory.sourceConfig = {};
        }
    },

    /**
     * Resolve home room used for source desired-creep calculations.
     * @param {string=} fallbackRoomName Fallback room when no configured home exists.
     * @returns {string|null} Home room name or null.
     */
    getHomeRoomName: function(fallbackRoomName) {
        if (Memory.homeRoomName) {
            return Memory.homeRoomName;
        }

        for (var spawnName in Game.spawns) {
            var spawn = Game.spawns[spawnName];
            if (spawn && spawn.room && spawn.room.name) {
                return spawn.room.name;
            }
        }

        return fallbackRoomName || null;
    },

    /**
     * Fetch per-source override config by source id.
     * @param {string} sourceId Source id key.
     * @returns {Object|null} Override config object or null.
     */
    getSourceOverride: function(sourceId) {
        if (!Memory.sourceConfig || !sourceId) {
            return null;
        }
        return Memory.sourceConfig[sourceId] || null;
    },

    /**
     * Compute desired creeps for a source using override or formula.
     * @param {string} roomName Room containing the source.
     * @param {string} sourceId Source id.
     * @param {number} freeSlots Walkable adjacent tiles around source.
     * @param {string=} homeRoomName Pre-resolved home room.
     * @param {(function(string, string): number)} getRoomDistance Distance callback.
     * @returns {number} Desired creeps for this source.
     */
    getDesiredCreepsForSource: function(roomName, sourceId, freeSlots, homeRoomName, getRoomDistance) {
        var override = this.getSourceOverride(sourceId);
        if (override && typeof override.desiredCreepsOverride === 'number') {
            return override.desiredCreepsOverride;
        }

        var home = homeRoomName || this.getHomeRoomName(roomName) || roomName;
        var roomDistance = getRoomDistance(home, roomName);
        var safeDistance = Number.isFinite(roomDistance) ? roomDistance : 0;
        return Math.max(this.MIN_DESIRED_CREEPS, freeSlots + safeDistance);
    },

    /**
     * Count walkable tiles around a source in a 3x3 neighborhood.
     * @param {Room} room Room containing the source.
     * @param {RoomPosition} sourcePos Source position.
     * @returns {number} Number of non-wall adjacent tiles.
     */
    getFreeSlotsAroundSource: function(room, sourcePos) {
        var freeSlots = 0;
        var terrain = room.getTerrain ? room.getTerrain() : null;

        for (var dx = -1; dx <= 1; dx++) {
            for (var dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) {
                    continue;
                }

                var x = sourcePos.x + dx;
                var y = sourcePos.y + dy;
                if (x < 0 || x > 49 || y < 0 || y > 49) {
                    continue;
                }

                var isWall = false;
                if (terrain) {
                    isWall = terrain.get(x, y) === TERRAIN_MASK_WALL;
                } else {
                    var terrainAt = room.lookForAt(LOOK_TERRAIN, x, y);
                    isWall = terrainAt && terrainAt[0] === 'wall';
                }

                if (!isWall) {
                    freeSlots++;
                }
            }
        }

        return freeSlots;
    },

    /**
     * Build canonical source intel rows for a room snapshot.
     * @param {Room} room Room to inspect.
     * @param {string} roomName Name of room.
     * @param {number} gameTime Current game tick.
     * @param {(function(string, string): number)} getRoomDistance Distance callback.
     * @returns {Object[]} Canonical source intel rows.
     */
    buildSourceData: function(room, roomName, gameTime, getRoomDistance) {
        var sources = room.find(FIND_SOURCES);
        var homeRoomName = this.getHomeRoomName(roomName) || roomName;
        var roomDistance = getRoomDistance(homeRoomName, roomName);

        return sources.map(function(source) {
            var freeSlots = this.getFreeSlotsAroundSource(room, source.pos);
            return {
                id: source.id,
                pos: { x: source.pos.x, y: source.pos.y },
                energyCapacity: source.energyCapacity,
                freeSlots: freeSlots,
                desiredCreeps: this.getDesiredCreepsForSource(roomName, source.id, freeSlots, homeRoomName, getRoomDistance),
                computedFrom: {
                    homeRoom: homeRoomName,
                    roomDistance: roomDistance,
                    scannedAt: gameTime
                }
            };
        }, this);
    },

    /**
     * Apply source overrides to canonical source intel rows.
     * @param {string} roomName Room name for formula inputs.
     * @param {Object[]} canonicalSources Canonical source rows.
     * @param {(function(string, string): number)} getRoomDistance Distance callback.
     * @returns {Object[]} Effective source rows with overrides applied.
     */
    getEffectiveSources: function(roomName, canonicalSources, getRoomDistance) {
        var homeRoomName = this.getHomeRoomName(roomName) || roomName;
        var roomDistance = getRoomDistance(homeRoomName, roomName);
        var safeDistance = Number.isFinite(roomDistance) ? roomDistance : 0;

        return canonicalSources.map(function(source) {
            var freeSlots = typeof source.freeSlots === 'number' ? source.freeSlots : this.MIN_DESIRED_CREEPS;
            var desiredCreeps = this.getDesiredCreepsForSource(roomName, source.id, freeSlots, homeRoomName, getRoomDistance);
            return {
                id: source.id,
                pos: source.pos,
                energyCapacity: source.energyCapacity,
                freeSlots: freeSlots,
                desiredCreeps: desiredCreeps,
                computedFrom: {
                    homeRoom: homeRoomName,
                    roomDistance: safeDistance,
                    scannedAt: source.computedFrom && source.computedFrom.scannedAt ? source.computedFrom.scannedAt : null
                }
            };
        }, this);
    }
};

module.exports = sourceIntel;
