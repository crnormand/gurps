import { fields } from '@gurps-types/foundry/index.js'
import {
  parseAcc,
  parseBlock,
  parseBulk,
  parseParry,
  parseRange,
  parseRateOfFire,
  parseReach,
  parseRecoil,
  parseShots,
} from '@module/action/parse-weapon.js'

/* ---------------------------------------- */

const weaponReachSchema = () => {
  return {
    /** The minimum reach of this attack, in yards. */
    min: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    /** The maximum reach of this attack, in yards. */
    max: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    /** Can this attack be made in close combat (i.e. against an adjacent target)? */
    closeCombat: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    /** Does this attack require a ready maneuver to change range? */
    changeRequiresReady: new fields.BooleanField({ required: true, nullable: false, initial: false }),
  }
}

export type WeaponReachSchema = ReturnType<typeof weaponReachSchema>

/* ---------------------------------------- */

export class WeaponReachField<
  Options extends fields.SchemaField.Options<WeaponReachSchema> = fields.SchemaField.DefaultOptions,
  AssignmentType =
    | fields.SchemaField.Internal.AssignmentType<WeaponReachSchema, Options>
    | fields.StringField.AssignmentType<Options>,
> extends fields.SchemaField<WeaponReachSchema, Options, AssignmentType> {
  constructor(options?: Options, context?: fields.DataField.ConstructionContext) {
    super(weaponReachSchema(), options, context)
  }

  /* ---------------------------------------- */

  protected override _cast(value: unknown): AssignmentType {
    if (typeof value === 'string') value = parseReach(value)

    return super._cast(value)
  }
}

/* ---------------------------------------- */

const weaponParrySchema = () => {
  return {
    /** Can this attack parry at all? */
    canParry: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    /** Is this weapon treated as a fencing weapon for parry purposes? */
    fencing: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    /** Is this weapon unbalanced for parry purposes?  */
    unbalanced: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    /** What is the parry modifier for this attack, which is added to the base parry value to determine the final parry value. */
    modifier: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
  }
}

export type WeaponParrySchema = ReturnType<typeof weaponParrySchema>

/* ---------------------------------------- */

export class WeaponParryField<
  Options extends fields.SchemaField.Options<WeaponParrySchema> = fields.SchemaField.DefaultOptions,
  AssignmentType =
    | fields.SchemaField.Internal.AssignmentType<WeaponParrySchema, Options>
    | fields.StringField.AssignmentType<Options>,
> extends fields.SchemaField<WeaponParrySchema, Options, AssignmentType> {
  constructor(options?: Options, context?: fields.DataField.ConstructionContext) {
    super(weaponParrySchema(), options, context)
  }

  /* ---------------------------------------- */

  protected override _cast(value: unknown): AssignmentType {
    if (typeof value === 'string') value = parseParry(value)

    return super._cast(value)
  }
}

/* ---------------------------------------- */

const weaponBlockSchema = () => {
  return {
    /** Can this attack block at all? */
    canBlock: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    /** The block modifier for this attack, which is added to the base block value to determine the final block value. */
    modifier: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
  }
}

export type WeaponBlockSchema = ReturnType<typeof weaponBlockSchema>

/* ---------------------------------------- */

export class WeaponBlockField<
  Options extends fields.SchemaField.Options<WeaponBlockSchema> = fields.SchemaField.DefaultOptions,
  AssignmentType =
    | fields.SchemaField.Internal.AssignmentType<WeaponBlockSchema, Options>
    | fields.StringField.AssignmentType<Options>,
> extends fields.SchemaField<WeaponBlockSchema, Options, AssignmentType> {
  constructor(options?: Options, context?: fields.DataField.ConstructionContext) {
    super(weaponBlockSchema(), options, context)
  }

  /* ---------------------------------------- */

  protected override _cast(value: unknown): AssignmentType {
    if (typeof value === 'string') value = parseBlock(value)

    return super._cast(value)
  }
}

/* ---------------------------------------- */
const weaponAccSchema = () => {
  return {
    /** The base accuracy modifier for this attack */
    base: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    /** The scope modifier for this attack, which is added to the base accuracy modifier to determine the final accuracy modifier. */
    scope: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    /** Is this attack a jet attack? */
    jet: new fields.BooleanField({ required: true, nullable: false, initial: false }),
  }
}

export type WeaponAccSchema = ReturnType<typeof weaponAccSchema>

/* ---------------------------------------- */

export class WeaponAccField<
  Options extends fields.SchemaField.Options<WeaponAccSchema> = fields.SchemaField.DefaultOptions,
  AssignmentType =
    | fields.SchemaField.Internal.AssignmentType<WeaponAccSchema, Options>
    | fields.StringField.AssignmentType<Options>,
> extends fields.SchemaField<WeaponAccSchema, Options, AssignmentType> {
  constructor(options?: Options, context?: fields.DataField.ConstructionContext) {
    super(weaponAccSchema(), options, context)
  }

  /* ---------------------------------------- */

  protected override _cast(value: unknown): AssignmentType {
    if (typeof value === 'string') value = parseAcc(value)

    return super._cast(value)
  }
}

/* ---------------------------------------- */

const weaponBulkSchema = () => {
  return {
    /** The normal bulk value of the weapon */
    normal: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    /** The bulk value of the weapon when used by a giant character */
    giant: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    /** Does this weapon have retracting stock? */
    retractingStock: new fields.BooleanField({ required: true, nullable: false, initial: false }),
  }
}

export type WeaponBulkSchema = ReturnType<typeof weaponBulkSchema>

/* ---------------------------------------- */

export class WeaponBulkField<
  Options extends fields.SchemaField.Options<WeaponBulkSchema> = fields.SchemaField.DefaultOptions,
  AssignmentType =
    | fields.SchemaField.Internal.AssignmentType<WeaponBulkSchema, Options>
    | fields.StringField.AssignmentType<Options>,
> extends fields.SchemaField<WeaponBulkSchema, Options, AssignmentType> {
  constructor(options?: Options, context?: fields.DataField.ConstructionContext) {
    super(weaponBulkSchema(), options, context)
  }

  /* ---------------------------------------- */

  protected override _cast(value: unknown): AssignmentType {
    if (typeof value === 'string') value = parseBulk(value)

    return super._cast(value)
  }
}

/* ---------------------------------------- */

const weaponRangeSchema = () => {
  return {
    /** The range after which the attack deals only half damage. */
    halfDamage: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    /** The minimum range of this attack */
    min: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    /** The maximum range of this attack */
    max: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    /** Is this attack considered muscle-powered for the purposes of range calculation? */
    musclePowered: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    /** Is the range of this attack measured in miles instead of yards? */
    inMiles: new fields.BooleanField({ required: true, nullable: false, initial: false }),
  }
}

export type WeaponRangeSchema = ReturnType<typeof weaponRangeSchema>

/* ---------------------------------------- */

export class WeaponRangeField<
  Options extends fields.SchemaField.Options<WeaponRangeSchema> = fields.SchemaField.DefaultOptions,
  AssignmentType =
    | fields.SchemaField.Internal.AssignmentType<WeaponRangeSchema, Options>
    | fields.StringField.AssignmentType<Options>,
> extends fields.SchemaField<WeaponRangeSchema, Options, AssignmentType> {
  constructor(options?: Options, context?: fields.DataField.ConstructionContext) {
    super(weaponRangeSchema(), options, context)
  }

  /* ---------------------------------------- */

  protected override _cast(value: unknown): AssignmentType {
    if (typeof value === 'string') value = parseRange(value)

    return super._cast(value)
  }
}

/* ---------------------------------------- */

const weaponRateOfFireModeSchema = () => {
  return {
    /** The maximum number of times this weapon can be shot in a single attack action */
    shotsPerAttack: new fields.NumberField({
      required: true,
      nullable: false,
      initial: 0,
      label: 'GURPS.action.rangedAttack.FIELDS.rateOfFire.shotsPerAttack',
    }),
    /** The number of secondary projectiles released by every attack (e.g. for a shotgun) */
    secondaryProjectiles: new fields.NumberField({
      required: true,
      nullable: false,
      initial: 0,
      label: 'GURPS.action.rangedAttack.FIELDS.rateOfFire.secondaryProjectiles',
    }),
    /** Is this weapon only able to fire in fully automatic mode? */
    fullAutoOnly: new fields.BooleanField({
      required: true,
      nullable: false,
      initial: false,
      label: 'GURPS.action.rangedAttack.FIELDS.rateOfFire.fullAutoOnly',
    }),
    /** Does this weapon fire in high-cyclic controlled bursts? */
    highCyclicControlledBursts: new fields.BooleanField({
      required: true,
      nullable: false,
      initial: false,
      label: 'GURPS.action.rangedAttack.FIELDS.rateOfFire.highCyclicControlledBursts',
    }),
  }
}

export type WeaponRateOfFireModeSchema = ReturnType<typeof weaponRateOfFireModeSchema>

/* ---------------------------------------- */

const weaponRateOfFireSchema = () => {
  return {
    /** The primary fire mode for this attack */
    mode1: new fields.SchemaField(weaponRateOfFireModeSchema(), { required: true, nullable: false }),
    /** The secondary fire mode for this attack, if applicable */
    mode2: new fields.SchemaField(weaponRateOfFireModeSchema(), { required: true, nullable: false }),
    /** Is this attack considered a jet attack for the purposes of rate of fire? */
    jet: new fields.BooleanField({ required: true, nullable: false, initial: false }),
  }
}

export type WeaponRateOfFireSchema = ReturnType<typeof weaponRateOfFireSchema>

/* ---------------------------------------- */

export class WeaponRateOfFireField<
  Options extends fields.SchemaField.Options<WeaponRateOfFireSchema> = fields.SchemaField.DefaultOptions,
  AssignmentType =
    | fields.SchemaField.Internal.AssignmentType<WeaponRateOfFireSchema, Options>
    | fields.StringField.AssignmentType<Options>,
> extends fields.SchemaField<WeaponRateOfFireSchema, Options, AssignmentType> {
  constructor(options?: Options, context?: fields.DataField.ConstructionContext) {
    super(weaponRateOfFireSchema(), options, context)
  }

  /* ---------------------------------------- */

  protected override _cast(value: unknown): AssignmentType {
    if (typeof value === 'string') value = parseRateOfFire(value)

    return super._cast(value)
  }
}

/* ---------------------------------------- */

const weaponRecoilSchema = () => {
  return {
    /** The normal recoil value for this attack */
    shot: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    /** An alternative recoil value for this attack, e.g. when using slugs for a shotgun instead of pellets */
    slug: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
  }
}

export type WeaponRecoilSchema = ReturnType<typeof weaponRecoilSchema>

/* ---------------------------------------- */

export class WeaponRecoilField<
  Options extends fields.SchemaField.Options<WeaponRecoilSchema> = fields.SchemaField.DefaultOptions,
  AssignmentType =
    | fields.SchemaField.Internal.AssignmentType<WeaponRecoilSchema, Options>
    | fields.StringField.AssignmentType<Options>,
> extends fields.SchemaField<WeaponRecoilSchema, Options, AssignmentType> {
  constructor(options?: Options, context?: fields.DataField.ConstructionContext) {
    super(weaponRecoilSchema(), options, context)
  }

  /* ---------------------------------------- */

  protected override _cast(value: unknown): AssignmentType {
    if (typeof value === 'string') value = parseRecoil(value)

    return super._cast(value)
  }
}

/* ---------------------------------------- */

const weaponShotsSchema = () => {
  return {
    /** The number of shots carried in the magazine (or other implement) of this weapon, as appropriate */
    count: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    /** The number of shots currently loaded in the weapon's chamber (if any) */
    inChamber: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    /** The number of seconds for which this attack fires (applicable for e.g. flamethrowers) */
    duration: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    /** The number of rounds required to reload this weapon once all shots are expended */
    reloadTime: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    /** Whether the reload time is per shot (e.g. revolvers) or for the entire reload action (e.g. magazines) */
    reloadTimeIsPerShot: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    /** Is this attack considered a thrown weapon for the purposes of shots and reload? */
    thrown: new fields.BooleanField({ required: true, nullable: false, initial: false }),
  }
}

export type WeaponShotsSchema = ReturnType<typeof weaponShotsSchema>

/* ---------------------------------------- */

export class WeaponShotsField<
  Options extends fields.SchemaField.Options<WeaponShotsSchema> = fields.SchemaField.DefaultOptions,
  AssignmentType =
    | fields.SchemaField.Internal.AssignmentType<WeaponShotsSchema, Options>
    | fields.StringField.AssignmentType<Options>,
> extends fields.SchemaField<WeaponShotsSchema, Options, AssignmentType> {
  constructor(options?: Options, context?: fields.DataField.ConstructionContext) {
    super(weaponShotsSchema(), options, context)
  }

  /* ---------------------------------------- */

  protected override _cast(value: unknown): AssignmentType {
    if (typeof value === 'string') value = parseShots(value)

    return super._cast(value)
  }
}
