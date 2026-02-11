import { fields } from '@gurps-types/foundry/index.js'
import { MeleeV1 } from '@module/action/legacy/meleev1.js'
import { RangedV1 } from '@module/action/legacy/rangedv1.js'
import { MeleeAttackModel } from '@module/action/melee-attack.js'
import { RangedAttackModel } from '@module/action/ranged-attack.js'
import * as HitLocations from '@module/hitlocation/hitlocation.js'
import { BaseItemModel } from '@module/item/data/base.js'
import { EquipmentModel } from '@module/item/data/equipment.js'
import { EquipmentV1 } from '@module/item/legacy/equipment-adapter.js'
import { SkillV1 } from '@module/item/legacy/skill-adapter.js'
import { SpellV1 } from '@module/item/legacy/spell-adapter.js'
import { TraitV1 } from '@module/item/legacy/trait-adapter.js'
import { TrackerInstance } from '@module/resource-tracker/resource-tracker.js'
import { TaggedModifiersSettings } from '@module/tagged-modifiers/index.js'
import { multiplyDice } from '@module/util/damage-utils.js'
import * as Settings from '@module/util/miscellaneous-settings.js'
import { roundTo } from '@util/math.js'
import { COSTS_REGEX } from '@util/parselink.js'
import { arrayToObject, makeRegexPatternFrom, splitArgs, zeroFill } from '@util/utilities.js'
import { AnyObject, DeepPartial } from 'fvtt-types/utils'

import { HitLocationEntry } from '../actor-components.js'
import { HitLocationEntryV1 } from '../legacy/hit-location-entryv1.js'
import { NoteV1 } from '../legacy/note-adapter.js'
import {
  MOVE_HALF,
  MOVE_NONE,
  MOVE_ONE,
  MOVE_ONETHIRD,
  MOVE_STEP,
  MOVE_TWO_STEPS,
  MOVE_TWOTHIRDS,
} from '../maneuver.js'
import { CheckInfo } from '../types.js'

import { BaseActorModel } from './base.js'
import {
  attributeSchema,
  conditionsSchema,
  DamageActionSchema,
  EncumbranceSchema,
  LiftingMovingSchema,
  MoveSchema,
  moveSchema,
  poolSchema,
  ReactionSchema,
} from './character-components.js'
import { HitLocationEntryV2 } from './hit-location-entry.js'
import { NoteV2 } from './note.js'

class CharacterModel extends BaseActorModel<CharacterSchema> {
  static override defineSchema(): CharacterSchema {
    return characterSchema()
  }

  /* ---------------------------------------- */

  // Local settings helper mirrors actor’s wrapper and avoids strict KeyFor typing.
  private getSetting<T>(key: string, fallback: T): T {
    const val = (game.settings as any)?.get(GURPS.SYSTEM_NAME, key)

    return (val ?? fallback) as T
  }

  static override LOCALIZATION_PREFIXES = super.LOCALIZATION_PREFIXES.concat('GURPS.Actor.Character')

  /* ---------------------------------------- */
  /*  Instance properties                     */
  /* ---------------------------------------- */

  // Item collections
  // Flat list of all Items of each type.
  allAdsV2: Item.OfType<'featureV2'>[] = []
  allSkillsV2: Item.OfType<'skillV2'>[] = []
  allSpellsV2: Item.OfType<'spellV2'>[] = []
  allEquipmentV2: Item.OfType<'equipmentV2'>[] = []

  // Action collections
  meleeV2: MeleeAttackModel[] = []
  rangedV2: RangedAttackModel[] = []

  // Reactions & Conditional modifiers
  reactions: fields.SchemaField.SourceData<ReactionSchema>[] = []
  conditionalmods: fields.SchemaField.SourceData<ReactionSchema>[] = []

  /* ---------------------------------------- */

  // Derived properties
  encumbrance: fields.SchemaField.SourceData<EncumbranceSchema>[] = []

  liftingmoving: fields.SchemaField.SourceData<LiftingMovingSchema> = {
    basiclift: 0,
    onehandedlift: 0,
    twohandedlift: 0,
    shove: 0,
    runningshove: 0,
    shiftslightly: 0,
    carryonback: 0,
  }

  /* ---------------------------------------- */

  get hitlocations() {
    const hitlocations: Record<string, HitLocationEntryV1> = {}

    this.hitlocationsV2.forEach((locationV2: any, index: number) => {
      hitlocations[`${zeroFill(index, 5)}`] = HitLocationEntryV1.createFromV2(locationV2)
    })

    return hitlocations
  }

  /* ---------------------------------------- */

  get hitlocationNames() {
    return this.hitlocationsV2
      .map(it => HitLocationEntryV1.createFromV2(it))
      .reduce((acc: Record<string, HitLocationEntryV1>, location) => {
        acc[location.where] = location

        return acc
      }, {})
  }

  /* ----------------------------------------- */

  eqtsummary: {
    eqtcost: number
    eqtlbs: number
    othercost: number
    otherlbs: number
  } = {
    eqtcost: 0,
    eqtlbs: 0,
    othercost: 0,
    otherlbs: 0,
  }

  defenses: {
    parry: { bonus: number }
    block: { bonus: number }
    dodge: { bonus: number }
  } = {
    parry: { bonus: 0 },
    block: { bonus: 0 },
    dodge: { bonus: 0 },
  }

  equippedparry: number = 0
  equippedblock: number = 0

  /* ---------------------------------------- */
  /*  Accessors                               */
  /* ---------------------------------------- */

  get currentmovemode(): fields.SchemaField.SourceData<MoveSchema> {
    return this.moveV2.find(mv => mv.default)!
  }

  get currentdodge(): number {
    return this.currentEncumbranceData?.currentdodge ?? 0
  }

  get currentmove(): number {
    return this.currentEncumbranceData?.currentmove ?? 0
  }

  get currentsprint(): number {
    return this.currentmove * 1.2 // TODO Should this be rounded to an integer?
  }

  get currentflight(): number {
    const flightmode = this.moveV2.find(mv => this.isAirMoveMode(mv))

    return flightmode?.basic ?? 0
  }

  /* ---------------------------------------- */

  // moveoverride: { maneuver: string | null; posture: string | null } = {
  //   maneuver: null,
  //   posture: null,
  // }

  /* ---------------------------------------- */

  // List of top-level ADs (not contained in another AD), sorted by `sort` field.
  get adsV2(): Item.OfType<'featureV2'>[] {
    return this.allAdsV2.filter(item => item.containedBy === null).sort((left, right) => left.sort - right.sort)
  }

  /* ---------------------------------------- */

  // @deprecated Legacy collection.
  get ads() {
    return arrayToObject(
      this.adsV2.map(item => new TraitV1(item)),
      5
    )
  }

  /* ---------------------------------------- */

  get skillsV2(): Item.OfType<'skillV2'>[] {
    return this.allSkillsV2.filter(item => item.containedBy === null).sort((left, right) => left.sort - right.sort)
  }

  /* ---------------------------------------- */

  // @deprecated Legacy collection.
  get skills() {
    return arrayToObject(
      this.skillsV2.map(item => new SkillV1(item)),
      5
    )
  }

  /* ---------------------------------------- */

  get spellsV2(): Item.OfType<'spellV2'>[] {
    return this.allSpellsV2.filter(item => item.containedBy === null).sort((left, right) => left.sort - right.sort)
  }

  /* ---------------------------------------- */

  // @deprecated Legacy collection.
  get spells() {
    return arrayToObject(
      this.spellsV2.map(item => new SpellV1(item)),
      5
    )
  }

  /* ---------------------------------------- */

  get equipmentV2() {
    return {
      carried: this.allEquipmentCarried
        .filter(item => item.containedBy === null)
        .sort((left, right) => left.sort - right.sort),
      other: this.allEquipmentOther
        .filter(item => item.containedBy === null)
        .sort((left, right) => left.sort - right.sort),
    }
  }

  /* ---------------------------------------- */

  get allEquipmentCarried() {
    return this.allEquipmentV2.filter(item => (item.system as EquipmentModel).eqt.carried === true)
  }

  /* ---------------------------------------- */

  get allEquipmentOther() {
    return this.allEquipmentV2.filter(item => (item.system as EquipmentModel).eqt.carried === false)
  }

  /* ---------------------------------------- */

  // @deprecated Legacy collection.
  get equipment() {
    return {
      carried: arrayToObject(this.equipmentV2.carried.map(item => new EquipmentV1(item))),
      other: arrayToObject(this.equipmentV2.other.map(item => new EquipmentV1(item))),
    }
  }

  /* ---------------------------------------- */

  // @deprecated Legacy collection.
  get melee() {
    return arrayToObject(
      this.meleeV2.map(item => new MeleeV1(item)),
      5
    )
  }

  /* ---------------------------------------- */

  // @deprecated Legacy collection.
  get ranged() {
    return arrayToObject(
      this.rangedV2.map(item => new RangedV1(item)),
      5
    )
  }

  /* ---------------------------------------- */

  // @deprecated Legacy collection.
  get move() {
    return arrayToObject(this.moveV2, 5)
  }

  /* ---------------------------------------- */

  // List of top-level notes (not contained in another note).
  get notesV2() {
    return this.allNotes.filter(item => item.containedBy === null)
  }

  // @deprecated Legacy collection.
  get notes() {
    return arrayToObject(
      this.notesV2.map(item => new NoteV1(item)),
      5
    )
  }

  /* ---------------------------------------- */

  private get currentEncumbranceData() {
    return this.encumbrance.find(enc => enc.current)
  }

  /* ---------------------------------------- */

  private isAirMoveMode(mv: fields.SchemaField.SourceData<MoveSchema>): boolean {
    return mv.mode === 'GURPS.moveModeAir'
  }

  /* ---------------------------------------- */

  getReactionsAndModifiers(
    key: 'reactions' | 'conditionalmods'
  ): foundry.data.fields.SchemaField.SourceData<ReactionSchema>[] {
    return this.parent.items.reduce((acc: any[], item) => {
      acc.push(...((item.system as Item.SystemOfType<'featureV2'>)[key] ?? []))

      return acc
    }, [])
  }

  protected _globalBonuses: AnyObject[] = []

  /* ---------------------------------------- */
  /*  Data Preparation                        */
  /* ---------------------------------------- */

  /**
   * Prepare data related to this DataModel itself, before any derived data is computed.
   */
  override prepareBaseData() {
    super.prepareBaseData()

    // Reset the conditions object
    this.#resetConditionsObject()
    this.#resetCalculatedAttributeValues()

    this.#applySizeModifierToTargetConditions()
  }
  /* ---------------------------------------- */

  #resetConditionsObject() {
    // TODO: verify whether this should be fully reset
    this.conditions = {
      ...this.conditions,
      posture: 'standing',
      maneuver: 'do_nothing',
      self: { modifiers: [] },
      target: { modifiers: [] },
      usermods: new Set<string>(),
      reeling: false,
      exhausted: false,
    }
  }

  /* ---------------------------------------- */

  #applySizeModifierToTargetConditions() {
    // Add the default size modifier to the target conditions
    if (this.traits.sizemod !== 0) {
      const sizeModifier = this.traits.sizemod > 0 ? `+${this.traits.sizemod}` : `${this.traits.sizemod}`

      this.conditions.target?.modifiers?.push(game.i18n?.format('GURPS.modifiersSize', { sm: sizeModifier }) ?? '')
    }
  }

  /* ---------------------------------------- */

  #resetCalculatedAttributeValues() {
    // Reset the calculated values of attributes
    Object.keys(this.attributes).forEach(key => {
      const attribute = this.attributes[key as keyof typeof this.attributes]

      this.attributes[key as keyof typeof this.attributes].value = attribute.import
    })
  }

  /* ---------------------------------------- */

  override prepareEmbeddedDocuments(): void {
    this._globalBonuses = this.parent.items.reduce((acc: AnyObject[], item) => {
      if (!(item.system instanceof BaseItemModel)) return acc
      acc.push(...item.system.getGlobalBonuses())

      return acc
    }, [])

    for (const item of this.parent.items) {
      if (!(item.system instanceof BaseItemModel)) continue
      item.system.applyBonuses(this._globalBonuses)
    }

    this.allAdsV2 = this.parent.items
      .filter(item => (item as Item.Implementation).isOfType('featureV2'))
      .map(item => item as Item.OfType<'featureV2'>)
    this.allSkillsV2 = this.parent.items
      .filter(item => (item as Item.Implementation).isOfType('skillV2'))
      .map(item => item as Item.OfType<'skillV2'>)
    this.allSpellsV2 = this.parent.items
      .filter(item => (item as Item.Implementation).isOfType('spellV2'))
      .map(item => item as Item.OfType<'spellV2'>)
    this.allEquipmentV2 = this.parent.items
      .filter(item => (item as Item.Implementation).isOfType('equipmentV2'))
      .map(item => item as Item.OfType<'equipmentV2'>)
    this.meleeV2 = this.parent.getItemAttacks({ attackType: 'melee' })
    this.rangedV2 = this.parent.getItemAttacks({ attackType: 'ranged' })

    this.reactions = this.getReactionsAndModifiers('reactions')
    this.conditionalmods = this.getReactionsAndModifiers('conditionalmods')

    this.#prepareEquipmentSummary()
  }

  /* ---------------------------------------- */

  override prepareDerivedData() {
    super.prepareDerivedData()

    this.#applyCharacterBonuses()
    this.#prepareLiftingMoving()
    this.#prepareEquipmentSummary()
    this.#prepareEncumbrance()
    this.#prepareDefenses()
    this.#prepareUserModifiers()

    this.#setCurrentManeuver()
  }

  /* ---------------------------------------- */

  #setCurrentManeuver() {
    // Set current maneuver to maneuver active effect if a valid one is present
    const maneuverEffect = this.parent.effects.find((effect: ActiveEffect) =>
      effect.statuses.some((status: string) => status === 'maneuver')
    )

    this.conditions.maneuver = maneuverEffect ? (maneuverEffect.flags.gurps?.name ?? null) : null
  }

  /* ---------------------------------------- */

  // NOTE: Not needed; hit location names are now derived at runtime.
  // #prepareHitLocationNames(): Record<string, HitLocationEntry> {
  //   return this.hitlocations.reduce((acc: Record<string, HitLocationEntry>, location) => {
  //     acc[location.where] = location
  //     return acc
  //   }, {})
  // }

  /* ---------------------------------------- */

  #prepareEquipmentSummary() {
    const onlyCountEquipped = this.getSetting(Settings.SETTING_CHECK_EQUIPPED, false)

    const carriedItems = onlyCountEquipped
      ? this.allEquipmentCarried.filter(item => item.system.component.equipped)
      : this.allEquipmentCarried

    this.eqtsummary = {
      eqtcost: roundTo(
        carriedItems.reduce((acc, item) => acc + item.system.component.cost * item.system.component.count, 0)
      ),
      eqtlbs: roundTo(
        carriedItems.reduce((acc, item) => acc + item.system.component.weight * item.system.component.count, 0)
      ),
      othercost: roundTo(
        this.allEquipmentOther.reduce((acc, item) => acc + item.system.component.cost * item.system.component.count, 0)
      ),
      otherlbs: roundTo(
        this.allEquipmentOther.reduce(
          (acc, item) => acc + item.system.component.weight * item.system.component.count,
          0
        )
      ),
    }
  }

  /* ---------------------------------------- */

  #applyCharacterBonuses() {
    this.#applyBonusesToAttributes()
    this.#applyBonusesToHitLocations()
  }

  /* ---------------------------------------- */

  #applyBonusesToAttributes() {
    for (const bonus of this._globalBonuses) {
      if (bonus.type !== 'attribute') continue

      const attrKey = bonus.attrkey

      if (this.attributes[attrKey as keyof typeof this.attributes]) {
        this.attributes[attrKey as keyof typeof this.attributes].value += bonus.mod as number
      }

      if (attrKey === 'DODGE') {
        // Special handling for dodge attribute
        this.dodge.value += bonus.mod as number
      }
    }
  }

  /* ---------------------------------------- */

  #applyBonusesToHitLocations() {
    for (const location of this.hitlocationsV2) {
      location.drItem = this._drBonusesFromItems[location.where] ?? 0
      const newDR = location.import + location.drItem + location.drMod

      // NOTE: I'm unsure as to whether drCap should ever apply.
      // On the one hand, using the ! operator in the /dr command may imply
      // that the DR of the location should always be set to the new value.
      // On the other hand, this may not be the intended behavior.
      // This is where documentation regarding intent would be helpful.
      location._dr = location.drCap === null ? newDR : Math.max(location.drCap, newDR)
    }
  }

  /* ---------------------------------------- */

  #prepareLiftingMoving() {
    const basicLift = Math.round((this.attributes.ST.value * this.attributes.ST.value) / 5)

    this.liftingmoving = {
      basiclift: basicLift,
      onehandedlift: basicLift * 2,
      twohandedlift: basicLift * 8,
      shove: basicLift * 12,
      runningshove: basicLift * 24,
      carryonback: basicLift * 15,
      shiftslightly: basicLift * 50,
    }
  }

  /* ---------------------------------------- */

  #prepareEncumbrance() {
    // Prevent duplicate entries across prepares
    this.encumbrance = []

    let foundCurrent = false
    const basicLift = this.liftingmoving.basiclift
    const liftBrackets: number[] = [basicLift, basicLift * 2, basicLift * 3, basicLift * 6, basicLift * 10]
    const basicMove = this.currentMoveMode?.basic ?? this.basicmove.value
    const basicDodge = this.dodge.value

    // TODO const moveIsEnhanced = this.currentMoveMode?.enhanced !== null

    const carriedWeight = this.eqtsummary.eqtlbs ?? 0

    for (let encumbranceLevel = 0; encumbranceLevel < liftBrackets.length; encumbranceLevel++) {
      let move = Math.floor(Math.max(1, basicMove * (1 - encumbranceLevel * 0.2)))
      let dodge = Math.max(1, basicDodge - encumbranceLevel)
      let sprint = Math.max(1, move * 1.2)

      if (this.conditions.reeling) {
        move = Math.ceil(move / 2)
        dodge = Math.ceil(dodge / 2)
        sprint = Math.ceil(sprint / 2)
      }

      if (this.conditions.exhausted) {
        move = Math.ceil(move / 2)
        dodge = Math.ceil(dodge / 2)
        sprint = Math.ceil(sprint / 2)
      }

      let current = false

      if (this.getSetting(Settings.SETTING_AUTOMATIC_ENCUMBRANCE, false)) {
        if (!foundCurrent && carriedWeight <= liftBrackets[encumbranceLevel]) {
          foundCurrent = true
          current = true
        }
      } else {
        if (encumbranceLevel === this.additionalresources.currentEncumbrance) {
          foundCurrent = true
          current = true
        }
      }

      const currentmove = this.#getCurrentMove(move)

      this.encumbrance.push({
        key: `enc${encumbranceLevel}`,
        level: encumbranceLevel,
        weight: liftBrackets[encumbranceLevel],
        move,
        dodge,
        current,
        currentmove,
        currentsprint: currentmove * 1.2,
        currentdodge: dodge,
        currentmovedisplay: `${currentmove}`,
      })
    }
  }

  /* ---------------------------------------- */

  #prepareDefenses() {
    this.defenses = { parry: { bonus: 0 }, block: { bonus: 0 }, dodge: { bonus: 0 } }

    // NOTE: this used to check again whether equipment is equipped but this was already
    // done when _globalBonuses was gathered so is not necessary
    this._globalBonuses.forEach(bonus => {
      // TODO: revise type
      const match = (bonus.text as string).match(/\[(?<bonus>[+-]\d+)\s*DB\]/)

      if (match) {
        const bonusAmount = parseInt(match.groups?.bonus ?? '0')

        this.defenses.parry.bonus += bonusAmount
        this.defenses.block.bonus += bonusAmount
        this.defenses.dodge.bonus += bonusAmount
      }
    })

    this.equippedparry = this.parent.getItemAttacks({ attackType: 'melee' }).reduce((acc, attack) => {
      if (!attack.component.parry) return acc
      const newParry = parseInt(attack.component.parry)

      if (newParry > acc) acc = newParry

      return acc
    }, 0)

    this.equippedblock = this.parent.getItemAttacks({ attackType: 'melee' }).reduce((acc, attack) => {
      if (!attack.component.block) return acc
      const newblock = parseInt(attack.component.block)

      if (newblock > acc) acc = newblock

      return acc
    }, 0)
  }

  /* ---------------------------------------- */

  #prepareUserModifiers() {
    this.parent.items.forEach(item => {
      if (!(item as Item.Implementation).isOfType('featureV2', 'skillV2', 'spellV2', 'equipmentV2')) return

      for (const modifier of (item.system as BaseItemModel).itemModifiers.split('\n').map(line => line.trim())) {
        const modifierDescription = `${modifier} ${item.id}`

        if (!this.conditions.usermods.has(modifierDescription)) this.conditions.usermods.add(modifierDescription)
      }

      for (const attack of (item as Item.Implementation).getItemAttacks()) {
        if ((item.system as BaseItemModel).itemModifiers === '') continue

        for (const modifier of attack.component.itemModifiers.split('\n').map(line => line.trim())) {
          const modifierDescription = `${modifier} ${item.id}`

          if (!this.conditions.usermods.has(modifierDescription)) this.conditions.usermods.add(modifierDescription)
        }
      }
    })
  }

  #getCurrentMove(base: number): number {
    const doUpdateMove = this.getSetting(Settings.SETTING_MANEUVER_UPDATES_MOVE, false) && this.parent.inCombat

    const moveForManeuver = this.#getMoveAdjustmentForManeuver(base)
    const moveForPosture = this.#getMoveAdjustmentForPosture(base)

    this.conditions.move =
      moveForManeuver.value < moveForPosture.value ? moveForManeuver.tooltip : moveForPosture.tooltip

    if (doUpdateMove) {
      return Math.min(moveForManeuver.value, moveForPosture.value)
    } else {
      return base
    }
  }

  /* ---------------------------------------- */

  #getMoveAdjustmentForManeuver(base: number): { value: number; tooltip: string } {
    let tooltip = game.i18n?.localize('GURPS.moveFull') ?? ''
    const maneuver = GURPS.Maneuvers.get(this.conditions.maneuver!)

    if (maneuver) {
      tooltip = game.i18n?.localize(maneuver.label) ?? ''
      const override = this.#getMoveAdjustmentForOverride(base, maneuver.move)

      return override ?? { value: base, tooltip }
    }

    return { value: base, tooltip }
  }

  /* ---------------------------------------- */

  #getMoveAdjustmentForPosture(base: number): { value: number; tooltip: string } {
    let tooltip = game.i18n?.localize('GURPS.moveFull') ?? ''
    const posture = GURPS.StatusEffect.lookup(this.conditions.posture)

    if (posture) {
      tooltip = game.i18n?.localize(posture.name) ?? ''
      const override = this.#getMoveAdjustmentForOverride(base, posture.move)

      return override ?? { value: base, tooltip }
    }

    return { value: base, tooltip }
  }

  /* ---------------------------------------- */

  #getMoveAdjustmentForOverride(base: number, override: string | null): { value: number; tooltip: string } | null {
    switch (override) {
      case MOVE_NONE:
        return {
          value: 0,
          tooltip: game.i18n?.localize('GURPS.none') ?? '',
        }
      case MOVE_ONE:
        return {
          value: 1,
          // TODO: localize
          tooltip: '1 yd/sec',
        }
      case MOVE_STEP:
        return {
          value: Math.max(1, Math.ceil(base / 10)),
          // TODO: localize
          tooltip: 'Step',
        }
      case MOVE_TWO_STEPS:
        return {
          value: Math.max(1, Math.ceil(base / 10)) * 2,
          // TODO: localize
          tooltip: 'Step or Two',
        }
      case MOVE_ONETHIRD:
        return {
          value: Math.max(1, Math.ceil(base / 3)),
          // TODO: localize
          tooltip: '×1/3',
        }
      case MOVE_HALF:
        return {
          value: Math.max(1, Math.ceil(base / 2)),
          // TODO: localize
          tooltip: 'Half',
        }
      case MOVE_TWOTHIRDS:
        return {
          value: Math.max(1, Math.ceil((base * 2) / 3)),
          // TODO: localize
          tooltip: '×2/3',
        }
      default:
        return null
    }
  }

  /* ---------------------------------------- */
  /*   CRUD Handlers                          */
  /* ---------------------------------------- */

  protected override _onUpdate(
    changed: DeepPartial<foundry.abstract.TypeDataModel.ParentAssignmentType<CharacterSchema, Actor.Implementation>>,
    options: foundry.abstract.Document.Database.UpdateOptions<foundry.abstract.types.DatabaseUpdateOperation>,
    userId: string
  ): void {
    super._onUpdate(changed, options, userId)

    // Automatically set reeling / exhausted conditions based on HP/FP value
    if (this.getSetting(Settings.SETTING_AUTOMATIC_ONETHIRD, false)) {
      const doAnnounce = this.getSetting(Settings.SETTING_SHOW_CHAT_FOR_REELING_TIRED, false)

      if (changed.system?.HP?.value !== undefined) {
        const isReeling = changed.system.HP.value < this.HP.max / 3

        if (this.conditions.reeling !== isReeling) {
          this.parent.toggleStatusEffect('reeling', { active: isReeling })

          if (doAnnounce) {
            const tag = isReeling ? 'GURPS.chatTurnOnReeling' : 'GURPS.chatTurnOffReeling'
            const message =
              game.i18n?.format(tag, {
                name: this.parent.displayname,
                pdfref: game.i18n.localize('GURPS.pdfReeling'),
              }) ?? ''

            this.parent.sendChatMessage(message)
          }
        }
      }

      if (changed.system?.FP?.value !== undefined) {
        const isExhausted = changed.system.FP.value < this.FP.max / 3

        if (this.conditions.exhausted !== isExhausted) {
          this.parent.toggleStatusEffect('exhausted', { active: isExhausted })

          if (doAnnounce) {
            const tag = isExhausted ? 'GURPS.chatTurnOnTired' : 'GURPS.chatTurnOffTired'
            const message =
              game.i18n?.format(tag, {
                name: this.parent.displayname,
                pdfref: game.i18n.localize('GURPS.pdfTired'),
              }) ?? ''

            this.parent.sendChatMessage(message)
          }
        }
      }
    }
  }

  /* ---------------------------------------- */
  /*  Accessors                               */
  /* ---------------------------------------- */

  get currentMoveMode(): fields.SchemaField.SourceData<MoveSchema> | null {
    return this.moveV2.find(enc => enc.default) ?? null
  }

  /* ---------------------------------------- */

  get hitLocationsWithDR(): HitLocationEntry[] {
    return this.hitlocationsV2.map(location => {
      return new HitLocationEntry(location.where, location._dr ?? 0, location.rollText ?? '-', location.split)
    })
  }

  /* ---------------------------------------- */

  get _hitLocationRolls() {
    return this.hitlocationNames
    // return HitLocation.getHitLocationRolls(this.additionalresources?.bodyplan)
  }

  /* ---------------------------------------- */

  get torsoDR(): HitLocationEntryV2 | undefined {
    // We assume that the torso is the hit location with a penalty of 0.
    const torsoLocation = this.hitlocationsV2.find(location => location.penalty === 0)

    return torsoLocation
  }

  /* ---------------------------------------- */

  /**
   * Special GURPS logic: Based on world settings, maneuvers may be hidden for everyone (in which case, return an empty
   * array), or hidden for everyone except GM and Owner. Maneuvers might also be mapped to a different maneuver to
   * prevent others from knowing exactly what the token plans to do. If visible, the Maneuver should appear first in
   * the array.
   */
  getTemporaryEffects(effects: ActiveEffect.Implementation[]): ActiveEffect.Implementation[] {
    const maneuver = effects.find(effect => effect.isManeuver)

    if (!maneuver) return effects

    const nonManeuverEffects = effects.filter(effect => !effect.isManeuver)

    const visibility = this.getSetting(Settings.SETTING_MANEUVER_VISIBILITY, 'NoOne')

    if (visibility === 'NoOne') return nonManeuverEffects

    if (!game.user?.isGM && !this.parent.isOwner) {
      if (visibility === 'GMAndOwner') return nonManeuverEffects

      const detail = this.getSetting(Settings.SETTING_MANEUVER_DETAIL, 'General')

      if (detail === 'General' || (detail === 'NoFeint' && maneuver?.flags.gurps?.name === 'feint')) {
        if (maneuver.flags.gurps?.alt) maneuver.img = maneuver.getFlag('gurps', 'alt')!
      }
    }

    return [maneuver, ...nonManeuverEffects]
  }

  /* ---------------------------------------- */
  /*  Legacy Functionality                    */
  /* ---------------------------------------- */

  protected get _drBonusesFromItems(): Record<string, number> {
    return this._globalBonuses.reduce((acc: Record<string, number>, bonus: AnyObject) => {
      const bonusMatch = (bonus.text as string).match(/DR\s*([+-]\d+)\s*(.*)/)

      if (!bonusMatch) return acc

      const modifier = parseInt(bonusMatch[1])

      if (isNaN(modifier)) return acc

      const locationPatterns = splitArgs(bonusMatch[2] ?? '').map(name => new RegExp(makeRegexPatternFrom(name))) ?? []

      for (const location of this.hitlocationsV2) {
        if (!locationPatterns.some(pattern => location.where.match(pattern))) continue
        acc[location.where] = (acc[location.where] ?? 0) + modifier
      }

      return acc
    }, {})
  }

  /* ---------------------------------------- */

  /**
   * Update the .drMod property of hit locations based on the provided formula.
   * @param formula - The formula to apply to the DR.
   * @param locations - An array of hit location names to apply the formula to.
   * @returns An object indicating whether the DR was changed, a message, and any warnings.
   */
  async changeDR(
    formula: string,
    locations: string[]
  ): Promise<{ changed: boolean; msg: string; info?: string; warn?: string }> {
    let changed = false
    const actorLocations = this.hitlocationsV2
    let affectedLocations: string[] = []
    let availableLocations: string[] = []

    if (locations.length > 0) {
      // NOTE: The system only supports adding bonuses to locations in set body plans.
      // This part of the function effectively filters the locations to only those
      // matching an existing body plan.
      const bodyPlan = this.additionalresources.bodyplan

      if (bodyPlan === '') {
        return { changed: false, msg: '', warn: 'No body plan defined for the actor.' }
      }

      const table = HitLocations.HitLocation.getHitLocationRolls(bodyPlan)

      availableLocations = Object.keys(table).map(key => key.toLowerCase())

      // NOTE: this checks whether any of the provided location names contain the available location
      // name as a substring. This allows for partials like "arm" to match "left arm" or "right arm".
      affectedLocations = availableLocations.filter(key => locations.some(location => location.includes(key)))

      if (affectedLocations.length === 0) {
        return {
          changed: false,
          msg: `<p>No valid locations found using: <i>${locations.join(
            ', '
          )}</i>.</p><p>Available locations are: <ul><li>${availableLocations.join('</li><li>')}</li></ul>`,
          warn: `No matching hit locations found. Available locatios are: ${availableLocations.join(', ')}`,
        }
      }
    }

    const changes: Record<string, number | null> = {}

    for (const [index, value] of Object.entries(actorLocations)) {
      let processedFormula = '+0'

      if (locations.length === 0 || affectedLocations.includes(value.where.toLowerCase())) {
        changed = true
        processedFormula = formula
      }

      this.#addDRChanges(changes, processedFormula, value, index)
    }

    if (changed) {
      const msg = `${this.parent.name}: DR ${formula} applied to ${affectedLocations.length > 0 ? affectedLocations.join(', ') : 'all hit locations'}.`

      // const validChanges = this.#validDRChanges(changes)
      await this.parent.update(changes as Actor.UpdateData)

      return { changed, msg, info: msg }
    }

    return { changed, msg: '', info: `${this.parent.name}: /dr command with formula ${formula} had no effect.` }
  }

  /* ---------------------------------------- */

  #addDRChanges(
    changes: Record<string, number | null>,
    formula: string,
    value: HitLocationEntryV2,
    index: string
  ): void {
    let dr = value._dr ?? 0
    let drMod = value.drMod ?? 0
    let drCap: number | null = value.drCap ?? null
    let drItem = value.drItem ?? 0

    if (formula === 'reset') {
      dr = value.import
      drMod = 0
      drCap = null
      drItem = 0
    } else {
      switch (formula.charAt(0)) {
        case '+':
        case '-':
          // If the formula starts with + or -, we assume it's a simple modifier
          drMod += parseInt(formula)
          break
        case '*':
          if (drCap === null) drCap = Math.max(0, value.import + drItem)
          drCap *= parseInt(formula.slice(1))
          dr = drCap
          drMod = drCap - drItem - value.import
          break
        case '/':
          if (drCap === null) drCap = Math.max(0, value.import + drItem)
          drCap = Math.max(0, Math.floor(drCap / parseInt(formula.slice(1))))
          dr = drCap
          drMod = drCap - drItem - value.import
          break
        case '!': {
          const mod = parseInt(formula.slice(1))

          drMod = mod
          dr = mod
          drCap = mod
          break
        }

        default:
          drMod = parseInt(formula)
          dr = Math.max(0, value.import, drMod, drItem)
          drCap = dr
      }
    }

    changes[`system.hitlocationsV2.${index}._dr`] = dr
    changes[`system.hitlocationsV2.${index}.drMod`] = drMod
    changes[`system.hitlocationsV2.${index}.drCap`] = drCap
    changes[`system.hitlocationsV2.${index}.import`] = value.import
  }

  /* ---------------------------------------- */

  findTrait(name: string): Item.OfType<'featureV2'> | null {
    return this.allAdsV2.find(trait => trait.name.toLowerCase().includes(name.toLowerCase())) ?? null
  }

  findAdvantage(name: string): Item.OfType<'featureV2'> | null {
    return this.findTrait(name)
  }

  /* ---------------------------------------- */

  async accumulateDamageRoll(action: fields.SchemaField.InitializedData<DamageActionSchema>): Promise<void> {
    const accumulatedActions = this.conditions.damageAccumulators

    const existingActionIndex = accumulatedActions.findIndex(
      accumulatedAction => accumulatedAction.orig === action.orig
    )

    if (existingActionIndex !== -1) return this.incrementDamageAccumulator(existingActionIndex)

    action.count = 1
    action.accumulate = null
    accumulatedActions.push(action)

    await this.parent.update({ 'system.conditions.damageAccumulators': accumulatedActions } as Actor.UpdateData)
  }

  /* ---------------------------------------- */

  async incrementDamageAccumulator(index: number): Promise<void> {
    const count = (this.conditions.damageAccumulators[index].count ?? 0) + 1

    await this.parent.update({ [`system.conditions.damageAccumulators.${index}.accumulate`]: count })
  }

  /* ---------------------------------------- */

  async decrementDamageAccumulator(index: number): Promise<void> {
    const count = (this.conditions.damageAccumulators[index].count ?? 0) - 1

    if (count < 1) {
      const accumulators = this.conditions.damageAccumulators

      accumulators.splice(index, 1)

      // @ts-expect-error: not sure why the path is not recognised
      await this.parent.update({ 'system.conditions.damageAccumulators': accumulators })
    } else await this.parent.update({ [`system.conditions.damageAccumulators.${index}.accumulate`]: count })
  }

  /* ---------------------------------------- */

  async clearDamageAccumulator(index: number): Promise<void> {
    const accumulators = this.conditions.damageAccumulators

    accumulators.splice(index, 1)
    // @ts-expect-error: not sure why the path is not recognised
    await this.parent.update({ 'system.conditions.damageAccumulators': accumulators })
  }

  /* ---------------------------------------- */

  async applyDamageAccumulator(index: number): Promise<void> {
    const accumulators = this.conditions.damageAccumulators
    const accumulator = accumulators[index]

    const roll = multiplyDice(accumulator.roll ?? '', accumulator.count ?? 1)

    if (accumulator.costs) {
      const costs = accumulator.costs.match(COSTS_REGEX)

      if (costs)
        accumulator.costs = `*${costs.groups?.verb} ${accumulator?.count ?? 0 * parseInt(costs.groups?.cost ?? '0')} ${costs.groups?.type}`
    }

    accumulator.roll = roll ?? null

    // @ts-expect-error: not sure why the path is not recognised
    await this.parent.update({ 'system.conditions.damageAccumulators': accumulators })
    await GURPS.performAction(accumulator as unknown as GurpsAction, GURPS.LastActor)
  }

  /* ---------------------------------------- */

  // NOTE: change from previous schema, where path was used instead of index
  async removeTracker(index: number): Promise<void> {
    const trackers = this.additionalresources.tracker

    if (index < 0 || index >= trackers.length) return
    trackers.splice(index, 1)
    // @ts-expect-error: not sure why the path is not recognised
    await this.parent.update({ 'system.additionalresources.tracker': trackers })
  }

  /* ---------------------------------------- */

  async addTracker(): Promise<void> {
    const trackers = this.additionalresources.tracker ?? []

    trackers.push(new TrackerInstance())
    // @ts-expect-error: not sure why the path is not recognised
    await this.parent.update({ 'system.additionalresources.tracker': trackers })
  }

  /* ---------------------------------------- */

  get trackersByName(): Record<string, TrackerInstance> {
    return this.additionalresources.tracker.reduce((acc: Record<string, TrackerInstance>, tracker: TrackerInstance) => {
      acc[tracker.name] = tracker

      return acc
    }, {})
  }

  /* ---------------------------------------- */

  // @deprecated -- Use GurpsActorV2.setMoveDefault instead.
  async setMoveDefault(value: string): Promise<void> {
    const move = this.moveV2

    move.forEach((moveEntry: fields.SchemaField.SourceData<MoveSchema>) => {
      moveEntry.default = moveEntry.mode === value
    })

    await this.parent.update({ 'system.moveV2': move } as Actor.UpdateData)
  }

  /* ---------------------------------------- */

  async addMoveMode({
    mode,
    basic,
    enhanced,
    isDefault = false,
  }: {
    mode: string
    basic: number
    enhanced?: number
    isDefault?: boolean
  }): Promise<void> {
    const move = this.moveV2 ?? []
    const existingMove = move.find(entry => entry.mode === mode)

    if (existingMove) {
      existingMove.basic = basic ?? existingMove.basic
      existingMove.enhanced = enhanced ?? existingMove.enhanced
      existingMove.default = isDefault ?? existingMove.default
    } else {
      move.push({
        mode,
        basic: basic,
        enhanced: enhanced ?? basic ?? 0,
        default: isDefault ?? move.length === 0,
      })
    }

    await this.parent.update({ 'system.moveV2': move } as Actor.UpdateData)
  }

  /* ---------------------------------------- */

  getChecks(checkType: string): {
    data: Array<CheckInfo>
    size: number
  } {
    const checks: Array<CheckInfo> = []

    switch (checkType) {
      case 'attributeChecks':
        Object.entries(this.attributes).forEach(([key, attribute]) => {
          checks.push({
            symbol: game.i18n?.localize(`GURPS.attributes${key}`) ?? '',
            label: game.i18n?.localize(`GURPS.attributes${key}NAME`) ?? '',
            value: attribute.import,
            notes: '',
            otf: key,
            isOTF: true,
          })
        })

        return { data: checks, size: checks.length }
      case 'otherChecks':
        checks.push(
          ...[
            {
              symbol: 'fa-solid fa-eye',
              label: game.i18n?.localize('GURPS.vision') ?? '',
              value: this.vision,
              otf: 'vision',
              isOTF: true,
            },
            {
              symbol: 'fa-solid fa-ear',
              label: game.i18n?.localize('GURPS.hearing') ?? '',
              value: this.hearing,
              otf: 'hearing',
              isOTF: true,
            },
            {
              symbol: 'fa-solid fa-face-scream',
              label: game.i18n?.localize('GURPS.frightcheck') ?? '',
              value: this.frightcheck,
              otf: 'frightcheck',
              isOTF: true,
            },
            {
              symbol: 'fa-solid fa-hand',
              label: game.i18n?.localize('GURPS.touch') ?? '',
              value: this.touch,
              otf: 'touch',
              isOTF: true,
            },
            {
              symbol: 'fa-solid fa-nose',
              label: game.i18n?.localize('GURPS.tastesmell') ?? '',
              value: this.tastesmell,
              otf: 'tastesmell',
              isOTF: true,
            },
            {
              symbol: 'fa-solid fa-hand-point-up',
              label: game.i18n?.localize('GURPS.touch') ?? '',
              value: this.touch,
              otf: 'touch',
              isOTF: true,
            },
            {
              symbol: 'fa-solid fa-sword',
              label: game.i18n?.localize('GURPS.thrust') ?? '',
              value: this.thrust,
              otf: 'thrust',
              isOTF: true,
            },
            {
              symbol: 'fa-solid fa-mace',
              label: game.i18n?.localize('GURPS.swing') ?? '',
              value: this.swing,
              otf: 'swing',
              isOTF: true,
            },
          ]
        )

        return { data: checks, size: checks.length }
      case 'attackChecks':
        checks.push(
          ...this.parent.items
            .reduce((acc: (MeleeAttackModel | RangedAttackModel)[], item) => {
              acc.push(...(item as Item.Implementation).getItemAttacks())

              return acc
            }, [])
            .map(attack => {
              const otfName = attack.component.mode ? `${attack.name} (${attack.component.mode})` : attack.name

              return {
                img: attack.img ?? '',
                symbol: game.i18n?.localize(`GURPS.attack${attack.name}`) ?? '',
                label: attack.name ?? '',
                value: attack.component.import,
                mode: attack.component.mode,
                otf: attack.type === 'meleeAttack' ? `M:"${otfName}"` : `R:"${otfName}"`,
                isOTF: true,
                otfDamage: `D:"${otfName}"`,
              }
            })
        )

        return { data: checks, size: checks.length }
      case 'defenseChecks':
        checks.push(
          {
            symbol: 'dodge',
            label: game.i18n?.localize('GURPS.dodge') ?? '',
            value: this.currentdodge,
            otf: 'dodge',
            isOTF: true,
          }
          // TODO: implement getItemAttacks on actor
        )
        this.parent.getItemAttacks({ attackType: 'melee' }).reduce((acc, attack) => {
          const symbol = game.i18n?.localize(`GURPS.${attack.name}`) ?? ''
          const img = attack.img
          const otfName = attack.component.mode ? `"${attack.name} (${attack.component.mode})"` : `"${attack.name}"`

          if (!isNaN(parseInt(attack.component.parry)))
            acc.push({
              symbol,
              img: img ?? '',
              label: attack.name ?? '',
              value: attack.component.parry,
              mode: attack.component.mode,
              otf: `P:${otfName}`,
              isOTF: true,
            })

          if (!isNaN(parseInt(attack.component.block)))
            acc.push({
              symbol,
              img: img ?? '',
              label: attack.name ?? '',
              value: attack.component.block,
              mode: attack.component.mode,
              otf: `B:${otfName}`,
              isOTF: true,
            })

          return acc
        }, checks)

        return { data: checks, size: checks.length }

      case 'markedChecks': {
        const items = this.parent.items.filter(item =>
          (item as Item.Implementation).isOfType('featureV2', 'skillV2', 'spellV2')
        )

        for (const item of items) {
          if (item.system.addToQuickRoll) {
            const type = item.type === 'featureV2' ? 'ad' : item.type
            let value = 0

            if ((item as Item.Implementation).isOfType('skillV2'))
              value = (item as Item.OfType<'skillV2'>).system.component.import
            if ((item as Item.Implementation).isOfType('spellV2'))
              value = (item as Item.OfType<'spellV2'>).system.component.import

            checks.push({
              symbol: game.i18n?.localize(`GURPS.${type}`) ?? '',
              img: item.img ?? '',
              label: item.name,
              value,
              notes: item.system.component.notes,
              otf: `${type}:"${item.name}"`,
              isOTF: false,
            })
          }
        }

        return { data: checks, size: checks.length }
      }

      default:
        return { data: [], size: 0 }
    }
  }

  /* ---------------------------------------- */

  async addTaggedRollModifiers(
    chatThing: string,
    optionalArgs: { obj?: AnyObject },
    attack?: MeleeAttackModel | RangedAttackModel
  ): Promise<boolean> {
    let isDamageRoll = false

    const taggedSettings = this.getSetting(
      Settings.SETTING_USE_TAGGED_MODIFIERS,
      null
    ) as TaggedModifiersSettings | null

    if (!taggedSettings) return false

    const allRollTags: string[] = taggedSettings.allRolls.split(',').map((tag: string) => tag.trim().toLowerCase())

    let itemRef = ''
    let allTags: string[] = []
    let refTags: string[] = []
    let modifierTags: string[] = []

    if (optionalArgs.obj) {
      // Get modifiers from action object
      const correspondingTags: Record<string, (keyof typeof taggedSettings)[]> = {
        m: ['allAttackRolls', 'allMeleeRolls'],
        r: ['allAttackRolls', 'allRangedRolls'],
        p: ['allDefenseRolls', 'allDefenseRolls'],
        b: ['allDefenseRolls', 'allBlockRolls'],
        d: ['allDamageRolls'],
        sk: ['allSkillRolls'],
        sp: ['allSpellRolls'],
      }

      const ref = chatThing
        .split('@')
        .pop()!
        .match(/(\S+):/)?.[1]
        .toLowerCase()

      if (ref && correspondingTags[ref]) {
        if (ref === 'd') isDamageRoll = true

        for (const tag of correspondingTags[ref]) {
          refTags.push(
            ...(taggedSettings[tag] as string).split(',').map((tagValue: string) => tagValue.trim().toLowerCase())
          )
        }
      }

      modifierTags =
        (optionalArgs.obj.modifierTags as string)?.split(',').map((tag: string) => tag.trim().toLowerCase()) ?? []
      allTags = [...modifierTags, ...allRollTags, ...refTags]
      itemRef = (optionalArgs.obj.name as string) ?? ''
    } else if (chatThing) {
      // Get modifiers from chat string
      const correspondingTags: Record<string, (keyof typeof taggedSettings)[]> = {
        st: ['allAttributesRolls', 'allSTRolls'],
        dx: ['allAttributesRolls', 'allDXRolls'],
        iq: ['allAttributesRolls', 'allIQRolls'],
        ht: ['allAttributesRolls', 'allHTRolls'],
        will: ['allWILLRolls'],
        per: ['allPERRolls'],
        frightcheck: ['allFRIGHTCHECKRolls'],
        vision: ['allVISIONRolls'],
        hearing: ['allHEARINGRolls'],
        tastesmell: ['allTASTESMELLRolls'],
        touch: ['allTOUCHRolls'],
        cr: ['allCRRolls'],
        dodge: ['allDefenseRolls', 'allDODGERolls'],
        p: ['allDefenseRolls', 'allParryRolls'],
        b: ['allDefenseRolls', 'allBlockRolls'],
      }

      const ref = chatThing.split('@').pop()!.toLowerCase().replace(' ', '').slice(0, -1).toLowerCase().split(':')[0]
      const regex = /(?<="|:).+(?=\s\(|"|])/gm

      if (ref && correspondingTags[ref]) {
        if (ref === 'p' || ref === 'b') {
          itemRef = chatThing.match(regex)?.[0] ?? ''
          if (itemRef !== '') itemRef = itemRef.replace(/"/g, '').split('(')[0].trim()
        }

        for (const tag of correspondingTags[ref]) {
          refTags.push(
            ...(taggedSettings[tag] as string).split(',').map((tagValue: string) => tagValue.trim().toLowerCase())
          )
        }
      }
    } else {
      // Get modifiers from attack/damage roll
      if (!attack) {
        refTags = taggedSettings.allDamageRolls.split(',').map((tag: string) => tag.trim().toLowerCase())
        isDamageRoll = true
      } else {
        refTags = taggedSettings.allAttackRolls.split(',').map((tag: string) => tag.trim().toLowerCase())
      }

      const attackMods = attack?.component?.modifierTags ?? []

      modifierTags = [...allRollTags, ...attackMods, ...refTags]
      itemRef = attack?.name ?? ''
    }

    // Get modifiers from user mods
    const userMods = this.conditions.usermods ?? []

    // Get modifiers from self mods
    const selfMods =
      this.conditions.self.modifiers?.map(mod => {
        const key = mod.match(/(GURPS.\w+)/)?.[1] || ''

        return key ? game.i18n?.localize(key) + mod.replace(key, '') : mod
      }) ?? []

    // Get modifiers from target mods
    const targetMods =
      game.user?.targets.reduce((acc: string[], target: Token.Implementation) => {
        const actor = target.actor

        if (!actor || !actor.isOfType('character', 'enemy')) return acc

        acc.push(
          ...((actor.system as CharacterModel).conditions.target.modifiers?.map(mod => {
            const key = mod.match(/(GURPS.\w+)/)?.[1] || ''

            return key ? game.i18n?.localize(key) + mod.replace(key, '') : mod
          }) ?? [])
        )

        return acc
      }, []) ?? []

    const actorInCombat = this.parent.inCombat
    const allMods: string[] = [...userMods, ...selfMods, ...targetMods]

    for (const mod of allMods) {
      const userModsTags: string[] = (mod.match(/#(\S+)/g) ?? [])?.map((tag: string) => tag.slice(1).toLowerCase())

      for (const tag of userModsTags) {
        let canApply = true

        if (mod.includes('#maneuver'))
          canApply = allTags.includes(tag) && (mod.includes(itemRef) || mod.includes('@man:'))

        // If the modifier should apply only to a specific item (e.g. specific usage of a weapon) account for this
        if ('itemPath' in optionalArgs && typeof optionalArgs.itemPath === 'string')
          canApply = canApply && (mod.includes(optionalArgs.itemPath) || !mod.includes('@system'))

        if (actorInCombat)
          canApply =
            canApply && (!taggedSettings.nonCombatOnlyTag || !allTags.includes(taggedSettings.nonCombatOnlyTag))
        else canApply = canApply && (!taggedSettings.combatOnlyTag || !allTags.includes(taggedSettings.combatOnlyTag))

        if (canApply) {
          const regex = new RegExp(/^[+-]\d+(.*?)(?=[#@])/)
          const desc = mod.match(regex)?.[1].trim() || ''
          const effectiveMod = mod.match(/[-+]\d+/)?.[0] || '0'

          // TODO: evaluate whether this causes too many data preparation cycles
          await GURPS.ModifierBucket.addModifier(effectiveMod, desc, undefined, true)
        }
      }
    }

    return isDamageRoll
  }

  /* ---------------------------------------- */

  /**
   * Parse roll info based on action type.
   *
   * @param {object} action - Object from GURPS.parselink
   * @param {string} chatthing - internal code for roll
   * @param {string} formula - formula for roll
   * @param {string} thing - name of the source of the roll
   * @returns {{}} result
   * @returns {string} result.name - Name of the action which originates the roll
   * @returns {[string]} result.uuid - UUID of the actor component that originates the roll
   * @returns {[string]} result.itemId - ID of the item that originates the roll
   * @returns {[string]} result.fromItem - ID of the parent item of the item that originates the roll
   * @returns {[string]} result.pageRef - Page reference of the item that originates the roll
   */
  findUsingAction(
    action: { type: string; name: string; orig: string; overridetxt?: string; attrkey?: string },
    chatthing: string,
    formula: string,
    thing: string
  ): { name: string; uuid: string | null; itemId: string | null; fromItem: string | null; pageRef: string | null } {
    const originType: string | null = action ? action.type : null
    let name: string, mode: string | undefined

    switch (originType) {
      case 'attack': {
        name = action.name.split('(')[0].trim()
        mode = action.name.match(/\((.+)\)/)?.[1]
        const attackType = action.orig.toLowerCase().startsWith('m:') ? 'melee' : 'ranged'
        const weapon = this.parent
          // @ts-expect-error: Not sure why this isn't resolving correctly.
          .getItemAttacks({ attackType })
          .find(attackEntry => attackEntry.name === name && (!mode || attackEntry.component.mode === mode))

        if (weapon)
          return {
            name: weapon.name ?? '',
            uuid: weapon.uuid,
            itemId: weapon.id,
            fromItem: weapon.item.id,
            pageRef: null,
          }
        else
          return {
            name: thing,
            uuid: null,
            itemId: null,
            fromItem: null,
            pageRef: null,
          }
      }
      case 'weapon-block':
      case 'weapon-parry': {
        name = action.name.split('(')[0].trim()
        mode = action.name.match(/\((.+?)\)/)?.[1]
        const weapon = this.parent
          .getItemAttacks({ attackType: 'melee' })
          .find(attackEntry => attackEntry.name === name && (!mode || attackEntry.component.mode === mode))

        if (weapon)
          return {
            name: weapon.name ?? '',
            uuid: weapon.uuid,
            itemId: weapon.id,
            fromItem: weapon.item.id,
            pageRef: null,
          }
        else
          return {
            name: thing,
            uuid: null,
            itemId: null,
            fromItem: null,
            pageRef: null,
          }
      }
      case 'skill-spell': {
        const item = [...this.allSkillsV2, ...this.allSpellsV2].find(skillOrSpell => skillOrSpell.name === action.name)

        if (item)
          return {
            name: item.name,
            uuid: item.uuid,
            itemId: item.id,
            fromItem: item.id,
            pageRef: item.system.component.pageref,
          }
        else
          return {
            name: action.name,
            uuid: null,
            itemId: null,
            fromItem: null,
            pageRef: null,
          }
      }
      case 'attribute': {
        let attrName = action?.overridetxt

        if (!attrName) attrName = game.i18n?.localize(`GURPS.${action.attrkey?.toLowerCase()}`) ?? ''
        if (attrName.startsWith('GURPS')) attrName = game.i18n?.localize(`GURPS.attributes${action.attrkey}NAME`) ?? ''

        return {
          name: attrName,
          uuid: null,
          itemId: null,
          fromItem: null,
          pageRef: null,
        }
      }
      case 'controlroll': {
        return {
          name: action.overridetxt || action.orig,
          uuid: null,
          itemId: null,
          fromItem: null,
          pageRef: null,
        }
      }

      default: {
        return {
          name: thing ? thing : chatthing ? chatthing.split('/[')[0] : formula,
          uuid: null,
          itemId: null,
          fromItem: null,
          pageRef: null,
        }
      }
    }
  }

  /* ---------------------------------------- */

  // #validDRChanges(changes: Record<string, any>): Record<string, any> {
  //   const array = foundry.utils.deepClone(this._source.hitlocationsV2)
  //   const regex = /^system\.hitlocationsV2\.(\d+)\..*/

  //   for (const [key, value] of Object.entries(changes)) {
  //     const index = parseInt(key.replace(regex, '$1'))
  //     const field = key.replace(regex, '')

  //     // @ts-expect-error
  //     array[index][field] = value
  //   }
  //   return { 'system.hitlocationsV2': array }
  // }
}

/* ---------------------------------------- */

const characterSchema = () => {
  return {
    // Default attributes
    attributes: new fields.SchemaField(
      {
        ST: new fields.SchemaField(attributeSchema(), { required: true, nullable: false }),
        DX: new fields.SchemaField(attributeSchema(), { required: true, nullable: false }),
        IQ: new fields.SchemaField(attributeSchema(), { required: true, nullable: false }),
        HT: new fields.SchemaField(attributeSchema(), { required: true, nullable: false }),
        WILL: new fields.SchemaField(attributeSchema(), { required: true, nullable: false }),
        PER: new fields.SchemaField(attributeSchema(), { required: true, nullable: false }),
        QN: new fields.SchemaField(attributeSchema(), { required: true, nullable: false }),
      },
      { required: true, nullable: false }
    ),

    // TODO In some future update, consider moving all of these to the attributes structure.
    // ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎

    // Built-in pools
    HP: new fields.SchemaField(poolSchema(), { required: true, nullable: false }),
    FP: new fields.SchemaField(poolSchema(), { required: true, nullable: false }),
    QP: new fields.SchemaField(poolSchema(), { required: true, nullable: false }),

    // Other attributes which don't count as core in this version of the system
    dodge: new fields.SchemaField({
      value: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    }),

    basicmove: new fields.SchemaField({
      // NOTE: change from previous data model, uses number instead of string type as value is always a number
      value: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
      points: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    }),

    basicspeed: new fields.SchemaField({
      // NOTE: change from previous data model, uses number instead of string type as value is always a number
      value: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
      points: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    }),

    frightcheck: new fields.NumberField({ required: true, nullable: false, initial: 0, label: 'GURPS.frightcheck' }),
    hearing: new fields.NumberField({ required: true, nullable: false, initial: 0, label: 'GURPS.hearing' }),
    tastesmell: new fields.NumberField({ required: true, nullable: false, initial: 0, label: 'GURPS.tastesmell' }),
    vision: new fields.NumberField({ required: true, nullable: false, initial: 0, label: 'GURPS.vision' }),
    touch: new fields.NumberField({ required: true, nullable: false, initial: 0, label: 'GURPS.touch' }),

    // NOTE: may want to revise this in the future to a custom DiceField or the like
    thrust: new fields.StringField({ required: true, nullable: false, label: 'GURPS.thrust' }),
    // NOTE: may want to revise this in the future to a custom DiceField or the like
    swing: new fields.StringField({ required: true, nullable: false, label: 'GURPS.swing' }),
    // ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎

    // NOTE: Change from previous schema; the encumbrance data is derived and only the current level is stored.
    // encumbrance: new fields.ArrayField(
    //   new fields.SchemaField(encumbranceSchema(), { required: true, nullable: false })
    // ),

    // TODO AdditionalResources was created by Chris to cover additional stuff that we didn't plan for. It allowed us
    // to add persistent fields without declaring them in the schema (and doing a subsdquent migration). We should
    // consider finding real homes for this data AND allowing for arbitrary additions without changing the schema.
    // Perhaps a ObjectModel? Or flags?
    additionalresources: new fields.SchemaField(
      {
        qnotes: new fields.StringField({ required: true, nullable: false }),
        // TODO This could be a trait instead.
        bodyplan: new fields.StringField({ required: true, nullable: false }),
        tracker: new fields.ArrayField(new fields.EmbeddedDataField(TrackerInstance), {
          required: true,
          nullable: false,
        }),
        importname: new fields.StringField({ required: true, nullable: true }),
        // NOTE: Should be a FilePathField but these do not allow arbitrary file extension.
        // TODO: implement FilePathField with arbitrary file extension support
        importpath: new fields.StringField({ required: true, nullable: true }),
        // NOTE: Change to schema; Save only the index of the current encumbrance level.
        currentEncumbrance: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
      },
      { required: true, nullable: false }
    ),

    conditionalinjury: new fields.SchemaField(
      {
        RT: new fields.SchemaField(
          {
            value: new fields.NumberField({ required: true, nullable: false, initial: 4 }),
            points: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
          },
          { required: true, nullable: false }
        ),
        injury: new fields.SchemaField(
          {
            severity: new fields.StringField({ required: true, nullable: false, initial: 0 }),
            daystoheal: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
          },
          { required: true, nullable: false }
        ),
      },
      { required: true, nullable: false }
    ),

    traits: new fields.SchemaField(
      {
        title: new fields.StringField({ required: true, nullable: false }),
        race: new fields.StringField({ required: true, nullable: false }),
        height: new fields.StringField({ required: true, nullable: false }),
        weight: new fields.StringField({ required: true, nullable: false }),
        age: new fields.StringField({ required: true, nullable: false }),
        birthday: new fields.StringField({ required: true, nullable: false }),
        religion: new fields.StringField({ required: true, nullable: false }),
        gender: new fields.StringField({ required: true, nullable: false }),
        eyes: new fields.StringField({ required: true, nullable: false }),
        hair: new fields.StringField({ required: true, nullable: false }),
        hand: new fields.StringField({ required: true, nullable: false }),
        skin: new fields.StringField({ required: true, nullable: false }),
        // NOTE: change from previous data model, uses number instead of string type as value is always a number
        sizemod: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
        techlevel: new fields.StringField({ required: true, nullable: false }),
        createdon: new fields.StringField({ required: true, nullable: false }),
        modifiedon: new fields.StringField({ required: true, nullable: false }),
        player: new fields.StringField({ required: true, nullable: false }),
      },
      { required: true, nullable: false }
    ),

    totalpoints: new fields.SchemaField(
      {
        attributes: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
        ads: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
        disads: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
        quirks: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
        skills: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
        spells: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
        total: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
        unspent: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
        race: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
      },
      { required: true, nullable: false }
    ),

    hitlocationsV2: new fields.ArrayField(
      new fields.EmbeddedDataField(HitLocationEntryV2, { required: true, nullable: false }),
      { required: true, nullable: false }
    ),

    // NOTE: Change from previous schema where these fields were part of the schema. They are now derived properties
    // reactions: new fields.ArrayField(new fields.SchemaField(reactionSchema(), { required: true, nullable: false }), {
    //   required: true,
    //   nullable: false,
    // }),
    // conditionalmods: new fields.ArrayField(
    //   new fields.SchemaField(reactionSchema(), { required: true, nullable: false }),
    //   {
    //     required: true,
    //     nullable: false,
    //   }
    // ),

    conditions: new fields.SchemaField(conditionsSchema(), { required: true, nullable: false }),

    // TODO Different move modes can be added based on Traits such as "Flight". Perhaps it's completely derived from Traits?
    // * "Normal" - Ground (Basic Move)/Air (0)/Water (Basic Move / 5)
    // * Amphibious = Ground (Basic Move)/Water (Basic Move)
    // * Aquatic = Ground (0) and Water (Basic Move)
    // * Flight = Ground (Basic Move)/Air (Basic Move x 2)
    // * Walk on Air = Ground (Basic Move)/Air (Basic Move)
    // * Flight (Newtonian Space Flight or Space Flight) = Ground (Basic Speed)/Air (Basic Speed x 2)/Space (Basic
    //   Speed x2)
    // * Flight (Space Flight Only AND one of Newtonian Space Flight or Space Flight) = Ground (Basic Speed)/Air (0)/
    //    Space (Basic Speed x2)
    //
    //  Enhanced Move = (Basic Speed x level; half level x 1.5) For ONE move mode
    //
    // * Tunneling = Underground (1 yard per level)
    moveV2: new fields.ArrayField(new fields.SchemaField(moveSchema(), { required: true, nullable: false }), {
      required: true,
      nullable: false,
      default: [{ mode: 'GURPS.moveModeGround', basic: 5, enhanced: null, default: true }],
    }),

    allNotes: new fields.ArrayField(new fields.EmbeddedDataField(NoteV2, { required: true, nullable: false }), {
      required: true,
      nullable: false,
    }),

    // NOTE: the following have been replaced with Items or accessors in the new model, and thus should not be used.
    // They are commented out but this note is kept here for reference.
    // ads: new fields.ObjectField(),
    // languages: new fields.ObjectField(),
    // skills: new fields.ObjectField(),
    // spells: new fields.ObjectField(),
    // money: new fields.ObjectField(),
    // melee: new fields.ObjectField(),
    // ranged: new fields.ObjectField(),
    // notes: new fields.ObjectField(),
    // equipment: new fields.SchemaField({
    // 	carried: new fields.ObjectField(),
    // 	other: new fields.ObjectField(),
    // }, { required: true, nullable: false }),
  }
}

type CharacterSchema = ReturnType<typeof characterSchema>

/* ---------------------------------------- */

export { CharacterModel, type CharacterSchema }
