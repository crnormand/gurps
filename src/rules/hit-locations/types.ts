export interface RulesHitLocation {
  /** The name of the hit location, e.g. "Head", "Arm", "Leg", etc. */
  name: string
  /** The inherent DR of the hit location, e.g.  2 for "Skull", etc. */
  dr: number
  /** The hit location penalty, e.g. -7 for "Skull", etc. */
  penalty: number
  /** The "role" of the hit location, which determines any special rules that apply to it, e.g. "eye" for "Eyes", etc. */
  role: HitLocationRole
  /** The number of slots used by this hit location when it is in a table */
  slots: number
  /** Sub-locations of this hit location, if any, e.g. New Hit Locations in Martial Arts p. 137 */
  subLocations?: RulesHitLocationTable
}

/* ---------------------------------------- */

export interface RulesHitLocationTable {
  /** The name of the hit location table, e.g. "Humanoid", etc. */
  name?: string
  /** The die roll used to determine the hit location, e.g. "3d6", etc. */
  roll: string
  /** The locations in this hit location table, e.g. "Head", "Arm", "Leg", etc. */
  locations: RulesHitLocation[]
}

/* ---------------------------------------- */

export enum HitLocationRole {
  Chest = 'chest',
  Extremity = 'extremity',
  Eye = 'eye',
  Face = 'face',
  Groin = 'groin',
  Limb = 'limb',
  Neck = 'neck',
  Skull = 'skull',
  Vitals = 'vitals',
}
