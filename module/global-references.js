import { ModifierBucket } from './modifier-bucket/bucket-app.js'
import { GurpsActor } from './actor/actor.js'
import GURPSRange from '../lib/ranges.js'
import Initiative from '../lib/initiative.js'
import HitFatPoints from '../lib/hitpoints.js'
import GURPSConditionalInjury from './injury/foundry/conditional-injury.js'

/**
 * @typedef {object} ChatProcessor
 * @property {function(string, {shiftKey: boolean;ctrlKey: boolean;data: {};}=, ChatMessageData | {speaker: any}=): Promise<boolean>} startProcessingLines
 *
 * The giant motherfucking action object returned by parselink.
 *
 * @typedef {{
 *   type: string;                // One of [attack|attackdamage|attribute|chat|controlroll|damage|deriveddamage|derivedroll|dragdrop|mapped|modifier|pdf|roll|skill-spell]
 *   orig: string;                // if [chat], text of the chat command
 *   formula?: string;            // if [roll|damage|deriveddamage|derivedroll] this is the dice formula to roll.
 *   path?: string | number;      // if [attribute] contains the attribute path in the data model.
 *   desc?: string;               // if [modifier|controlroll|roll|damage|derivedroll], this is descriptive text.
 *   costs?: string;              // if [damage|deriveddamage|derivedroll] this is any 'costs' such as FP.
 *   link?: string;               // if 'pdf', this is the PDF link text. If 'dragdrop' this is the type of object being dropped?
 *   id?: string;                 // if 'dragdrop' this is the uuid of the object being dropped?
 *   displayformula?: string;     // if 'roll' this is the dice formula to display; overrides Action.formula.
 *   blindroll?: boolean;
 *   isSpellOnly?: boolean;
 *   isSkillOnly?: boolean;
 *   isMelee?: boolean;
 *   isRanged?: boolean;
 *   name?: string,
 *   target?: string | number;    // if [attribute|controlroll] this is the target number.
 *   mod?: string;                // if 'modifier'|'damage', this is the modifier value.
 *   next?: Action;               // if type is 'modifier', this is the next modifier in the list.
 *   spantext?: string;
 *   floatingAttribute?: string | number | null,
 *   floatingType?: string | null,
 *   floatingLabel?: string | null,
 *   truetext?: string,
 *   falsetext?: string;
 *   overridetxt?: string;
 *   quiet?: boolean;             // if [chat], flag to tell it not to create a chat message?
 *   damagetype?: string;         // if [damage|deriveddamage], the string value of the damage type (i.e., 'cut', 'pi', 'burn', etc...)
 *   extdamagetype?: string;      // if [damage], any extra damage modifier, like 'ex'.
 *   derivedformula?: string;     // if [deriveddamage], a damage formula like 'sw+2' or 'thr-1'. If [derivedroll], 'sw' or 'thr'.
 *   calcOnly?: boolean;          // if [skill-spell|attribute], then return the target calculated for this skill-spell|attribute instead of rolling against it.
 *   attrkey?: string;
 *   melee?: string;
 *   attribute?: string;
 *   obj?: object;
 * }} Action
 *
 * The global GURPS reference ===
 * @typedef {object} _GURPS
 * @property {string}                 BANNER
 * @property {string}                 LEGAL
 * @property {ModifierBucket}         ModifierBucket
 * @property {GurpsActor|null}        LastActor
 * @property {string[]}               ChatCommandsInProcess
 * @property {string[]}               PendingOTFs
 * @property {boolean}                IgnoreTokenSelect
 * @property {Record<string,string>}  PARSELINK_MAPPINGS
 * @property {Record<string,string>}  SJGProductMappings
 * @property {string}                 USER_GUIDE_URL
 * @property {Record<string,any>}     SavedStatusEffects
 * @property {Record<string,string>}  attributes
 * @property {Record<string,string>}  attributepaths
 * @property {Record<string,string>}  attributeNames
 * @property {Record<string,string>}  skillTypes
 * @property {Element | undefined}    damageDragImage
 * @property {ChatProcessor}          ChatProcessors
 * @property {GURPSRange}             rangeObject
 * @property {Initiative}             initiative
 * @property {HitFatPoints}           hitpoints
 * @property {GURPSConditionalInjury} ConditionalInjury
 * @property {Element}                allTheThingsImage
 * @property {function(GurpsActor): void}                         ClearLastActor
 * @property {function(GurpsActor | null): void}                  SetLastActor
 * @property {function(string): string}                           escapeUnicode
 * @property {function(): void}                                   clearActiveEffects
 * @property {function(string, boolean=): string}                 gurpslink
 * @property {function(GurpsActor | User, string):
 *            Promise<number | null>}                             applyModifierDesc
 * @property {function(string, string | null, JQuery.Event,
 *            boolean|{blindroll:boolean}, GurpsActor | null): void} whisperOtfToOwner
 * @property {function(JQuery.MouseEventBase, GurpsActor | null,
 *            string, string | null, boolean, boolean): void}     resolveDamageRoll
 * @property {function(Action, GurpsActor | null,
 *            JQuery.Event | null=, string[]=):
 *            Promise<boolean|{target: any, thing: any}|undefined>} performAction
 * @property {function(File): Promise<string|ArrayBuffer|null>}   readTextFromFile
 * @property {function(string): string}                           cleanUpP
 * @property {function(object | null, number=): string}           objToString
 * @property {function(string): string}                           trim
 * @property {function(string, boolean, JQuery.Event | null):
 *            Promise<boolean>}                                   executeOTF
 * @property {function(string, any=): string}                     _mapAttributePath
 * @property {function(GurpsActorData, string, boolean=,
 *            boolean=): any}                                     findAttack
 * @property {function(string | string[], any, string=): any}     resolve
 * @property {function(GurpsActor|GurpsActorData, string,
 *            boolean=, boolean=): any}                           findSkillSpell
 * @property {function(GurpsActor | GurpsActorData, string): any} findAdDisad
 * @property {function(JQuery.MouseEventBase, GurpsActor | null,
 *            string[]): Promise<void>}                           handleRoll
 * @property {function(JQuery.MouseEventBase, GurpsActor | null,
 *            string | null, string[]=): void}                    handleGurpslink
 * @property {function(number): string}                           genkey
 * @property {function(Record<string, any>, any, number=): string} put
 * @property {function(GurpsActor, string): Promise<void>}        removeKey
 * @property {function(Actor, string, object): void}              insertBeforeKey
 * @property {function(object, string): Record<string,any>}       decode
 * @property {function(Record<string,any>,
 *            { fn: (arg0: any, arg1: { data: any; }) => string; },
 *            number, { indent: any; key: string; count: any; },  string=,
 *            { equipment: { carried: Object; }; }|null=):string} listeqtrecurse
 * @property {function(string, boolean, User[] | null=): void}    sendOtfMessage
 * @property {function(boolean): void}                            setInitiativeFormula
 * @property {function(object,
 *            (value: any, key: string, depth: number) => boolean,
 *            string=, depth=):void}                             recurselist
 * === End global GURPS reference ===
 *
 * === GurpsItemData ===
 * @typedef {object} GurpsItemData
 * @property {Record<string,any>} equipped
 * @property {Record<string,any>} carried
 * @property {Record<string,any>} bonuses
 * @property {string} globalid
 * @property {{count: number,
 *            itemid: string | null,
 *            carried: boolean,
 *            equipped: boolean,
 *            parentuuid: string,
 *            img: string | null,
 *            globalid: string,
 *            importid: string,
 *            importFrom: string,
 *            uuid: string}} eqt
 * === End GurpsItemData
 *
 *
 * @typedef { {value: number, max: number, import: number, points: number} } Attribute
 *
 * @typedef {object} GurpsActorData
 * @property {string|null}  migrationversion
 * @property {Record<string, Attribute>} attributes
 * @property {Attribute} HP
 * @property {Attribute} FP
 * @property {Attribute} basicspeed
 * @property {Attribute} basicmove
 * @property {Attribute} dodge
 * @property {string} thrust
 * @property {string} swing
 * @property {number} basiclift
 * @property {number} vision
 * @property {number} hearing
 * @property {number} tastesmell
 * @property {number} touch
 * @property {number} frightcheck
 * @property {number} currentmove
 * @property {number} currentflight
 * @property {number} currentdodge
 * @property {number} equippedparry
 * @property {number} equippedblock
 * @property {{carried: {}, other: {} }} equipment
 * @property {object} skills
 * @property {object} spells
 * @property {object} melee
 * @property {object} ads
 * @property {object} eqtsummary
 * @property {object} hitlocations
 * @property {Record<string,any>} encumbrance
 * @property {object} ranged
 * @property {object} notes
 * @property {{maneuver: string}} conditions
 * @property {{
 *     isTired: boolean,
 *     isReeling: boolean,
 *     showflightmove: boolean
 *     importpath: string
 *     importname: String
 *     importversion: string
 *     ignoreinputbodyplan: boolean
 *     bodyplan: string
 *   }} additionalresources
 * @property {string} lastImport
 *
 */
