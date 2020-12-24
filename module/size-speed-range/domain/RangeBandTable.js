export class RangeBandTable {
    static table() {
        return [
            {
                band: "Close",
                maxDistanceYards: 5,
                penalty: 0,
                description: "Can touch or strike foe"
            },
            {
                band: "Short",
                maxDistanceYards: 20,
                penalty: -3,
                description: "Can talk to foe; pistol or muscle-powered missile range"
            },
            {
                band: "Medium",
                maxDistanceYards: 100,
                penalty: -7,
                description: "Can only shout to foe; shotgun or SMG range"
            },
            {
                band: "Long",
                maxDistanceYards: 500,
                penalty: -11,
                description: "Opponent out of earshot; rifle range"
            },
            {
                band: "Extreme",
                maxDistanceYards: "500+",
                penalty: -15,
                description: "Rival difficult to even see; sniper range"
            }
        ];
    }

    static yardsToPenalty(yards) {
        for (const range of RangeBandTable.table()) {
            // Handles last distance being "500+"
            if (typeof range.maxDistanceYards === 'string') {
                return range.penalty;
            }

            if (yards <= range.maxDistanceYards) {
                return range.penalty;
            }
        }
    }
}