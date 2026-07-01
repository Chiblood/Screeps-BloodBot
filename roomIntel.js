var roomIntel = {
    
// How often to refresh room data (in ticks)
SCAN_INTERVAL: 500,
    
// CPU threshold - only scan if we have this much CPU remaining
CPU_THRESHOLD: 10,
    
    // Initialize Memory structure if it doesn't exist
    init: function() {
        if (!Memory.intel) {
            Memory.intel = {
                rooms: {},
                lastGlobalScan: 0
            };
        }
    },
    
    // Scan a specific room and cache the data
    scanRoom: function(roomName) {
        var room = Game.rooms[roomName];
        if (!room) {
            console.log('[Intel] Cannot scan room ' + roomName + ' - no vision');
            return null;
        }
        
        var sources = room.find(FIND_SOURCES);
        var minerals = room.find(FIND_MINERALS);
        var controller = room.controller;
        var hostiles = room.find(FIND_HOSTILE_CREEPS);
        var hostileStructures = room.find(FIND_HOSTILE_STRUCTURES);
        
        var roomData = {
            name: roomName,
            scannedAt: Game.time,
            
            // Source information
            sources: sources.map(s => ({
                id: s.id,
                pos: { x: s.pos.x, y: s.pos.y },
                energyCapacity: s.energyCapacity
            })),
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
    
    // Determine room status
    getRoomStatus: function(room, controller, hostiles) {
        if (hostiles.length > 0) return 'hostile';
        if (!controller) return 'highway';
        if (controller.my) return 'owned';
        if (controller.owner) return 'enemy';
        if (controller.reservation && controller.reservation.username === 'YourUsername') return 'reserved';
        return 'neutral';
    },
    
    // Get cached room data
    getRoomData: function(roomName) {
        this.init();
        if (Memory.intel.rooms && Memory.intel.rooms[roomName]) {
            return Memory.intel.rooms[roomName];
        }
        return null;
    },
    
    // Get all nearby room names (Screeps room naming convention)
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
    
    // Parse room name (e.g., "W1N1" -> {x: 1, xDir: 'W', y: 1, yDir: 'N'})
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
    
    // Build room name from coordinates
    buildRoomName: function(x, xDir, y, yDir) {
        return xDir + x + yDir + y;
    },
    
    // Calculate linear distance between two rooms
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
    
    // Get all scanned rooms with optional filters
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
    
    // Update intel for all visible rooms
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
    
    // CPU-aware update - only scans if CPU is available
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
    
    // Smart update - prioritizes stale data and stops when CPU runs low
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
    
    // Generate a report of nearby rooms
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