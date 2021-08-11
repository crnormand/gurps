import { ModifierBucket } from './modifier-bucket/bucket-app.js'
import { GurpsActor, Skill, Spell } from './actor/actor.js'
import { ChatProcessors } from './chat.js'

/**
 * The giant motherfucking action object returned by parselink.
 *
 * @typedef {{
 *   type: string;                // One of [attack|attackdamage|attribute|chat|controlroll|damage|deriveddamage|derivedroll|dragdrop|mapped|modifier|pdf|roll|skill-spell]
 *   orig: string;                // if [chat], text of the chat command
 *   formula?: string;            // if [roll|damage|deriveddamage|derivedroll] this is the dice formula to roll.
 *   path?: string | number;
 *   desc?: string;               // if [modifier|controlroll|roll|damage|derivedroll], this is descriptive text.
 *   costs?: string;              // if [damage|deriveddamage|derivedroll] this is any 'costs' such as FP.
 *   link?: string;               // if 'pdf', this is the PDF link text. If 'dragdrop' this is the type of object being dropped?
 *   id?: string;                 // if 'dragdrop' this is the uuid of the object being dropped?
 *   displayformula?: string;     // if 'roll' this is the dice formula to display; overrides Action.formula.
 *   blindroll?: boolean;
 *   isSpellOnly?: boolean;
 *   isSkillOnly?: boolean;
 *   name?: string,
 *   target?: string | number;    // if 'controlroll' this is the target number.
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
 *   calcOnly?: boolean;          // if [skill-spell|attribute], it has something to do with calculate only, whatever that means.?
 * }} Action
 *
 * @typedef {{
 *   ModifierBucket: ModifierBucket; // bucket reference
 *   LastActor: GurpsActor | null;
 *   LastActorName: string | null;
 *   ClearLastActor(actor: GurpsActor): void;
 *   SetLastActor(actor: GurpsActor | null): void;
 *   SavedStatusEffects: {}
 *   clearActiveEffects(): void;
 *   ChatCommandsInProcess: string[];
 *   PendingOTFs: string[];
 *   IgnoreTokenSelect: boolean;
 *   attributepaths: {};
 *   attributes: {};
 *   attributeNames: {};
 *   skillTypes: {};
 *   PARSELINK_MAPPINGS: { [key: string]: number | string, };
 *   SJGProductMappings: { [key: string]: number | string, };
 *   USER_GUIDE_URL: string;
 *   escapeUnicode(str: string): string;
 *   readTextFromFile(file: File) : Promise<string|ArrayBuffer|null>;
 *   cleanUpP(xml: string) : string;
 *   objToString(obj: Object|null, ndeep: number) : string
 *   trim(str : string) : string
 *   executeOTF(string: string, priv: boolean, event: any) : any
 *   handleRoll(event: JQuery.ClickEvent,           // Handle a "roll" event (click) in the context of the given GurpsActor.
 *      actor: GurpsActor, targets: string[]) : number|null;
 *   parseForDamage(str: string,                    // Parse the text as an OTF for damage.
 *      overridetext: string) : Action;
 *   handlePdf(links: string) : void;               // Parse a comma-separated list of pdflinks and open the PDF(s) using PDFoundry.
 *   handleOnPdf(event: JQuery.ClickEvent) : void;  // Given a JQuery ClickEvent on a PDF Link, handle the event.
 *   performAction(action: Action, actor: GurpsActor|null, event: MouseEvent, targets?: string[]): Promise<boolean>;
 *   ChatProcessors: ChatProcessors;
 *   addModifier(mod: number|string, desc: string, list?: import('./modifier-bucket/bucket-app.js').Modifier[]) : void;
 *   findSkillSpell(actor: GurpsActor, sname: string, isSkillOnly?: boolean, isSpellOnly?: boolean) : Skill|Spell|undefined;
 * }} _GURPS
 */

/**
 * @param {any} actor
 */
export function asGurpsActor(actor) {
  return /** @type {GurpsActor} */ actor
}

/**
 * @returns {_GURPS}
 */
export function _GURPS() {
  // @ts-ignore
  if (!!window.GURPS) return GURPS
  throw new Error('GURPS is not initialized')
}

/**
 * @returns {Game}
 */
export function _game() {
  if (game instanceof Game) return game
  throw new Error('Game not initialized yet!')
}

/**
 * @returns {Canvas}
 */
export function _canvas() {
  if (canvas instanceof Canvas) return canvas
  throw new Error('Canvas not initialized yet!')
}

export function _ui() {
  if (!!ui) return ui
  throw new Error('ui is not initialized yet!')
}

/**
 * @returns {User}
 */
export function _user() {
  let user = _game().user
  if (user) return user
  throw new Error('User is not initialized yet!')
}
