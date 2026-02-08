import { fields } from '@gurps-types/foundry/data-fields.js'
import { EquipmentV1 } from '@module/item/legacy/equipment-adapter.js'
import * as Settings from '@util/miscellaneous-settings.js'
import { COSTS_REGEX, parselink } from '@util/parselink.js'
import {
  arrayToObject,
  generateUniqueId,
  makeRegexPatternFrom,
  objectToArray,
  recurselist,
  splitArgs,
  zeroFill,
} from '@util/utilities.js'
import { AnyMutableObject, AnyObject } from 'fvtt-types/utils'

import { MeleeAttackModel, RangedAttackModel } from '../action/index.js'
import { ContainerUtils } from '../data/mixins/container-utils.js'
import { ModelCollection } from '../data/model-collection.js'
import { HitLocation } from '../hitlocation/hitlocation.js'
import { ImportSettings } from '../importer/index.js'
import { TraitV1 } from '../item/legacy/trait-adapter.js'
import { PseudoDocument } from '../pseudo-document/pseudo-document.js'
import { ResourceTracker } from '../resource-tracker/index.js'
import { ResourceTrackerTemplate, TrackerInstance } from '../resource-tracker/resource-tracker.js'
import { TokenActions } from '../token-actions.js'
import { multiplyDice } from '../util/damage-utils.ts'
import { parseItemKey } from '../util/object-utils.ts'

import { Advantage, Equipment, HitLocationEntry, Melee, Named, Ranged, Skill, Spell } from './actor-components.js'
import { ActorImporter } from './actor-importer.js'
import { DamageActionSchema, ReactionSchema } from './data/character-components.js'
import { HitLocationEntryV2 } from './data/hit-location-entry.js'
import { collectDeletions } from './deletion.js'
import { cleanTags, getRangedModifier } from './effect-modifier-popout.js'
import {
  ActorV1Interface,
  ActorV1Model,
  DamageAccumulator,
  EncumbranceLevel,
  MoveMode,
} from './legacy/actorv1-interface.js'
import { HitLocationEntryV1 } from './legacy/hit-location-entryv1.js'
import { NoteV1 } from './legacy/note-adapter.js'
import Maneuvers, {
  MOVE_HALF,
  MOVE_NONE,
  MOVE_ONE,
  MOVE_ONETHIRD,
  MOVE_STEP,
  MOVE_TWO_STEPS,
  MOVE_TWOTHIRDS,
  PROPERTY_MOVEOVERRIDE_MANEUVER,
  PROPERTY_MOVEOVERRIDE_POSTURE,
} from './maneuver.js'
import { CanRollResult, CheckInfo } from './types.js'

function DamageModule() {
  return GURPS.modules.Damage
}

export const MoveModes = {
  Ground: 'GURPS.moveModeGround',
  Air: 'GURPS.moveModeAir',
  Water: 'GURPS.moveModeWater',
  Space: 'GURPS.moveModeSpace',
}

interface EquipmentDropData {
  actorid: string
  isLinked: boolean
  itemData: {
    _id: string
    type: string
    name: string
    sort: number
    system: Record<string, any>
  }
  itemid: string
  key: string
  type: string
  uuid: string
}

class GurpsActorV2<SubType extends Actor.SubType> extends Actor<SubType> implements ActorV1Interface {
  // Narrowed view of this.system for characterV2 logic.
  private get modelV2() {
    return this.system as Actor.SystemOfType<'characterV2' | 'enemy'>
  }

  // Narrowed view of this.system for characterV1 logic.
  private get modelV1(): ActorV1Model {
    return this.system as Actor.SystemOfType<'character'>
  }

  // Common guard for new actor subtypes.
  private get isNewActorType(): boolean {
    return this.isOfType('characterV2', 'enemy')
  }

  // Item subtype guard helpers
  private isFeatureV2(item: Item.Implementation): item is Item.OfType<'featureV2'> {
    return item.isOfType('featureV2')
  }

  // Settings getter with default fallback
  private getSetting(key: string, fallback: string): string
  private getSetting(key: string, fallback: boolean): boolean
  private getSetting(key: string, fallback: number): number
  private getSetting<T>(key: string, fallback: T): T
  private getSetting<T>(key: string, fallback: T): T {
    const val = (game.settings as any)!.get(GURPS.SYSTEM_NAME, key)

    return (val ?? fallback) as T
  }

  isOfType<SubType extends Actor.SubType>(...types: SubType[]): this is Actor.OfType<SubType>
  isOfType(...types: string[]): boolean {
    return types.includes(this.type as Actor.SubType)
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   *
   * Get an array of all Users who are owners of this Actor.
   * NOTE: Changed from getOwners() in old system.
   * @returns An array of User instances who are owners of this Actor.
   */
  get owners(): User.Implementation[] {
    return game.users?.filter(user => user.isOwner) ?? []
  }

  /**
   * NOTE: Both character and characterV2.
   *
   * Alias of accessor owners.
   * @returns An array of User instances who are owners of this Actor.
   */
  getOwners(): User.Implementation[] {
    return this.owners
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   *
   * NOTE: STUB. Not convinced this is needed in the new system.
   */
  async openSheet(newSheet: Application | foundry.applications.api.ApplicationV2): Promise<void> {
    const sheet = this.sheet

    if (sheet) {
      await sheet.close()

      // @ts-expect-error: ignore
      delete this.apps[sheet.appId]

      // @ts-expect-error: ignore
      await this.setFlag('core', 'sheetClass', newSheet)

      this.ignoreRender = false
      this.sheet.render(true)
    }
  }

  /* ---------------------------------------- */

  override getEmbeddedDocument<EmbeddedName extends Actor.Embedded.CollectionName>(
    embeddedName: EmbeddedName,
    id: string,
    options?: foundry.abstract.Document.GetEmbeddedDocumentOptions
  ): Actor.Embedded.DocumentFor<EmbeddedName> | undefined {
    const { invalid = false, strict = true } = options ?? {}

    if (this.isNewActorType) {
      const systemEmbeds = (this.system?.constructor as any).metadata.embedded ?? {}

      if (embeddedName in systemEmbeds) {
        const path = systemEmbeds[embeddedName]
        const document = foundry.utils.getProperty(this, path) as any

        return (
          document.get(id, {
            invalid,
            strict,
          }) ?? null
        )
      }
    }

    return super.getEmbeddedDocument(embeddedName, id, { invalid, strict })
  }

  /* ---------------------------------------- */

  /**
   * Obtain the embedded collection of a given pseudo-document type.
   */
  getEmbeddedPseudoDocumentCollection(embeddedName: string): ModelCollection<PseudoDocument> {
    const collectionPath = (this.system?.constructor as any).metadata.embedded?.[embeddedName]

    if (!collectionPath) {
      throw new Error(
        `${embeddedName} is not a valid embedded Pseudo-Document within the [${'type' in this ? this.type : 'base'}] ${this.documentName} subtype!`
      )
    }

    return foundry.utils.getProperty(this, collectionPath) as ModelCollection<PseudoDocument>
  }

  /* ---------------------------------------- */

  getItemAttacks(options: { attackType: 'melee' }): MeleeAttackModel[]
  getItemAttacks(options: { attackType: 'ranged' }): RangedAttackModel[]
  getItemAttacks(options: { attackType: 'both' }): (MeleeAttackModel | RangedAttackModel)[]
  getItemAttacks(): (MeleeAttackModel | RangedAttackModel)[]
  getItemAttacks(
    options: { attackType: 'melee' | 'ranged' | 'both' } = { attackType: 'both' }
  ): (MeleeAttackModel | RangedAttackModel)[] {
    const attacks: (MeleeAttackModel | RangedAttackModel)[] = []

    for (const item of this.items) {
      if (options.attackType === 'melee') {
        attacks.push(...(item as Item.Implementation).getItemAttacks({ attackType: 'melee' }))
      } else if (options.attackType === 'ranged') {
        attacks.push(...(item as Item.Implementation).getItemAttacks({ attackType: 'ranged' }))
      } else {
        attacks.push(...(item as Item.Implementation).getItemAttacks({ attackType: 'both' }))
      }
    }

    return attacks
  }

  /* ---------------------------------------- */

  getItemReactions(key: 'reactions' | 'conditionalmods'): foundry.data.fields.SchemaField.SourceData<ReactionSchema>[] {
    const out: foundry.data.fields.SchemaField.SourceData<ReactionSchema>[] = []

    for (const item of this.items) {
      if (!this.isFeatureV2(item as Item.Implementation)) continue
      out.push(...(item.system[key] ?? []))
    }

    return out
  }

  /**
   * NOTE: Both character and characterV2.
   *
   * Special GURPS logic: Only one Posture effect can be active at a time. If a new Posture effect is applied,
   * the existing one will be toggled (off).
   */
  override async toggleStatusEffect(
    statusId: string,
    options?: Actor.ToggleStatusEffectOptions
  ): Promise<ActiveEffect.Implementation | boolean | undefined> {
    const status = CONFIG.statusEffects.find(effect => effect.id === statusId)

    if (!status) throw new Error(`Invalid status ID "${statusId}" provided to GurpsActorV2#toggleStatusEffect`)

    // TODO See if isPostureEffect can be moved to status.
    if (this.isPostureEffect(status)) {
      // If the status effect is a posture, remove all other postures first
      const postureEffects = this.getAllActivePostureEffects().filter(postureEffect =>
        postureEffect.statuses.find(effectStatus => effectStatus !== statusId)
      )

      for (const it of postureEffects) {
        await super.toggleStatusEffect(it.statuses.first()!, options)
      }

      await this.deleteEmbeddedDocuments(
        'ActiveEffect',
        postureEffects.map(postureEffect => postureEffect.id!),
        { parent: this }
      )
    }

    return super.toggleStatusEffect(statusId, options)
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   */
  private isPostureEffect(status: object): boolean {
    return foundry.utils.getProperty(status, 'flags.gurps.effect.type') === 'posture'
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   */
  private getAllActivePostureEffects() {
    return this.effects.filter(activeEffect => this.isPostureEffect(activeEffect))
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   *
   * Send a private chat message containing the specified text to all users
   * with ownership permission of this Actor document.
   * @param message - Message content to send
   */
  sendChatMessage(message: string) {
    foundry.applications.handlebars
      .renderTemplate('systems/gurps/templates/chat-processing.hbs', { lines: [message] })
      .then(content => {
        const whisper = this.owners.length > 0 ? this.owners.map(user => user.id) : null

        ChatMessage.create({ content, whisper })
      })
  }

  /* ---------------------------------------- */
  /*  Migration                               */
  /* ---------------------------------------- */

  // static override migrateData(source: AnyMutableObject): AnyMutableObject {
  //   super.migrateData(source)
  //   migrateCharacter(source)
  //   return source
  // }

  /* ---------------------------------------- */
  /*  Accessors                               */
  /* ---------------------------------------- */

  get currentMoveMode() {
    return this.isNewActorType ? this.modelV2.currentMoveMode : this._getCurrentMoveMode
  }

  /**
   * NOTE: Both character and characterV2
   */
  get _additionalResources() {
    return this.isNewActorType ? this.modelV2.additionalresources : this.modelV1.additionalresources
  }

  /**
   * NOTE: Both character and characterV2.
   */
  get displayname() {
    let name = this.name

    if (!!this.token && this.token.name != name) name = this.token.name + '(' + name + ')'

    return name
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   */
  get hitLocationsWithDR(): HitLocationEntry[] {
    if (this.isNewActorType) return this.modelV2.hitLocationsWithDR

    // Legacy V1 handling.
    const myhitlocations = []
    const table = this._hitLocationRolls

    for (const [_key, value] of Object.entries(this.modelV1.hitlocations)) {
      let rollText = value.roll

      if (!value.roll && !!table[value.where])
        // Can happen if manually edited
        rollText = table[value.where].roll

      if (!rollText) rollText = HitLocation.DEFAULT
      let dr = parseInt(value.dr.toString())

      if (isNaN(dr)) dr = 0
      const entry = new HitLocationEntry(value.where, dr, rollText, value?.split)

      myhitlocations.push(entry)
    }

    return myhitlocations
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   */
  get _hitLocationRolls() {
    return this.isNewActorType
      ? this.modelV2._hitLocationRolls
      : HitLocation.getHitLocationRolls(this.modelV1.additionalresources?.bodyplan)
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   */
  get defaultHitLocation(): string {
    return this.getSetting('default-hitlocation', '')
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   *
   * NOTE: Not technically an accessor but here for parity with the old system.
   */
  getTorsoDr(): Record<string, any> | undefined {
    if (this.isNewActorType) return this.torsoDr

    // Legacy V1 handling.
    // Return the hit location with 0 penalty.
    if (!this.modelV1.hitlocations) return undefined
    const hl = Object.values(this.modelV1.hitlocations).find(location => location.penalty == 0)

    return hl
  }

  get torsoDr(): HitLocationEntryV2 | undefined {
    return this.modelV2.torsoDR
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   *
   * @returns An array of temporary effects that are applied to the actor.
   * This is overriden for CharacterModel where maneuvers are moved to the top of the
   * array.
   */
  override get temporaryEffects(): ActiveEffect.Implementation[] {
    if (this.isNewActorType) return this.modelV2.getTemporaryEffects(super.temporaryEffects)

    // Legacy V1 handling.
    const allEffects = super.temporaryEffects
    const maneuver = allEffects.find(activeEffect => activeEffect.isManeuver)

    if (!maneuver) return allEffects

    const effects = allEffects.filter(activeEffect => !activeEffect.isManeuver)

    const visibility = game.settings!.get(GURPS.SYSTEM_NAME, Settings.SETTING_MANEUVER_VISIBILITY)

    if (visibility === 'NoOne') return effects

    if (!game.user?.isGM && !this.isOwner) {
      if (visibility === 'GMAndOwner') return effects

      const detail = game.settings!.get(GURPS.SYSTEM_NAME, Settings.SETTING_MANEUVER_DETAIL)

      if (detail === 'General' || (detail === 'NoFeint' && maneuver?.flags.gurps?.name === 'feint')) {
        if (maneuver.flags.gurps?.alt) maneuver.img = maneuver.getFlag('gurps', 'alt')!
      }
    }

    return [maneuver, ...effects]
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   */
  get usingQuintessence(): boolean {
    return this.getSetting(Settings.SETTING_USE_QUINTESSENCE, false)
  }

  /* ---------------------------------------- */
  /*  Data Preparation                        */
  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   */
  override prepareBaseData() {
    super.prepareBaseData()

    if (this.isNewActorType) {
      this.doForEachEmbedded(pd => pd.prepareBaseData())
    } else {
      // Legacy V1 handling.
      // this.modelV1.hitlocationNames = this.hitLocationByWhere
      // for (const location in this.modelV1.hitlocationNames) {
      //   if (typeof this.modelV1.hitlocationNames[location].import === 'string') {
      //     this.modelV1.hitlocationNames[location].import = parseInt(this.modelV1.hitlocationNames[location].import)
      //   }
      // }

      if (this.type !== 'character') return

      this.modelV1.conditions.posture = 'standing'
      this.modelV1.conditions.self = { modifiers: [] }
      this.modelV1.conditions.target = { modifiers: [] }
      this.modelV1.conditions.exhausted = false
      this.modelV1.conditions.reeling = false

      {
        // Oh how I wish we had a typesafe model!
        // I hate treating everything as "maybe its a number, maybe its a string...?!"

        let sizemod = this.modelV1.traits?.sizemod?.toString() || '+0'

        if (sizemod.match(/^\d/g)) sizemod = `+${sizemod}`

        if (sizemod !== '0' && sizemod !== '+0') {
          this.modelV1.conditions.target.modifiers.push(game.i18n!.format('GURPS.modifiersSize', { sm: sizemod }))
        }
      }

      const attributes = this.modelV1.attributes

      if (foundry.utils.getType(attributes.ST.import) === 'string')
        this.modelV1.attributes.ST.import = parseInt(attributes.ST.import.toString())

      // this.modelV1.trackersByName = this.trackersByName
    }
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   */
  override prepareDerivedData() {
    super.prepareDerivedData()

    if (this.isNewActorType) {
      this.doForEachEmbedded(pd => pd.prepareDerivedData())
    } else {
      // Legacy V1 handling.
      if (this.type !== 'character') return

      // Handle new move data -- if data.move exists, use the default value in that object to set the move
      // value in the first entry of the encumbrance object.
      if (this.modelV1.encumbrance) {
        let move = this.modelV1.move

        if (!move) {
          const currentMove = this.modelV1.encumbrance['00000'].move ?? this.modelV1.basicmove.value
          const value = { mode: MoveModes.Ground, basic: currentMove, default: true }

          foundry.utils.setProperty(this.modelV1, 'move.00000', value)
          move = this.modelV1.move
        }

        const current = Object.values(move).find(it => it.default)

        if (current) {
          // This is nonpersistent, derived values only.
          this.modelV1.encumbrance['00000'].move = current.basic
        }
      }

      this.calculateDerivedValues()
    }
  }

  /* ---------------------------------------- */

  /** Iterate through all embedded pseudo-documents and execute a function */
  doForEachEmbedded(fn: (pd: PseudoDocument) => void) {
    const embedded = this.modelV2?.metadata?.embedded ?? {}

    for (const documentName of Object.keys(embedded)) {
      for (const pseudoDocument of this.getEmbeddedPseudoDocumentCollection(documentName)) fn(pseudoDocument)
    }
  }

  /* ---------------------------------------- */

  override prepareEmbeddedDocuments(): void {
    super.prepareEmbeddedDocuments()
    if (this.isNewActorType) this.modelV2.prepareEmbeddedDocuments()
  }

  /* ---------------------------------------- */
  /*  Legacy Functionality                    */
  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2
   */
  async internalUpdate(data: Actor.UpdateData, context?: Record<string, any>): Promise<this | undefined> {
    return this.update(data, { ...context, render: false })
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2
   */
  async addTaggedRollModifiers(
    chatThing: string,
    optionalArgs: { obj?: AnyObject },
    attack?: Record<string, any>
  ): Promise<boolean> {
    if (this.isNewActorType)
      return this.modelV2.addTaggedRollModifiers(
        chatThing,
        optionalArgs,
        attack as MeleeAttackModel | RangedAttackModel
      )

    // Legacy V1 handling.
    let isDamageRoll = false
    const taggedSettings = game.settings!.get(GURPS.SYSTEM_NAME, Settings.SETTING_USE_TAGGED_MODIFIERS)
    const allRollTags = taggedSettings.allRolls.split(',').map(it => it.trim().toLowerCase())

    // First get Item or Attribute Effect Tags
    let modifierTags: string[],
      itemRef: string | undefined = undefined,
      refTags: string[]

    if (optionalArgs.obj) {
      const ref = chatThing
        .split('@')
        .pop()!
        .match(/(\S+):/)?.[1]
        .toLowerCase()

      switch (ref) {
        case 'm':
          refTags = taggedSettings.allAttackRolls.split(',').map(it => it.trim().toLowerCase())
          refTags = refTags.concat(taggedSettings.allMeleeRolls.split(',').map(it => it.trim().toLowerCase()))
          break
        case 'r':
          refTags = taggedSettings.allAttackRolls.split(',').map(it => it.trim().toLowerCase())
          refTags = refTags.concat(taggedSettings.allRangedRolls.split(',').map(it => it.trim().toLowerCase()))
          break
        case 'p':
          refTags = taggedSettings.allDefenseRolls.split(',').map(it => it.trim().toLowerCase())
          refTags = refTags.concat(taggedSettings.allParryRolls.split(',').map(it => it.trim().toLowerCase()))
          break
        case 'b':
          refTags = taggedSettings.allDefenseRolls.split(',').map(it => it.trim().toLowerCase())
          refTags = refTags.concat(taggedSettings.allBlockRolls.split(',').map(it => it.trim().toLowerCase()))
          break
        case 'd':
          refTags = taggedSettings.allDamageRolls.split(',').map(it => it.trim().toLowerCase())
          isDamageRoll = true
          break
        case 'sk':
          refTags = taggedSettings.allSkillRolls.split(',').map(it => it.trim().toLowerCase())
          break
        case 'sp':
          refTags = taggedSettings.allSpellRolls.split(',').map(it => it.trim().toLowerCase())

          if (taggedSettings.useSpellCollegeAsTag) {
            const spell = optionalArgs.obj as Record<string, any>
            const collegeTags = cleanTags(spell.college)

            refTags = refTags.concat(collegeTags)
          }

          break
        default:
          refTags = []
      }

      // Item or Actor Component
      modifierTags =
        ((optionalArgs.obj?.modifierTags as string) || '')
          .split(',')
          .map(it => it.trim())
          .map(it => it.toLowerCase()) || []
      modifierTags = [...modifierTags, ...allRollTags, ...refTags].filter(mod => !!mod)
      itemRef = (optionalArgs.obj.name as string) || (optionalArgs.obj.originalName as string)
    } else if (chatThing) {
      // Targeted Roll or Attribute Check
      const ref = chatThing.split('@').pop()!.toLowerCase().replace(' ', '').slice(0, -1).toLowerCase().split(':')[0]
      let refTags: string[] = []
      const regex = /(?<="|:).+(?=\s\(|"|])/gm

      switch (ref) {
        case 'st':
        case 'dx':
        case 'iq':
        case 'ht':
          refTags = (taggedSettings as unknown as Record<string, string>)[`all${ref.toUpperCase()}Rolls`]
            .split(',')
            .map(it => it.trim().toLowerCase())
          refTags = refTags.concat(taggedSettings.allAttributesRolls.split(',').map(it => it.trim().toLowerCase()))
          break
        case 'will':
        case 'per':
        case 'frightcheck':
        case 'vision':
        case 'hearing':
        case 'tastesmell':
        case 'touch':
        case 'cr':
          refTags = (taggedSettings as unknown as Record<string, string>)[`all${ref.toUpperCase()}Rolls`]
            .split(',')
            .map(it => it.trim().toLowerCase())
          break
        case 'dodge':
          refTags = taggedSettings.allDefenseRolls.split(',').map(it => it.trim().toLowerCase())
          refTags = refTags.concat(
            (taggedSettings as unknown as Record<string, string>)[`all${ref.toUpperCase()}Rolls`]
              .split(',')
              .map(it => it.trim().toLowerCase())
          )
          break
        case 'p':
          refTags = taggedSettings.allDefenseRolls.split(',').map(it => it.trim().toLowerCase())
          refTags = refTags.concat(taggedSettings.allParryRolls.split(',').map(it => it.trim().toLowerCase()))
          itemRef = chatThing.match(regex)?.[0]
          if (itemRef) itemRef = itemRef.replace(/"/g, '').split('(')[0].trim()
          break
        case 'b':
          refTags = taggedSettings.allDefenseRolls.split(',').map(it => it.trim().toLowerCase())
          refTags = refTags.concat(taggedSettings.allBlockRolls.split(',').map(it => it.trim().toLowerCase()))

          itemRef = chatThing.match(regex)?.[0]
          if (itemRef) itemRef = itemRef.replace(/"/g, '').split('(')[0].trim()
          break
        default:
          refTags = []
      }

      modifierTags = [...allRollTags, ...refTags]
    } else {
      // Damage roll from OTF or Attack
      if (!attack) {
        refTags = taggedSettings.allDamageRolls.split(',').map(it => it.trim().toLowerCase())
        isDamageRoll = true
      } else {
        refTags = taggedSettings.allAttackRolls.split(',').map(it => it.trim().toLowerCase())
      }

      const attackMods = attack?.modifierTags || []

      modifierTags = [...allRollTags, ...attackMods, ...refTags]
      itemRef = attack?.name || attack?.originalName
    }

    // Then get the modifiers from:
    // Actor User Mods
    const userMods = (foundry.utils.getProperty(this, 'system.conditions.usermods') as string[]) || []
    // Actor Self Mods
    const selfMods =
      (foundry.utils.getProperty(this, 'system.conditions.self.modifiers') as string[]).map((mod: string) => {
        const key = mod.match(/(GURPS.\w+)/)?.[1] || ''

        if (key) return game.i18n!.localize(key) + mod.replace(key, '')

        return mod
      }) || []
    // Actor Targeted Mods
    const targetMods = []

    for (const target of Array.from(game.user!.targets)) {
      const targetActor = target.actor
      const mods = targetActor
        ? (foundry.utils.getProperty(targetActor, 'system.conditions.target.modifiers') as string[])
        : []

      for (const mod of mods) {
        const key = mod.match(/(GURPS.\w+)/)?.[1] || ''

        if (key) targetMods.push(game.i18n!.localize(key) + mod.replace(key, ''))
        else targetMods.push(mod)
      }

      const actorToken = this.getActiveTokens()[0]
      const rangeMod = getRangedModifier(actorToken, target)

      if (rangeMod) targetMods.push(rangeMod)
    }

    const allMods = [...userMods, ...selfMods, ...targetMods]
    const actorInCombat =
      game.combat?.combatants.find(combatant => combatant.actor!.id === this.id) && game.combat?.isActive

    for (const userMod of allMods) {
      const userModsTags = (userMod.match(/#(\S+)/g) || []).map((it: string) => it.slice(1).toLowerCase())

      for (const tag of userModsTags) {
        let canApply = modifierTags.includes(tag)

        if (userMod.includes('#maneuver')) {
          canApply = canApply && (userMod.includes(itemRef!) || userMod.includes('@man:'))
        }

        if (Object.hasOwn(optionalArgs, 'itemPath')) {
          // If the modifier should apply only to a specific item (e.g. specific usage of a weapon) account for this
          // @ts-expect-error: itemPath may not exist
          canApply = canApply && (userMod.includes(optionalArgs.itemPath) || !userMod.includes('@system'))
        }

        if (actorInCombat) {
          canApply =
            canApply && (!taggedSettings.nonCombatOnlyTag || !modifierTags.includes(taggedSettings.nonCombatOnlyTag))
        } else {
          canApply = canApply && (!taggedSettings.combatOnlyTag || !modifierTags.includes(taggedSettings.combatOnlyTag))
        }

        if (canApply) {
          const regex = new RegExp(/^[+-]\d+(.*?)(?=[#@])/)
          const desc = userMod.match(regex)?.[1].trim() || ''
          const mod = userMod.match(/[-+]\d+/)?.[0] || '0'

          GURPS.ModifierBucket.addModifier(mod, desc, undefined, true)
        }
      }
    }

    return isDamageRoll
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2
   *
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
    action: { type: string; name: string; orig: string; overridetxt?: string; attrkey: string },
    chatthing: string,
    formula: string,
    thing: string
  ): { name: string; uuid: string | null; itemId: string | null; fromItem: string | null; pageRef: string | null } {
    if (this.isNewActorType) return this.modelV2.findUsingAction(action, chatthing, formula, thing)

    // Legacy V1 handling.
    const originType = action ? action.type : 'undefined'
    let result = undefined
    let name: string, mode: string | undefined

    switch (originType) {
      case 'attack': {
        name = action.name.split('(')[0].trim()
        mode = action.name.match(/\((.+)\)/)?.[1]
        const path = action.orig.toLowerCase().startsWith('m:') ? 'melee' : 'ranged'

        recurselist(this.modelV1[path], (obj, _k, _d) => {
          if ((obj.originalName === name || obj.name === name) && (!mode || obj.mode === mode)) {
            result = {
              name: obj.name,
              uuid: obj.uuid,
              itemId: obj.itemid,
              fromItem: obj.fromItem,
              pageRef: obj.pageref,
            }
          }
        })

        if (!Object.keys(result!).length) {
          result = {
            name: thing,
            uuid: null,
            itemId: null,
            fromItem: null,
            pageRef: null,
          }
        }

        break
      }
      case 'weapon-block':
      case 'weapon-parry':
        name = action.name.split('(')[0].trim()
        mode = action.name.match(/\((.+?)\)/)?.[1]
        recurselist(this.modelV1.melee, (melee, _k, _d) => {
          if ((melee.originalName === name || melee.name === name) && (!mode || melee.mode === mode)) {
            result = {
              name: melee.name,
              uuid: melee.uuid,
              itemId: melee.itemid,
              fromItem: melee.fromItem,
              pageRef: melee.pageref,
            }
          }
        })

        if (!Object.keys(result!).length) {
          result = {
            name: thing,
            uuid: null,
            itemId: null,
            fromItem: null,
            pageRef: null,
          }
        }

        break
      case 'skill-spell': {
        const item = this.findByOriginalName(action.name)

        if (item) {
          result = {
            name: item.name,
            uuid: item.uuid,
            // @ts-expect-error: itemid missing in types
            itemId: item.itemid,
            // @ts-expect-error: fromItem missing in types
            fromItem: item.fromItem,
            // @ts-expect-error: pageref missing in types
            pageRef: item.pageref,
          }
        } else {
          result = {
            name: action.name,
            uuid: null,
            itemId: null,
            fromItem: null,
            pageRef: null,
          }
        }

        break
      }
      case 'attribute': {
        let attrName = action?.overridetxt

        if (!attrName) attrName = game.i18n!.localize(`GURPS.${action.attrkey.toLowerCase()}`)
        if (attrName.startsWith('GURPS')) attrName = game.i18n!.localize(`GURPS.attributes${action.attrkey}NAME`)
        result = {
          name: attrName,
          uuid: null,
          itemId: null,
          fromItem: null,
          pageRef: null,
        }
        break
      }
      case 'controlroll':
        result = {
          name: action.overridetxt || action.orig,
          uuid: null,
          itemId: null,
          fromItem: null,
          pageRef: null,
        }
        break

      default:
        result = {
          name: thing ? thing : chatthing ? chatthing.split('/[')[0] : formula,
          uuid: null,
          itemId: null,
          fromItem: null,
          pageRef: null,
        }
    }

    return result!
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2
   */
  async changeDR(drFormula: string, locations: string[]) {
    if (this.isNewActorType) return this.modelV2.changeDR(drFormula, locations)

    // Legacy V1 handling
    let changed = false
    const actorLocations: Record<string, HitLocationEntryV1> = { ...this.modelV1.hitlocations }
    let affectedLocations: string[] = []
    let availableLocations = []

    this._getDRFromItems(actorLocations)

    if (locations.length > 0) {
      // Get Actor Body Plan
      const bodyPlan = this.modelV1.additionalresources.bodyplan

      if (!bodyPlan) {
        return { changed, warn: 'No body plan found in actor.' }
      }

      const table = HitLocation.getHitLocationRolls(bodyPlan)

      // Humanoid Body Plan example: [
      //   "Eye",
      //   "Skull",
      //   "Face",
      //   "Right Leg",
      //   "Right Arm",
      //   "Torso",
      //   "Groin",
      //   "Left Arm",
      //   "Left Leg",
      //   "Hand",
      //   "Foot",
      //   "Neck",
      //   "Vitals"
      // ]
      availableLocations = Object.keys(table).map(key => key.toLowerCase())
      affectedLocations = availableLocations.filter(location => {
        for (const loc of locations) {
          if (location.includes(loc)) return { changed: true }
        }

        return { changed: false }
      })

      if (!affectedLocations.length) {
        const msg = `<p>No valid locations found using: <i>${locations.join(
          ', '
        )}</i>.</p><p>Available locations are: <ul><li>${availableLocations.join('</li><li>')}</li></ul>`
        const warn = 'No valid locations found. Available locations are: ' + availableLocations.join(', ')

        return { changed, msg, warn }
      }
    }

    for (const key in actorLocations) {
      let formula

      if (!locations.length || affectedLocations.includes(actorLocations[key].where.toLowerCase())) {
        changed = true
        formula = drFormula
      } else {
        formula = '+0'
      }

      actorLocations[key] = this._changeDR(formula, actorLocations[key])
    }

    if (changed) {
      // Exclude than rewrite the hitlocations on Actor
      await this.internalUpdate({ 'system.-=hitlocations': null } as Actor.UpdateData)
      await this.update({ 'system.hitlocations': actorLocations } as Actor.UpdateData)
      const msg = `${this.name}: DR ${drFormula} applied to ${
        affectedLocations.length > 0 ? affectedLocations.join(', ') : 'all locations'
      }`

      return { changed, msg, info: msg }
    }

    return { changed: false }
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2
   *
   * Check if a roll can be performed.
   * NOTE: there doesn't seem to be much reason for this method to be in the Actor class.
   * Consider moving it to roll or elsewhere.
   */
  async canRoll(
    // TODO: replace with action
    action: AnyObject, // Action parsed from OTF
    token: Token.Implementation, // Actor Token
    chatThing?: string, // String representation of the action
    actorComponent?: AnyObject // Actor Component for the action
  ): Promise<CanRollResult> {
    const isAttack = action.type === 'attack'
    const isDefense = action.attribute === 'dodge' || action.type === 'weapon-parry' || action.type === 'weapon-block'
    const isAttribute = action.type === 'attribute'
    const isSlam =
      action.type === 'damage' && (action.orig as string).includes('slam') && (action.orig as string).includes('@')
    const isCombatActive = game.combat?.active === true
    const isCombatant = this.inCombat
    const isCombatStarted = isCombatActive && game.combat.started === true

    const result: Awaited<ReturnType<typeof this.canRoll>> = {
      canRoll: true,
      isSlam,
      hasActions: true,
      isCombatant,
    }

    if (!isCombatActive || !isCombatant || !this.isOfType('characterV2', 'enemy')) return result

    const needTarget = !isSlam && (isAttack || action.isSpellOnly || action.type === 'damage')
    const checkForTargetSettings = this.getSetting(Settings.SETTING_ALLOW_TARGETED_ROLLS, 'Allow')

    if (isCombatant && needTarget && game.user?.targets.size === 0) {
      result.canRoll = result.canRoll && checkForTargetSettings !== 'Forbid'
      result.targetMessage =
        checkForTargetSettings !== 'Allow'
          ? game.i18n?.localize(`GURPS.${checkForTargetSettings.toLowerCase()}NoTargetSelected`)
          : ''
    }

    if (!(token && isCombatActive && isCombatant && !isSlam)) return result

    const actions = await TokenActions.fromToken(token)

    // If the current maneuver is invalid for the action, add a warning message to the
    // result and set canRoll to false depending on the maneuver settings
    if ((!actions.canAttack && isAttack) || (!actions.canDefend && isDefense)) {
      const maneuver = game.i18n?.localize(Maneuvers.getManeuver(actions.currentManeuver).label) ?? ''
      const rollTypeLabel = game.i18n?.localize(isAttack ? 'GURPS.attackRoll' : 'GURPS.defenseRoll') ?? ''
      const checkManeuverSetting = this.getSetting(Settings.SETTING_ALLOW_ROLL_BASED_ON_MANEUVER, 'Warn')

      const message =
        checkManeuverSetting !== 'Allow'
          ? game.i18n?.format(`GURPS.${checkManeuverSetting.toLowerCase()}CannotRollWithManeuver`, {
              rollTypeLabel,
              maneuver,
            })
          : ''

      result.canRoll = result.canRoll && checkManeuverSetting !== 'Forbid'
      result.message = message
    }

    // If the maximum actions limit has been reached, add a warning message to the
    // result and set canRoll to false depending on the actions settings
    const checkMaxActionsSetting = this.getSetting(Settings.SETTING_ALLOW_AFTER_MAX_ACTIONS, 'Warn')
    const maxActions = this.modelV2.conditions.actions.maxActions ?? 1
    const extraActions = actions.extraActions ?? 0
    const canConsumeAction = this.canConsumeAction(action, chatThing, actorComponent)

    if (
      !isAttack &&
      !isDefense &&
      !isAttribute &&
      actions.totalActions >= maxActions + extraActions &&
      canConsumeAction
    ) {
      result.canRoll = result.canRoll && checkMaxActionsSetting !== 'Forbid'
      result.hasActions = false
      result.maxActionMessage =
        checkMaxActionsSetting !== 'Allow'
          ? game.i18n?.localize(`GURPS.${checkMaxActionsSetting.toLowerCase()}MaxActionsReached`)
          : ''
    }

    // Same as above, but for maximum attacks per round
    // using things like Extra Attack
    const itemExtraAttacks = actorComponent?.extraAttacks ?? 0
    const rapidStrikeBonus = actorComponent?.rapidStrikeBonus ?? 0

    if (
      isAttack &&
      canConsumeAction &&
      Math.max(actions.totalAttacks, actions.totalActions) >=
        maxActions + extraActions + (actions.extraAttacks ?? 0) + itemExtraAttacks + rapidStrikeBonus
    ) {
      result.canRoll = result.canRoll && checkMaxActionsSetting !== 'Forbid'
      result.hasActions = false
      result.maxAttackMessage =
        checkMaxActionsSetting !== 'Allow'
          ? game.i18n?.localize(`GURPS.${checkMaxActionsSetting.toLowerCase()}MaxAttacksReached`)
          : ''
    }

    // Same as above, but for maximum blocks per round
    const maxBlocks = this.modelV2.conditions.actions.maxBlocks ?? 1

    if (
      isDefense &&
      canConsumeAction &&
      action.type === 'weapon-block' &&
      actions.totalBlocks >= maxBlocks + (actions.extraBlocks ?? 0) + extraActions
    ) {
      result.canRoll = result.canRoll && checkMaxActionsSetting !== 'Forbid'
      result.hasActions = false
      result.maxBlockmessage =
        checkMaxActionsSetting !== 'Allow'
          ? game.i18n?.localize(`GURPS.${checkMaxActionsSetting.toLowerCase()}MaxBlocksReached`)
          : ''
    }

    // Same as above, but for maximum parries per round
    if (
      isDefense &&
      canConsumeAction &&
      action.type === 'weapon-parry' &&
      actions.totalParries >= extraActions + (actions.maxParries ?? 0)
    ) {
      result.canRoll = result.canRoll && checkMaxActionsSetting !== 'Forbid'
      result.hasActions = false
      result.maxParryMessage =
        checkMaxActionsSetting !== 'Allow'
          ? game.i18n?.localize(`GURPS.${checkMaxActionsSetting.toLowerCase()}MaxParriesReached`)
          : ''
    }

    // Check if combat has started
    if (!isCombatStarted) {
      const checkCombatStartedSetting = this.getSetting(Settings.SETTING_ALLOW_ROLLS_BEFORE_COMBAT_START, 'Warn')

      result.canRoll = result.canRoll && checkCombatStartedSetting !== 'Forbid'
      result.rollBeforeStartMessage =
        checkCombatStartedSetting !== 'Allow'
          ? game.i18n?.localize(`GURPS.${checkCombatStartedSetting.toLowerCase()}RollsBeforeCombatStarted`)
          : ''
    }

    return result
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2
   *
   * Check if the current action consumes an action slot from the actor.
   * False by default to handle things like attribute rolls.
   */
  canConsumeAction(action: AnyObject, chatThing?: string, actorComponent?: AnyObject): boolean {
    if (!action && !chatThing) return false

    const useMaxActions = this.getSetting(Settings.SETTING_USE_MAX_ACTIONS, 'Disable')

    if (useMaxActions === 'Disable') return false

    const isCombatant = this.inCombat

    if (!isCombatant && useMaxActions === 'AllCombatant') return false

    const actionType = chatThing?.match(/(?<=@|)(\w+)(?=:)/g)?.[0].toLowerCase() ?? ''
    const isAttack = action?.type === 'attack' || ['m', 'r'].includes(actionType)
    const isDefense =
      action?.attribute === 'dodge' ||
      action?.type === 'weapon-parry' ||
      action?.type === 'weapon-block' ||
      ['dodge', 'p', 'b'].includes(actionType)
    const isDodge = action?.attribute === 'dodge' || actionType === 'dodge'
    const isSkill = (action?.type === 'skill-spell' && action.isSkillOnly) || actionType === 'sk'
    const isSpell = (action?.type === 'skill-spell' && action.isSpellOnly) || actionType === 'sp'

    const actionIsMarkedAsConsume: boolean | null = (actorComponent?.consumeAction as boolean | undefined) ?? null

    if ((isSpell || isAttack || isDefense) && !isDodge) {
      return actionIsMarkedAsConsume !== null ? actionIsMarkedAsConsume : true
    } else if (isSkill) {
      return actionIsMarkedAsConsume !== null ? actionIsMarkedAsConsume : false
    }

    return false
  }

  /**
   * NOTE: Both character and characterV2.
   *
   * This method is called when "system.conditions.maneuver" changes on the actor (via the update method)
   */
  async replaceManeuver(maneuverId: string) {
    this.getDependentTokens().forEach(token => token.object?.setManeuver(maneuverId))
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   *
   * TODO The behavior of replacePosture and replaceManeuver are different. The maneuver one updates tokens, while this
   * one toggles status effects. Consider unifying the behavior.
   */
  async replacePosture(postureId: string) {
    const id = postureId === GURPS.StatusEffectStanding ? this.modelV2.conditions.posture : postureId

    this.toggleStatusEffect(id)
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   */
  isEffectActive(effect: ActiveEffect.Implementation | { id: string }): boolean {
    return this.effects.some(activeEffect => activeEffect.id === effect.id)
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2
   */
  get damageAccumulators(): any[] | null {
    return this.isNewActorType
      ? (this.modelV2.conditions.damageAccumulators ?? null)
      : (this.modelV1.conditions.damageAccumulators ?? null)
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   */
  async accumulateDamageRoll(action: fields.SchemaField.InitializedData<DamageActionSchema>): Promise<void> {
    if (this.isNewActorType) return this.modelV2.accumulateDamageRoll(action)

    // Legacy V1 handling.
    if (!this.modelV1.conditions.damageAccumulators) this.modelV1.conditions.damageAccumulators = []

    const accumulators = this.modelV1.conditions.damageAccumulators
    const existing = accumulators.findIndex(it => it.orig === action.orig)

    if (existing !== -1) return this.incrementDamageAccumulator(existing)

    // an existing accumulator is not found, create one
    const legacyAction = action as unknown as DamageAccumulator

    legacyAction.count = 1
    accumulators.push(legacyAction)
    await this.internalUpdate({ 'system.conditions.damageAccumulators': accumulators } as Actor.UpdateData)
    GURPS.ModifierBucket.render()
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   */
  async incrementDamageAccumulator(index: number): Promise<void> {
    if (this.isNewActorType) return this.modelV2.incrementDamageAccumulator(index)

    // Legacy V1 handling.
    this.damageAccumulators![index].count++
    await this.internalUpdate({ 'system.conditions.damageAccumulators': this.damageAccumulators } as Actor.UpdateData)
    GURPS.ModifierBucket.render()
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   */
  async decrementDamageAccumulator(index: number): Promise<void> {
    if (this.isNewActorType) return this.modelV2.decrementDamageAccumulator(index)

    // Legacy V1 handling.
    if (this.damageAccumulators) {
      this.damageAccumulators[index].count--
      if (this.damageAccumulators[index].count < 1) this.damageAccumulators.splice(index, 1)
      await this.internalUpdate({ 'system.conditions.damageAccumulators': this.damageAccumulators } as Actor.UpdateData)
      GURPS.ModifierBucket.render()
    }
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   */
  async clearDamageAccumulator(index: number): Promise<void> {
    if (this.isNewActorType) return this.modelV2.clearDamageAccumulator(index)

    // Legacy V1 handling.
    if (this.damageAccumulators) {
      this.damageAccumulators.splice(index, 1)
      await this.internalUpdate({ 'system.conditions.damageAccumulators': this.damageAccumulators } as Actor.UpdateData)
      GURPS.ModifierBucket.render()
    }
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   */
  async applyDamageAccumulator(index: number): Promise<void> {
    if (this.isNewActorType) return this.modelV2.applyDamageAccumulator(index)

    // Legacy V1 handling.
    if (this.damageAccumulators) {
      const accumulator = this.damageAccumulators[index]
      const roll = multiplyDice(accumulator.formula, accumulator.count)

      if (accumulator.costs) {
        const costs = accumulator.costs.match(COSTS_REGEX)

        if (costs) {
          accumulator.costs = `*${costs.groups.verb} ${accumulator.count * costs.groups.cost} ${costs.groups.type}`
        }
      }

      accumulator.formula = roll
      this.damageAccumulators.splice(index, 1)
      await this.internalUpdate({ 'system.conditions.damageAccumulators': this.damageAccumulators } as Actor.UpdateData)
      await GURPS.performAction(accumulator, GURPS.LastActor)
    }
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   */
  findEquipmentByName(pattern: string, otherFirst = false): [Item.Implementation | null, string | null] | null {
    if (this.isNewActorType) {
      // Removed leading slashes
      const patterns = makeRegexPatternFrom(pattern.replace(/^\/+/, ''))
        // Remove leading ^
        .substring(1)
        // Split by /
        .split('/')
        // Apply ^ to each pattern
        .map(patternFragment => new RegExp('^' + patternFragment, 'i'))

      const carriedItem = this.modelV2.equipmentV2.carried.find((equipmentItem: Item.OfType<'equipmentV2'>) =>
        patterns.some(pattern => pattern.test(equipmentItem.name))
      )
      const otherItem = this.modelV2.equipmentV2.other.find((equipmentItem: Item.OfType<'equipmentV2'>) =>
        patterns.some(pattern => pattern.test(equipmentItem.name))
      )

      const carriedResult: [Item.OfType<'equipmentV2'>, string] | null = carriedItem
        ? [carriedItem ?? null, carriedItem.id ?? '']
        : null
      const otherResult: [Item.OfType<'equipmentV2'>, string] | null = otherItem
        ? [otherItem ?? null, otherItem.id ?? '']
        : null

      return otherFirst ? (otherResult ?? carriedResult ?? null) : (carriedResult ?? otherResult ?? null)
    } else {
      // Legacy actorv1 logic.
      while (pattern[0] == '/') pattern = pattern.substring(1)
      pattern = makeRegexPatternFrom(pattern, false)
      const patterns = pattern
        .substring(1) // remove the ^ from the beginning of the string
        .split('/')
        .map(patternFragment => new RegExp('^' + patternFragment, 'i')) // and apply it to each pattern
      /**
       * @type {any}
       */
      let eqt: Item | null = null
      let key: string | null = null

      const list1 = otherFirst ? this.modelV1.equipment.other : this.modelV1.equipment.carried
      const list2 = otherFirst ? this.modelV1.equipment.carried : this.modelV1.equipment.other
      const pkey1 = otherFirst ? 'system.equipment.other.' : 'system.equipment.carried.'
      const pkey2 = otherFirst ? 'system.equipment.carried.' : 'system.equipment.other.'

      recurselist(
        list1,
        // @ts-expect-error - callback signature differs from recurselist type
        (value, parentKey, depth) => {
          const length = patterns.length - 1
          const pattern = patterns[Math.min(depth, length)]

          if (value.name.match(pattern)) {
            if (!eqt && (depth === length || patterns.length === 1)) {
              eqt = value
              key = parentKey
            }
          } else return patterns.length == 1
        },
        pkey1
      )
      recurselist(
        list2,
        // @ts-expect-error - callback signature differs from recurselist type
        (value, parentKey, depth) => {
          const length = patterns.length - 1
          const pattern = patterns[Math.min(depth, length)]

          if (value.name.match(pattern)) {
            if (!eqt && (depth === length || patterns.length === 1)) {
              eqt = value
              key = parentKey
            }
          } else return patterns.length === 1
        },
        pkey2
      )

      return [eqt, key]
    }
  }

  /* ---------------------------------------- */

  async updateEqtCountV2(id: string, count: number) {
    if (!this.isOfType('characterV2', 'enemy')) return null

    const equipment = this.modelV2.allEquipmentV2.find(equipmentItem => equipmentItem.id === id)
    const updateData: Record<string, any> = { _id: id, system: { eqt: { count } } }

    // If modifying the quantity of an item should automatically force imports to ignore the imported quantity,
    // set ignoreImportQty to true.
    if (ImportSettings.ignoreQuantityOnImport) {
      updateData.system.eqt.ignoreImportQty = true
    }

    if (equipment) {
      await this.updateEmbeddedDocuments('Item', [updateData], { parent: this })

      return equipment
    } else {
      throw new Error(`GURPS | Equipment with ID ${id} not found in actor ${this.name}`)
    }
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   */
  isEmptyActor(): boolean {
    // return (this.model).additionalresources.importname === null
    return false
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   */
  async runOTF(otf: string): Promise<void> {
    const action = GURPS.parselink(otf)

    await GURPS.performAction(action.action!, this)
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   */
  getChecks(checkType: string): {
    data: CheckInfo[] | Record<string, CheckInfo> | Record<string, CheckInfo[]>
    size: number
  } {
    if (this.isNewActorType) {
      return this.modelV2.getChecks(checkType)
    } else {
      // Legacy actorv1 logic.
      const quickRollSettings = game.settings!.get(GURPS.SYSTEM_NAME, Settings.SETTING_USE_QUICK_ROLLS)

      if (!quickRollSettings[checkType]) {
        return { data: [], size: 0 }
      }

      const result: { data: CheckInfo[] | Record<string, CheckInfo> | Record<string, CheckInfo[]>; size: number } = {
        data: [],
        size: 0,
      }
      const checks: CheckInfo[] = []
      const data: CheckInfo[] | Record<string, CheckInfo> | Record<string, CheckInfo[]> = {}
      let size = 0

      switch (checkType) {
        case 'attributeChecks': {
          const keys = ['ST', 'DX', 'IQ', 'HT', 'WILL', 'PER']

          for (const key of keys) {
            const attribute = (this.modelV1.attributes as Record<string, any>)[key]

            checks.push({
              symbol: game.i18n!.localize(`GURPS.attributes${key}`),
              label: game.i18n!.localize(`GURPS.attributes${key}NAME`),
              value: attribute.import,
              otf: key,
            })
          }

          result.data = checks
          result.size = checks.length
          break
        }
        case 'otherChecks': {
          const icons = {
            checks: {
              vision: 'fa-solid fa-eye',
              hearing: 'fa-solid fa-ear',
              frightcheck: 'fa-solid fa-face-scream',
              tastesmell: 'fa-regular fa-nose',
              touch: 'fa-solid fa-hand-point-up',
            },
            dmg: {
              thrust: 'fa-solid fa-sword',
              swing: 'fa-solid fa-mace',
            },
          }

          for (const key of Object.keys(icons)) {
            const checks: CheckInfo[] = []

            for (const subKey of Object.keys((icons as Record<string, any>)[key])) {
              const value = (this.modelV1 as Record<string, any>)[subKey]

              checks.push({
                symbol: (icons as Record<string, any>)[key][subKey],
                label: game.i18n!.localize(`GURPS.${subKey}`),
                value,
                otf: subKey,
              })
              size += 1
            }

            data[key] = checks
          }

          result.data = data
          result.size = size
          break
        }
        case 'attackChecks': {
          const attacks = ['melee', 'ranged']

          for (const key of attacks) {
            const checks: CheckInfo[] = []

            recurselist((this.modelV1 as Record<string, any>)[key], (attack, _k, _d) => {
              if (attack.addToQuickRoll) {
                let comp = this.findByOriginalName(attack.originalName || attack.name)

                // @ts-expect-error: Possible null return
                if (!comp) comp = this.findEquipmentByName(attack.name)[0] ?? null
                // @ts-expect-error: itemid missing.
                const img = this.items.get(comp?.itemid)?.img
                const symbol = game.i18n!.localize(`GURPS.${key}`)

                let oftName = attack.name

                if (attack.mode) oftName += ` (${attack.mode})`
                checks.push({
                  symbol,
                  img,
                  label: attack.name,
                  value: attack.import,
                  damage: attack.damage,
                  mode: attack.mode,
                  otf: `${key.slice(0, 1)}:"${oftName}"`,
                  otfDamage: `d:${oftName}`,
                })
                size += 1
              }
            })
            data[key] = checks
          }

          result.data = data
          result.size = size
          break
        }
        case 'defenseChecks': {
          recurselist(this.modelV1.encumbrance, (enc, _k, _d) => {
            if (enc.current) {
              data.dodge = {
                symbol: 'dodge',
                label: game.i18n!.localize(`GURPS.dodge`),
                value: enc.dodge,
                otf: `dodge`,
              }
            }
          })
          const defenses = ['parry', 'block']

          for (const key of defenses) {
            const checks: CheckInfo[] = []

            recurselist(this.modelV1.melee, (defense, _k, _d) => {
              if (parseInt(defense[key] || 0) > 0 && defense.addToQuickRoll) {
                let comp = this.findByOriginalName(defense.originalName || defense.name)

                // @ts-expect-error: Possible null return
                if (!comp) comp = this.findEquipmentByName(defense.name)[0]
                // @ts-expect-error: itemid missing.
                const img = this.items.get(comp?.itemid)?.img
                const symbol = game.i18n!.localize(`GURPS.${key}`)
                let otf = `${key.slice(0, 1)}:"${defense.name}"`

                if (defense.mode) otf += ` (${defense.mode})`
                checks.push({
                  symbol,
                  img,
                  label: defense.name,
                  value: defense[key],
                  mode: defense.mode,
                  otf,
                })
                size += 1
              }
            })
            data[key] = checks
          }

          result.data = data
          result.size = size + 1
          break
        }
        case 'markedChecks': {
          const traits = ['skills', 'spells', 'ads']

          for (const traitType of traits) {
            recurselist((this.modelV1 as Record<string, any>)[traitType], (trait, _k, _d) => {
              if (trait.addToQuickRoll) {
                const comp = this.findByOriginalName(trait.originalName || trait.name)
                // @ts-expect-error: itemid missing.
                const img = this.items.get(comp?.itemid)?.img
                const symbol = game.i18n!.localize(`GURPS.${traitType.slice(0, -1)}`)

                if (trait.import) {
                  checks.push({
                    symbol,
                    img,
                    label: trait.name,
                    value: trait.import,
                    notes: trait.notes,
                    otf: `${traitType.slice(0, 2)}:"${trait.name}"`,
                    isOTF: false,
                  })
                }

                const possibleOTFs = trait.notes.match(/\[.*?\]/g) || []

                for (const otf of possibleOTFs) {
                  const parsed = parselink(otf)

                  if (parsed) {
                    checks.push({
                      symbol,
                      img,
                      label: parsed.text.replace(/[[\]]/g, ''),
                      value: '',
                      notes: trait.notes,
                      otf: `/r ${parsed.text}`,
                      isOTF: true,
                    })
                  }
                }
              }
            })
          }

          result.data = checks
          result.size = checks.length
          break
        }
      }

      return result
    }
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   */
  async _sanityCheckItemSettings(actorComp: AnyObject): Promise<boolean> {
    let canEdit = false
    const message = 'GURPS.settingNoEquipAllowedHint'

    if (actorComp.itemid) canEdit = true

    if (!canEdit) {
      const phrases = game.i18n!.localize(message)
      const body = phrases
        .split('.')
        .filter(phrase => !!phrase)
        .map(phrase => `${phrase.trim()}.`)
        .join('</p><p>')

      await foundry.applications.api.DialogV2.prompt({
        window: { title: game.i18n!.localize('GURPS.settingNoEditAllowed') },
        content: `<p>${body}</p>`,
        ok: {
          label: 'GURPS.ok',
          icon: 'fa-solid fa-check',
        },
      })
    }

    return canEdit
  }

  /**
   * NOTE: Both character and characterV2.
   *
   * Finds the actor component key corresponding to the given ID.
   *
   * @param key - The key to search for in the trait objects.
   * @param id - The ID to match within the trait objects.
   * @param sysKey - The system.<key> to use for the search.
   * @param include - Whether to check equal or include in the search
   * @return The trait key if found, otherwise undefined.
   */
  _findSysKeyForId(key: string, id: string | undefined, sysKey: string, include: boolean = false): string | undefined {
    let traitKey: string | undefined = undefined
    const data = this.system as Record<string, any>
    const list = data[sysKey] as any

    if (list) {
      recurselist(list, (value: any, parentKey: string, _depth: number) => {
        const exists = include ? !!value?.[key]?.includes?.(id) : value?.[key] === id

        if (exists) traitKey = `system.${sysKey}.` + parentKey
      })
    }

    return traitKey
  }

  /**
   * NOTE: Both character and characterV2.
   */
  async toggleExpand(path: string, expandOnly: boolean = false) {
    if (this.isNewActorType) {
      const obj = foundry.utils.getProperty(this, path) as any

      // Check if object implements IContainable interface and call toggleOpen
      if (ContainerUtils.isToggleable(obj)) await obj.toggleOpen(expandOnly)
    } else {
      // Legacy actor type
      const obj = foundry.utils.getProperty(this, path) as any

      if (!!obj.collapsed && Object.keys(obj.collapsed).length > 0) {
        const temp = { ...obj.contains, ...obj.collapsed }
        const update = {
          [path + '.-=collapsed']: null,
          [path + '.collapsed']: {},
          [path + '.contains']: temp,
        }

        await this.update(update)
      } else if (!expandOnly && !!obj.contains && Object.keys(obj.contains).length > 0) {
        const temp = { ...obj.contains, ...obj.collapsed }
        const update = {
          [path + '.-=contains']: null,
          [path + '.contains']: {},
          [path + '.collapsed']: temp,
        }

        await this.update(update)
      }
    }
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   */
  async refreshDR() {
    await this.changeDR('+0', [])
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   *
   * Reorder an item in the actor's item list. This function moves the item at sourceKey to be just before the item at
   * targetKey.
   * @param sourceKey A full path up to the index, such as "system.skills.123456"
   * @param targetkey A full path up to the index, such as "system.skills.654321"
   * @param object The object to move
   * @param isSrcFirst Whether the source key comes first
   *
   * @deprecated Use moveItem() instead
   */
  async reorderItem(sourceKey: string, targetkey: string, object: any, isSrcFirst: boolean) {
    if (this.isNewActorType) return await this.moveItem(sourceKey, targetkey)

    // Legacy actor type.
    if (!isSrcFirst) {
      await this._removeKey(sourceKey)
      await this._insertBeforeKey(targetkey, object)
    } else {
      await this._insertBeforeKey(targetkey, object)
      await this._removeKey(sourceKey)
    }
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   */
  async updateEqtCount(eqtkey: string, count: number) {
    if (this.isNewActorType) {
      const eqt = foundry.utils.getProperty(this, eqtkey) as EquipmentV1
      const item = eqt.equipmentV2

      await this.updateEqtCountV2(item.id!, count)
    } else {
      /** @type {{ [key: string]: any }} */
      const eqt: { [key: string]: any } = foundry.utils.getProperty(this, eqtkey) as any

      if (!(await this._sanityCheckItemSettings(eqt))) return
      const update = { [eqtkey + '.count']: count }

      if (ImportSettings.ignoreQuantityOnImport)
        // @ts-expect-error - dynamic property assignment to update object
        update[eqtkey + '.ignoreImportQty'] = true

      await this.update(update)

      const item: any = this.items.get(eqt.itemid)

      if (item) {
        item.modelV1.eqt!.count = count
        if (ImportSettings.ignoreQuantityOnImport) item.modelV1.eqt!.ignoreImportQty = true

        await item.actor!._updateItemFromForm(item)
      }

      await this.updateParentOf(eqtkey, false)
    }
  }

  /* ---------------------------------------- */

  async deleteEntry(path: string, { refreshDR = true } = {}): Promise<unknown> {
    const data = foundry.utils.getProperty(this, path)

    if (!data) return data

    const savedIgnoreRender = this.ignoreRender

    this.ignoreRender = true

    try {
      const deletions = collectDeletions(data, path)

      for (const { itemid } of deletions) {
        if (itemid) {
          const foundryItem = this.items.get(itemid)

          if (foundryItem) await foundryItem.delete()
          await this._removeItemAdditions(itemid)
        }
      }

      await GURPS.removeKey(this, path)

      if (refreshDR && path.includes('.equipment.')) {
        await this.refreshDR()
      }
    } finally {
      this.ignoreRender = savedIgnoreRender
      this._forceRender()
    }

    return data
  }

  /* ---------------------------------------- */

  async deleteItem(item: Item.Implementation) {
    for (const child of item.contents) await this.deleteItem(child)
    await this.deleteEmbeddedDocuments('Item', [item.id!])
  }

  /* ---------------------------------------- */

  async editItem(path: string, obj: any) {
    if (this.isNewActorType) {
      const note = foundry.utils.getProperty(this, path) as NoteV1
      const item = note.noteV2
      const array = foundry.utils.deepClone(this.system._source.allNotes)
      const index = array.findIndex(noteSource => noteSource.id === item.id)

      if (index !== -1) {
        array[index] = { ...array[index], ...obj }
        await this.update({ 'system.allNotes': array } as Actor.UpdateData)
      }
    } else {
      if (obj.modifierTags) obj.modifierTags = cleanTags(obj.modifierTags).join(', ')
      await this.removeModEffectFor(path)
      await this.internalUpdate({ [path]: obj })
      const commit = this.applyItemModEffects({}, true)

      if (commit) {
        await this.internalUpdate(commit)

        if (canvas!.tokens!.controlled.length > 0) {
          // @ts-expect-error - TokenDocument.setFlag parameters not fully typed
          await canvas!.tokens!.controlled[0].document.setFlag('gurps', 'lastUpdate', new Date().getTime().toString())
        }
      }
    }
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   */
  async handleEquipmentDrop(dragData: EquipmentDropData): Promise<boolean> {
    // Drag and drop on same actor is handled by moveEquipment().
    if (dragData.actorid === this.id) return false

    if (!dragData.itemid) {
      ui.notifications?.warn(game.i18n!.localize('GURPS.cannotDragNonFoundryEqt'))

      return false
    }

    // TODO: Why is dragging from unlinked tokens disallowed?
    if (!dragData.isLinked) {
      ui.notifications?.warn(
        `You cannot drag from an unlinked token. The source token must have 'Link Actor Data' checked.`
      )

      return false
    }

    const srcActor = game.actors!.get(dragData.actorid) as GurpsActorV2<Actor.SubType> | undefined

    if (!srcActor) return false
    const eqt = foundry.utils.getProperty(srcActor, dragData.key) as EquipmentV1

    if (
      (!!eqt.contains && Object.keys(eqt.contains).length > 0) ||
      (!!eqt.collapsed && Object.keys(eqt.collapsed).length > 0)
    ) {
      ui.notifications?.warn('You cannot transfer an Item that contains other equipment.')

      return false
    }

    let count: number | null = eqt.count

    if (count && count > 1) {
      count = await this.promptEquipmentQuantity(eqt.name, game.i18n!.format('GURPS.TransferTo', { name: this.name }))
    }

    if (!count) return false

    if (count! > eqt.count) count = eqt.count

    // If the two actors are owned by the same user...
    if (this.isOwner && srcActor?.isOwner) {
      if (this.isNewActorType) {
        // Search the target actor (this) for an item with the same name.
        const existing = this.findEquipmentByName(eqt.name, false)

        if (existing) {
          // If found, increment the count of the existing item.
          // @ts-expect-error - equipmentV2 system type not fully typed
          await this.updateEqtCountV2(existing[0].id!, existing[0].system.eqt.count + count)
        } else {
          // If not found, create a new item with the specified count.
          await this.#createEquipment(eqt.equipmentV2.toObject(false), count)
        }

        // Adjust the source actor's equipment.
        if (count >= eqt.count) await srcActor.deleteEntry(dragData.key)
        else await srcActor.updateEqtCount(dragData.key, +eqt.count - count)
      } else {
        // Legacy actor type
        // Search the target actor (this) for an item with the same name.
        // @ts-expect-error - itemid property from actor component
        const item = srcActor.items.get(eqt.itemid)

        const destKey = this._findEqtkeyForId('name', eqt.name)

        // If this actor already has the item, just update the count.
        if (destKey) {
          const destEqt = foundry.utils.getProperty(this, destKey) as EquipmentV1

          await this.updateEqtCount(destKey, +destEqt.count + count)
        } else {
          // Otherwise, create a new item.
          // @ts-expect-error - equipment system eqt property not fully typed
          item.system.eqt.count = count
          await this.addNewItemData(item as Record<string, any>)
        }

        // Adjust the source actor's equipment.
        if (count >= eqt.count) await srcActor.deleteEntry(dragData.key)
        else await srcActor.updateEqtCount(dragData.key, +eqt.count - count)
      }
    } else {
      // The two actors are not owned by the same user.
      const destowner = game.users?.players.find(player => this.testUserPermission(player, 'OWNER'))

      if (destowner) {
        // Send a request to the owner of the destination actor to add the item.
        ui.notifications?.info(`Asking ${this.name} if they want ${eqt.name}`)

        dragData.itemData.system.eqt.count = count // They may not have given all of them

        game.socket?.emit('system.gurps', {
          type: 'dragEquipment1',
          srckey: dragData.key,
          srcuserid: game.user!.id,
          srcactorid: dragData.actorid,
          destuserid: destowner.id,
          destactorid: this.id,
          itemData: dragData.itemData,
          count: +count,
        })
      } else ui.notifications?.warn(game.i18n!.localize('GURPS.youDoNotHavePermission'))
    }

    return false
  }

  /* ---------------------------------------- */

  async #createEquipment(eqt: Record<string, any>, count: number, parent: Item.OfType<'equipmentV2'> | null = null) {
    const { _id: _omit, ...itemData } = foundry.utils.duplicate(eqt) as Record<string, any>

    itemData.system.containedBy = parent?.id ?? null
    itemData.system.eqt.count = count
    itemData.system.eqt.carried = true // Default to carried when transferring.
    await this.createEmbeddedDocuments('Item', [itemData as Item.CreateData], { parent: this })
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   *
   * @deprecated Use moveItem() instead
   */
  async moveEquipment(sourcekey: string, targetkey: string, shiftkey: boolean = false) {
    if (this.isNewActorType) return await this.moveItem(sourcekey, targetkey, shiftkey)

    // Legacy actor type.
    if (sourcekey == targetkey) return
    if (shiftkey && (await this._splitEquipment(sourcekey, targetkey))) return
    // Because we may be modifing the same list, we have to check the order of the keys and
    // apply the operation that occurs later in the list, first (to keep the indexes the same)
    const srca = sourcekey.split('.')

    srca.splice(0, 3)
    const tara = targetkey.split('.')

    tara.splice(0, 3)
    const max = Math.min(srca.length, tara.length)
    let isSrcFirst = max === 0 ? srca.length > tara.length : false

    for (let i = 0; i < max; i++) {
      if (parseInt(srca[i]) < parseInt(tara[i])) isSrcFirst = true
    }

    const object = foundry.utils.getProperty(this, sourcekey) as any

    if (targetkey.match(/^system\.equipment\.\w+$/)) {
      this.ignoreRender = true
      object.parentuuid = ''

      if (object.itemid) {
        const item = this.items.get(object.itemid)!

        await this.updateEmbeddedDocuments('Item', [{ _id: item.id, 'system.eqt.parentuuid': '' } as Item.UpdateData])
      }

      const target = { ...GURPS.decode<EquipmentV1>(this, targetkey) } // shallow copy the list

      if (!isSrcFirst) await GURPS.removeKey(this, sourcekey)
      const eqtkey = GURPS.put(target, object)

      await this.updateItemAdditionsBasedOn(object, targetkey + '.' + eqtkey)
      await this.update({ [targetkey]: target })
      if (isSrcFirst) await GURPS.removeKey(this, sourcekey)

      return this._forceRender()
    }

    if (await this._checkForMerging(sourcekey, targetkey)) return

    if (sourcekey.includes(targetkey) || targetkey.includes(sourcekey)) {
      ui.notifications!.error('Unable to drag and drop withing the same hierarchy. Try moving it elsewhere first.')

      return
    }

    this.toggleExpand(targetkey, true)

    const where = await foundry.applications.api.DialogV2.wait({
      window: { title: object.name },
      content: `<p>${game.i18n!.localize('GURPS.dropPlacement')}</p>`,
      buttons: [
        {
          action: 'before',
          icon: 'fa-solid fa-turn-left-down',
          label: 'GURPS.dropBefore',
          default: true,
        },
        {
          action: 'inside',
          icon: 'fa-solid fa-arrow-down-to-bracket',
          label: 'GURPS.dropInside',
        },
      ],
    })

    if (!where) return

    this.ignoreRender = true

    if (!isSrcFirst) {
      await GURPS.removeKey(this, sourcekey)
      await this.updateParentOf(sourcekey, false)
    }

    await this.updateItemAdditionsBasedOn(object, targetkey)

    const key = where === 'before' ? targetkey : targetkey + '.contains.' + zeroFill(0)

    await GURPS.insertBeforeKey(this, key, object)
    await this.updateParentOf(key, true)

    if (isSrcFirst) {
      await GURPS.removeKey(this, sourcekey)
      await this.updateParentOf(sourcekey, false)
    }

    this._forceRender()
  }

  /* ---------------------------------------- */

  /**
   * Handles EITHER legacy or new-style item movement within the actor's items.
   * @param sourcekey using legacy Equipment, such as 'system.equipment.carried.00112' or new-style 'system.equipmentV2.carried.0'
   * @param targetkey using legacy format, such as 'system.equipment.other.00000.contains.00123' or new-style 'system.equipmentV2.other.0.contains.0'
   * @param split true if the user wants to split the item quantity.
   */
  async moveItem(sourcekey: string, targetkey: string, split: boolean = false) {
    if (sourcekey == targetkey) return

    // Convert the legacy key format to the new format.
    sourcekey = this.#convertLegacyItemKey(sourcekey)
    targetkey = this.#convertLegacyItemKey(targetkey)

    // Parse the source and target keys.
    const [sourceCollection, sourceIndex, sourcePath] = parseItemKey(sourcekey)
    const [targetCollection, targetIndex_, targetPath_] = parseItemKey(targetkey)
    let targetIndex = targetIndex_
    let targetPath = targetPath_

    const allowed =
      targetCollection.startsWith('system.equipmentV2') && sourceCollection.startsWith('system.equipmentV2')

    if (!allowed) {
      if (targetCollection !== sourceCollection) {
        // TODO: Maybe this should fail quietly? Or it should pop up a warning to the user?
        throw new Error(
          `Cannot reorder items between different collections: ${sourceCollection} and ${targetCollection}`
        )
      }
    }

    // Get the item to move.
    const item = foundry.utils.getProperty(this, sourcekey) as Item.Implementation

    // If Item is equipmentV2, check if we should split the item's quantity.
    if (item && item.type === 'equipmentV2' && split) {
      if (await this.#splitEquipment(sourcekey, targetkey)) return
    }

    // Set isSrcFirst to true if the source comes before the target in the same container.
    let isSrcFirst = false

    if (sourceCollection === targetCollection) {
      if (sourcePath === targetPath && sourceIndex! < targetIndex!) isSrcFirst = true
    }

    // If the item is being dropped onto a same-named item, check if we should merge them.
    if (item.type === 'equipmentV2' && (await this.checkForMerge(item as Item.OfType<'equipmentV2'>, targetkey))) return

    let where: 'before' | 'inside' | 'after' | null = null

    if (targetkey === targetCollection)
      where = 'after' // Dropping on the collection itself, so add to the end.
    else
      where = await this.resolveDropPosition(item as Item.OfType<'equipmentV2' | 'featureV2' | 'skillV2' | 'spellV2'>)

    if (!where) return

    // Get the source array contents
    const sourceArray = foundry.utils.getProperty(
      this,
      sourcePath ? [sourceCollection, sourcePath].join('.') : sourceCollection
    ) as Item.Implementation[]

    // Adjust the target index if dropping before and the source comes before the target.
    if (where === 'before' && isSrcFirst && targetIndex && targetIndex > 0) targetIndex--
    if (where === 'after' && !isSrcFirst) targetIndex = undefined // Add to the end of the array.

    // Dropping inside a container. Set the target to be the end of the container's contents.
    if (where === 'inside') {
      targetPath = `${targetPath ? targetPath + '.' + targetIndex + '.contains' : targetIndex + '.contains'}`
      targetIndex = undefined // Add to the end of the array.

      // Expand the target container if it is collapsed.
      await this.toggleExpand(targetkey, true)
    }

    // Get the target container contents.
    let targetArray = sourceArray

    if (targetCollection !== sourceCollection || targetPath !== sourcePath)
      targetArray = foundry.utils.getProperty(
        this,
        targetPath ? [targetCollection, targetPath].join('.') : targetCollection
      ) as Item.Implementation[]

    // Remove the item from the source array.
    sourceArray.splice(sourceIndex!, 1)

    // If targetIndex is undefined, set to to add to the end of the array.
    targetIndex ??= targetArray.length

    // Set the parent and add the item to the target.
    let containedBy = null

    if (targetPath) {
      const container = foundry.utils.getProperty(
        this,
        targetCollection + '.' + targetPath.replace(/\.contains$/, '') // Get rid of the final '.contains'.
      ) as Item.Implementation

      containedBy = container.id
    }

    const updates: Record<string, any>[] = []
    const update = {
      _id: item.id,
      sort: targetIndex,
      system: {
        containedBy: containedBy ?? null,
      },
    } as Item.UpdateData

    if (item.type === 'equipmentV2') {
      // @ts-expect-error: wrong type for _id provided by fvtt-types
      update.system!.eqt = { carried: targetCollection === 'system.equipmentV2.carried' }
    }

    updates.push(update)

    // Insert the item into the target array at the correct position.
    targetArray.splice(targetIndex, 0, item)

    targetArray.forEach((obj, index) => {
      if (obj === item) return // Skip the moved item, already updated above.
      updates.push({ _id: obj.id, sort: index })
    })

    // Update the sort property of each element in the source arrays.
    if (sourceArray !== targetArray) {
      sourceArray.forEach((obj, index) => {
        updates.push({ _id: obj.id, sort: index })
      })
    }

    await this.updateEmbeddedDocuments('Item', updates, { parent: this })
  }

  private async resolveDropPosition(
    item: Item.OfType<'equipmentV2' | 'featureV2' | 'skillV2' | 'spellV2'>
  ): Promise<'before' | 'inside' | 'after' | null> {
    return await foundry.applications.api.DialogV2.wait({
      window: { title: item.name },
      content: `<p>${game.i18n!.localize('GURPS.dropResolve')}</p>`,
      buttons: [
        {
          action: 'before',
          icon: 'fa-solid fa-turn-left-down',
          label: 'GURPS.dropBefore',
          default: true,
        },
        {
          action: 'inside',
          icon: 'fas fa-sign-in-alt',
          label: 'GURPS.dropInside',
        },
      ],
    })
  }

  /* ---------------------------------------- */

  #convertLegacyItemKey(key: string) {
    key = key.replace(/^system\.ads/, 'system.adsV2')
    key = key.replace(/^system\.spells/, 'system.spellsV2')
    key = key.replace(/^system\.skills/, 'system.skillsV2')
    key = key.replace(/^system\.equipment\.carried/, 'system.equipmentV2.carried')
    key = key.replace(/^system\.equipment\.other/, 'system.equipmentV2.other')

    // For any substring like .12345., convert to parseInt(12345)
    return key.replace(/\.([0-9]+)/g, (_, num) => `.${parseInt(num)}`)
  }

  /**
   * @param key such as 'system.equipment.carried.00000.contains.00123'. May also parse keys ending with a property,
   *  such as 'system.equipment.carried.00000.contains.00123.weight'.
   * @returns [
   *  string - primary component collection, such as 'system.equipment.carried',
   *  number - index (as a number) of the final segment of the path (such as 123 in the example),
   *  path - path within the collection, such as '00000.contains'.
   *  property - final property if the key ends with a property rather than an index, otherwise undefined.
   * ]
   */
  /**
   * Ask the user if they want to split the quantity of the item and put some in targetkey, leaving the rest in srckey.
   * @param srckey
   * @param targetkey
   * @returns true if split was handled.
   */
  async #splitEquipment(srckey: string, targetkey: string): Promise<boolean> {
    const sourceItem = (foundry.utils.getProperty(this, srckey) as Item.OfType<'equipmentV2'>) ?? null

    if (!sourceItem || !sourceItem.eqt || sourceItem.eqt.count <= 1) return false // Nothing to split

    const count = (await this.promptEquipmentQuantity(sourceItem.name, game.i18n!.localize('GURPS.splitQuantity'))) ?? 0

    if (count <= 0) return true // Didn't want to split.
    if (count >= sourceItem.eqt.count) return false // Not a split, but a move.

    // Could be a list such as 'system.equipment.other' or an item such as 'system.equipment.other.1'.
    // If it ends in '.other' or '.carried', parent is null.
    let parent = null

    if (!targetkey.match(/^system\.equipmentV2\.(other|carried)$/)) {
      parent = (foundry.utils.getProperty(this, targetkey) as Item.OfType<'equipmentV2'>) ?? null
    }

    // Copy item and save.
    await this.#createEquipment(sourceItem.toObject(false), count, parent)

    // Update src equipment count (sourceItem.eqt.count - count)
    await this.updateEqtCountV2(sourceItem.id!, sourceItem.eqt.count - count)

    return true
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   */
  private async promptEquipmentQuantity(eqt: string, title: string): Promise<number | null> {
    const result: number | null = await foundry.applications.api.DialogV2.wait({
      window: { title: title },
      content: await foundry.applications.handlebars.renderTemplate('systems/gurps/templates/transfer-equipment.hbs', {
        eqt: eqt,
      }),
      buttons: [
        {
          action: 'ok',
          label: game.i18n!.localize('GURPS.ok'),
          icon: 'fa-solid fa-check',
          // @ts-expect-error - DialogV2 callback button.form.elements not fully typed
          callback: (_, button, __) => parseInt(button.form!.elements.qty.valueAsNumber),
        },
      ],
    })

    return result
  }

  /* ---------------------------------------- */

  private async checkForMerge(item: Item.OfType<'equipmentV2'>, targetkey: string): Promise<boolean> {
    // If dropping on an item of the same name and type, ask if they want to merge.
    const targetItem = (foundry.utils.getProperty(this, targetkey) as Item.OfType<'equipmentV2'>) ?? null

    if (!targetItem || targetItem.type !== 'equipmentV2' || targetItem.name !== item.name) return false

    const merge = await foundry.applications.api.DialogV2.wait({
      window: { title: `Merge Items` },
      content: `Merge the equipment named "${item.name}"?<p>This will add the quantities together and delete the source item.</p>`,
      buttons: [
        {
          action: 'merge',
          icon: 'fa-solid fa-check',
          label: `Merge`,
          default: true,
        },
        {
          action: 'cancel',
          icon: 'fa-solid fa-xmark',
          label: `Cancel`,
        },
      ],
    })

    if (merge === 'merge') {
      // Update the target item's count.
      await this.updateEqtCountV2(targetItem.id!, targetItem.system.eqt.count + item.system.eqt.count)
      // Delete the source item.
      await this.deleteItem(item)

      return true
    }

    return false
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   */
  _findEqtkeyForId(key: string, id: any): string | undefined {
    if (this.isNewActorType) {
      const equipment = [...this.modelV2.equipmentV2.carried, ...this.modelV2.equipmentV2.other]

      return equipment.find((item: Record<string, any>) => item[key] === id)?.id ?? undefined
    } else {
      // Legacy actor type.
      let eqtkey
      const data = this.modelV1

      recurselist(data.equipment.carried, (value, parentKey, _depth) => {
        if (value[key] == id) eqtkey = 'system.equipment.carried.' + parentKey
      })
      if (!eqtkey)
        recurselist(data.equipment.other, (value, parentKey, _depth) => {
          if (value[key] == id) eqtkey = 'system.equipment.other.' + parentKey
        })

      return eqtkey
    }
  }

  /* ---------------------------------------- */

  /**
   * Both for new and legacy actors, add a new item to the actor.
   */
  async addNewItemData(itemData: Record<string, any>, targetKey: string | null = null) {
    if (this.isNewActorType) {
      if (targetKey) {
        targetKey = this.#convertLegacyItemKey(targetKey)
        const parent = foundry.utils.getProperty(this, targetKey) as Item.OfType<'equipmentV2'> | null

        if (parent && parent.isOfType('equipmentV2')) {
          itemData.system.containedBy = parent.id
        }
      }

      this.#createEquipment(itemData, itemData.system.eqt.count ?? 1, null)
    } else {
      // Legacy handling for v1 actors.

      let data = itemData as Item.CreateData

      if (typeof itemData.toObject === 'function') {
        data = itemData.toObject()
        // @ts-expect-error - equipment system eqt property not fully typed
        data.system.eqt.count = itemData.system.eqt.count // For some reason the count isn't deepcopied correctly.
      }

      const localItems = await this.createEmbeddedDocuments('Item', [data]) // add a local Foundry Item based on some Item data

      if (!localItems || localItems.length === 0) return

      const localItem = localItems[0]

      await this.updateEmbeddedDocuments('Item', [
        // @ts-expect-error - equipment system eqt property not fully typed
        { _id: localItem.id, 'system.eqt.uuid': generateUniqueId(), 'system.eqt.save': true },
      ])

      await this.addItemData(localItem, targetKey) // only created 1 item
      const item = this.items.get(localItem._id) as Item.OfType<'base' | 'equipment' | 'feature' | 'skill' | 'spell'>

      return this._updateItemFromForm(item!)
    }
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   */
  async setMoveDefault(value: string) {
    if (this.isNewActorType) {
      const index = parseInt(value)

      if (isNaN(index)) return

      const move: any[] = this.modelV2.moveV2

      for (let i = 0; i < move.length; i++) {
        move[i].default = index === i
      }

      // Replace the entire array.
      await this.update({ 'system.move': move } as Actor.UpdateData)
    } else {
      // Legacy actor type.
      const move = this.modelV1.move

      for (const key in move) {
        move[key].default = value === key
      }

      await this.update({ 'system.move': move } as Actor.UpdateData)
      this._forceRender()
    }
  }

  /**
   * Both for new and legacy actors, add a new item to the actor.
   */
  handleDamageDrop(damageData: any) {
    if (game.user?.isGM || !DamageModule().settings.onlyGMsCanOpenADD()) {
      const dialog = new GURPS.ApplyDamageDialog(this, damageData)

      dialog.render(true)
    } else ui.notifications?.warn(game.i18n?.localize('GURPS.invalidUserForDamageWarning') ?? '')
  }

  /* =========================================================================================== */
  /* Actor v1 methods                                                                            */
  /* =========================================================================================== */

  // @deprecated Actor v1 only.
  private ignoreRender = false

  /* ---------------------------------------- */

  /**
   * @deprecated ActorV1 only.
   */
  get hitLocationByWhere(): Record<string, HitLocationEntryV1> {
    const byWhere: Record<string, HitLocationEntryV1> = {}

    if (this.modelV1.hitlocations) {
      // Convert this.system.hitlocations into an object keyed by location.where.
      for (const [_key, value] of Object.entries(this.modelV1.hitlocations)) {
        byWhere[`${value.where}`] = value
      }
    }

    return byWhere
  }

  /**
   * @deprecated ActorV1 only.
   */
  get trackersByName() {
    // Convert this.system.additionalresources.tracker into an object keyed by tracker.name.
    const byName: Record<string, TrackerInstance> = {}

    for (const [_key, value] of Object.entries(this.modelV1.additionalresources.tracker ?? {})) {
      byName[`${value.name}`] = value
    }

    return byName
  }

  protected override async _onUpdate(changed: any, options: any, userId: string): Promise<void> {
    super._onUpdate(changed, options, userId)

    if (this.isNewActorType) return

    // Automatically set reeling / exhausted conditions based on HP/FP value
    if (this.getSetting(Settings.SETTING_AUTOMATIC_ONETHIRD, false)) {
      const doAnnounce = this.getSetting(Settings.SETTING_SHOW_CHAT_FOR_REELING_TIRED, false)

      if (changed.system?.HP?.value !== undefined) {
        const isReeling = changed.system.HP.value < this.modelV2.HP.max / 3

        if (this.modelV2.conditions.reeling !== isReeling) {
          this.toggleStatusEffect('reeling', { active: isReeling })

          if (doAnnounce) {
            const tag = isReeling ? 'GURPS.chatTurnOnReeling' : 'GURPS.chatTurnOffReeling'
            const message =
              game.i18n?.format(tag, {
                name: this.displayname,
                pdfref: game.i18n.localize('GURPS.pdfReeling'),
              }) ?? ''

            this.sendChatMessage(message)
          }
        }
      }

      if (changed.system?.FP?.value !== undefined) {
        const isExhausted = changed.system.FP.value < this.modelV2.FP.max / 3

        if (this.modelV2.conditions.exhausted !== isExhausted) {
          this.toggleStatusEffect('exhausted', { active: isExhausted })

          if (doAnnounce) {
            const tag = isExhausted ? 'GURPS.chatTurnOnTired' : 'GURPS.chatTurnOffTired'
            const message =
              game.i18n?.format(tag, {
                name: this.displayname,
                pdfref: game.i18n.localize('GURPS.pdfTired'),
              }) ?? ''

            this.sendChatMessage(message)
          }
        }
      }
    }
  }

  /**
   * @deprecated Actor v1 only.
   */
  async postImport(): Promise<void> {
    if (this.isNewActorType) return

    this.calculateDerivedValues()

    // Convoluted code to add Items (and features) into the equipment list
    let orig: Item.OfType<'equipment'>[] = this.items.contents
      .filter(i => i.type === 'equipment')
      .slice()
      .map(i => i as Item.OfType<'equipment'>)
      .sort((left, right) => right.name.localeCompare(left.name)) // in case items are in the same list... add them alphabetically

    let good: Item.OfType<'equipment'>[] = []

    while (orig.length > 0) {
      // We are trying to place 'parent' items before we place 'children' items
      const left: Item.OfType<'equipment'>[] = []
      let atLeastOne = false

      for (const i of orig) {
        const equipmentParentUuid = (i as any).system.eqt!.parentuuid

        if (
          !equipmentParentUuid ||
          good.find(existingEquipmentItem => (existingEquipmentItem as any).system.eqt!.uuid == equipmentParentUuid)
        ) {
          atLeastOne = true
          good.push(i) // Add items in 'parent' order... parents before children (so children can find parent when inserted into list)
        } else left.push(i)
      }

      if (atLeastOne) orig = left
      else {
        // if unable to move at least one, just copy the rest and hope for the best
        good = [...good, ...left]
        orig = []
      }
    }

    for (const item of good) await this.addItemData(item, null) // re-add the item equipment and features

    await this.internalUpdate({ '_stats.systemVersion': game.system!.version } as Actor.UpdateData, {
      diff: false,
      render: false,
    })

    // Set custom trackers based on templates.  should be last because it may need other data to initialize...
    await this.setResourceTrackers()
    await this.syncLanguages()

    // If using Foundry Items we can remove Modifier Effects from Actor Components
    const userMods: string[] = (foundry.utils.getProperty(this.system, 'conditions.usermods') as string[]) || []

    const validMods = userMods.filter(mod => !mod.includes('@system.'))

    await this.update({ 'system.conditions.usermods': validMods } as Actor.UpdateData)

    // If Actor does not have system.conditions.actions, create it
    if (!this.modelV1.conditions.actions) {
      await this.internalUpdate({
        'system.conditions.actions': {
          maxActions: 1,
          maxBlocks: 1,
        },
      } as Actor.UpdateData)
    }

    if (canvas!.tokens!.controlled.length > 0) {
      // @ts-expect-error - TokenDocument.setFlag parameters not fully typed
      await canvas!.tokens!.controlled[0].document.setFlag('gurps', 'lastUpdate', new Date().getTime().toString())
    }
  }

  /**
   * @deprecated Actor v1 only.
   *
   * Adds any assigned resource trackers to the actor data and sheet.
   */
  private async setResourceTrackers() {
    /** @type {TrackerInstance[]} */
    const currentTrackers: TrackerInstance[] = GurpsActorV2.getTrackersAsArray(this.system)

    const newTrackers: ResourceTrackerTemplate[] =
      ResourceTracker.TemplateManager.getMissingRequiredTemplates(currentTrackers)

    // If no new trackers were added, nothing to do.
    if (newTrackers.length === 0) return

    for (const template of newTrackers) {
      this._initializeTrackerValues(template)
      currentTrackers.push(template.tracker)
    }

    const data = arrayToObject(currentTrackers)

    // Remove all trackers first. Add the new "array" of trackers.
    if (data) {
      await this.update({ 'system.additionalresources.-=tracker': null } as Actor.UpdateData)
      await this.update({ 'system.additionalresources.tracker': data } as Actor.UpdateData)
    }
  }

  /**
   * @deprecated Actor v1 only.
   * Ensure Language Advantages conform to a standard (for Polygot module)
   */
  private async syncLanguages() {
    if (this.modelV1.languages) {
      let updated = false
      const newads = { ...this.modelV1.ads }
      const langn = /Language:?/i
      const langt = new RegExp(game.i18n!.localize('GURPS.language') + ':?', 'i')

      recurselist(this.modelV1.languages, (value, _k, _d) => {
        const adv = GURPS.findAdDisad(this, '*' + value.name) // is there an Adv including the same name

        if (adv) {
          if (!adv.name.match(langn) && !adv.name.match(langt)) {
            // GCA4/GCS style
            adv.name = game.i18n!.localize('GURPS.language') + ': ' + adv.name
            updated = true
          }
        } else {
          // GCA5 style (Language without Adv)
          let name = game.i18n!.localize('GURPS.language') + ': ' + value.name

          if (value.spoken == value.written)
            // If equal, then just report single level
            name += ' (' + value.spoken + ')'
          else if (value.spoken)
            // Otherwise, report type and level (like GCA4)
            name += ' (' + game.i18n!.localize('GURPS.spoken') + ') (' + value.spoken + ')'
          else name += ' (' + game.i18n!.localize('GURPS.written') + ') (' + value.written + ')'
          const adv = new Advantage()

          adv.name = name
          adv.points = value.points
          GURPS.put(newads, adv)
          updated = true
        }
      })

      if (updated) {
        await this.internalUpdate({ 'system.ads': newads } as Actor.UpdateData)
      }
    }
  }

  /**
   * @deprecated Actor v1 only.
   *
   * Initialize the attribute starting values/levels. The code is expecting 'value' or 'level' for many things, and
   * instead of changing all of the GUIs and OTF logic we are just going to switch the rug out from underneath.
   * "Import" data will be in the 'import' key and then we will calculate value/level when the actor is loaded.
   */
  _initializeStartingValues() {
    const data = this.modelV1 as Record<string, any>

    data.currentdodge = 0 // start at zero, and bonuses will add, and then they will be finalized later
    if (!!data.equipment && !data.equipment.carried) data.equipment.carried = {} // data protection
    if (!!data.equipment && !data.equipment.other) data.equipment.other = {}

    // Attributes need to have 'value' set because Foundry expects objs with value and max to be attributes (so we can't use currentvalue)
    // Need to protect against data errors
    for (const attr in data.attributes) {
      if (typeof data.attributes[attr] === 'object' && data.attributes[attr] !== null) {
        if (isNaN(data.attributes[attr].import)) data.attributes[attr].value = 0
        else data.attributes[attr].value = parseInt(data.attributes[attr].import)
      }
    }

    recurselist(data.skills as Record<string, Skill>, (skill, _k, _d) => {
      if (skill.import) skill.level = parseInt(skill.import)
    })

    recurselist(data.spells as Record<string, Spell>, (spell, _k, _d) => {
      if (spell.import) spell.level = parseInt(spell.import)
    })

    // we don't really need to use recurselist for melee/ranged... but who knows, they may become hierarchical in the future
    recurselist(data.melee, (meleeWeapon, _k, _d) => {
      if (meleeWeapon.import) {
        meleeWeapon.level = parseInt(meleeWeapon.import)

        if (!isNaN(parseInt(meleeWeapon.parry))) {
          // allows for '14f' and 'no'
          const base = 3 + Math.floor(meleeWeapon.level / 2)
          const bonus = parseInt(meleeWeapon.parry) - base

          if (bonus != 0) {
            meleeWeapon.parrybonus = (bonus > 0 ? '+' : '') + bonus
          }
        }

        if (!isNaN(parseInt(meleeWeapon.block))) {
          const base = 3 + Math.floor(meleeWeapon.level / 2)
          const bonus = parseInt(meleeWeapon.block) - base

          if (bonus != 0) {
            meleeWeapon.blockbonus = (bonus > 0 ? '+' : '') + bonus
          }
        }
      } else {
        meleeWeapon.parrybonus = meleeWeapon.parry
        meleeWeapon.blockbonus = meleeWeapon.block
      }
    })

    recurselist(data.ranged, (rangedWeapon, _k, _d) => {
      rangedWeapon.level = parseInt(rangedWeapon.import)
    })

    recurselist(data.hitlocations, (hitLocation, _k, _d) => {
      if (!hitLocation.dr) hitLocation.dr = hitLocation.import
    })
  }

  /**
   * @deprecated Actor v1 only. In Actor v2, item additions are handled automatically via derived data.
   *
   * Once the Items has been added to our items list, add the equipment and any features.
   */
  private async addItemData(itemData: Record<string, any>, targetkey: string | null = null) {
    const [eqtkey, addFeatures] = await this._addNewItemEquipment(itemData, targetkey)

    if (addFeatures) {
      await this._addItemAdditions(itemData, eqtkey)
    }
  }

  /**
   * @deprecated Actor v1 only. In Actor v2, item additions are handled automatically via derived data.
   *
   * Make the initial equipment object (unless it already exists, saved in a user equipment).
   */
  private async _addNewItemEquipment(itemData: Record<string, any>, targetkey: string | null) {
    const existing = this._findEqtkeyForId('itemid', itemData._id)

    if (existing) {
      // it may already exist (due to qty updates), so don't add it again
      const eqt = foundry.utils.getProperty(this, existing) as Equipment

      return [existing, eqt.carried && eqt.equipped]
    }

    let _data = itemData

    // HACK: ah, don't worry, we'll get rid of all this soon enough - M
    if (_data.system) _data = _data.system

    if (_data.eqt.parentuuid) {
      let found

      recurselist(this.modelV1.equipment.carried, (value, key, _d) => {
        if (value.uuid == _data.eqt.parentuuid) found = 'system.equipment.carried.' + key
      })
      if (!found)
        recurselist(this.modelV1.equipment.other, (value, key, _d) => {
          if (value.uuid == _data.eqt.parentuuid) found = 'system.equipment.other.' + key
        })

      if (found) {
        targetkey = found + '.contains.' + zeroFill(0)
      }
    }

    if (targetkey == null)
      if (_data.carried) {
        // new carried items go at the end
        targetkey = 'system.equipment.carried'
        let index = 0
        const list = foundry.utils.getProperty(this, targetkey) as Record<string, any>

        while (Object.hasOwn(list, zeroFill(index))) index++
        targetkey += '.' + zeroFill(index)
      } else targetkey = 'system.equipment.other'
    if (targetkey.match(/^system\.equipment\.\w+$/)) targetkey += '.' + zeroFill(0) //if just 'carried' or 'other'
    const eqt = _data.eqt

    if (!eqt) {
      ui.notifications?.warn('Item: ' + itemData._id + ' (Global:' + _data.globalid + ') missing equipment')

      return ['', false]
    } else {
      eqt.itemid = itemData._id
      eqt.globalid = _data.uuid

      eqt.equipped = _data.equipped ?? true
      eqt.img = itemData.img

      eqt.carried = _data.carried ?? true
      await GURPS.insertBeforeKey(this, targetkey, eqt)
      await this.updateParentOf(targetkey, true)

      return [targetkey, eqt.carried && eqt.equipped]
    }
  }

  /**
   * @deprecated Actor v1 only. In Actor v2, item additions are handled automatically via derived data.
   *
   * The ItemData received is the Parent Item. We need to check for child items created with the `fromItem` equal to
   * Parent itemId.
   */
  private async _addItemAdditions(itemData: Record<string, any>, _eqtkey?: string | null) {
    let commit = {}
    const subTypes = ['melee', 'ranged', 'ads', 'skills', 'spells']
    const parentItem: Record<string, any> | undefined = this.items.get(itemData._id)

    if (!parentItem) return

    let newList = {}

    for (const subType of subTypes) {
      newList = { ...(foundry.utils.getProperty(this, `system.${subType}`) as Record<string, any>) }

      if (!!parentItem.system[subType] && typeof parentItem.system[subType] === 'object') {
        for (const key in parentItem.system[subType]) {
          if (Object.hasOwn(parentItem.system[subType], key)) {
            const childItemData = parentItem.system[subType][key]
            const commitData = await this._addChildItemElement(parentItem, childItemData, subType, newList)

            commit = { ...commit, ...commitData }
            newList = commitData[`system.${subType}`]
          }
        }
      }
    }

    commit = this.applyItemModEffects(commit, true)
    if (commit) await this.update(commit, { diff: false })
    this.calculateDerivedValues() // new skills and bonuses may affect other items... force a recalc
  }

  /**
   * @deprecated Actor v1 only. In Actor v2, item additions are handled automatically via derived data.
   * Process Child Items from Parent Item.
   *
   * Why I did not use the original code? Too complex to add new scenarios.
   */
  private async _addChildItemElement(
    parentItem: Record<string, any>,
    childItemData: Record<string, any>,
    key: string,
    list: AnyMutableObject
  ) {
    const found = false

    if (found) {
      // Use existing actor component uuid
      // @ts-expect-error - dynamic property access on modelV1
      const existingActorComponent = (this.modelV1[key] as Record<string, any>).find(
        (actorComponent: any) => actorComponent.fromItem === parentItem._id
      )

      childItemData.uuid = existingActorComponent?.uuid || ''
    }

    // Let's (re)create the child Item with updated Child Item information
    let actorComp

    switch (key) {
      case 'ads':
        actorComp = Advantage.fromObject(childItemData, this)
        break
      case 'skills':
        actorComp = Skill.fromObject(childItemData, this)
        actorComp['import'] = await this._getSkillLevelFromOTF(childItemData.otf)
        break
      case 'spells':
        actorComp = Spell.fromObject(childItemData, this)
        actorComp['import'] = await this._getSkillLevelFromOTF(childItemData.otf)
        break
      case 'melee':
        actorComp = Melee.fromObject(childItemData, this)
        actorComp['import'] = await this._getSkillLevelFromOTF(childItemData.otf)
        actorComp.name = `${parentItem.name} - ${actorComp.mode}`
        actorComp.fromItem = parentItem.uuid
        break
      case 'ranged':
        actorComp = Ranged.fromObject(childItemData, this)
        actorComp['import'] = await this._getSkillLevelFromOTF(childItemData.otf)
        actorComp.name = `${parentItem.name} - ${actorComp.mode}`
        actorComp.fromItem = parentItem.uuid
        break
    }

    if (!actorComp) return {}
    actorComp.fromItem = parentItem._id
    const importer = new ActorImporter(this)

    actorComp = await importer._processItemFrom(actorComp, '')
    GURPS.put(list, actorComp)

    return { ['system.' + key]: list }
  }

  /**
   * @deprecated Actor v1 only. In Actor v2, item additions are handled automatically via derived data.
   *
   * Add Actor Modifier Effects from Character Sheet
   * @param {object} commit
   * @param {boolean} append
   * @returns {object}
   */
  applyItemModEffects(commit: Record<string, any>, append: boolean = false): object {
    const allUserMods = append ? (foundry.utils.getProperty(this.system, 'conditions.usermods') as string[]) || [] : []
    const userMods = allUserMods.filter((mod: string) => !mod.includes('@eft:'))
    const newMods = []

    // First Resolve Actor Items
    for (const item of this.items.contents) {
      const itemData = item.system

      if (itemData.itemModifiers?.length > 0) {
        const allEffects = itemData.itemModifiers.split('\n').map((mod: string) => mod.trim())

        for (const effect of allEffects) {
          const fullDesc = `${effect} @${item.id}`

          if (!userMods.includes(fullDesc)) {
            newMods.push(fullDesc)
          }
        }
      }
    }

    // Then Melee and Ranged Actor Components
    const paths = [this.modelV1.melee, this.modelV1.ranged]

    for (const path of paths) {
      recurselist(path, (actorComponent, _k, _d) => {
        if (actorComponent.itemModifiers) {
          const allEffects = actorComponent.itemModifiers.split('\n').map((mod: string) => mod.trim())

          for (const effect of allEffects) {
            const fullDesc = `${effect} @system.${path}.${_k}`

            if (!userMods.includes(fullDesc)) {
              newMods.push(fullDesc)
            }
          }
        }
      })
    }

    return {
      ...commit,
      'system.conditions.usermods': [...userMods, ...newMods],
    }
  }

  /**
   * @deprecated Actor v1 only.
   *
   * Remove Item Effects for informed reference
   * @param {string} reference - item.id or system.<path>
   * @returns {Promise<void>}
   */
  async removeModEffectFor(reference: string): Promise<void> {
    const userMods: string[] = (foundry.utils.getProperty(this.system, 'conditions.usermods') as string[]) || []
    const newMods = userMods.filter(mod => !mod.includes(reference) || mod.includes('@man:') || !mod.includes('@eft:'))

    await this.internalUpdate({ 'system.conditions.usermods': newMods } as Actor.UpdateData)
  }

  /**
   * @deprecated Actor v1 only.
   *
   * Called from the Item editor to let us know our personal item has been modified.
   * @param item
   */
  async updateItem(item: Item): Promise<void> {
    // @ts-expect-error - dynamic property access on modelV1
    delete item.editingActor
    this.ignoreRender = true
    if (item.id) await this._removeItemAdditions(item.id)

    const oldkey = this._findEqtkeyForId('itemid', item.id)
    let oldeqt

    if (oldkey) oldeqt = foundry.utils.getProperty(this, oldkey) as Equipment
    const other = item.id ? await this._removeItemElement(item.id, 'equipment.other') : null // try to remove from other

    if (!other) {
      // if not in other, remove from carried, and then re-add everything
      if (item.id) await this._removeItemElement(item.id, 'equipment.carried')
      await this.addItemData(item)
    } else {
      // If was in other... just add back to other (and forget addons)
      await this._addNewItemEquipment(item, 'system.equipment.other.' + zeroFill(0))
    }

    const newkey = this._findEqtkeyForId('itemid', item.id)

    if (!!oldeqt && (!!oldeqt.contains || !!oldeqt.collapsed)) {
      this.update({
        [newkey + '.contains']: oldeqt.contains,
        [newkey + '.collapsed']: oldeqt.collapsed,
      })
    }

    this._forceRender()
  }

  /**
   * @deprecated Actor v1 only.
   *
   * This will ensure that every character at least starts with these new data values. actor-sheet.js may change them.
   */
  private calculateDerivedValues() {
    const saved = !!this.ignoreRender

    this.ignoreRender = true
    this._initializeStartingValues()
    this._applyItemBonuses()

    // Must be done after bonuses, but before weights
    this._calculateEncumbranceIssues()

    // Must be after bonuses and encumbrance effects on ST
    this._recalcItemFeatures()
    this._calculateRangedRanges()

    // Must be done at end
    this._calculateWeights()

    const maneuver = this.effects.contents.find(it => it.statuses.find(status => status === 'maneuver'))

    this.modelV1.conditions.maneuver = maneuver ? maneuver.flags.gurps!.name : 'undefined'

    if (!this.modelV1.equippedparry) this.modelV1.equippedparry = this.getEquippedParry()
    if (!this.modelV1.equippedblock) this.modelV1.equippedblock = this.getEquippedBlock()
    // Catch for older actors that may not have these values set.
    if (!this.modelV1.currentmove) this.modelV1.currentmove = parseInt(this.modelV1.basicmove.value.toString())
    if (!this.modelV1.currentdodge && this.modelV1.dodge.value)
      this.modelV1.currentdodge = parseInt(this.modelV1.dodge.value.toString())
    if (!this.modelV1.currentflight)
      this.modelV1.currentflight = parseFloat(this.modelV1.basicspeed.value.toString()) * 2

    // Look for Defense bonuses.
    if (!this.modelV1.defenses) this.modelV1.defenses = this.getEquippedDefenseBonuses()

    this.ignoreRender = saved
    if (!saved) setTimeout(() => this._forceRender(), 333)
  }

  /**
   * @deprecated Actor v1 only.
   *
   * Apply item bonuses to attributes, skills, attacks, etc.
   */
  private _applyItemBonuses() {
    const pi = (num: string | undefined) => (num ? parseInt(num) : 0)

    const gids: string[] = [] //only allow each global bonus to add once
    const data = this.modelV1

    for (const item of this.items.contents) {
      const itemData = (item as Item.OfType<'base' | 'equipment' | 'feature' | 'skill' | 'spell'>).modelV1 as Record<
        string,
        any
      >

      if (
        (item.type !== 'equipment' || (itemData.equipped && itemData.carried)) &&
        !!itemData.bonuses &&
        !gids.includes(itemData.globalid)
      ) {
        gids.push(itemData.globalid)
        const bonuses = itemData.bonuses.split('\n')

        for (let bonus of bonuses) {
          let match = bonus.match(/\[(.*)\]/)

          if (match) bonus = match[1] // remove extranious  [ ]
          const link = parselink(bonus) // ATM, we only support attribute and skill

          if (link.action) {
            // start OTF
            recurselist(data.melee, (weapon, _k, _d) => {
              weapon.level = pi(weapon.level)

              if (link.action.type == 'attribute' && link.action.attrkey == 'DX') {
                // All melee attack skills affected by DX
                weapon.level += pi(link.action.mod)

                if (!isNaN(parseInt(weapon.parry))) {
                  // handles '11f'
                  const match = (weapon.parry + '').match(/(\d+)(.*)/)

                  weapon.parry = 3 + Math.floor(weapon.level / 2)
                  if (weapon.parrybonus) weapon.parry += pi(weapon.parrybonus)
                  if (match) weapon.parry += match[2]
                }

                if (!isNaN(parseInt(weapon.block))) {
                  // handles 'no'
                  weapon.block = 3 + Math.floor(weapon.level / 2)
                  if (weapon.blockbonus) weapon.block += pi(weapon.blockbonus)
                }
              }

              if (link.action.type == 'attack' && !!link.action.isMelee) {
                if (weapon.name.match(makeRegexPatternFrom(link.action.name, false))) {
                  weapon.level += pi(link.action.mod)

                  if (!isNaN(parseInt(weapon.parry))) {
                    // handles '11f'
                    const match = (weapon.parry + '').match(/(\d+)(.*)/)

                    weapon.parry = 3 + Math.floor(weapon.level / 2)
                    if (weapon.parrybonus) weapon.parry += pi(weapon.parrybonus)
                    if (match) weapon.parry += match[2]
                  }

                  if (!isNaN(parseInt(weapon.block))) {
                    // handles 'no'
                    weapon.block = 3 + Math.floor(weapon.level / 2)
                    if (weapon.blockbonus) weapon.block += pi(weapon.blockbonus)
                  }
                }
              }
            }) // end melee

            recurselist(data.ranged, (rangedWeapon, _k, _d) => {
              rangedWeapon.level = pi(rangedWeapon.level)
              if (link.action.type == 'attribute' && link.action.attrkey == 'DX')
                rangedWeapon.level += pi(link.action.mod)

              if (link.action.type == 'attack' && !!link.action.isRanged) {
                if (rangedWeapon.name.match(makeRegexPatternFrom(link.action.name, false)))
                  rangedWeapon.level += pi(link.action.mod)
              }
            }) // end ranged

            recurselist(data.skills, (skill, _k, _d) => {
              skill.level = pi(skill.level)

              if (link.action.type == 'attribute') {
                // skills affected by attribute changes
                if (skill.relativelevel?.toUpperCase().startsWith(link.action.attrkey))
                  skill.level += pi(link.action.mod)
              }

              if (link.action.type == 'skill-spell' && !link.action.isSpellOnly) {
                if (skill.name.match(makeRegexPatternFrom(link.action.name, false))) skill.level += pi(link.action.mod)
              }
            }) // end skills

            recurselist(data.spells, (spell, _k, _d) => {
              spell.level = pi(spell.level)

              if (link.action.type == 'attribute') {
                // spells affected by attribute changes
                if (spell.relativelevel?.toUpperCase().startsWith(link.action.attrkey))
                  spell.level += pi(link.action.mod)
              }

              if (link.action.type == 'skill-spell' && !link.action.isSkillOnly) {
                if (spell.name.match(makeRegexPatternFrom(link.action.name, false))) spell.level += pi(link.action.mod)
              }
            }) // end spells

            if (link.action.type == 'attribute') {
              const paths = link.action.path.split('.')
              const last = paths.pop()
              let data = this.modelV1 as Record<string, any>

              if (paths.length > 0) data = foundry.utils.getProperty(data, paths.join('.')) as Record<string, any>
              // regular attributes have a path
              else {
                // only accept DODGE
                if (link.action.attrkey != 'DODGE') break
              }

              data[last] = pi(data[last]) + pi(link.action.mod) // enforce that attribute is int
            } // end attributes & Dodge
          } // end OTF

          // parse bonus for other forms, DR+x?
          match = bonus.match(/DR *([+-]\d+) *(.*)/) // DR+1 *Arms "Left Leg" ...

          if (match) {
            const delta = parseInt(match[1])
            let locpatterns = null

            if (match[2]) {
              const locs = splitArgs(match[2])

              locpatterns = locs.map(loc => new RegExp(makeRegexPatternFrom(loc), 'i'))
            }

            recurselist(data.hitlocations, (hitLocation, _k, _d) => {
              if (
                !locpatterns ||
                locpatterns.find(pattern => !!hitLocation.where && hitLocation.where.match(pattern)) != null
              ) {
                let dr = hitLocation.dr ?? ''

                dr += ''
                const match = dr.match(/(\d+) *([/|]) *(\d+)/) // check for split DR 5|3 or 5/3

                if (match) {
                  dr = parseInt(match[1]) + delta
                  const dr2 = parseInt(match[3]) + delta

                  hitLocation.dr = dr + match[2] + dr2
                } else if (!isNaN(parseInt(dr))) {
                  hitLocation.dr = parseInt(dr) + delta
                  if (!!hitLocation.drCap && hitLocation.dr > hitLocation.drCap) hitLocation.dr = hitLocation.drCap
                }
                //console.warn(e.where, e.dr)
              }
            })
          } // end DR
        }
      }
    }
  }

  /**
   * @deprecated Actor v1 only.
   *
   * Handle Drag and Drop on Actor
   *
   * We can handle equipments, spells, skills and features.
   * Current logic is:
   * 1. Check if the global item was already dragged. If yes, do not import again.
   * 2. Check if the Actor Component for this Item is already created. Same behavior.
   * 3. Create a new Actor Component, manually adding global image and OTFs.
   * 4. Create the correspondent Foundry Item.
   * 5. Process Item Additions (Child Items)
   *
   * The biggest trap here is to add something to Actor Component but not Foundry Item and vice-versa.
   */
  async handleItemDrop(dragData: Record<string, any>): Promise<void> {
    if (!this.isOwner) {
      ui.notifications?.warn(game.i18n!.localize('GURPS.youDoNotHavePermission'))

      return
    }

    // New item created in Foundry v12.331 dragData:
    // {
    //   "type": "Item",
    //   "uuid": "Item.542YuRvzxVx83kL1"
    // }
    const global = await fromUuid(dragData.uuid)
    const data = global ? global : dragData

    if (!data) {
      ui.notifications?.warn('NO ITEM DATA!')

      return
    }

    // @ts-expect-error Ensure globalid is set.
    if (!data.globalid) await data.update({ _id: data._id, 'system.globalid': dragData.uuid })
    this.ignoreRender = true

    // Process Actor Component, Parent (dropped) Item and Child Items.

    // 1. This global item was already dropped?
    // @ts-expect-error: old item type not registering correctly
    const found = this.items.find(it => it.system.globalid === data.system.globalid)

    if (found) {
      ui.notifications?.warn(game.i18n!.localize('GURPS.cannotDropItemAlreadyExists'))

      return
    }

    ui.notifications?.info(
      game.i18n!.format('GURPS.droppingItemNotification', { actorName: this.name, itemName: data.name })
    )

    // 2. Check if Actor Component exists
    const actorCompKey =
      // @ts-expect-error - custom item type properties not in base type
      data.type === 'equipment'
        ? this._findEqtkeyForId('globalid', data.system.globalid)
        : // @ts-expect-error - custom item type properties not in base type
          this._findSysKeyForId('globalid', data.system.globalid, data.actorComponentKey)
    const actorComp = foundry.utils.getProperty(this, actorCompKey!) as Named | undefined

    if (actorComp) {
      ui.notifications?.warn(game.i18n!.localize('GURPS.cannotDropItemAlreadyExists'))
    } else {
      // 3. Create Actor Component
      let actorComp
      let targetKey

      // @ts-expect-error - custom item type not in base Item type
      switch (data.type) {
        case 'equipment':
          actorComp = Equipment.fromObject({ name: data.name, ...data.system.eqt }, this)
          targetKey = 'system.equipment.carried'
          break
        case 'feature':
          actorComp = Advantage.fromObject({ name: data.name, ...data.system.fea }, this)
          targetKey = 'system.ads'
          break
        case 'skill':
          actorComp = Skill.fromObject({ name: data.name, ...data.system.ski }, this)
          targetKey = 'system.skills'
          break
        case 'spell':
          actorComp = Spell.fromObject({ name: data.name, ...data.system.spl }, this)
          targetKey = 'system.spells'
          break
      }

      // @ts-expect-error - dynamic property access on actor component
      actorComp.itemInfo.img = data.img
      // @ts-expect-error - dynamic property access via itemSysKey
      actorComp.otf = data.system[data.itemSysKey].otf
      // @ts-expect-error - dynamic property access via itemSysKey
      actorComp.checkotf = data.system[data.itemSysKey].checkotf
      // @ts-expect-error - dynamic property access via itemSysKey
      actorComp.duringotf = data.system[data.itemSysKey].duringotf
      // @ts-expect-error - dynamic property access via itemSysKey
      actorComp.passotf = data.system[data.itemSysKey].passotf
      // @ts-expect-error - dynamic property access via itemSysKey
      actorComp.failotf = data.system[data.itemSysKey].failotf

      // 4. Create Parent Item
      const importer = new ActorImporter(this)

      actorComp = await importer._processItemFrom(actorComp, '')
      // @ts-expect-error - itemid property added by importer
      const parentItem = this.items.get(actorComp.itemid)
      const keys = ['melee', 'ranged', 'ads', 'spells', 'skills']

      for (const key of keys) {
        recurselist(data.system[key], actorComponentEntry => {
          if (!actorComponentEntry.uuid) actorComponentEntry.uuid = foundry.utils.randomID(16)
        })
      }

      await this.updateEmbeddedDocuments('Item', [
        {
          _id: parentItem!.id,
          // @ts-expect-error: old item type not registering correctly
          'system.globalid': dragData.uuid,
          'system.melee': data.system.melee,
          'system.ranged': data.system.ranged,
          'system.ads': data.system.ads,
          'system.spells': data.system.spells,
          'system.skills': data.system.skills,
          'system.bonuses': data.system.bonuses,
        },
      ])

      // 5. Update Actor System with new Component
      const systemObject = foundry.utils.duplicate(foundry.utils.getProperty(this, targetKey!) as Record<string, any>)
      const removeKey = targetKey!.replace(/(\w+)$/, '-=$1')

      await this.internalUpdate({ [removeKey]: null })
      await GURPS.put(systemObject, actorComp)

      await this.internalUpdate({ [targetKey!]: systemObject })

      // @ts-expect-error - custom item type not in base Item type
      if (data.type === 'equipment') await Equipment.calc(actorComp)

      // 6. Process Child Items for created Item
      const actorCompKey =
        // @ts-expect-error - custom item type properties not in base type
        data.type === 'equipment'
          ? // @ts-expect-error - equipment system eqt property not fully typed
            this._findEqtkeyForId('uuid', parentItem.system.eqt.uuid)
          : // @ts-expect-error - dynamic property access via itemSysKey
            this._findSysKeyForId('uuid', parentItem.system[parentItem.itemSysKey].uuid, parentItem.actorComponentKey)

      // @ts-expect-error - parentItem type mismatch with method signature
      await this._addItemAdditions(parentItem, actorCompKey)
    }

    this._forceRender()
  }

  /**
   * @deprecated Actor v1 only.
   *
   * Calculate Encumbrance levels.
   */
  private _calculateEncumbranceIssues() {
    const data = this.modelV1
    const encs = data.encumbrance
    const isReeling = !!data.conditions.reeling
    const isTired = !!data.conditions.exhausted

    // We must assume that the first level of encumbrance has the finally calculated move and dodge settings
    if (encs) {
      const level0: EncumbranceLevel = encs[zeroFill(0)] // if there are encumbrances, there will always be a level0
      let effectiveMove = parseInt(level0.move.toString())
      let effectiveDodge = isNaN(parseInt(level0.dodge.toString()))
        ? '–'
        : (parseInt(level0.dodge.toString()) + parseInt(data.currentdodge.toString())).toString()
      let effectiveSprint = this._getSprintMove()

      if (isReeling) {
        effectiveMove = Math.ceil(effectiveMove / 2)
        effectiveDodge = isNaN(parseInt(effectiveDodge)) ? '–' : Math.ceil(parseInt(effectiveDodge) / 2).toString()
        effectiveSprint = Math.ceil(effectiveSprint / 2)
      }

      if (isTired) {
        effectiveMove = Math.ceil(effectiveMove / 2)
        effectiveDodge = isNaN(parseInt(effectiveDodge)) ? '–' : Math.ceil(parseInt(effectiveDodge) / 2).toString()
        effectiveSprint = Math.ceil(effectiveSprint / 2)
      }

      for (const enckey in encs) {
        const enc = encs[enckey]

        if (!enc.level) enc.level = parseInt(enckey) // FIXME: Why enc.level=NaN after GCA import?
        let threshold = 10 - 2 * parseInt(enc.level.toString()) // each encumbrance level reduces move by 20%

        threshold /= 10 // JS likes to calculate 0.2*3 = 3.99999, but handles 2*3/10 fine.

        // TODO This is kind of bullshit: there is no currentmove, currentdodge, currentsprint, or currentmovedisplay per encumbrance level.
        enc.currentmove = this._getCurrentMove(effectiveMove, threshold) //Math.max(1, Math.floor(m * t))
        enc.currentdodge = isNaN(parseInt(effectiveDodge))
          ? '–'
          : Math.max(1, parseInt(effectiveDodge) - parseInt(enc.level.toString()))
        enc.currentsprint = Math.max(1, Math.floor(effectiveSprint * threshold))
        enc.currentmovedisplay = this._isEnhancedMove()
          ? enc.currentmove + '/' + enc.currentsprint
          : enc.currentmove.toString()

        if (enc.current) {
          // Save the global move/dodge
          data.currentmove = enc.currentmove
          data.currentdodge = enc.currentdodge
          data.currentsprint = enc.currentsprint
        }
      }
    }
  }

  /**
   * @deprecated Actor v1 only.
   */
  private _isEnhancedMove(): boolean {
    return !!this._getCurrentMoveMode()?.enhanced
  }

  /**
   * @deprecated Actor v1 only.
   */
  private _getSprintMove() {
    const current = this._getCurrentMoveMode()

    if (!current) return 0
    if (current?.enhanced) return current.enhanced

    return Math.floor(current.basic * 1.2)
  }

  /**
   * @deprecated Actor v1 only.
   */
  private _getCurrentMoveMode() {
    const move = (this.modelV1?.move ?? {}) as Record<string, MoveMode>
    const current = Object.values(move).find(it => it.default)

    if (!current && Object.keys(move).length > 0) return move['00000']

    return current
  }

  /**
   * @deprecated Actor v1 only.
   */
  private _getCurrentMove(move: number, threshold: number) {
    let inCombat = false

    try {
      inCombat = !!game.combat?.combatants.filter(combatant => combatant.actorId == this.id)
    } catch {
      // During game startup, an exception is being thrown trying to access 'game.combat'
    }

    const updateMove = game.settings!.get(GURPS.SYSTEM_NAME, Settings.SETTING_MANEUVER_UPDATES_MOVE) && inCombat

    const maneuver = this._getMoveAdjustedForManeuver(move, threshold)
    const posture = this._getMoveAdjustedForPosture(move, threshold)

    if (threshold == 1.0) this.modelV1.conditions.move = maneuver.move < posture.move ? maneuver.text : posture.text

    return updateMove
      ? maneuver.move < posture.move
        ? maneuver.move
        : posture.move
      : Math.max(1, Math.floor(move * threshold))
  }

  /**
   * @deprecated Actor v1 only.
   */
  private _getMoveAdjustedForManeuver(move: number, threshold: number) {
    let adjustment = null

    if (foundry.utils.getProperty(this, PROPERTY_MOVEOVERRIDE_MANEUVER)) {
      const value = foundry.utils.getProperty(this, PROPERTY_MOVEOVERRIDE_MANEUVER) as number

      adjustment = this._adjustMove(move, threshold, value)
    }

    return adjustment
      ? adjustment
      : {
          move: Math.max(1, Math.floor(move * threshold)),
          text: game.i18n!.localize('GURPS.moveFull'),
        }
  }

  /**
   * @deprecated Actor v1 only.
   */
  private _getMoveAdjustedForPosture(move: number, threshold: number) {
    let adjustment = null

    if (foundry.utils.getProperty(this, PROPERTY_MOVEOVERRIDE_POSTURE)) {
      const value = foundry.utils.getProperty(this, PROPERTY_MOVEOVERRIDE_POSTURE) as number

      // let reason = game.i18n!.localize(GURPS.StatusEffect.lookup(this.modelV1.conditions.posture).name)
      adjustment = this._adjustMove(move, threshold, value)
    }

    return adjustment
      ? adjustment
      : {
          move: Math.max(1, Math.floor(move * threshold)),
          text: game.i18n!.localize('GURPS.moveFull'),
        }
  }

  /**
   * @deprecated Actor v1 only.
   */
  private _adjustMove(move: number, threshold: number, value: number) {
    switch (value.toString()) {
      case MOVE_NONE:
        return {
          move: 0,
          text: game.i18n!.localize('GURPS.none'),
        }

      case MOVE_ONE:
        return {
          move: 1,
          text: '1 yd/sec',
        }

      case MOVE_STEP:
        return {
          move: this._getStep(),
          text: 'Step',
        }

      case MOVE_TWO_STEPS:
        return {
          move: this._getStep() * 2,
          text: 'Step or Two',
        }

      case MOVE_ONETHIRD:
        return {
          move: Math.max(1, Math.ceil((move / 3) * threshold)),
          text: '×1/3',
        }

      case MOVE_HALF:
        return {
          move: Math.max(1, Math.ceil((move / 2) * threshold)),
          text: 'Half',
        }

      case MOVE_TWOTHIRDS:
        return {
          move: Math.max(1, Math.ceil(((2 * move) / 3) * threshold)),
          text: '×2/3',
        }
    }

    return null
  }

  /**
   * @deprecated Actor v1 only.
   */
  private _getStep() {
    const step = Math.ceil(parseInt(this.modelV1.basicmove.value.toString()) / 10)

    return Math.max(1, step)
  }

  /**
   * @deprecated Actor v1 only.
   *
   * Once all of the bonuses are applied, determine the actual level for each feature
   */
  private _recalcItemFeatures() {
    const data = this.modelV1

    this._collapseQuantumEq(data.melee, true)
    this._collapseQuantumEq(data.ranged)
    this._collapseQuantumEq(data.skills)
    this._collapseQuantumEq(data.spells)
  }

  /**
   * @deprecated Actor v1 only.
   *
   * Convert Item feature OTF formulas into actual skill levels.
   */
  private _collapseQuantumEq(list: object, isMelee = false) {
    recurselist(list, async actorComponent => {
      let otf = actorComponent.otf

      if (otf) {
        const match = otf.match(/\[(.*)\]/)

        if (match) otf = match[1] // remove extranious  [ ]

        if (otf.match(/^ *\d+ *$/)) {
          // just a number
          actorComponent.import = parseInt(otf)
        } else {
          const action = parselink(otf)

          if (action.action) {
            this.ignoreRender = true
            action.action.calcOnly = true
            GURPS.performAction(action.action, this).then(ret => {
              actorComponent.level = ret.target

              if (isMelee) {
                if (!isNaN(parseInt(actorComponent.parry))) {
                  const parry = '' + actorComponent.parry
                  let match = parry.match(/([+-]\d+)(.*)/)

                  // @ts-expect-error - assigning array literal to match result type
                  if (!match && parry.trim() == '0') match = [0, 0] // allow '0' to mean 'no bonus', not skill level = 0

                  if (match) {
                    actorComponent.parrybonus = parseInt(match[1])
                    actorComponent.parry = actorComponent.parrybonus + 3 + Math.floor(actorComponent.level / 2)
                  }

                  if (!!match && !!match[2]) actorComponent.parry = `${actorComponent.parry}${match[2]}`
                }

                if (!isNaN(parseInt(actorComponent.block))) {
                  const block = '' + actorComponent.block
                  let match = block.match(/([+-]\d+)(.*)/)

                  // @ts-expect-error - assigning array literal to match result type
                  if (!match && block.trim() == '0') match = [0, 0] // allow '0' to mean 'no bonus', not skill level = 0

                  if (match) {
                    actorComponent.blockbonus = parseInt(match[1])
                    actorComponent.block = actorComponent.blockbonus + 3 + Math.floor(actorComponent.level / 2)
                  }

                  if (!!match && !!match[2]) actorComponent.block = `${actorComponent.block}${match[2]}`
                }
              }
            })
          }
        }
      }
    })
  }

  /**
   * @deprecated Actor v1 only.
   * Calculate Ranged weapon ranges based on ST if set to 'xN' or 'xN/xM'.
   */
  private _calculateRangedRanges() {
    if (!game.settings!.get(GURPS.SYSTEM_NAME, Settings.SETTING_CONVERT_RANGED)) return
    const st = +this.modelV1.attributes.ST.value

    recurselist(this.modelV1.ranged, ranged => {
      let rng = ranged.range || '' // Data protection

      rng = rng + '' // force to string
      let match = rng.match(/^ *[xX]([\d.]+) *$/)

      if (match) {
        rng = parseFloat(match[1]) * st
      } else {
        match = rng.match(/^ *[xX]([\d.]+) *\/ *[xX]([\d.]+) *$/)

        if (match) {
          const r1 = parseFloat(match[1]) * st
          const r2 = parseFloat(match[2]) * st

          rng = `${Math.floor(r1)}/${Math.floor(r2)}`
        }
      }

      ranged.range = rng
    })
  }

  /**
   * @deprecated Actor v1 only.
   */
  private _calculateWeights() {
    const data = this.modelV2
    const eqt = data.equipment || {}
    const eqtsummary = {
      eqtcost: this._sumeqt(eqt.carried, 'cost'),
      eqtlbs: this._sumeqt(
        eqt.carried,
        'weight',
        game.settings!.get(GURPS.SYSTEM_NAME, Settings.SETTING_CHECK_EQUIPPED)
      ),
      othercost: this._sumeqt(eqt.other, 'cost'),
      otherlbs: this._sumeqt(eqt.other, 'weight'),
    }

    if (game.settings!.get(GURPS.SYSTEM_NAME, Settings.SETTING_AUTOMATIC_ENCUMBRANCE))
      this.checkEncumbance(eqtsummary.eqtlbs)
    data.eqtsummary = eqtsummary
  }

  /**
   * @deprecated Actor v1 only.
   *
   * Recursive sum of equipment tree for weight or cost.
   */
  private _sumeqt(dict: Record<string, any>, type: string, checkEquipped = false) {
    if (!dict) return 0.0
    const flt = (str: string) => (str ? parseFloat(str) : 0)
    let sum = 0

    for (const key in dict) {
      const value = dict[key]
      const count = flt(value.count)
      const num = flt(value[type])

      if (!checkEquipped || !!value.equipped) sum += count * num
      sum += this._sumeqt(value.contains, type, checkEquipped)
      sum += this._sumeqt(value.collapsed, type, checkEquipped)
    }

    return Math.floor(sum * 100) / 100
  }

  /**
   * @deprecated Actor v1 only.
   */
  private checkEncumbance(currentWeight: number) {
    /** @type {{ [key: string]: any }} */
    const encs: { [key: string]: any } = this.modelV1.encumbrance
    let last = zeroFill(0) // if there are encumbrances, there will always be a level0
    let best, prev

    for (const key in encs) {
      const enc = encs[key]

      if (enc.current) prev = key
      const weight = parseFloat(enc.weight.toString())

      if (weight > 0) {
        last = key

        if (currentWeight <= weight) {
          best = key
          break
        }
      }
    }

    if (!best) best = last // that has a weight

    if (best != prev) {
      for (const key in encs) {
        const enc = encs[key]

        if (key === best) {
          enc.current = true
          this.modelV1.currentmove = parseInt(enc.currentmove.toString())
          this.modelV1.currentdodge = parseInt(enc.currentdodge.toString())
        } else if (enc.current) {
          enc.current = false
        }
      }
    }
  }

  /**
   * TODO Will this be needed for characterV2?
   */
  getEquippedParry() {
    const [txt, val] = this.getEquipped('parry')

    this.modelV1.equippedparryisfencing = !!txt && /f$/i.test(txt.toString())

    return val
  }

  /**
   * TODO Will this be needed for characterV2?
   */
  getEquippedBlock() {
    return this.getEquipped('block')[1]
  }

  /**
   * NOTE: Both character and characterV2.
   *
   * TODO For characterV2, is this still needed? Should the code go directly to modelV2?
   */
  getCurrentDodge(): number {
    return this.isNewActorType ? this.modelV2.currentdodge : parseInt(this.modelV1.currentdodge.toString())
  }

  /**
   * NOTE: Both character and characterV2.
   *
   * TODO Is this needed for GB Actor sheet? Nothing in the system calls this method.
   */
  getCurrentMove() {
    return this.isNewActorType ? this.modelV2.currentmove : this.modelV1.currentmove
  }

  /**
   * @deprecated Actor v1 only.
   */
  private getEquipped(key: string) {
    let val = 0
    let txt = ''

    if (!!this.modelV1.melee && !!this.modelV1.equipment?.carried) {
      // Go through each melee attack...
      Object.values(this.modelV1.melee).forEach(melee => {
        // ...and see if there's a matching piece of carried equipment.
        recurselist(this.modelV1.equipment.carried, (equipment, _k, _d) => {
          if (equipment?.equipped && !!namesMatch(melee, equipment)) {
            const num = parseInt((melee as Record<string, any>)[key])

            if (!isNaN(num)) {
              if (num > val || (num === val && /f$/i.test((melee as Record<string, any>)[key]))) {
                val = num
                txt = '' + (melee as Record<string, any>)[key]
              }
            }
          }
        })
      })
    }

    // Find any parry/block in the melee attacks that do NOT match any equipment.
    Object.values(this.modelV1?.melee ?? {}).forEach(melee => {
      // If the current melee attack has a defense (parry|block) ...
      if (/\d+.*/.test((melee as Record<string, any>)[key])) {
        let matched = false
        const equipment = this.modelV1.equipment

        recurselist(equipment?.carried ?? [], (item, _k, _d) => {
          if (!matched && namesMatch(melee, item)) {
            matched = true
          }
        })

        recurselist(equipment?.other ?? [], (item, _k, _d) => {
          if (!matched && namesMatch(melee, item)) {
            matched = true
          }
        })

        if (!matched) {
          const num = parseInt((melee as Record<string, any>)[key])

          if (!isNaN(num)) {
            if (num > val) {
              val = num
              txt = '' + (melee as Record<string, any>)[key]
            }
          }
        }
      }
    })

    if (!val && !!(this.modelV1 as Record<string, any>)[key]) {
      txt = '' + (this.modelV1 as Record<string, any>)[key]
      val = parseInt(txt)
    }

    return [txt, val]

    function namesMatch(melee: Melee, equipment: Equipment) {
      return melee.name.match(makeRegexPatternFrom(equipment.name, false))
    }
  }

  /**
   * @deprecated Actor v1 only.
   */
  private getEquippedDefenseBonuses() {
    const defenses = { parry: {}, block: {}, dodge: {} }
    const carried = this.modelV1.equipment?.carried

    if (carried) {
      recurselist(carried, (item, _k, _d) => {
        if (item?.equipped) {
          const match = item.notes.match(/\[(?<bonus>[+-]\d+)\s*DB\]/)

          if (match) {
            const bonus = parseInt(match.groups.bonus)

            defenses.parry = { bonus: bonus }
            defenses.block = { bonus: bonus }
            defenses.dodge = { bonus: bonus }
          }
        }
      })
    }

    return defenses
  }

  /**
   * @deprecated Actor v1 only.
   *
   * Calculate Skill Level per OTF.
   *
   * On Skills and Spells item sheets, if you define the `otf` field and leave the `import` field blank, system will
   * try to calculate the skill level based on the OTF formula informed.
   *
   * BTW, `import` is the name for the base skill level. I know, naming is hard.
   */
  private async _getSkillLevelFromOTF(otf: string): Promise<any> {
    if (!otf) return
    const skillAction = parselink(otf).action

    if (!skillAction) return
    skillAction.calcOnly = true
    const results = (await GURPS.performAction(skillAction, this)) as { target: any; thing: any }

    return results?.target
  }

  /**
   * @deprecated Actor v1 only. In Actor v2, item additions are handled automatically via derived data.
   * Used to recalculate weight and cost sums for a whole tree.
   * @param {string} srckey
   */
  async updateParentOf(srckey: string, updatePuuid = true) {
    // pindex = 4 for equipment
    const pindex = 4
    const paths = srckey.split('.')
    let sp = paths.slice(0, pindex).join('.') // find the top level key in this list
    // But count may have changed... if (srckey == sp) return // no parent for this eqt
    const parent = foundry.utils.getProperty(this, sp) as any

    if (parent) {
      // data protection
      await Equipment.calcUpdate(this, parent, sp) // and re-calc cost and weight sums from the top down

      if (updatePuuid) {
        let puuid = ''

        if (paths.length >= 6) {
          sp = paths.slice(0, -2).join('.')
          puuid = (foundry.utils.getProperty(this, sp) as any).uuid
        }

        await this.internalUpdate({ [srckey + '.parentuuid']: puuid })

        const eqt = foundry.utils.getProperty(this, srckey) as Equipment

        if (eqt.itemid) {
          const item = this.items.get(eqt.itemid)

          if (item)
            await this.updateEmbeddedDocuments('Item', [
              { _id: item.id, 'system.eqt.parentuuid': puuid } as Item.UpdateData,
            ])
        }
      }
    }
  }

  /**
   * @deprecated In the new system, item additions are handled automatically via derived data.
   *
   * Called when equipment is being moved or equipped
   * @param {Equipment} eqt equipment.
   * @param {string} targetPath equipment target path.
   */
  async updateItemAdditionsBasedOn(eqt: Equipment, targetPath: string) {
    await this._updateEqtStatus(eqt, targetPath, targetPath.includes('.carried'), eqt.equipped)
  }

  /**
   * @deprecated Actor v1 only.
   * Equipment may carry other eqt, so we must adjust the carried and equipped status all the way down.
   * @param {Equipment} eqt equipment object.
   * @param {string} eqtkey equipment key.
   * @param {boolean} carried container item's carried status.
   * @param {boolean} equipped container item's equipped status.
   */
  private async _updateEqtStatus(eqt: Equipment, eqtkey: string, carried: boolean, equipped: boolean) {
    eqt.carried = carried
    eqt.equipped = equipped

    if (eqt.itemid) {
      const item = this.items.get(eqt.itemid)!

      await this.updateEmbeddedDocuments('Item', [
        // @ts-expect-error - equipment system properties not fully typed
        { _id: item.id, 'system.equipped': equipped, 'system.carried': carried },
      ])

      if (!carried || !equipped) this._removeItemAdditions(eqt.itemid)
      if (carried && equipped) await this._addItemAdditions(item, eqtkey)
    }

    for (const key in eqt.contains) {
      // @ts-expect-error - contains entries typed as Equipment
      await this._updateEqtStatus(eqt.contains[key], eqtkey + '.contains.' + key, carried, equipped)
    }

    for (const key in eqt.collapsed)
      await this._updateEqtStatus(eqt.collapsed[key], eqtkey + '.collapsed.' + key, carried, equipped)
  }

  /**
   * @deprecated Actor v1 only.
   * @param {string} itemid
   */
  async _removeItemAdditions(itemid: string) {
    const saved = this.ignoreRender

    this.ignoreRender = true
    await this._removeItemElement(itemid, 'melee')
    await this._removeItemElement(itemid, 'ranged')
    await this._removeItemElement(itemid, 'ads')
    await this._removeItemElement(itemid, 'skills')
    await this._removeItemElement(itemid, 'spells')
    await this._removeItemEffect(itemid)
    this.ignoreRender = saved
  }

  /**
   * @deprecated Actor v1 only.
   * Remove Item Element
   *
   * This is the original comment (still valid):
   *
   *   `// We have to remove matching items after we searched through the list`
   *
   *   `// because we cannot safely modify the list why iterating over it`
   *
   *   `// and as such, we can only remove 1 key at a time and must use thw while loop to check again`
   *
   *  When Use Foundry Items is enabled, we just find the item using their `fromItem`
   *  instead their `itemId`. This is because now every child item has the Id for their
   *  parent item in that field.
   *
   *  The trick here: always remove Item before Actor Component.
   *
   * @param {string} itemid
   * @param {string} key
   */
  private async _removeItemElement(itemid: string, key: string) {
    let found: string | boolean = true
    let any = false

    if (!key.startsWith('system.')) key = 'system.' + key

    while (found) {
      found = false
      const list = foundry.utils.getProperty(this, key) as any

      recurselist(list, (actorComponent, entryKey, _d) => {
        if (actorComponent.fromItem === itemid) found = entryKey
      })

      if (found) {
        any = true
        const actorKey = key + '.' + found
        // We need to remove the child item from the actor
        const childActorComponent = foundry.utils.getProperty(this, actorKey) as any
        const existingChildItem = await this.items.get(childActorComponent.itemid)

        if (existingChildItem) await existingChildItem.delete()
        await GURPS.removeKey(this, actorKey)
      }
    }

    return any
  }

  /**
   * @deprecated Actor v1 only.
   * Remove Item Effect from Actor system.conditions.usermods
   *
   * @param {string} itemId
   * @private
   */
  private async _removeItemEffect(itemId: string) {
    const userMods = foundry.utils.getProperty(this, 'system.conditions.usermods')
    // @ts-expect-error - userMods array type not inferred from getProperty
    const mods = [...userMods.filter(mod => !mod.includes(`@${itemId}`))]

    // @ts-expect-error - usermods property type not fully typed
    await this.update({ 'system.conditions.usermods': mods })
  }

  /**
   * @deprecated Actor v1 only.
   * @param item
   */
  async _updateItemFromForm(item: Item.OfType<'base' | 'equipment' | 'feature' | 'skill' | 'spell'>) {
    if (this.isNewActorType) return

    const sysKey =
      item.type === 'equipment'
        ? this._findEqtkeyForId('itemid', item.id)
        : this._findSysKeyForId('itemid', item.id!, item.actorComponentKey)

    if (!sysKey) {
      console.warn(`GURPS | Could not find Actor Component for Item ${item.name} (${item.id})`)

      return
    }

    const actorComp = foundry.utils.getProperty(this, sysKey) as any

    if (!(await this._sanityCheckItemSettings(actorComp))) return

    // @ts-expect-error - editingActor is a runtime property
    if (item.editingActor) delete item.editingActor

    await this._removeItemAdditions(item.id!)

    // Check for Equipment changed count
    // If originalCount exists, let's check if the count has changed
    // If changed and ignoreImportQty is true, we need to add the flag to the item
    if (
      item.isOfType('equipment') &&
      ImportSettings.ignoreQuantityOnImport &&
      // @ts-expect-error: equipment system type not registering correctly
      !!item.system.eqt.originalCount &&
      // @ts-expect-error: equipment system type not registering correctly
      !isNaN(item.system.eqt.originalCount) &&
      // @ts-expect-error: equipment system type not registering correctly
      item.system.eqt.originalCount !== item.modelV1.eqt.count
    ) {
      // @ts-expect-error: equipment system type not registering correctly
      item.system.eqt.ignoreImportQty = true
    }

    // Update Item
    item.modelV1.modifierTags = cleanTags(item.modelV1.modifierTags).join(', ')
    await this.updateEmbeddedDocuments('Item', [{ _id: item.id, system: item.system, name: item.name }])

    // Update Actor Component
    const itemInfo = item.getItemInfo()

    await this.internalUpdate({
      [sysKey]: {
        // @ts-expect-error: equipment system type not registering correctly
        ...item.system[item.itemSysKey],
        uuid: actorComp.uuid,
        parentuuid: actorComp.parentuuid,
        itemInfo,
        addToQuickRoll: item.modelV1.addToQuickRoll,
        modifierTags: item.modelV1.modifierTags,
        itemModifiers: item.modelV1.itemModifiers,
      },
    })
    await this._addItemAdditions(item, sysKey)

    if (item.type === 'equipment') {
      await this.updateParentOf(sysKey, true)
      await this._updateEquipmentCalc(sysKey)
    }
  }

  /**
   * @deprecated Actor v1 only.
   * @param equipKey
   * @returns
   */
  private async _updateEquipmentCalc(equipKey: string) {
    if (!equipKey.includes('system.eqt.')) return
    const equip = foundry.utils.getProperty(this, equipKey) as any

    await Equipment.calc(equip)

    if (equip.parentuuid) {
      const parentKey = this._findEqtkeyForId('itemid', equip.parentuuid)

      if (parentKey) {
        await this._updateEquipmentCalc(parentKey)
      }
    }
  }

  /**
   * @deprecated Actor v1 only.
   * @param name
   * @param include
   * @returns
   */
  private findByOriginalName(name: string, include = false): Item.Implementation | null {
    // @ts-expect-error: equipment system type not registering correctly
    let item = this.items.find(i => i.system.originalName === name)

    // @ts-expect-error: equipment system type not registering correctly
    if (!item) item = this.items.find(i => i.system.name === name)
    if (item) return item as Item.Implementation

    const actorSysKeys = ['ads', 'skills', 'spells']

    for (const key of actorSysKeys) {
      let sysKey = this._findSysKeyForId('originalName', name, key, include)

      if (!sysKey) sysKey = this._findSysKeyForId('name', name, key, include)
      if (sysKey) return foundry.utils.getProperty(this, sysKey) as Item.Implementation

      const camelCaseName = name
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('')
      const localizedKey = `GURPS.trait${camelCaseName}`
      const localizedName = game.i18n!.localize(localizedKey)

      if (localizedName && localizedName !== localizedKey) {
        sysKey = this._findSysKeyForId('originalName', localizedName, key, include)
        if (!sysKey) sysKey = this._findSysKeyForId('name', localizedName, key, include)
        if (sysKey) return foundry.utils.getProperty(this, sysKey) as Item.Implementation
      }
    }

    return null
  }

  /**
   * @deprecated Actor v1 only.
   * @param actorLocations
   * @param update
   * @returns
   */
  private _getDRFromItems(actorLocations: Record<string, HitLocationEntryV1>, update = true) {
    const itemMap: Record<string, any> = {}

    if (update) {
      recurselist(actorLocations, (hitLocation, _k, _d) => {
        hitLocation.drItem = 0
      })
    }

    for (const item of this.items.filter(i => !!i.system.carried && !!i.system.equipped && !!i.system.bonuses)) {
      const bonusList = item.system.bonuses || ''
      const bonuses = bonusList.split('\n')

      for (let bonus of bonuses) {
        let match = bonus.match(/\[(.*)\]/)

        if (match) bonus = match[1] // remove extraneous  [ ]

        match = bonus.match(/DR *([+-]\d+) *(.*)/)

        if (match) {
          const delta = parseInt(match[1])
          let locPatterns: RegExp[] | null = null

          if (match[2]) {
            const locs = splitArgs(match[2])

            locPatterns = locs.map(loc => new RegExp(makeRegexPatternFrom(loc), 'i'))
            recurselist(actorLocations, (hitLocation, _k, _d) => {
              if (
                !locPatterns ||
                locPatterns.find(pattern => !!hitLocation.where && hitLocation.where.match(pattern)) != null
              ) {
                if (update) hitLocation.drItem += delta
                itemMap[hitLocation.where] = {
                  ...itemMap[hitLocation.key],
                  [item.name]: delta,
                }
              }
            })
          }
        }
      }
    }

    return itemMap
  }

  /**
   * @deprecated Actor v1 only.
   *
   * If we need to keep something like this, it should be moved to HitLocation class.
   * @param drFormula
   * @param hitLocation
   * @returns
   */
  private _changeDR(drFormula: string, hitLocation: HitLocationEntryV1) {
    if (drFormula === 'reset') {
      hitLocation.dr = hitLocation.import
      hitLocation.drMod = 0
      hitLocation.drCap = 0
      hitLocation.drItem = 0

      return hitLocation
    }

    if (!hitLocation.drItem) hitLocation.drItem = 0

    if (typeof hitLocation.import === 'string') hitLocation.import = parseInt(hitLocation.import)

    if (drFormula.startsWith('+') || drFormula.startsWith('-')) {
      hitLocation.drMod += parseInt(drFormula)
      hitLocation.dr = Math.max(hitLocation.import + hitLocation.drMod + hitLocation.drItem, 0)
      hitLocation.drCap = hitLocation.dr
    } else if (drFormula.startsWith('*')) {
      if (!hitLocation.drCap) hitLocation.drCap = Math.max(hitLocation.import + hitLocation.drItem, 0)
      hitLocation.drCap = hitLocation.drCap * parseInt(drFormula.slice(1))
      hitLocation.dr = hitLocation.drCap
      hitLocation.drMod = hitLocation.drCap - hitLocation.drItem - hitLocation.import
    } else if (drFormula.startsWith('/')) {
      if (!hitLocation.drCap) hitLocation.drCap = Math.max(hitLocation.import + hitLocation.drItem, 0)
      hitLocation.drCap = Math.max(Math.floor(hitLocation.drCap / parseInt(drFormula.slice(1))), 0)
      hitLocation.dr = hitLocation.drCap
      hitLocation.drMod = hitLocation.drCap - hitLocation.drItem - hitLocation.import
    } else if (drFormula.startsWith('!')) {
      hitLocation.drMod = parseInt(drFormula.slice(1))
      hitLocation.dr = parseInt(drFormula.slice(1))
      hitLocation.drCap = parseInt(drFormula.slice(1))
    } else {
      hitLocation.drMod = parseInt(drFormula)
      hitLocation.dr = Math.max(hitLocation.import + hitLocation.drMod + hitLocation.drItem, 0)
      hitLocation.drCap = hitLocation.dr
    }

    return hitLocation
  }

  /**
   * @deprecated Actor v1 only.
   */
  async _removeKey(sourceKey: string) {
    // source key is the whole path, like 'system.melee.00001'
    const components = sourceKey.split('.')

    const index = parseInt(components.pop()!)
    const path = components.join('.')

    let object = GURPS.decode<AnyObject>(this, path)
    const array = objectToArray(object)

    // Delete the whole object.
    const last = components.pop()
    const nullKey = `${components.join('.')}.-=${last}`

    await this.internalUpdate({ [nullKey]: null })

    // Remove the element from the array
    array.splice(index, 1)

    // Convert back to an object
    object = arrayToObject(array, 5)

    // update the actor
    await this.internalUpdate({ [path]: object }, { diff: false })
  }

  /**
   * @deprecated Actor v1 only.
   */
  async _insertBeforeKey(targetKey: string, element: any) {
    // target key is the whole path, like 'system.melee.00001'
    const components = targetKey.split('.')

    const index = parseInt(components.pop()!)
    const path = components.join('.')

    let object = GURPS.decode<AnyObject>(this, path)
    const array = objectToArray(object)

    // Delete the whole object.
    const last = components.pop()
    const nullKey = `${components.join('.')}.-=${last}`

    await this.internalUpdate({ [nullKey]: null })

    // Insert the element into the array.
    array.splice(index, 0, element)

    // Convert back to an object
    object = arrayToObject(array, 5)

    // update the actor
    await this.internalUpdate({ [path]: object }, { diff: false })
  }

  /**
   * @deprecated Actor v1 only.
   */
  async _splitEquipment(srckey: string, targetkey: string) {
    const srceqt = foundry.utils.getProperty(this, srckey) as any

    if (srceqt.count <= 1) return false // nothing to split

    const count = await this.promptEquipmentQuantity(srceqt, game.i18n!.localize('GURPS.splitQuantity'))

    if (!count || count <= 0) return true // didn't want to split
    if (count >= srceqt.count) return false // not a split, but a move

    if (targetkey.match(/^system\.equipment\.\w+$/)) targetkey += '.' + zeroFill(0)

    if (srceqt.globalid) {
      this.ignoreRender = true
      await this.updateEqtCount(srckey, srceqt.count - count)
      const rawItem = this.items.get(srceqt.itemid)

      if (rawItem) {
        const item = rawItem as Item.OfType<'equipment'>

        item.modelV1.eqt.count = count
        await this.addNewItemData(item, targetkey)
        await this.updateParentOf(targetkey, true)
      }

      this._forceRender()

      return true
    } else {
      // simple eqt
      const neqt = foundry.utils.duplicate(srceqt)

      neqt.count = count
      this.ignoreRender = true
      await this.updateEqtCount(srckey, srceqt.count - count)
      await GURPS.insertBeforeKey(this, targetkey, neqt)
      await this.updateParentOf(targetkey, true)
      this._forceRender()

      return true
    }
  }

  /**
   * @deprecated Actor v1 only.
   *
   * @param {string} srckey
   * @param {string} targetkey
   */
  async _checkForMerging(srckey: string, targetkey: string) {
    const srceqt = foundry.utils.getProperty(this, srckey) as any
    const desteqt = foundry.utils.getProperty(this, targetkey) as any

    if (
      (!!srceqt.globalid && srceqt.globalid == desteqt.globalid) ||
      (!srceqt.globalid && srceqt.name == desteqt.name)
    ) {
      this.ignoreRender = true
      await this.updateEqtCount(targetkey, parseInt(srceqt.count) + parseInt(desteqt.count))
      await this.deleteEntry(srckey, { refreshDR: false })
      this._forceRender()

      return true
    }

    return false
  }

  /**
   * @deprecated Actor v1 only.
   */
  private static addTrackerToDataObject(
    data: Record<string, any>,
    trackerData: Record<string, any>
  ): Record<string, any> {
    const trackers = GurpsActorV2.getTrackersAsArray(data)

    trackers.push(trackerData as TrackerInstance)

    return arrayToObject(trackers)
  }

  /**
   * @deprecated Actor v1 only.
   */
  private static getTrackersAsArray(data: Record<string, any>): TrackerInstance[] {
    let trackerArray = data.additionalresources.tracker

    if (!trackerArray) trackerArray = {}

    return objectToArray(trackerArray)
  }

  /**
   * @deprecated Actor v1 only.
   */
  async addTracker(): Promise<void> {
    this.ignoreRender = true

    const trackerData = { name: '', value: 0, min: 0, max: 0, points: 0 }
    const data = GurpsActorV2.addTrackerToDataObject(this.system, trackerData as Record<string, any>)

    await this.update({ 'system.additionalresources.-=tracker': null } as Actor.UpdateData) // force Foundry to see the change
    await this.update({ 'system.additionalresources.tracker': data } as Actor.UpdateData)

    this._forceRender()
  }

  /**
   * @deprecated Actor v1 only.
   *
   * Update this tracker slot with the contents of the template.
   * @param {String} path JSON data path to the tracker; must start with 'additionalresources.tracker.'
   * @param {*} template to apply
   */
  async applyTrackerTemplate(path: string, template: Record<string, any>): Promise<void> {
    this._initializeTrackerValues(template)

    // remove whatever is there
    await this.clearTracker(path)

    // add the new tracker
    const update: Record<string, any> = {}

    update[`system.${path}`] = template.tracker
    await this.update(update)
  }

  /**
   * @deprecated Actor v1 only.
   */
  private _initializeTrackerValues(template: Record<string, any>) {
    let value = template.tracker.value

    if (template.initialValue) {
      value = parseInt(template.initialValue, 10)

      if (Number.isNaN(value)) {
        // try to use initialValue as a path to another value
        value = foundry.utils.getProperty(this, 'system.' + template.initialValue) ?? template.tracker.value
      }
    }

    template.tracker.max = value
    template.tracker.value = template.tracker.isDamageTracker ? template.tracker.min : value
  }

  /**
   * @deprecated Actor v1 only.
   *
   * Overwrites the tracker pointed to by the path with default/blank values.
   * @param {String} path JSON data path to the tracker; must start with 'additionalresources.tracker.'
   */
  private async clearTracker(path: string): Promise<void> {
    // verify that this is a Tracker
    const prefix = 'additionalresources.tracker.'

    if (!path.startsWith(prefix)) throw `Invalid actor data path, actor=[${this.id}] path=[${path}]`

    const update: Record<string, any> = {}

    update[`system.${path}`] = {
      name: '',
      alias: '',
      pdf: '',
      max: 0,
      min: 0,
      value: 0,
      isDamageTracker: false,
      isDamageType: false,
      initialValue: '',
      thresholds: [],
    }
    await this.update(update)
  }

  /**
   * Removes the indicated tracker from the object, reindexing the keys.
   * @param {String} path JSON data path to the tracker; must start with 'additionalresources.tracker.'
   */
  async removeTracker(path: string): Promise<void> {
    this.ignoreRender = true
    const prefix = 'additionalresources.tracker.'

    // verify that this is a Tracker
    if (!path.startsWith(prefix)) throw `Invalid actor data path, actor=[${this.id}] path=[${path}]`

    const key = path.replace(prefix, '')
    const trackerData = this.modelV1.additionalresources.tracker

    delete trackerData[key]
    const trackers = objectToArray(trackerData)
    const data = arrayToObject(trackers)

    // remove all trackers
    await this.update({ 'system.additionalresources.-=tracker': null } as Actor.UpdateData)

    // add the new "array" of trackers
    if (data) this.update({ 'system.additionalresources.tracker': data } as Actor.UpdateData)

    this._forceRender()
  }

  /**
   * @deprecated Actor v1 only.
   */
  findAdvantage(name: string): Advantage | undefined {
    // This code is for when the actor is using Foundry items.
    // let found = this.items.filter(it => it.type === 'feature').find(it => it.name.match(new RegExp(advname, 'i')))
    // This code is for no Foundry items.

    // flatten the advantages into a single array. an advantage is a container if it has a `contains` property
    const list: Advantage[] = []

    const traverse = (ads: Record<string, Advantage>) => {
      for (const key in ads) {
        const adv = ads[key]

        list.push(adv)

        if (adv.contains) {
          traverse(adv.contains)
        }
      }
    }

    traverse(this.modelV1.ads)

    return Object.values(list).find(it => it.name.match(new RegExp(name, 'i')))
  }

  /**
   * @deprecated Actor v1 only.
   *
   * Given a hit location ID, return the DR tooltip HTML.
   */
  getDRTooltip(locationId: string): string {
    const hitLocation = this.modelV2.hitlocations[locationId]

    if (!hitLocation) return ''
    const drBase = hitLocation.import
    const drMod = hitLocation.drMod || 0
    const drItem = hitLocation.drItem || 0
    const itemMap = this._getDRFromItems(this.modelV2.hitlocations, false)
    const drLoc = itemMap[hitLocation.where] || {}
    const drItemLines = Object.keys(drLoc).map(key => `${key}: ${drLoc[key]}`)

    const context = { drBase, drMod, drItem, drItemLines }
    const template = Handlebars.partials['dr-tooltip']
    const compiledTemplate = Handlebars.compile(template)

    return new Handlebars.SafeString(compiledTemplate(context)) as unknown as string
  }

  /**
   * @deprecated Actor v1 only.
   */
  getPortraitPath() {
    if (game.settings!.get(GURPS.SYSTEM_NAME, Settings.SETTING_PORTRAIT_PATH) == 'global') return 'images/portraits/'

    return `worlds/${game.world!.id}/images/portraits`
  }

  /**
   * @deprecated Actor v1 only.
   */
  _forceRender() {
    this.ignoreRender = false
    this.render()
  }

  /* =========================================================================================== */
  /*  CRUD Operations                                                                            */
  /* =========================================================================================== */

  override async _preUpdate(changes: Actor.UpdateData, _options: AnyObject, _user: User): Promise<void> {
    if (this.isNewActorType) {
      this.#translateLegacyHitlocationData(changes)
      this.#translateLegacyEncumbranceData(changes)
      await this.#translateAdsData(changes)
      this.#translateMoveData(changes)
      this.#translateNoteData(changes)
    }
  }

  /**
   * Translate legacy HitLocation data like "system.hitlocations.00003.import" to "system.hitlocationsV2.3.import".
   */
  #translateLegacyHitlocationData(data: any) {
    if (!data.system || typeof data.system !== 'object') return
    if (!('hitlocations' in data.system) && !('-=hitlocations' in data.system)) return

    // Check for deletion pattern: { system: { '-=hitLocations': null } }
    const deleteKey = '-=hitlocations' in data.system

    if (deleteKey) {
      delete data.system['-=hitlocations']
      data.system.hitlocationsV2 = []
    }

    // Check for individual element updates: { system: { notes: { '00000': { title': 'New Title' } } } }
    const changeKey = 'hitlocations' in data.system && typeof data.system.hitlocations === 'object'

    if (changeKey) {
      const hitlocationsV2: any[] = foundry.utils.deepClone(this.modelV2._source.hitlocationsV2) ?? []
      const keys = Object.keys(foundry.utils.flattenObject(data as object))
      const changes = keys.filter(it => it.startsWith('system.hitlocations.'))
      const processedChanges: string[] = []

      for (const change of changes) {
        // If change ends in a number like '000123', we're updating the whole object; if it ends in a property name,
        // we're updating a property of the object.
        const [_, index, ___, property] = parseItemKey(change)
        const pathToObject = property ? change.replace(new RegExp(`\\.${property}$`), '') : change

        if (processedChanges.includes(pathToObject)) {
          delete data[change]
          continue
        }

        // Does the hitlocation already exist?
        const hitlocationV1 = foundry.utils.getProperty(this, pathToObject) as HitLocationEntryV1

        if (hitlocationV1) {
          // Existing hitlocation.
          const newData = foundry.utils.getProperty(data, pathToObject) as AnyObject

          HitLocationEntryV1.updateV2(hitlocationsV2[index!], newData)
          delete data[change]
          processedChanges.push(pathToObject)
        } else {
          // New hitlocation.
          const newData = foundry.utils.getProperty(data, pathToObject) as AnyObject
          const location = {} as HitLocationEntryV2

          HitLocationEntryV1.updateV2(location, newData)
          hitlocationsV2.push(location)
          delete data[change]
          processedChanges.push(pathToObject)
        }
      }

      data.system.hitlocationsV2 = hitlocationsV2
      delete data.system.hitlocations
    }
  }

  /**
   * Translate legacy Encumbrance current index from "system.encumbrance.2.current = true" to "system.additionalresources.currentEncumbrance = 2"
   */
  #translateLegacyEncumbranceData(data: Actor.UpdateData) {
    Object.keys(data)
      .filter(key => key.startsWith('system.encumbrance.'))
      .forEach(key => {
        const index = key.split('.')[2]
        const field = key.split('.').slice(3).join('.')
        const value = data[key as keyof typeof data]

        if (field === 'current' && !!value) {
          // @ts-expect-error - dynamic property assignment to update data
          data[`system.additionalresources.currentEncumbrance`] = index
        }

        delete data[key as keyof typeof data]
      })
  }

  /*
   * Translate legacy Advantages/Disadvantages data from "system.ads" to Item updates.
   *
   * We are either deleting the entire array or inserting the entire array. Updates are handled directly in the Item.
   */
  async #translateAdsData(data: any) {
    if (!data.system || typeof data.system !== 'object') return
    if (!('ads' in data.system) && !('-=ads' in data.system)) return

    // Check for deletion pattern: { system: { '-=ads': null } }
    const deleteKey = '-=ads' in data.system

    if (deleteKey) {
      const featureIds = this.items.filter(item => item.type === 'featureV2').map(item => item.id!)

      await this.deleteEmbeddedDocuments('Item', featureIds)

      delete data.system['-=ads']
    }

    // Check for insertion/update: { system: { ads: {...} } }
    const changeKey = 'ads' in data.system && typeof data.system.ads === 'object'

    if (changeKey) {
      const toUpdate: Record<string, any>[] = []
      const toCreate: Record<string, any>[] = []

      // const array = this.items.filter(item => item.type === 'featureV2')
      const keys = Object.keys(foundry.utils.flattenObject(data as object))
      const changes = keys.filter(it => it.startsWith('system.ads.'))

      const processedChanges: string[] = []

      for (const change of changes) {
        const [_, __, ___, property] = parseItemKey(change)
        const pathToObject = property ? change.replace(new RegExp(`\\.${property}$`), '') : change

        if (processedChanges.includes(pathToObject)) {
          delete data[change]
          continue
        }

        const newData = foundry.utils.getProperty(data, pathToObject) as AnyObject

        // Does the ad already exist?
        const adsv1 = foundry.utils.getProperty(this, pathToObject) as TraitV1

        if (adsv1 && adsv1.traitV2) {
          // Existing ad.
          const updateData: Record<string, any> = TraitV1.getUpdateData(newData, adsv1)

          toUpdate.push({ _id: adsv1.traitV2._id, ...updateData })

          // foundry.utils.deleteProperty(data, pathToObject)
          processedChanges.push(pathToObject)
        } else {
          // New ad.
          const updateData: Record<string, any> = TraitV1.getUpdateData(newData)

          toCreate.push(updateData)

          // foundry.utils.deleteProperty(data, pathToObject)
          processedChanges.push(pathToObject)
        }
      }

      if (toCreate.length > 0) {
        toCreate.forEach((it, index) => {
          if (it.system?.containedBy === null) {
            const length = this.items
              .filter(item => item.type === 'featureV2')
              .filter(ad => (ad as Item.OfType<'featureV2'>).containedBy === null).length

            it.sort = length + index
          }
        })

        await this.createEmbeddedDocuments('Item', toCreate as Item.CreateData[])
      }

      if (toUpdate.length > 0) await this.updateEmbeddedDocuments('Item', toUpdate as Item.UpdateData[])

      delete data.system.ads
    }
  }

  /**
   * system.-=move: null
   * system.move:[
   *  {
   *    mode:"GURPS.moveModeGround",
   *    basic:7,
   *    enhanced:0,
   *    default:true
   *  },
   *  {
   *    mode:"other"
   *    basic:0,
   *    enhanced:null,
   *    default:false
   * }]
   * @param data
   * @returns
   */
  #translateMoveData(data: any) {
    if (!data.system || typeof data.system !== 'object') return
    if (!('move' in data.system) && !('-=move' in data.system)) return

    // Check for deletion pattern: { system: { '-=move': null } }
    const deleteKey = '-=move' in data.system

    if (deleteKey) {
      data.system.moveV2 = []
      delete data.system['-=move']
    }

    const changeKey = 'move' in data.system && typeof data.system.move === 'object'

    if (changeKey) {
      const array: any[] = foundry.utils.deepClone(this.modelV2._source.moveV2) ?? []

      // Get the list of property keys of system.move -- these are indices into system.moveV2.
      const keys = Object.keys(data.system.move).sort()

      for (const key of keys) {
        const index = parseInt(key)
        const moveV1 = foundry.utils.getProperty(data, `system.move.${key}`) as any

        if (array.length <= index) {
          const moveV2 = {}

          this.#updateMove2V2FromLegacyMove(moveV2, moveV1)
          // insert at the correct index
          array.splice(index, 0, moveV2)
        } else {
          this.#updateMove2V2FromLegacyMove(array[index], moveV1)
        }

        delete data.system.move[key]
      }

      data.system.moveV2 = array
      delete data.system.move
    }
  }

  #updateMove2V2FromLegacyMove(moveV2: any, changes: any) {
    const keys = Object.keys(changes)

    for (const key of keys) {
      switch (key) {
        case 'basic':
        case 'enhanced':
        case 'mode':
        case 'default':
          moveV2[key] = changes[key]
          break
        default:
          console.warn(`Unknown move property in legacy data: ${key}`)
          break
      }
    }
  }

  /**
   * system.notes.00000.contains.00000
   *
   * @param data
   * @returns
   */
  #translateNoteData(data: any) {
    if (!data.system || typeof data.system !== 'object') return
    if (!('notes' in data.system) && !('-=notes' in data.system)) return

    // Check for deletion pattern: { system: { '-=notes': null } }
    const deleteKey = '-=notes' in data.system

    if (deleteKey) {
      data.system.allNotes = []
      delete data.system['-=notes']
    }

    // Check for individual element updates: { system: { notes: { '00000': { title': 'New Title' } } } }
    const changeKey = 'notes' in data.system && typeof data.system.notes === 'object'

    if (changeKey) {
      const array: any[] = foundry.utils.deepClone(this.modelV2._source.allNotes) ?? []
      const keys = Object.keys(foundry.utils.flattenObject(data as object))
      const changes = keys.filter(it => it.startsWith('system.notes.'))

      const processedChanges: string[] = []

      for (const change of changes) {
        // If change ends in a number like '000123', we're updating the whole object; if it ends in a property name,
        // we're updating a property of the object.
        const [_, __, ___, property] = parseItemKey(change)
        const pathToObject = property ? change.replace(new RegExp(`\\.${property}$`), '') : change

        if (processedChanges.includes(pathToObject)) {
          delete data[change]
          continue
        }

        // Does the note already exist?
        const notev1 = foundry.utils.getProperty(this, pathToObject) as NoteV1

        if (notev1) {
          // Existing note.
          const arrIndex = array.findIndex(it => it.id === notev1.noteV2.id)
          const newData = foundry.utils.getProperty(data, pathToObject) as AnyObject

          NoteV1.updateNoteV2(array[arrIndex], newData)
          delete data[change]
          processedChanges.push(pathToObject)
        } else {
          // New note.
          const newData = foundry.utils.getProperty(data, pathToObject) as AnyObject
          const notev2: any = {}

          NoteV1.updateNoteV2(notev2, newData)
          array.push(notev2)
          delete data[change]
          processedChanges.push(pathToObject)
        }
      }

      data.system.allNotes = array
      delete data.system.notes
    }
  }
}

export { GurpsActorV2 }
