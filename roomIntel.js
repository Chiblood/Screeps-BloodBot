var sourceIntel = require('sourceIntel');

var roomIntel = {
    
// How often to refresh room data (in ticks)
SCAN_INTERVAL: 500,
    
// CPU threshold - only scan if we have this much CPU remaining
CPU_THRESHOLD: 10,

    /**
     * Initialize intel/source memory structures when missing.
     * @returns {void}
     */
    init: function() {
        if (!Memory.intel) {
            Memory.intel = {
                rooms: {},
                lastGlobalScan: 0
            };
        }
        sourceIntel.initMemory();
    },
    
    /**
     * Scan a room with vision and cache the snapshot in Memory.intel.
     * @param {string} roomName Room name to scan.
     * @returns {Object|null} Cached room intel or null if room is not visible.
     */
    scanRoom: function(roomName) {
        var room = Game.rooms[roomName];
        if (!room) {
            console.log('[Intel] Cannot scan room ' + roomName + ' - no vision');
            return null;
        }

        this.init();
        
        var sources = room.find(FIND_SOURCES);
        var sourceData = sourceIntel.buildSourceData(room, roomName, Game.time, this.getRoomDistance.bind(this));
        var minerals = room.find(FIND_MINERALS);
        var controller = room.controller;
        var hostiles = room.find(FIND_HOSTILE_CREEPS);
        var hostileStructures = room.find(FIND_HOSTILE_STRUCTURES);
        
        var roomData = {
            name: roomName,
            scannedAt: Game.time,
            
            // Source information
            sources: sourceData,
            sourceCount: sources.length,
            
            // Mineral information
            minerals: minerals.map(m => ({
                id: m.id,
                mineralType: m.mineralType,
                pos: { x: m.pos.x, y: m.pos.y },
                mineralAmount: m.mineralAmount
            })),
            
            // Controller information
            controller: controller ? {
                id: controller.id,
                level: controller.level,
                pos: { x: controller.pos.x, y: controller.pos.y },
                my: controller.my,
                owner: controller.owner ? controller.owner.username : null,
                reservation: controller.reservation ? {
                    username: controller.reservation.username,
                    ticksToEnd: controller.reservation.ticksToEnd
                } : null
            } : null,
            
            // Threat assessment
            hostiles: {
                creeps: hostiles.length,
                structures: hostileStructures.length,
                hasThreat: (hostiles.length > 0 || hostileStructures.length > 0)
            },
            
            // Room status
            status: this.getRoomStatus(room, controller, hostiles)
        };
        
        // Store in memory
        if (!Memory.intel.rooms) {
            Memory.intel.rooms = {};
        }
        Memory.intel.rooms[roomName] = roomData;
        
        return roomData;
    },

    /**
     * Return canonical source intel array for a room.
     * @param {string} roomName Room to read from intel.
     * @returns {Object[]} Source intel entries for the room.
     */
    getRoomSources: function(roomName) {
        this.init();
        var roomData = this.getRoomData(roomName);
        if (roomData && roomData.sources) {
            return roomData.sources;
        }

        if (Game.rooms[roomName]) {
            var scanned = this.scanRoom(roomName);
            if (scanned && scanned.sources) {
                return scanned.sources;
            }
        }

        return [];
    },

    /**
     * Return source intel with live override values applied.
     * @param {string} roomName Room to build effective source list for.
     * @returns {Object[]} Effective source intel entries.
     */
    getEffectiveSources: function(roomName) {
        var canonicalSources = this.getRoomSources(roomName);
        return sourceIntel.getEffectiveSources(roomName, canonicalSources, this.getRoomDistance.bind(this));
    },
    
    /**
     * Determine high-level room status for reporting.
     * @param {Room} room Visible room object.
     * @param {StructureController|null} controller Room controller, if present.
     * @param {Creep[]} hostiles Hostile creeps currently detected.
     * @returns {string} Status value: hostile/highway/owned/enemy/reserved/neutral.
     */
    getRoomStatus: function(room, controller, hostiles) {
        if (hostiles.length > 0) return 'hostile';
        if (!controller) return 'highway';
        if (controller.my) return 'owned';
        if (controller.owner) return 'enemy';
        if (controller.reservation && controller.reservation.username === 'YourUsername') return 'reserved';
        return 'neutral';
    },
    
    /**
     * Read cached room intel from memory.
     * @param {string} roomName Room name key.
     * @returns {Object|null} Cached intel entry or null.
     */
    getRoomData: function(roomName) {
        this.init();
        if (Memory.intel.rooms && Memory.intel.rooms[roomName]) {
            return Memory.intel.rooms[roomName];
        }
        return null;
    },
    
    /**
     * Build a square list of nearby room names around a center room.
     * @param {string} roomName Center room name.
     * @param {number} range Radius in room coordinates.
     * @returns {string[]} Room names in range.
     */
    getNearbyRoomNames: function(roomName, range) {
        var rooms = [];
        var parsed = this.parseRoomName(roomName);
        if (!parsed) return rooms;
        
        for (var dx = -range; dx <= range; dx++) {
            for (var dy = -range; dy <= range; dy++) {
                var newX = parsed.x + dx;
                var newY = parsed.y + dy;
                var newRoom = this.buildRoomName(newX, parsed.xDir, newY, parsed.yDir);
                rooms.push(newRoom);
            }
        }
        return rooms;
    },
    
    /**
     * Parse a room name into directional coordinate parts.
     * @param {string} roomName Room name like W1N1.
     * @returns {{xDir: string, x: number, yDir: string, y: number}|null} Parsed room parts or null when invalid.
     */
    parseRoomName: function(roomName) {
        var match = roomName.match(/^([WE])(\d+)([NS])(\d+)$/);
        if (!match) return null;
        return {
            xDir: match[1],
            x: parseInt(match[2]),
            yDir: match[3],
            y: parseInt(match[4])
        };
    },
    
    /**
     * Build room name from directional coordinate pieces.
     * @param {number} x X coordinate value.
     * @param {string} xDir X direction (W/E).
     * @param {number} y Y coordinate value.
     * @param {string} yDir Y direction (N/S).
     * @returns {string} Room name.
     */
    buildRoomName: function(x, xDir, y, yDir) {
        return xDir + x + yDir + y;
    },
    
    /**
     * Calculate linear room distance between two room names.
     * @param {string} roomName1 Origin room.
     * @param {string} roomName2 Destination room.
     * @returns {number} Linear distance or Infinity for invalid room names.
     */
    getRoomDistance: function(roomName1, roomName2) {
        var parsed1 = this.parseRoomName(roomName1);
        var parsed2 = this.parseRoomName(roomName2);
        if (!parsed1 || !parsed2) return Infinity;
        
        var x1 = parsed1.xDir === 'W' ? -parsed1.x : parsed1.x;
        var y1 = parsed1.yDir === 'N' ? parsed1.y : -parsed1.y;
        var x2 = parsed2.xDir === 'W' ? -parsed2.x : parsed2.x;
        var y2 = parsed2.yDir === 'N' ? parsed2.y : -parsed2.y;
        
        return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
    },
    
    /**
     * Return cached scanned rooms with optional filtering.
     * @param {{status?: string, minSources?: number, maxDistance?: number, fromRoom?: string}=} filters Optional room filters.
     * @returns {Object[]} Matching room intel entries.
     */
    getScannedRooms: function(filters) {
        this.init();
        var rooms = [];
        
        for (var roomName in Memory.intel.rooms) {
            var roomData = Memory.intel.rooms[roomName];
            
            // Apply filters if provided
            if (filters) {
                if (filters.status && roomData.status !== filters.status) continue;
                if (filters.minSources && roomData.sourceCount < filters.minSources) continue;
                if (filters.maxDistance && filters.fromRoom) {
                    var distance = this.getRoomDistance(filters.fromRoom, roomName);
                    if (distance > filters.maxDistance) continue;
                }
            }
            
            rooms.push(roomData);
        }
        
        return rooms;
    },
    
    /**
     * Refresh stale intel for visible rooms.
     * @returns {void}
     */
    updateVisibleRooms: function() {
        this.init();
        var scannedCount = 0;
        
        for (var roomName in Game.rooms) {
            var cached = this.getRoomData(roomName);
            
            // Scan if: no cached data, or data is stale
            if (!cached || (Game.time - cached.scannedAt) > this.SCAN_INTERVAL) {
                this.scanRoom(roomName);
                scannedCount++;
            }
        }
        
        if (scannedCount > 0) {
            console.log('[Intel] Scanned ' + scannedCount + ' rooms');
        }
        
        Memory.intel.lastGlobalScan = Game.time;
    },
    
    /**
     * Refresh visible rooms when sufficient CPU headroom is available.
     * @param {number=} cpuThreshold Minimum CPU headroom required.
     * @returns {{skipped?: boolean, reason?: string, cpuAvailable?: number, threshold?: number, scanned?: number, cpuCost?: number}}
     */
    updateVisibleRoomsIfCPU: function(cpuThreshold) {
        var threshold = cpuThreshold || this.CPU_THRESHOLD;
        var cpuUsed = Game.cpu.getUsed();
        var cpuAvailable = Game.cpu.limit - cpuUsed;
        
        // Check if we have enough CPU headroom
        if (cpuAvailable < threshold) {
            return { 
                skipped: true, 
                reason: 'Insufficient CPU',
                cpuAvailable: cpuAvailable,
                threshold: threshold
            };
        }
        
        // Track CPU usage for this operation
        var startCpu = Game.cpu.getUsed();
        this.init();
        var scannedCount = 0;
        
        for (var roomName in Game.rooms) {
            // Check CPU before each scan
            var currentCpu = Game.cpu.getUsed();
            if ((Game.cpu.limit - currentCpu) < threshold) {
                console.log('[Intel] Stopped scanning - CPU limit approaching');
                break;
            }
            
            var cached = this.getRoomData(roomName);
            
            // Scan if: no cached data, or data is stale
            if (!cached || (Game.time - cached.scannedAt) > this.SCAN_INTERVAL) {
                this.scanRoom(roomName);
                scannedCount++;
            }
        }
        
        var cpuCost = Game.cpu.getUsed() - startCpu;
        
        if (scannedCount > 0) {
            console.log('[Intel] Scanned ' + scannedCount + ' rooms (CPU: ' + cpuCost.toFixed(2) + ')');
        }
        
        Memory.intel.lastGlobalScan = Game.time;
        
        return {
            scanned: scannedCount,
            cpuCost: cpuCost,
            cpuAvailable: cpuAvailable
        };
    },
    
    /**
     * Prioritize oldest intel first and stop scanning when CPU gets low.
     * @param {number=} cpuThreshold Minimum CPU headroom required.
     * @returns {{skipped?: boolean, reason?: string, scanned?: number, queued?: number, cpuCost?: number}}
     */
    updateWithPriority: function(cpuThreshold) {
        var threshold = cpuThreshold || this.CPU_THRESHOLD;
        var cpuUsed = Game.cpu.getUsed();
        var cpuAvailable = Game.cpu.limit - cpuUsed;
        
        if (cpuAvailable < threshold) {
            return { skipped: true, reason: 'Insufficient CPU' };
        }
        
        this.init();
        var startCpu = Game.cpu.getUsed();
        var scannedCount = 0;
        
        // Build priority list (oldest scans first)
        var scanQueue = [];
        for (var roomName in Game.rooms) {
            var cached = this.getRoomData(roomName);
            var age = cached ? (Game.time - cached.scannedAt) : Infinity;
            
            if (!cached || age > this.SCAN_INTERVAL) {
                scanQueue.push({ room: roomName, age: age });
            }
        }
        
        // Sort by age (oldest first)
        scanQueue.sort(function(a, b) { return b.age - a.age; });
        
        // Scan until we run low on CPU
        for (var i = 0; i < scanQueue.length; i++) {
            var currentCpu = Game.cpu.getUsed();
            if ((Game.cpu.limit - currentCpu) < threshold) {
                console.log('[Intel] CPU limit reached after ' + scannedCount + ' scans');
                break;
            }
            
            this.scanRoom(scanQueue[i].room);
            scannedCount++;
        }
        
        var cpuCost = Game.cpu.getUsed() - startCpu;
        
        if (scannedCount > 0) {
            console.log('[Intel] Priority scan: ' + scannedCount + ' rooms (CPU: ' + cpuCost.toFixed(2) + ')');
        }
        
        Memory.intel.lastGlobalScan = Game.time;
        
        return {
            scanned: scannedCount,
            queued: scanQueue.length,
            cpuCost: cpuCost
        };
    },
    
    /**
     * Print a console report of nearby room intel.
     * @param {string} homeRoom Origin room for distance calculations.
     * @param {number} range Range of nearby rooms to include.
     * @returns {Array<{room: string, distance: number, data: Object}>} Report rows for scanned rooms.
     */
    generateReport: function(homeRoom, range) {
        this.init();
        var nearbyRooms = this.getNearbyRoomNames(homeRoom, range);
        var report = [];
        
        console.log('===== Room Intel Report =====');
        console.log('Home Room: ' + homeRoom);
        console.log('Scan Range: ' + range);
        console.log('');
        
        for (var i = 0; i < nearbyRooms.length; i++) {
            var roomName = nearbyRooms[i];
            var data = this.getRoomData(roomName);
            var distance = this.getRoomDistance(homeRoom, roomName);
            
            if (data) {
                var minerals = data.minerals.map(m => m.mineralType).join(', ');
                console.log(roomName + ' [' + distance + ' rooms away]');
                console.log('  Status: ' + data.status);
                console.log('  Sources: ' + data.sourceCount);
                console.log('  Minerals: ' + (minerals || 'none'));
                if (data.controller) {
                    console.log('  Controller: RCL ' + data.controller.level + 
                               (data.controller.owner ? ' (owned by ' + data.controller.owner + ')' : ''));
                }
                if (data.hostiles.hasThreat) {
                    console.log('  ?? HOSTILES DETECTED: ' + data.hostiles.creeps + ' creeps');
                }
                console.log('  Last scanned: ' + (Game.time - data.scannedAt) + ' ticks ago');
                console.log('');
                
                report.push({
                    room: roomName,
                    distance: distance,
                    data: data
                });
            } else {
                console.log(roomName + ' [' + distance + ' rooms away] - Not scanned yet');
                console.log('');
            }
        }
        
        console.log('=============================');
        return report;
    }
};

module.exports = roomIntel;