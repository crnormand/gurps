import { SYSTEM_NAME } from "."
import { SettingsMenuGURPS } from "./menu"

export class DefaultHitLocationSettings extends SettingsMenuGURPS {
	static override readonly namespace = "default_hit_locations"

	static override readonly SETTINGS = ["body_type"]

	protected static override get settings(): Record<string, any> {
		return {
			body_type: {
				name: "",
				hint: "",
				type: Object,
				default: {
					name: "Humanoid",
					roll: "3d",
					locations: [
						{
							id: "eye",
							choice_name: "Eyes",
							table_name: "Eyes",
							slots: 0,
							hit_penalty: -9,
							dr_bonus: 0,
							description:
								"An attack that misses by 1 hits the torso instead. Only impaling (imp), piercing (pi-, pi, pi+, pi++), and tight-beam burning (burn) attacks can target the eye – and only from the front or sides. Injury over HP÷10 blinds the eye. Otherwise, treat as skull, but without the extra DR!",
							calc: {
								roll_range: "-",
								dr: {
									all: 0,
								},
							},
						},
						{
							id: "skull",
							choice_name: "Skull",
							table_name: "Skull",
							slots: 2,
							hit_penalty: -7,
							dr_bonus: 2,
							description:
								"An attack that misses by 1 hits the torso instead. Wounding modifier is x4. Knockdown rolls are at -10. Critical hits use the Critical Head Blow Table (B556). Exception: These special effects do not apply to toxic (tox) damage.",
							calc: {
								roll_range: "3-4",
								dr: {
									all: 2,
								},
							},
						},
						{
							id: "face",
							choice_name: "Face",
							table_name: "Face",
							slots: 1,
							hit_penalty: -5,
							dr_bonus: 0,
							description:
								"An attack that misses by 1 hits the torso instead. Jaw, cheeks, nose, ears, etc. If the target has an open-faced helmet, ignore its DR. Knockdown rolls are at -5. Critical hits use the Critical Head Blow Table (B556). Corrosion (cor) damage gets a x1½ wounding modifier, and if it inflicts a major wound, it also blinds one eye (both eyes on damage over full HP). Random attacks from behind hit the skull instead.",
							calc: {
								roll_range: "5",
								dr: {
									all: 0,
								},
							},
						},
						{
							id: "leg",
							choice_name: "Leg",
							table_name: "Right Leg",
							slots: 2,
							hit_penalty: -2,
							dr_bonus: 0,
							description:
								"Reduce the wounding multiplier of large piercing (pi+), huge piercing (pi++), and impaling (imp) damage to x1. Any major wound (loss of over ½ HP from one blow) cripples the limb. Damage beyond that threshold is lost.",
							calc: {
								roll_range: "6-7",
								dr: {
									all: 0,
								},
							},
						},
						{
							id: "arm",
							choice_name: "Arm",
							table_name: "Right Arm",
							slots: 1,
							hit_penalty: -2,
							dr_bonus: 0,
							description:
								"Reduce the wounding multiplier of large piercing (pi+), huge piercing (pi++), and impaling (imp) damage to x1. Any major wound (loss of over ½ HP from one blow) cripples the limb. Damage beyond that threshold is lost. If holding a shield, double the penalty to hit: -4 for shield arm instead of -2.",
							calc: {
								roll_range: "8",
								dr: {
									all: 0,
								},
							},
						},
						{
							id: "torso",
							choice_name: "Torso",
							table_name: "Torso",
							slots: 2,
							hit_penalty: 0,
							dr_bonus: 0,
							description: "",
							calc: {
								roll_range: "9-10",
								dr: {
									all: 0,
								},
							},
						},
						{
							id: "groin",
							choice_name: "Groin",
							table_name: "Groin",
							slots: 1,
							hit_penalty: -3,
							dr_bonus: 0,
							description:
								"An attack that misses by 1 hits the torso instead. Human males and the males of similar species suffer double shock from crushing (cr) damage, and get -5 to knockdown rolls. Otherwise, treat as a torso hit.",
							calc: {
								roll_range: "11",
								dr: {
									all: 0,
								},
							},
						},
						{
							id: "arm",
							choice_name: "Arm",
							table_name: "Left Arm",
							slots: 1,
							hit_penalty: -2,
							dr_bonus: 0,
							description:
								"Reduce the wounding multiplier of large piercing (pi+), huge piercing (pi++), and impaling (imp) damage to x1. Any major wound (loss of over ½ HP from one blow) cripples the limb. Damage beyond that threshold is lost. If holding a shield, double the penalty to hit: -4 for shield arm instead of -2.",
							calc: {
								roll_range: "12",
								dr: {
									all: 0,
								},
							},
						},
						{
							id: "leg",
							choice_name: "Leg",
							table_name: "Left Leg",
							slots: 2,
							hit_penalty: -2,
							dr_bonus: 0,
							description:
								"Reduce the wounding multiplier of large piercing (pi+), huge piercing (pi++), and impaling (imp) damage to x1. Any major wound (loss of over ½ HP from one blow) cripples the limb. Damage beyond that threshold is lost.",
							calc: {
								roll_range: "13-14",
								dr: {
									all: 0,
								},
							},
						},
						{
							id: "hand",
							choice_name: "Hand",
							table_name: "Hand",
							slots: 1,
							hit_penalty: -4,
							dr_bonus: 0,
							description:
								"If holding a shield, double the penalty to hit: -8 for shield hand instead of -4. Reduce the wounding multiplier of large piercing (pi+), huge piercing (pi++), and impaling (imp) damage to x1. Any major wound (loss of over ⅓ HP from one blow) cripples the extremity. Damage beyond that threshold is lost.",
							calc: {
								roll_range: "15",
								dr: {
									all: 0,
								},
							},
						},
						{
							id: "foot",
							choice_name: "Foot",
							table_name: "Foot",
							slots: 1,
							hit_penalty: -4,
							dr_bonus: 0,
							description:
								"Reduce the wounding multiplier of large piercing (pi+), huge piercing (pi++), and impaling (imp) damage to x1. Any major wound (loss of over ⅓ HP from one blow) cripples the extremity. Damage beyond that threshold is lost.",
							calc: {
								roll_range: "16",
								dr: {
									all: 0,
								},
							},
						},
						{
							id: "neck",
							choice_name: "Neck",
							table_name: "Neck",
							slots: 2,
							hit_penalty: -5,
							dr_bonus: 0,
							description:
								"An attack that misses by 1 hits the torso instead. Neck and throat. Increase the wounding multiplier of crushing (cr) and corrosion (cor) attacks to x1½, and that of cutting (cut) damage to x2. At the GM’s option, anyone killed by a cutting (cut) blow to the neck is decapitated!",
							calc: {
								roll_range: "17-18",
								dr: {
									all: 0,
								},
							},
						},
						{
							id: "vitals",
							choice_name: "Vitals",
							table_name: "Vitals",
							slots: 0,
							hit_penalty: -3,
							dr_bonus: 0,
							description:
								"An attack that misses by 1 hits the torso instead. Heart, lungs, kidneys, etc. Increase the wounding modifier for an impaling (imp) or any piercing (pi-, pi, pi+, pi++) attack to x3. Increase the wounding modifier for a tight-beam burning (burn) attack to x2. Other attacks cannot target the vitals.",
							calc: {
								roll_range: "-",
								dr: {
									all: 0,
								},
							},
						},
					],
				},
			},
		}
	}

	override async getData(): Promise<any> {
		const attributes = (game as Game).settings.get(SYSTEM_NAME, `${this.namespace}.attributes`)
		return {
			attributes: attributes,
			actor: null,
			config: (CONFIG as any).GURPS,
		}
	}
}
