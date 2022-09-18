import { CR, CRAdjustment } from "@module/data";

/**
 *
 * @param cr
 * @param crAdj
 */
export function adjustment(cr: CR, crAdj: CRAdjustment): number {
	if (cr === CR.None) return 0;
	switch (crAdj) {
		case CRAdjustment.None:
			return 0;
		case CRAdjustment.ActionPenalty:
		case CRAdjustment.ReactionPenalty:
		case CRAdjustment.FrightCheckPenalty:
		case CRAdjustment.FrightCheckBonus:
			return Object.values(CR).indexOf(cr) - Object.values(CR).length;
		case CRAdjustment.MinorCostOfLivingIncrease:
			return 5 * Object.values(CR).length - Object.values(CR).indexOf(cr);
		case CRAdjustment.MajorCostOfLivingIncrease:
			return 10 * (1 << (Object.values(CR).length - (Object.values(CR).indexOf(cr) + 1)));
		default:
			return adjustment(cr, CRAdjustment.None);
	}
}
