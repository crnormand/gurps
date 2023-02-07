import { gid } from "@module/data"

export interface AttributeObj {
	bonus?: number
	effectiveBonus?: number
	cost_reduction?: number
	order: number
	attr_id: string
	adj: number
	damage?: number
	attribute_def?: AttributeDefObj
	apply_ops?: boolean
	calc?: {
		value: number
		current?: number
		points: number
	}
}

export interface AttributeDefObj {
	id: string
	type: AttributeType
	name: string
	full_name?: string
	attribute_base: string
	cost_per_point?: number
	cost_adj_percent_per_sm?: number
	thresholds?: PoolThresholdDef[]
	order?: number
}

export enum AttributeType {
	Integer = "integer",
	IntegerRef = "integer_ref",
	Decimal = "decimal",
	DecimalRef = "decimal_ref",
	Pool = "pool",
	PrimarySeparator = "primary_separator",
	SecondarySeparator = "secondary_separator",
	PoolSeparator = "pool_separator",
}

export type ThresholdOp = "halve_move" | "halve_dodge" | "halve_st"

export interface PoolThresholdDef {
	state: string
	explanation?: string
	expression?: string
	ops?: ThresholdOp[]
}

export const reserved_ids: string[] = [gid.Skill, gid.Parry, gid.Block, gid.Dodge, gid.SizeModifier, gid.Ten]
