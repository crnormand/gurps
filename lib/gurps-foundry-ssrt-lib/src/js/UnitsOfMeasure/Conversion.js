import * as Units from './Units.js';
import * as Methods from './Methods.js';

/**
 * Converts input value to yards
 *
 * @param {number} value
 * @param {string} inputUnit
 * @param {string} conversionMethod
 * @returns {number}
 */
export default function ({ value, inputUnit, conversionMethod }) {
    if (inputUnit === Units.YD) {
        return value;
    }

    return Units.isMetric(inputUnit) ? metersToYards(metricToMeters(value, inputUnit), conversionMethod) : customaryToYards(value, inputUnit);
}

function customaryToYards(customaryValue, inputUnit) {
    if (Units.isMetric(inputUnit)) {
        throw new Error('Trying to convert a US customary unit to yards as part of customaryToYards');
    }

    if (inputUnit === Units.MI) {
        return customaryValue * 1760;
    }

    if (inputUnit === Units.FT) {
        return customaryValue / 3;
    }

    if (inputUnit === Units.IN) {
        return customaryValue / 36;
    }

    if (inputUnit === Units.YD) {
        return customaryValue;
    }

    throw new Error(`Using unsupported input unit ${inputUnit} in customaryToYards`);
}

function metersToYards(meters, conversionMethod) {
    if (conversionMethod === Methods.real) {
        return meters / 1.09361;
    }

    if (conversionMethod === Methods.meterEqualsYard) {
        return meters;
    }

    throw new Error(`Using unsupported conversion method ${conversionMethod} in metersToYards`);
}

function metricToMeters(metricValue, inputUnit) {
    if (!Units.isMetric(inputUnit)) {
        throw new Error('Trying to convert a non-metric unit to meters as part of metricToMeters');
    }

    if (inputUnit === Units.CM) {
        return metricValue / 100;
    }

    if (inputUnit === Units.KM) {
        return metricValue * 1000;
    }

    if (inputUnit === Units.M) {
        return metricValue;
    }

    throw new Error(`Using unsupported input unit ${inputUnit} in metricToMeters`);
}