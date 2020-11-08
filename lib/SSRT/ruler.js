import { SSRT } from './SSRT.js';

export const getRulerSegmentLabel = (segmentDistance, totalDistance, isTotal) => {
    const units = canvas.scene.data.gridUnits;

    let label = getDistanceWithMod(segmentDistance, units);

    if (isTotal && segmentDistance !== totalDistance) {
        label += ` [${getDistanceWithMod(totalDistance, units)}]`;
    }

    return label;
};

const getDistanceWithMod = (distance, units) => {
    let label = `${Math.round(distance * 100) / 100} ${units}`;

    try {
				let temp = SSRT.speedRangeFromExpression({ expression: `${distance} ${units}` });
				game.GURPS.ModifierBucket.setTempRangeMod(temp);
        label += ` (${temp})`;
    } catch (e) {}

    return label;
};
