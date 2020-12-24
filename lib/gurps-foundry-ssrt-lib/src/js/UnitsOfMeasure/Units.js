export const CM = 'centimeter';
export const FT = 'foot';
export const IN = 'inch';
export const KM = 'kilometer';
export const M = 'meter';
export const MI = 'mile';
export const YD = 'yard';

export function isMetric(unit) {
    return [CM, KM, M].findIndex((metricUnit) => unit === metricUnit) > -1;
}
