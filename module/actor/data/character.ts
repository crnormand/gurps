import {
  attributeSchema,
  conditionsSchema,
  EncumbranceSchema,
  LiftingMovingSchema,
  poolSchema,
} from './character-components.js'
import { BaseActorModel } from './base.js'
import fields = foundry.data.fields
import { HitLocationEntryV1, HitLocationEntryV2 } from './hit-location-entry.js'
import { zeroFill } from '../../../lib/utilities.js'
import * as Settings from '../../../lib/miscellaneous-settings.js'
import { AnyObject } from 'fvtt-types/utils'
import GurpsActiveEffect from 'module/effects/active-effect.js'
import {
  MOVE_HALF,
  MOVE_NONE,
  MOVE_ONE,
  MOVE_ONETHIRD,
  MOVE_STEP,
  MOVE_TWO_STEPS,
  MOVE_TWOTHIRDS,
} from '../maneuver.js'

class CharacterModel extends BaseActorModel<CharacterSchema> {
  static override defineSchema(): CharacterSchema {
    return characterSchema()
  }

  /* ---------------------------------------- */

  static override LOCALIZATION_PREFIXES = super.LOCALIZATION_PREFIXES.concat('GURPS.Actor.Character')

  /* ---------------------------------------- */
  /*  Derived properties                     */
  /* ---------------------------------------- */
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
  /*  Accessors                               */
  /* ---------------------------------------- */

  get hitlocationNames() {
    return this.hitlocationsV2.reduce((acc: Record<string, HitLocationEntryV2>, location) => {
      acc[location.where] = location
      return acc
    }, {})
  }

  /* ---------------------------------------- */

  get currentdodge(): number {
    return this.encumbrance.find(enc => enc.current)?.currentdodge ?? 0
  }

  /* ---------------------------------------- */
  /*  Data Preparation                        */
  /* ---------------------------------------- */

  /**
   * Prepare data related to this DataModel itself, before any derived data is computed.
   */
  override prepareBaseData() {
    super.prepareBaseData()

    this.#resetConditionsObject()
    this.#resetCalculatedAttributeValues()

    this.#applySizeModifierToTargetConditions()
  }

  /* ---------------------------------------- */

  #resetCalculatedAttributeValues() {
    Object.keys(this.attributes).forEach(key => {
      const attribute = this.attributes[key as keyof typeof this.attributes]
      this.attributes[key as keyof typeof this.attributes].value = attribute.import
    })
  }

  /* ---------------------------------------- */

  #resetConditionsObject() {
    // TODO: verify whether this should be fully reset
    this.conditions = {
      ...this.conditions,
      posture: 'standing',
      maneuver: null,
      self: { modifiers: [] },
      target: { modifiers: [] },
      usermods: [],
      reeling: false,
      exhausted: false,
    }
  }

  /* ---------------------------------------- */

  #applySizeModifierToTargetConditions() {
    if (this.traits.sizemod !== 0) {
      const sizeModifier = this.traits.sizemod > 0 ? `+${this.traits.sizemod}` : `${this.traits.sizemod}`
      this.conditions.target?.modifiers?.push(game.i18n?.format('GURPS.modifiersSize', { sm: sizeModifier }) ?? '')
    }
  }

  /* ---------------------------------------- */

  override prepareDerivedData() {
    super.prepareDerivedData()

    this.#applyCharacterBonuses()
    this.#prepareLiftingMoving()
    this.#prepareEncumbrance()

    this.#setCurrentManeuver()
  }

  /* ---------------------------------------- */

  #applyCharacterBonuses() {
    this.#applyBonusesToHitLocations()
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
    const basicLift = Math.round(0.2 * (this.attributes.ST.value * this.attributes.ST.value))

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
    const automaticEncumbrance = game.settings?.get(GURPS.SYSTEM_NAME, Settings.SETTING_AUTOMATIC_ENCUMBRANCE) ?? false

    let foundCurrent = false
    const basicLift = this.liftingmoving.basiclift
    const liftBrackets: number[] = [basicLift, basicLift * 2, basicLift * 3, basicLift * 6, basicLift * 10]
    const basicMove = this.basicmove.value
    const basicDodge = this.dodge.value

    // TODO const moveIsEnhanced = this.currentMoveMode?.enhanced !== null

    const carriedWeight = 0 // this.eqtsummary.eqtlbs ?? 0

    for (let i = 0; i < liftBrackets.length; i++) {
      let move = Math.floor(Math.max(1, basicMove * (1 - i * 0.2)))
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

      let current = false

      if (automaticEncumbrance) {
        if (!foundCurrent && carriedWeight <= liftBrackets[i]) {
          foundCurrent = true
          current = true
        }
      } else {
        if (i === this.additionalresources.currentEncumbrance) {
          foundCurrent = true
          current = true
        }
      }

      const currentmove = this.#getCurrentMove(move)

      this.encumbrance.push({
        key: `enc${i}`,
        level: i,
        weight: liftBrackets[i],
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

  #setCurrentManeuver() {
    const maneuverEffect = this.parent.effects.find((effect: ActiveEffect.Implementation) =>
      effect.statuses.some((status: string) => status === 'maneuver')
    )
    this.conditions.maneuver = maneuverEffect ? (maneuverEffect.flags.gurps?.name ?? null) : null
  }

  /* ---------------------------------------- */

  #getCurrentMove(base: number): number {
    const moveForManeuver = this.#getMoveAdjustmentForManeuver(base)
    const moveForPosture = this.#getMoveAdjustmentForPosture(base)

    this.conditions.move =
      moveForManeuver.value < moveForPosture.value ? moveForManeuver.tooltip : moveForPosture.tooltip

    if (game.settings?.get(GURPS.SYSTEM_NAME, Settings.SETTING_MANEUVER_UPDATES_MOVE) && this.parent.inCombat) {
      return Math.min(moveForManeuver.value, moveForPosture.value)
    } else {
      return base
    }
  }

  /* ---------------------------------------- */

  #getMoveAdjustmentForManeuver(base: number): { value: number; tooltip: string } {
    let tooltip = game.i18n?.localize('GURPS.moveFull') ?? ''
    const maneuver = GURPS.Maneuvers.get(this.conditions.maneuver)
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
    const posture_ = GURPS.StatusEffect.lookup(this.conditions.posture)
    if (posture_) {
      tooltip = game.i18n?.localize(posture_.name) ?? ''
      const override = this.#getMoveAdjustmentForOverride(base, posture_.move)
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

  override _onUpdate(changed: object, options: any, userId: string): void {
    super._onUpdate(changed, options, userId)
  }

  /* ---------------------------------------- */
  /*  Legacy Functionality                    */
  /* ---------------------------------------- */

  protected get _drBonusesFromItems(): Record<string, number> {
    // TODO Go through the list of Items and find all DR bonuses
    return {}
  }

  /* ---------------------------------------- */

  get hitlocations() {
    const hitlocationsV1: Record<string, HitLocationEntryV1> = {}

    this.hitlocationsV2.forEach((locationV2: any, index: number) => {
      hitlocationsV1[`${zeroFill(index, 5)}`] = HitLocationEntryV1.createFromV2(locationV2)
    })
    return hitlocationsV1
  }

  /* ---------------------------------------- */

  /**
   * Get temporary effects for display in the Token HUD.
   *
   * Special GURPS logic: Based on world settings, maneuvers may be hidden for everyone (in which case, return an empty
   * array), or hidden for everyone except GM and Owner. Maneuvers might also be mapped to a different maneuver to
   * prevent others from knowing exactly what the token plans to do. If visible, the Maneuver should appear first in the array.
   */
  getTemporaryEffects(effects: GurpsActiveEffect[]): ActiveEffect.Implementation[] {
    const maneuver = effects.find(e => e.isManeuver)
    if (!maneuver) return effects as ActiveEffect.Implementation[]

    const nonManeuverEffects = effects.filter(e => !e.isManeuver)

    const visibility = game.settings?.get(GURPS.SYSTEM_NAME, Settings.SETTING_MANEUVER_VISIBILITY) ?? 'NoOne'
    if (visibility === 'NoOne') return nonManeuverEffects as ActiveEffect.Implementation[]

    if (!game.user?.isGM && !this.parent.isOwner) {
      if (visibility === 'GMAndOwner') return nonManeuverEffects as ActiveEffect.Implementation[]

      const detail = game.settings?.get(GURPS.SYSTEM_NAME, Settings.SETTING_MANEUVER_DETAIL) ?? 'General'
      if (detail === 'General' || (detail === 'NoFeint' && maneuver?.flags.gurps?.name === 'feint')) {
        if (!!maneuver.flags.gurps?.alt) maneuver.img = maneuver.getFlag('gurps', 'alt')
      }
    }

    return [maneuver, ...nonManeuverEffects] as ActiveEffect.Implementation[]
  }

  getChecks(checkType: string): {
    size: number
    data: Array<{
      img?: string
      symbol: string
      label: string
      mode?: string
      value: number | string
      notes?: string
      otf: string
      otfDamage?: string
      isOTF: boolean
    }>
  } {
    const checks: Array<{
      img?: string
      symbol: string
      label: string
      mode?: string
      value: number | string
      notes?: string
      otf: string
      otfDamage?: string
      isOTF: boolean
    }> = []

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
      // case 'attackChecks':
      //   checks.push(
      //     ...this.parent.items
      //       .reduce((acc: (MeleeAttackModel | RangedAttackModel)[], item) => {
      //         acc.push(...item.getItemAttacks())
      //         return acc
      //       }, [])
      //       .map(attack => {
      //         const otfName = attack.component.mode ? `${attack.name} (${attack.component.mode})` : attack.name
      //         return {
      //           img: attack.img ?? '',
      //           symbol: game.i18n?.localize(`GURPS.attack${attack.name}`) ?? '',
      //           label: attack.name ?? '',
      //           value: attack.component.import,
      //           mode: attack.component.mode,
      //           otf: attack.type === 'meleeAttack' ? `M:"${otfName}"` : `R:"${otfName}"`,
      //           isOTF: true,
      //           otfDamage: `D:"${otfName}"`,
      //         }
      //       })
      //   )
      //   return { data: checks, size: checks.length }
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
        // this.parent.getItemAttacks({ attackType: 'melee' }).reduce((acc, attack) => {
        //   const symbol = game.i18n?.localize(`GURPS.${attack.name}`) ?? ''
        //   const img = attack.img
        //   const otfName = attack.component.mode ? `"${attack.name} (${attack.component.mode})"` : `"${attack.name}"`

        //   if (!isNaN(parseInt(attack.component.parry)))
        //     acc.push({
        //       symbol,
        //       img: img ?? '',
        //       label: attack.name ?? '',
        //       value: attack.component.parry,
        //       mode: attack.component.mode,
        //       otf: `P:${otfName}`,
        //       isOTF: true,
        //     })

        //   if (!isNaN(parseInt(attack.component.block)))
        //     acc.push({
        //       symbol,
        //       img: img ?? '',
        //       label: attack.name ?? '',
        //       value: attack.component.block,
        //       mode: attack.component.mode,
        //       otf: `B:${otfName}`,
        //       isOTF: true,
        //     })
        //   return acc
        // }, checks)
        return { data: checks, size: checks.length }

      // case 'markedChecks':
      //   const items = this.parent.items.filter(item => item.isOfType('feature', 'skill', 'spell'))
      //   for (const item of items) {
      //     if (item.system.addToQuickRoll) {
      //       const type = item.type === 'feature' ? 'ad' : item.type
      //       let value = 0
      //       if (item.isOfType('skill', 'spell')) value = item.system.component.import

      //       checks.push({
      //         symbol: game.i18n?.localize(`GURPS.${type}`) ?? '',
      //         img: item.img ?? '',
      //         label: item.name,
      //         value,
      //         notes: item.system.component.notes,
      //         otf: `${type}:"${item.name}"`,
      //         isOTF: false,
      //       })
      //     }
      //   }
      //   return { data: checks, size: checks.length }

      default:
        return { data: [], size: 0 }
    }
  }

  /* ---------------------------------------- */

  async addTaggedRollModifiers(
    chatThing: string,
    optionalArgs: { obj?: AnyObject },
    attack?: AnyObject
  ): Promise<boolean> {
    let isDamageRoll = false
    const taggedSettings = game.settings!.get(GURPS.SYSTEM_NAME, Settings.SETTING_USE_TAGGED_MODIFIERS)!
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
          refTags.push(...(taggedSettings[tag] as string).split(',').map((t: string) => t.trim().toLowerCase()))
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
      let regex = /(?<="|:).+(?=\s\(|"|])/gm

      if (ref && correspondingTags[ref]) {
        if (ref === 'p' || ref === 'b') {
          itemRef = chatThing.match(regex)?.[0] ?? ''
          if (itemRef !== '') itemRef = itemRef.replace(/"/g, '').split('(')[0].trim()
        }

        for (const tag of correspondingTags[ref]) {
          refTags.push(...(taggedSettings[tag] as string).split(',').map((t: string) => t.trim().toLowerCase()))
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
      // @ts-expect-error
      const attackMods = attack?.component.modifierTags ?? []
      modifierTags = [...allRollTags, ...attackMods, ...refTags]
      // @ts-expect-error
      itemRef = attack?.name ?? ''
    }

    // Get modifiers from user mods
    const userMods = this.conditions.usermods ?? []

    // Get modiifers from self mods
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

      userModsTags.forEach(async tag => {
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
      })
    }

    return isDamageRoll
  }

  /**
   * Parse roll info based on action type.
   */
  findUsingAction(
    action: { type: string; name: string; orig: string; overridetxt?: string; attrkey?: string },
    chatthing: string,
    formula: string,
    thing: string
  ): { name: string; uuid: string | null; itemId: string | null; fromItem: string | null; pageRef: string | null } {
    if (!this.isOfType('character', 'enemy')) {
      console.warn('Actor is not a character or enemy.')
      return {
        name: thing,
        uuid: null,
        itemId: null,
        fromItem: null,
        pageRef: null,
      }
    }

    const originType: string | null = action ? action.type : null
    // let name: string, mode: string | undefined
    switch (originType) {
      // case 'attack': {
      //   name = action.name.split('(')[0].trim()
      //   mode = action.name.match(/\((.+)\)/)?.[1]
      //   const attackType = action.orig.toLowerCase().startsWith('m:') ? 'melee' : 'ranged'
      //   const weapon = this.parent
      //     // @ts-expect-error: Not sure why this isn't resolving correctly.
      //     .getItemAttacks({ attackType })
      //     .find(e => e.name === name && (!mode || e.component.mode === mode))
      //   if (weapon)
      //     return {
      //       name: weapon.name ?? '',
      //       uuid: weapon.uuid,
      //       itemId: weapon.id,
      //       fromItem: weapon.item.id,
      //       pageRef: null,
      //     }
      //   else
      //     return {
      //       name: thing,
      //       uuid: null,
      //       itemId: null,
      //       fromItem: null,
      //       pageRef: null,
      //     }
      // }
      // case 'weapon-block':
      // case 'weapon-parry': {
      //   name = action.name.split('(')[0].trim()
      //   mode = action.name.match(/\((.+?)\)/)?.[1]
      //   const weapon = this.parent
      //     .getItemAttacks({ attackType: 'melee' })
      //     .find(e => e.name === name && (!mode || e.component.mode === mode))
      //   if (weapon)
      //     return {
      //       name: weapon.name ?? '',
      //       uuid: weapon.uuid,
      //       itemId: weapon.id,
      //       fromItem: weapon.item.id,
      //       pageRef: null,
      //     }
      //   else
      //     return {
      //       name: thing,
      //       uuid: null,
      //       itemId: null,
      //       fromItem: null,
      //       pageRef: null,
      //     }
      // }
      // case 'skill-spell': {
      //   const item = [...this.skills, ...this.spells].find(e => e.name === action.name)
      //   if (item)
      //     return {
      //       name: item.name,
      //       uuid: item.uuid,
      //       itemId: item.id,
      //       fromItem: item.id,
      //       pageRef: item.system.component.pageref,
      //     }
      //   else
      //     return {
      //       name: action.name,
      //       uuid: null,
      //       itemId: null,
      //       fromItem: null,
      //       pageRef: null,
      //     }
      // }
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
}

/* ---------------------------------------- */

const characterSchema = () => {
  return {
    // Default attributes.
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

    // Built-in pools
    HP: new fields.SchemaField(poolSchema(), { required: true, nullable: false }),
    FP: new fields.SchemaField(poolSchema(), { required: true, nullable: false }),
    QP: new fields.SchemaField(poolSchema(), { required: true, nullable: false }),

    frightcheck: new fields.NumberField({ required: true, nullable: false, initial: 0, label: 'GURPS.frightcheck' }),
    hearing: new fields.NumberField({ required: true, nullable: false, initial: 0, label: 'GURPS.hearing' }),
    tastesmell: new fields.NumberField({ required: true, nullable: false, initial: 0, label: 'GURPS.tastesmell' }),
    vision: new fields.NumberField({ required: true, nullable: false, initial: 0, label: 'GURPS.vision' }),
    touch: new fields.NumberField({ required: true, nullable: false, initial: 0, label: 'GURPS.touch' }),

    // NOTE: may want to revise this in the future to a custom DiceField or the like
    thrust: new fields.StringField({ required: true, nullable: false, label: 'GURPS.thrust' }),
    // NOTE: may want to revise this in the future to a custom DiceField or the like
    swing: new fields.StringField({ required: true, nullable: false, label: 'GURPS.swing' }),

    // Other attributes which don't count as core in this version of the system
    dodge: new fields.SchemaField({
      value: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    }),
    // ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎

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

    hitlocationsV2: new fields.ArrayField(
      new fields.EmbeddedDataField(HitLocationEntryV2, { required: true, nullable: false }),
      { required: true, nullable: false }
    ),

    additionalresources: new fields.SchemaField(
      {
        // TODO This could be a trait instead.
        bodyplan: new fields.StringField({ required: true, nullable: false }),
        currentEncumbrance: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
      },
      { required: true, nullable: false }
    ),

    conditions: new fields.SchemaField(conditionsSchema(), { required: true, nullable: false }),
  }
}
type CharacterSchema = ReturnType<typeof characterSchema>

/* ---------------------------------------- */

export { CharacterModel, type CharacterSchema }
