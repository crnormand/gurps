import {
  attributeSchema,
  conditionsSchema,
  DamageActionSchema,
  EncumbranceSchema,
  LiftingMovingSchema,
  MoveSchema,
  moveSchema,
  poolSchema,
  reactionSchema,
} from './character-components.js'
import fields = foundry.data.fields
import { HitLocationEntry } from './hit-location-entry.js'
import { BaseItemModel } from '../../item/data/base.js'
import { AnyObject, DeepPartial } from 'fvtt-types/utils'
import { makeRegexPatternFrom, splitArgs } from '../../../lib/utilities.js'
import { HitLocation } from '../../hitlocation/hitlocation.js'
import * as Settings from '../../../lib/miscellaneous-settings.js'
import { BaseActorModel } from './base.js'
import {
  MOVE_HALF,
  MOVE_NONE,
  MOVE_ONE,
  MOVE_ONETHIRD,
  MOVE_STEP,
  MOVE_TWO_STEPS,
  MOVE_TWOTHIRDS,
} from '../maneuver.js'
import { multiplyDice } from '../../utilities/damage-utils.js'
import { COSTS_REGEX } from '../../../lib/parselink.js'
import { TrackerInstance } from '../../resource-tracker/resource-tracker.js'

class CharacterModel extends BaseActorModel<CharacterSchema> {
  static override defineSchema(): CharacterSchema {
    return characterSchema()
  }

  /* ---------------------------------------- */
  /*  Instance properties                     */
  /* ---------------------------------------- */

  // Item collections
  declare ads: ConfiguredItem<'feature'>['document'][]
  declare skills: ConfiguredItem<'skill'>['document'][]
  declare spells: ConfiguredItem<'spell'>['document'][]
  // FIXME: There is no note item type. Not sure what to do with this yet
  // declare notes: ConfiguredItem<'feature'>[]
  declare equipment: {
    carried: ConfiguredItem<'equipment'>['document'][]
    other: ConfiguredItem<'equipment'>['document'][]
  }

  /* ---------------------------------------- */

  // Derived properties
  declare encumbrance: fields.SchemaField.SourceData<EncumbranceSchema>[]
  declare liftingmoving: fields.SchemaField.SourceData<LiftingMovingSchema>
  declare hitlocationNames: Record<string, HitLocationEntry>

  declare eqtsummary: {
    eqtcost: number
    eqtlbs: number
    othercost: number
    otherlbs: number
  }

  declare defenses: {
    parry: { bonus: number }
    block: { bonus: number }
    dodge: { bonus: number }
  }

  equippedparry: number = 0
  equippedblock: number = 0
  currentdodge: number = 0
  currentmove: number = 0
  currentflight: number = 0

  moveoverride: { maneuver: string | null; posture: string | null } = {
    maneuver: null,
    posture: null,
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
    // TODO: verify whether this should be fully reset
    this.conditions = {
      ...this.conditions,
      posture: 'standing',
      maneuver: 'ready',
      self: { modifiers: [] },
      target: { modifiers: [] },
      usermods: [],
      reeling: false,
      exhausted: false,
    }

    // Add the default size modifier to the target conditions
    if (this.traits.sizemod !== 0) {
      const sizeModifier = this.traits.sizemod > 0 ? `+${this.traits.sizemod}` : `${this.traits.sizemod}`
      this.conditions.target?.modifiers?.push(game.i18n?.format('GURPS.modifiersSize', { sm: sizeModifier }) ?? '')
    }

    // Reset the hitlocationNames object
    this.hitlocationNames = this.#prepareHitLocationNames()

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

    this.ads = this.parent.items.filter(item => item.isOfType('feature'))
    this.skills = this.parent.items.filter(item => item.isOfType('skill'))
    this.spells = this.parent.items.filter(item => item.isOfType('spell'))
    const equipment = this.parent.items.filter(item => item.isOfType('equipment'))
    this.equipment = {
      carried: equipment.filter(item => item.system.carried === true),
      other: equipment.filter(item => item.system.carried === false),
    }

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

    // Set currernt maneuver to maneuver active effect if a valid one is present
    const maneuverEffect = this.parent.effects.find(effect => effect.statuses.some(status => status === 'maneuver'))
    this.conditions.maneuver = maneuverEffect ? maneuverEffect.flags.gurps.name : null
  }

  /* ---------------------------------------- */

  #prepareHitLocationNames(): Record<string, HitLocationEntry> {
    return this.hitlocations.reduce((acc: Record<string, HitLocationEntry>, location) => {
      acc[location.where] = location
      return acc
    }, {})
  }

  /* ---------------------------------------- */

  #prepareEquipmentSummary() {
    const onlyCountEquipped = game.settings?.get(Settings.SYSTEM_NAME, Settings.SETTING_CHECK_EQUIPPED) ?? false
    const numberToTwoDP = (num: number) => Math.round(num * 100) / 100

    const carriedItems = onlyCountEquipped
      ? this.equipment.carried.filter(item => item.system.equipped)
      : this.equipment.carried

    this.eqtsummary = {
      eqtcost: numberToTwoDP(
        carriedItems.reduce((acc, item) => acc + item.system.component.cost * item.system.component.count, 0)
      ),
      eqtlbs: numberToTwoDP(
        carriedItems.reduce((acc, item) => acc + item.system.component.weight * item.system.component.count, 0)
      ),
      othercost: numberToTwoDP(
        this.equipment.other.reduce((acc, item) => acc + item.system.component.cost * item.system.component.count, 0)
      ),
      otherlbs: numberToTwoDP(
        this.equipment.other.reduce((acc, item) => acc + item.system.component.weight * item.system.component.count, 0)
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
    for (const location of this.hitlocations) {
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
    const basicLift = 5 * (this.attributes.ST.value * this.attributes.ST.value)

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
    const automaticEncumbrance =
      game.settings?.get(Settings.SYSTEM_NAME, Settings.SETTING_AUTOMATIC_ENCUMBRANCE) ?? false

    let manualEncumbranceIndex = -1
    let foundCurrent = false
    const currentEncumbrance = this.encumbrance ?? []
    if (!currentEncumbrance.length && !automaticEncumbrance) {
      manualEncumbranceIndex = currentEncumbrance.findIndex(enc => enc.current)
      foundCurrent = true
    }

    const encumbrance: fields.SchemaField.SourceData<EncumbranceSchema>[] = []
    const basicLift = this.liftingmoving.basiclift
    const liftBrackets: number[] = [basicLift, basicLift * 2, basicLift * 3, basicLift * 6, basicLift * 10]
    const basicMove = this.basicmove.value
    const basicDodge = this.dodge.value

    const moveIsEnhanced = this.currentMoveMode?.enhanced !== null

    const carriedWeight = this.eqtsummary.eqtlbs ?? 0

    for (let i = 0; i < liftBrackets.length; i++) {
      let move = Math.max(1, basicMove * (1 - i * 0.2))
      let dodge = Math.max(1, basicDodge - i)
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

      let current = automaticEncumbrance ? false : i === manualEncumbranceIndex
      if (!foundCurrent && carriedWeight <= liftBrackets[i]) {
        foundCurrent = true
        current = true
      }

      const currentmove = this.#getCurrentMove(move)

      encumbrance.push({
        key: `enc${i}`,
        level: i,
        weight: liftBrackets[i],
        move,
        dodge,
        current,

        currentmove,
        currentsprint: currentmove * 1.2,
        currentdodge: dodge,
        currentmovedisplay: moveIsEnhanced ? `${move}/${sprint}` : `${move}`,
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
  }

  /* ---------------------------------------- */

  #prepareUserModifiers() {
    this.parent.items.forEach(item => {
      if (!item.isOfType('feature', 'skill', 'spell', 'equipment')) return
      for (const modifier of item.system.itemModifiers.split('\n').map(e => e.trim())) {
        const modifierDescription = `${modifier} ${item.id}`
        this.conditions.usermods.add(modifierDescription)
      }

      for (const attack of item.getItemAttacks()) {
        if (item.system.itemModifiers === '') continue
        for (const modifier of attack.component.itemModifiers.split('\n').map(e => e.trim())) {
          const modifierDescription = `${modifier} ${item.id}`
          this.conditions.usermods.add(modifierDescription)
        }
      }
    })
  }

  /* ---------------------------------------- */

  #getCurrentMove(base: number): number {
    const doUpdateMove =
      game.settings?.get(Settings.SYSTEM_NAME, Settings.SETTING_MANEUVER_UPDATES_MOVE) && this.parent.inCombat

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
    // NOTE: why does moveoverride need to be a value on the system? Why not just fetch
    // the value dynamically each time?
    let tooltip = game.i18n?.localize('GURPS.moveFull') ?? ''
    const maneuver = GURPS.Maneuvers.get(this.conditions.maneuver)
    if (maneuver) tooltip = game.i18n?.localize(maneuver.label) ?? ''

    const override = this.#getMoveAdjustmentForOverride(base, this.moveoverride.maneuver)

    return override ?? { value: base, tooltip }
  }

  /* ---------------------------------------- */

  #getMoveAdjustmentForPosture(base: number): { value: number; tooltip: string } {
    // NOTE: why does moveoverride need to be a value on the system? Why not just fetch
    // the value dynamically each time?
    let tooltip = game.i18n?.localize('GURPS.moveFull') ?? ''
    const posture = this.moveoverride.posture
    if (posture) tooltip = game.i18n?.localize(GURPS.StatusEffect.lookup(this.conditions.posture).name) ?? ''

    const override = this.#getMoveAdjustmentForOverride(base, this.moveoverride.posture)

    return override ?? { value: base, tooltip }
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
    if (game.settings?.get(Settings.SYSTEM_NAME, Settings.SETTING_AUTOMATIC_ONETHIRD)) {
      const doAnnounce = game.settings?.get(Settings.SYSTEM_NAME, Settings.SETTING_SHOW_CHAT_FOR_REELING_TIRED)

      if (changed.system?.HP?.value !== undefined) {
        const isReeling = changed.system.HP.value < this.HP.value / 3
        if (this.conditions.reeling !== isReeling) {
          this.parent.toggleStatusEffect('reeling', { active: isReeling })

          if (doAnnounce) {
            let tag = isReeling ? 'GURPS.chatTurnOnReeling' : 'GURPS.chatTurnOffReeling'
            let message =
              game.i18n?.format(tag, {
                name: this.parent.displayname,
                pdfref: game.i18n.localize('GURPS.pdfReeling'),
              }) ?? ''
            this.parent.sendChatMessage(message)
          }
        }
      }

      if (changed.system?.FP?.value !== undefined) {
        const isExhausted = changed.system.FP.value < this.FP.value / 3
        if (this.conditions.exhausted !== isExhausted) {
          this.parent.toggleStatusEffect('exhausted', { active: isExhausted })

          if (doAnnounce) {
            let tag = isExhausted ? 'GURPS.chatTurnOnTired' : 'GURPS.chatTurnOffTired'
            let message =
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
    return this.move.find(enc => enc.default) ?? null
  }

  /* ---------------------------------------- */
  /*  Legacy Functionality                    */
  /* ---------------------------------------- */

  protected get _drBonusesFromItems(): Record<string, number> {
    return this._globalBonuses.reduce((acc: Record<string, number>, bonus: AnyObject) => {
      const bonusMatch = (bonus.text as string).match(/DR\s*([+-]\d+)\s*(.*)/)
      if (!bonusMatch) return acc

      let modifier = parseInt(bonusMatch[1])
      if (isNaN(modifier)) return acc

      const locationPatterns = splitArgs(bonusMatch[2] ?? '').map(name => new RegExp(makeRegexPatternFrom(name))) ?? []

      for (const location of this.hitlocations) {
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
    let actorLocations = this.hitlocations
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

      const table = HitLocation.getHitLocationRolls(bodyPlan)
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
      await this.parent.update(changes)
      return { changed, msg, info: msg }
    }
    return { changed, msg: '', info: `${this.parent.name}: /dr command with formula ${formula} had no effect.` }
  }

  /* ---------------------------------------- */

  #addDRChanges(changes: Record<string, number | null>, formula: string, value: HitLocationEntry, index: string): void {
    let dr = value.dr ?? 0
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
        case '!':
          const mod = parseInt(formula.slice(1))
          drMod = mod
          dr = mod
          drCap = mod
          break
        default:
          drMod = parseInt(formula)
          dr = Math.max(0, value.import, drMod, drItem)
          drCap = dr
      }
    }

    changes[`system.hitlocations.${index}._dr`] = dr
    changes[`system.hitlocations.${index}.drMod`] = drMod
    changes[`system.hitlocations.${index}.drCap`] = drCap
  }

  /* ---------------------------------------- */

  findTrait(name: string): ConfiguredItem<'feature'>['document'] | null {
    return this.ads.find(trait => trait.name.toLowerCase().includes(name.toLowerCase())) ?? null
  }

  findAdvantage(name: string): ConfiguredItem<'feature'>['document'] | null {
    return this.findTrait(name)
  }

  /* ---------------------------------------- */

  async accumulateDamageRoll(action: fields.SchemaField.InitializedData<DamageActionSchema>): Promise<void> {
    const accumulatedActions = this.conditions.damageAccumulators

    const existingActionIndex = accumulatedActions.findIndex(e => e.orig === action.orig)
    if (existingActionIndex !== -1) return this.incrementDamageAccumulator(existingActionIndex)

    action.count = 1
    // @ts-expect-error: not sure why I can't set this value to null
    action.accumulate = null
    accumulatedActions.push(action)
    // @ts-expect-error: not sure why the path is not recognised
    await this.parent.update({ 'system.conditions.damageAccumulators': accumulatedActions })
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
    await GURPS.performAction(accumulator, GURPS.LastActor)
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

  async setMoveDefault(value: string): Promise<void> {
    const move = this.move
    move.forEach((moveEntry: fields.SchemaField.SourceData<MoveSchema>) => {
      moveEntry.default = moveEntry.mode === value
    })

    // @ts-expect-error: not sure why the path is not recognised
    await this.parent.update({ 'system.move': move })
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
    const move = this.move ?? []
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
    // @ts-expect-error: not sure why the path is not recognised
    await this.parent.update({ 'system.move': move })
  }

  /* ---------------------------------------- */
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

    // In-build pools
    HP: new fields.SchemaField(poolSchema(), { required: true, nullable: false }),
    FP: new fields.SchemaField(poolSchema(), { required: true, nullable: false }),
    QP: new fields.SchemaField(poolSchema(), { required: true, nullable: false }),

    // Other attributes which don't count as core in this version of the system
    dodge: new fields.SchemaField({
      value: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
      // NOTE: env_level is never used in the code, so has been removed.
      // enc_level: new fields.NumberField({ required: true, nullable: false }),
    }),
    basicmove: new fields.SchemaField({
      // NOTE: change from previous data model, uses number instead of string type as value is always a number
      value: new fields.NumberField({ required: true, nullable: false }),
      points: new fields.NumberField({ required: true, nullable: false }),
    }),
    basicspeed: new fields.SchemaField({
      // NOTE: change from previous data model, uses number instead of string type as value is always a number
      value: new fields.NumberField({ required: true, nullable: false }),
      points: new fields.NumberField({ required: true, nullable: false }),
    }),
    frightcheck: new fields.NumberField({ required: true, nullable: false }),
    hearing: new fields.NumberField({ required: true, nullable: false }),
    tastesmell: new fields.NumberField({ required: true, nullable: false }),
    vision: new fields.NumberField({ required: true, nullable: false }),
    touch: new fields.NumberField({ required: true, nullable: false }),
    // Generic parry used for mooks
    parry: new fields.NumberField({ required: true, nullable: false }),
    // NOTE: moved to derived property
    // currentmove: new fields.NumberField({ required: true, nullable: false }),
    // NOTE: may want to revise this in the future to a custom DiceField or the like
    thrust: new fields.StringField({ required: true, nullable: false }),
    // NOTE: may want to revise this in the future to a custom DiceField or the like
    swing: new fields.StringField({ required: true, nullable: false }),

    // NOTE: these properties no longer exists in the schema as their value is always derived.
    // They have been replaced with a class property which is updated during data preparation
    // encumbrance: new fields.TypedObjectField(
    //   new fields.SchemaField(encumbranceSchema, { required: true, nullable: false })
    // ),
    // lifitngmoving: new fields.SchemaField(liftingMovingSchema, { required: true, nullable: false }),

    // NOTE: conditions does not seem to ever be explicitly defined in the previous schema, only implicitly.
    // It is also a derived property and thus not defined in the schema.
    // conditions: new fields.ObjectField(),

    additionalresources: new fields.SchemaField(
      {
        bodyplan: new fields.StringField({ required: true, nullable: false }),
        tracker: new fields.ArrayField(new fields.EmbeddedDataField(TrackerInstance), {
          required: true,
          nullable: false,
        }),
        importname: new fields.StringField({ required: true, nullable: true }),
        importpath: new fields.FilePathField({ required: true, nullable: true, categories: ['TEXT'] }),
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
        sizemod: new fields.NumberField({ required: true, nullable: false }),
        techlevel: new fields.StringField({ required: true, nullable: false }),
        createdon: new fields.StringField({ required: true, nullable: false }),
        modifiedon: new fields.StringField({ required: true, nullable: false }),
        player: new fields.StringField({ required: true, nullable: false }),
      },
      { required: true, nullable: false }
    ),

    totalpoints: new fields.SchemaField(
      {
        attributes: new fields.NumberField({ required: true, nullable: false }),
        ads: new fields.NumberField({ required: true, nullable: false }),
        disads: new fields.NumberField({ required: true, nullable: false }),
        quirks: new fields.NumberField({ required: true, nullable: false }),
        skills: new fields.NumberField({ required: true, nullable: false }),
        spells: new fields.NumberField({ required: true, nullable: false }),
        total: new fields.NumberField({ required: true, nullable: false }),
        unspent: new fields.NumberField({ required: true, nullable: false }),
        race: new fields.NumberField({ required: true, nullable: false }),
      },
      { required: true, nullable: false }
    ),

    hitlocations: new fields.ArrayField(
      new fields.EmbeddedDataField(HitLocationEntry, { required: true, nullable: false }),
      { required: true, nullable: false }
    ),

    reactions: new fields.ArrayField(new fields.SchemaField(reactionSchema(), { required: true, nullable: false }), {
      required: true,
      nullable: false,
    }),
    conditionalmods: new fields.ArrayField(
      new fields.SchemaField(reactionSchema(), { required: true, nullable: false }),
      {
        required: true,
        nullable: false,
      }
    ),

    conditions: new fields.SchemaField(conditionsSchema(), { required: true, nullable: false }),

    move: new fields.ArrayField(new fields.SchemaField(moveSchema(), { required: true, nullable: false }), {
      required: true,
      nullable: false,
      default: [{ mode: 'GURPS.moveModeGround', basic: 5, enhanced: null, default: true }],
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
