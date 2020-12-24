'use strict';

import {displayMod} from '../../../lib/utilities.js';
import {SSRT} from '../../../lib/gurps-foundry-ssrt-lib/src/js/SSRT.js';
import {RangeBandTable} from '../domain/RangeBandTable.js';
import convertToYards from '../../../lib/gurps-foundry-ssrt-lib/src/js/UnitsOfMeasure/Conversion.js';
import parseDistance from '../../../lib/gurps-foundry-ssrt-lib/src/js/Parsing.js';
import * as conversionMethods from '../../../lib/gurps-foundry-ssrt-lib/src/js/UnitsOfMeasure/Methods.js';

const SYSTEM_NAME = 'gurps';
const SETTING_NAME = 'rangeStrategy';
const STRATEGY_STANDARD = 'Standard';
const STRATEGY_RANGE_BANDS = 'Simplified';

const getStrategy = () => game.settings.get(SYSTEM_NAME, SETTING_NAME);

const simplifiedRangeTable = RangeBandTable.table().map(row => ({
    moddesc: `${row.band} range (${row.maxDistanceYards} yds)`,
    max: row.maxDistanceYards,
    penalty: row.penalty,
    desc: row.description
}));

const basicSetRangeTable = SSRT.speedRangeTable(16).map(row => ({
    moddesc: `for speed/range ${row.yards} yds`,
    max: row.yards,
    penalty: row.penalty,
    desc: `${row.yards} yds`
}));
// change the last entry description from 700 yards to 500+ yards
basicSetRangeTable.forEach(row => {
    if (row.penalty === -15) {
        row.moddesc = 'for speed/range 500+ yds';
        row.max = '500+';
        row.desc = '500+ yds';
    }
});

/*
  Defines the range strategy used throughout the application. A range strategy
  is defined as an ordered (closest range to farthest range) array of range 
  bands. A range band is defined as a structure like this:

  {
    moddesc: <String: text to use in the modifier bucket>,
    max: <num: number of yards that define the maximum distance of this band>,				
    penalty: <num: modifier to use for ranged attacks in this band>,
    desc: <String: text that describes the range>
  }

  Responsibilities:

  - Defines a world setting to set the range strategy. Currently supported: 
    * Standand (Size and Speed/Range Table from Basic).
    * Simplifed (Range bands from Monster Hunters 2: The Enemy).
   
  - On update of the setting, update the modifier bucket and all actors.

  - On start up (a 'ready' hook) set the range bands and modifiers based 
    on the current setting value.

  - On start up (a 'ready' hook) initializes the range ruler to show range penalties
    according to the chosen strategy.
    
  - Maintains an instance variable (rangeTable) that contains the current set of
    range bands based on the chosen strategy. This table is to be used only for display
    and interactive roll mod application purposes

  - Maintains an instance variable (bucketModifiers) that contains an array of
    modifier text for the modifier bucket.
 */
export default class GURPSRange {
    constructor() {
        this._setup();
        this._setStrategy(STRATEGY_STANDARD);
    }

    _setup() {
        let self = this;

        Hooks.once('init', async function () {
            game.GURPS = GURPS;

            const choices = {};
            choices[STRATEGY_STANDARD] = 'Size and Speed/Range Table';
            choices[STRATEGY_RANGE_BANDS] = 'Monster Hunters 2 Range Bands';

            /* Define Settings */
            game.settings.register(SYSTEM_NAME, SETTING_NAME, {
                name: 'Default range modifier strategy:',
                hint: 'Sets the formula to use to calculate range penalties.',
                scope: 'world',
                config: true,
                type: String,
                choices,
                default: STRATEGY_STANDARD,
                onChange: value => self._updateAfterSettingsChange()
            });
        });

        // Set the range to whatever the setting is upon opening the world.
        // Have to do it this way because the order of "init Hooks" is indeterminate.
        // This will run after all init hooks have been processed.
        Hooks.once('ready', async function () {
            self._updateAfterSettingsChange();

            // Replace the range ruler with our own.
            Ruler.prototype._getSegmentLabel = (segmentDistance, totalDistance, isTotal) => {
                const units = canvas.scene.data.gridUnits;
                const getLabel = (distance, units) => `${Math.round(distance * 100) / 100} ${units}`;

                let label = getLabel(segmentDistance, units);
                if (isTotal && segmentDistance !== totalDistance) {
                    label += ` [${getLabel(totalDistance, units)}]`;
                }

                const mod = self._getRangePenalty(totalDistance, units);
                game.GURPS.ModifierBucket.setTempRangeMod(mod);

                return label + ` (${mod})`;
            }

            Ruler.prototype._endMeasurementOrig = Ruler.prototype._endMeasurement;
            Ruler.prototype._endMeasurement = function () {
                this._endMeasurementOrig();
                game.GURPS.ModifierBucket.addTempRangeMod();
            }
        })
    }

    _getRangePenalty(distance, units) {
        if (getStrategy() === STRATEGY_RANGE_BANDS) {
            return RangeBandTable.yardsToPenalty(
                convertToYards({
                    value: distance,
                    inputUnit: parseDistance(`${distance} ${units}`).unit,
                    conversionMethod: conversionMethods.real
                })
            );
        }

        return SSRT.speedRangeFromExpression({expression: `${distance} ${units}`});
    }

    async _updateAfterSettingsChange() {
        const currentStrategy = getStrategy();
        console.log(currentStrategy);

        this._setStrategy(currentStrategy);

        // update modifier bucket
        ui.modifierbucket = game.GURPS.ModifierBucket;
        if (typeof ui.modifierbucket !== 'undefined') {
            ui.modifierbucket.refresh();
        }

        // FYI update all actors
        for (const actor of game.actors.entities) {
            // Return true if the current game user has observer or owner rights to an actor
            if (actor.permission >= CONST.ENTITY_PERMISSIONS.OBSERVER) {
                await actor.update({ranges: this.rangeTable});
            }
        }
    }

    _setStrategy(strategy) {
        if (strategy === STRATEGY_STANDARD) {
            this.rangeTable = basicSetRangeTable;
        } else {
            this.rangeTable = simplifiedRangeTable;
        }

        this.bucketModifiers = [];
        this.rangeTable.forEach(band => {
            if (band.penalty != 0) {
                this.bucketModifiers.push(displayMod(band.penalty) + ' ' + band.moddesc);
            }
        })
    }
}
