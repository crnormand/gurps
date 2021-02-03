import * as CI from "../domain/ConditionalInjury.js";

const SYSTEM_NAME = 'gurps'
const SETTING_NAME = 'useConditionalInjury'

export default class GURPSConditionalInjury {
    constructor() {
        let self = this;

        Hooks.once('init', async function () {
            game.GURPS = GURPS;

            Handlebars.registerHelper('ciSeveritiesTooltip', self.severitiesTooltip)
            Handlebars.registerHelper('ciCurrentGrossEffects', self.currentGrossEffects)

            game.settings.register(SYSTEM_NAME, SETTING_NAME, {
                name: 'Use Conditional Injury instead of HP',
                hint: 'From Pyramid #3/120: Conditional Injury removes Hit Points from the game as the basis for wound tracking, and replaces them with an effects based method for injury.',
                scope: 'world',
                config: true,
                type: Boolean,
                default: false,
                onChange: value => self.update()
            })
        })
    }

    async update() {
        // FYI render all open apps
        Object.values(ui.windows).filter(it => it.rendered).forEach(app => app.render(true))
    }

    isInUse = () => game.settings.get(SYSTEM_NAME, SETTING_NAME);

		conditionalEffectsTable = () => { return CI.conditionalEffectsTable };

    severitiesTooltip = opt => {
        const data = CI.conditionalEffectsTable.map(row => ({ severity: row.severity, label: row.grossEffects}));
        data.forEach(row => {
            if (row.severity === "-7 or less") {
                row.severity = "<= -7";
            }

            if (row.severity === "6 or more") {
                row.severity = ">= 6";
            }
        })

        let results = ''
        data.forEach((item) => {
            results += opt.fn(item)
        })
        return results
    };

    currentGrossEffects = (severity, field) => {
        const result = {
            label: CI.grossEffectsForSeverity(severity)
        };

        if (severity < -1 || severity === "" || severity === null || severity === undefined) {
            result.style = "normal";
        }

        severity = parseInt(severity, 10);

        if (severity === -1) {
            result.style = "reeling";
        }

        if (severity >= 0 && severity <= 1) {
            result.style = "collapse";
        }

        if (severity >= 2 && severity <= 3) {
            result.style = "check";
        }

        if (severity >= 4 && severity <= 5) {
            result.style = "dead";
        }

        if (severity >= 6) {
            result.style = "destroyed";
        }

        return result[field];
    };
}