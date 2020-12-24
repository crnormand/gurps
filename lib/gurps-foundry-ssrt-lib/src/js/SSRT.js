import * as Units from './UnitsOfMeasure/Units.js';
import * as Methods from './UnitsOfMeasure/Methods.js';
import toYards from './UnitsOfMeasure/Conversion.js';
import parseExpression from './Parsing.js';

const SSRTSequence = [1, 1.5, 2, 3, 5, 7];

/**
 * Class representing the SSRT and the entry point of the library.
 *
 * @hideconstructor
 * @public
 */
export class SSRT {
    /**
     * Returns the Speed/Range penalty for the given expression
     *
     * @param {string} expression Should contain linear measurement and unit of measure
     * @param {string} metricConversionMethod Which method to use for converting metric units into yards
     * @returns {number}
     * @public
     * @static
     */
    static speedRangeFromExpression({ expression, metricConversionMethod = Methods.real }) {
        const { linearMeasurement, unit } = parseExpression(expression);
        return this.speedRangeFromData({ linearMeasurement, unit, metricConversionMethod });
    }

    /**
     * Returns the Speed/Range penalty for given data
     *
     * @param {number} linearMeasurement In unit of measure supplied by the following argument
     * @param {string} unit Unit of measure linearMeasurement is expressed in
     * @param {string} metricConversionMethod Which method to use for converting metric units into yards
     * @returns {number}
     * @public
     * @static
     */
    static speedRangeFromData({ linearMeasurement, unit = Units.YD, metricConversionMethod = Methods.real }) {
        const yards = toYards({ value: linearMeasurement, inputUnit: unit, conversionMethod: metricConversionMethod });
        return SSRT._yardsToSpeedRangePenalty(yards);
    }

    /**
     * @param {number} yards
     * @returns {number}
     * @private
     * @static
     */
    static _yardsToSpeedRangePenalty(yards) {
        if (yards <= 2) {
            return 0;
        }

        let reducedYards = yards;
        let timesReduced = 0;
        while (reducedYards > 10) {
            reducedYards /= 10;
            timesReduced++;
        }

        let reducedPenalty = 1;
        if (reducedYards > 1.5) {
            reducedPenalty = 0;
        }
        if (reducedYards > 2) {
            reducedPenalty = -1;
        }
        if (reducedYards > 3) {
            reducedPenalty = -2;
        }
        if (reducedYards > 5) {
            reducedPenalty = -3;
        }
        if (reducedYards > 7) {
            reducedPenalty = -4;
        }

        return reducedPenalty - 6 * timesReduced;
    }

    /**
     * Returns the Size Modifier for the given expression
     *
     * @param {string} expression Should contain linear measurement and unit of measure
     * @param {string} metricConversionMethod Which method to use for converting metric units into yards
     * @returns {number}
     * @public
     * @static
     */
    static sizeFromExpression({ expression, metricConversionMethod = Methods.real }) {
        const { linearMeasurement, unit } = parseExpression(expression);
        return this.sizeFromData({ linearMeasurement, unit, metricConversionMethod });
    }

    /**
     * Returns the Size Modifier for given data
     *
     * @param {number} linearMeasurement In unit of measure supplied by the following argument
     * @param {string} unit Unit of measure linearMeasurement is expressed in
     * @param {string} metricConversionMethod Which method to use for converting metric units into yards
     * @returns {number}
     * @public
     * @static
     */
    static sizeFromData({ linearMeasurement, unit = Units.YD, metricConversionMethod = Methods.real }) {
        const yards = toYards({ value: linearMeasurement, inputUnit: unit, conversionMethod: metricConversionMethod });
        return SSRT._yardsToSizeModifier(yards);
    }

    /**
     * @param {number} yards
     * @returns {number}
     * @private
     * @static
     */
    static _yardsToSizeModifier(yards) {
        const inch = 1 / 36;
        if (yards <= inch / 5) {
            return -15;
        }
        if (yards <= inch / 3) {
            return -14;
        }
        if (yards <= inch / 2) {
            return -13;
        }
        if (yards <= (inch * 2) / 3) {
            return -12;
        }
        if (yards <= inch) {
            return -11;
        }
        if (yards <= inch * 1.5) {
            return -10;
        }
        if (yards <= inch * 2) {
            return -9;
        }
        if (yards <= inch * 3) {
            return -8;
        }
        if (yards <= inch * 5) {
            return -7;
        }
        if (yards <= inch * 8) {
            return -6;
        }

        const foot = 1 / 3;
        if (yards <= foot) {
            return -5;
        }
        if (yards <= foot * 1.5) {
            return -4;
        }
        if (yards <= foot * 2) {
            return -3;
        }

        if (yards <= 1) {
            return -2;
        }
        if (yards <= 1.5) {
            return -1;
        }

        return -this._yardsToSpeedRangePenalty(yards);
    }

    /**
     * @typedef {Object} SpeedRangeTableEntry
     * @property {number} yards Linear measurement in yards
     * @property {number} penalty The speed/range penalty for the specified linear measurement
     * @public
     */

    /**
     * Returns a speed/range table as structured data
     *
     * @param {number} numberOfEntries The number of entries in the table which should be returned. 31 is chosen as the default because that is the number of entries published in Basic Set starting with 2 yards.
     * @returns {SpeedRangeTableEntry[]}
     * @public
     * @static
     */
    static speedRangeTable(numberOfEntries = 31) {
        const results = [];

        let currentSequence = SSRTSequence;

        while (results.length < numberOfEntries) {
            const nextSequence = [];

            for (const element of currentSequence) {
                nextSequence.push(element * 10);

                if (element < 2) {
                    continue;
                }

                results.push({ yards: element, penalty: SSRT._yardsToSpeedRangePenalty(element) });
            }

            currentSequence = nextSequence;
        }

        return results;
    }
}
