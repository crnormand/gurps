import { CharacterGURPS } from "@actor"
import { reserved_ids } from "@module/attribute/attribute_def"
import { PoolThreshold } from "@module/attribute/pool_threshold"
import { sanitize } from "@util"
import { ResourceTrackerDef } from "./tracker_def"

export interface ResourceTrackerObj {
	order: number
	tracker_id: string
	damage: number
	calc?: {
		value: number
		current: number
	}
}

export class ResourceTracker {
	actor: CharacterGURPS

	order: number

	tracker_id: string

	damage: number

	constructor(actor: CharacterGURPS, tracker_id: string, order: number, data?: any) {
		if (data) Object.assign(this, data)
		this.actor = actor
		this.tracker_id = tracker_id
		this.order = order
		this.damage ??= 0
	}

	get id(): string {
		return this.tracker_id
	}

	set id(v: string) {
		this.tracker_id = sanitize(v, false, reserved_ids)
	}

	get tracker_def(): ResourceTrackerDef {
		return new ResourceTrackerDef(this.actor.settings.resource_trackers.find(e => e.id === this.tracker_id))
	}

	get max(): number {
		return this.tracker_def.max
	}

	set max(v: number) {
		this.tracker_def.max = v
	}

	get min(): number {
		return this.tracker_def.min
	}

	set min(v: number) {
		this.tracker_def.min = v
	}

	get current() {
		return this.max - this.damage
	}

	set current(v: number) {
		this.max = v
	}

	get currentThreshold(): Partial<PoolThreshold> | null {
		const cur = this.current
		for (const t of this.tracker_def.thresholds) {
			if (cur <= t.threshold!(this.actor)) return t
		}
		return null
	}
}
