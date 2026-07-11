var creepBodies = {

    build: function (roleName, energyBudget, harvesterCount) {
        switch (roleName) {
            case 'tank':
                return this.buildTankBody(energyBudget);
            case 'archer':
                return this.buildArcherBody(energyBudget);
            case 'healer':
                return this.buildHealerBody(energyBudget);
            case 'rogue':
                return this.buildRogueBody(energyBudget);
            default:
                return this.buildEconomyBody(energyBudget, harvesterCount);
        }
    },

    // Verbatim copy of the pre-refactor body logic from prototype.spawn.js so
    // harvester/upgrader/builder/repairer spawning behavior is unchanged.
    buildEconomyBody: function (energyPool, harvesterCount) {
        var desiredParts = [];
        if (energyPool < 400 || harvesterCount == 0) {
            desiredParts = [WORK, CARRY, CARRY, MOVE, MOVE];
        }
        else {
            var cycles = Math.floor(energyPool / 200);
            var maxCycles = Math.floor(MAX_CREEP_SIZE / 3);
            cycles = Math.min(cycles, maxCycles);

            for (var c = 0; c < cycles; c++) {
                desiredParts.push(WORK);
                desiredParts.push(MOVE);
                desiredParts.push(CARRY);
            }
        }
        return desiredParts;
    },

    // Front-loaded TOUGH (damage resolves part-by-part in body-array order, so
    // TOUGH absorbs hits before MOVE/ATTACK), roughly 60/20/20% of the energy
    // budget. Note this mobility ratio is deliberately tank-slow, not full-speed.
    buildTankBody: function (energyBudget) {
        var minCost = BODYPART_COST[TOUGH] + BODYPART_COST[MOVE] + BODYPART_COST[ATTACK];
        if (energyBudget < minCost) {
            return [];
        }

        var toughCount = Math.floor((energyBudget * 0.6) / BODYPART_COST[TOUGH]);
        var moveCount = Math.floor((energyBudget * 0.2) / BODYPART_COST[MOVE]);
        var attackCount = Math.floor((energyBudget * 0.2) / BODYPART_COST[ATTACK]);

        toughCount = Math.max(toughCount, 1);
        moveCount = Math.max(moveCount, 1);
        attackCount = Math.max(attackCount, 1);

        while (toughCount + moveCount + attackCount > MAX_CREEP_SIZE && toughCount > 1) {
            toughCount--;
        }

        var body = [];
        for (var t = 0; t < toughCount; t++) body.push(TOUGH);
        for (var m = 0; m < moveCount; m++) body.push(MOVE);
        for (var a = 0; a < attackCount; a++) body.push(ATTACK);
        return body;
    },

    // Alternating RANGED_ATTACK/MOVE for a 1:1 ratio (full speed on plain terrain).
    buildArcherBody: function (energyBudget) {
        var cycleCost = BODYPART_COST[RANGED_ATTACK] + BODYPART_COST[MOVE];
        if (energyBudget < cycleCost) {
            return [];
        }

        var maxCycles = Math.floor(MAX_CREEP_SIZE / 2);
        var cycles = Math.min(Math.floor(energyBudget / cycleCost), maxCycles);

        var body = [];
        for (var i = 0; i < cycles; i++) {
            body.push(RANGED_ATTACK);
            body.push(MOVE);
        }
        return body;
    },

    // Alternating HEAL/MOVE for a 1:1 ratio (full speed to keep up with the squad).
    buildHealerBody: function (energyBudget) {
        var cycleCost = BODYPART_COST[HEAL] + BODYPART_COST[MOVE];
        if (energyBudget < cycleCost) {
            return [];
        }

        var maxCycles = Math.floor(MAX_CREEP_SIZE / 2);
        var cycles = Math.min(Math.floor(energyBudget / cycleCost), maxCycles);

        var body = [];
        for (var i = 0; i < cycles; i++) {
            body.push(HEAL);
            body.push(MOVE);
        }
        return body;
    },

    // Intentionally capped small regardless of available energy - "light and
    // fast", not a scaled-down tank. Phase 2 may raise the cap once cross-room
    // scouting lands.
    buildRogueBody: function (energyBudget) {
        var templates = [
            [MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK],
            [MOVE, MOVE, ATTACK],
            [MOVE, ATTACK]
        ];

        for (var i = 0; i < templates.length; i++) {
            var cost = _.sum(templates[i], function (part) { return BODYPART_COST[part]; });
            if (energyBudget >= cost) {
                return templates[i];
            }
        }
        return [];
    }
};

module.exports = creepBodies;
