const naturalHealingTable = [
    {
        severity: -6,
        days: 1
    },
    {
        severity: -5,
        days: 1.5
    },
    {
        severity: -4,
        days: 2
    },
    {
        severity: -3,
        days: 5
    },
    {
        severity: -2,
        days: 7
    },
    {
        severity: -1,
        days: 10
    },
    {
        severity: 0,
        days: 14
    },
    {
        severity: 1,
        days: 21
    },
    {
        severity: 2,
        days: 35
    },
    {
        severity: 3,
        days: 49
    },
    {
        severity: 4,
        days: 70
    },
    {
        severity: 5,
        days: 105
    },
];

export const daysToHealForSeverity = severity => {
    // gotta love untyped languages
    if (severity < -6 || !severity) {
        return 0;
    }

    severity = parseInt(severity, 10);

    for (const row of naturalHealingTable) {
        if (severity === row.severity) {
            return row.days;
        }
    }

    return null;
};

export const severityForDaysToHeal = days => {
    if (days <= 0 || !days) {
        return null;
    }

    days = parseInt(days, 10);

    for (const row of naturalHealingTable) {
        if (days <= row.days) {
            return row.severity;
        }
    }

    return 5;
}

export const conditionalEffectsTable = [
    {
//        severity: "",
        grossEffects: "None",
        shock: null,
        pain: null,
    },
    {
        severity: -6,
        grossEffects: "Scratch",
        shock: -1,
        pain: "Mild Pain",
    },
    {
        severity: -5,
        grossEffects: "Minor Wound",
        shock: -1,
        pain: "Mild Pain",
    },
    {
        severity: -4,
        grossEffects: "Minor Wound",
        shock: -2,
        pain: "Moderate Pain",
    },
    {
        severity: -3,
        grossEffects: "Minor Wound",
        shock: -2,
        pain: "Moderate Pain",
    },
    {
        severity: -2,
        grossEffects: "Major Wound",
        shock: -4,
        pain: "Severe Pain",
    },
    {
        severity: -1,
        grossEffects: "Reeling",
        shock: -4,
        pain: "Terrible Pain",
    },
    {
        severity: 0,
        grossEffects: "Crippled",
        shock: -4,
        pain: "Agony",
    },
    {
        severity: 1,
        grossEffects: "Crippled",
        shock: -4,
        pain: "Agony",
    },
    {
        severity: 2,
        grossEffects: "Mortal Wound",
        shock: -4,
        pain: "Agony",
    },
    {
        severity: 3,
        grossEffects: "Mortal Wound",
        shock: -4,
        pain: "Agony",
    },
    {
        severity: 4,
        grossEffects: "Instantly Fatal",
        shock: -4,
        pain: "Agony",
    },
    {
        severity: 5,
        grossEffects: "Instantly Fatal",
        shock: -4,
        pain: "Agony",
    },
    {
        severity: "6+",
        grossEffects: "Total Destruction",
        shock: null,
        pain: null,
    },
];

export const grossEffectsForSeverity = severity => {
    // gotta love untyped languages
    if (severity < -6 || severity === "" || severity === null || severity === undefined) {
        return "None";
    }

    severity = parseInt(severity, 10);

    for (const row of conditionalEffectsTable) {
        if (severity === row.severity) {
            return row.grossEffects;
        }
    }

    return "Total Destruction";
};

export const incrementSeverity = severity => {
    if (severity === "" || severity === null || severity === undefined) {
        return -6;
    }

    let incrementedSeverity = parseInt(severity, 10) + 1;

    return incrementedSeverity > 6 ? 6 : incrementedSeverity;
}

export const decrementSeverity = severity => {
    if (severity === "" || severity === null || severity === undefined || severity == -6) {
        return null;
    }

    let decrementedSeverity = parseInt(severity, 10) - 1;

    if (decrementedSeverity > 6) {
        decrementedSeverity = 6;
    }

    return decrementedSeverity < -6 ? -6 : decrementedSeverity;
}

export const incrementDaysToHeal = (days, delta = 1) => {
    if (days === "" || days === null || days === undefined) {
        days = 0;
    }

    return parseInt(days, 10) + delta;
}

export const decrementDaysToHeal = (days, delta = 1) => {
    if (days === "" || days === null || days === undefined) {
        days = 0;
    }

    const decrementedDays = parseInt(days, 10) - delta;

    return decrementedDays < 0 ? 0 : decrementedDays;
}

export const setSeverity = severity => {
    if (severity === "" || severity === null || severity === undefined) {
        return null;
    }

    severity = parseInt(severity, 10);

    if (severity < -6) {
        return -6;
    }

    return severity > 6 ? 6 : severity;
}

export const setDaysToHeal = days => {
    if (days === "" || days === null || days === undefined) {
        return 0;
    }

    days = parseInt(days, 10);

    return days < 0 ? 0 : days;
}