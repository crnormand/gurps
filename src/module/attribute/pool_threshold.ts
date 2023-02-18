import { evaluateToNumber, VariableResolver } from "@util"
import { PoolThresholdDef, ThresholdOp } from "./data"

export class PoolThreshold {
	state = ""

	explanation = ""

	expression = ""

	// Multiplier = 0;
	// divisor = 1;
	// addition = 0;
	ops: ThresholdOp[] = []

	constructor(data: PoolThresholdDef) {
		Object.assign(this, data)
	}

	threshold(resolver: VariableResolver): number {
		return evaluateToNumber(this.expression, resolver)
		// Let divisor = this.divisor;
		// if (divisor == 0) divisor = 1;
		// return Math.round((max * this.multiplier) / this.divisor + this.addition);
	}
}
