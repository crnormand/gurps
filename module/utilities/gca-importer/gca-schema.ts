import fields = foundry.data.fields
import DataModel = foundry.abstract.DataModel

/**
 * These classes use Foundry's own DataModel system for its inbuilt validation and easy translation into useful data.
 * It serves as the back-bone of native GCA5 data handling.
 *
 * Elements use the normal name found in the GCA5 .xsd schema, while attributes are prefixed with "$"
 * For elements with minOccurs set to 0, the field is set to nullable, but still remains required.
 * This lets us just deal with null values rather than undefined ones.
 */

/* ---------------------------------------- */

class GCABonusClass extends DataModel<GCABonusClassSchema> {
  static override defineSchema(): GCABonusClassSchema {
    return gcaBonusClassSchema
  }
}

const gcaBonusClassSchema = {
  name: new fields.StringField({ required: true, nullable: false }),
  affects: new fields.StringField({ required: true, nullable: true }),
  stacks: new fields.StringField({ required: true, nullable: true }),
  upto: new fields.StringField({ required: true, nullable: true }),
  downto: new fields.StringField({ required: true, nullable: true }),
  // NOTE: Not sure what this does yet
  uptoisset: new fields.NumberField({ required: true, nullable: true }),
  downtoisset: new fields.NumberField({ required: true, nullable: true }),
  best: new fields.StringField({ required: true, nullable: true }),
  worst: new fields.StringField({ required: true, nullable: true }),
}

type GCABonusClassSchema = typeof gcaBonusClassSchema

/* ---------------------------------------- */

class GCABonusClassesBlock extends DataModel<GCABonusClassesBlockSchema> {
  static override defineSchema(): GCABonusClassesBlockSchema {
    return gcaBonusClassesBlockSchema
  }
}

const gcaBonusClassesBlockSchema = {
  bonusclass: new fields.ArrayField(new fields.EmbeddedDataField(GCABonusClass), { required: true, nullable: false }),
  $count: new fields.NumberField({ required: true, nullable: false }),
}

type GCABonusClassesBlockSchema = typeof gcaBonusClassesBlockSchema

/* ---------------------------------------- */

class GCAGroupingOptions extends DataModel<GCAGroupingOptionsSchema> {
  static override defineSchema(): GCAGroupingOptionsSchema {
    return gcaGroupingOptionsSchema
  }

  /* ---------------------------------------- */

  static fromXML(xml: HTMLElement): GCAGroupingOptions {
    const data: Partial<DataModel.CreateData<GCAGroupingOptionsSchema>> = {}

    data.traittype = xml.getElementsByTagName('traittype')[0]?.textContent ?? ''
    data.groupingtype = xml.getElementsByTagName('groupingtype')[0]?.textContent ?? ''
    data.specifiedtag = xml.getElementsByTagName('specifiedtag')[0]?.textContent ?? ''
    data.includetagpartinheader = xml.getElementsByTagName('includetagpartinheader')[0]?.textContent === 'true'
    data.specifiedvaluesonly = xml.getElementsByTagName('specifiedvaluesonly')[0]?.textContent === 'true'
    data.specifiedvalueslist = xml.getElementsByTagName('specifiedvalueslist')[0]?.textContent ?? ''
    data.groupsatend = xml.getElementsByTagName('groupsatend')[0]?.textContent === 'true'

    return new this(data)
  }
}

const gcaGroupingOptionsSchema = {
  traittype: new fields.StringField({ required: true, nullable: false }),
  groupingtype: new fields.StringField({ required: true, nullable: false }),
  specifiedtag: new fields.StringField({ required: true, nullable: false }),
  includetagpartinheader: new fields.BooleanField({ required: true, nullable: false }),
  specifiedvaluesonly: new fields.BooleanField({ required: true, nullable: false }),
  specifiedvalueslist: new fields.StringField({ required: true, nullable: false }),
  groupsatend: new fields.BooleanField({ required: true, nullable: false }),
}

type GCAGroupingOptionsSchema = typeof gcaGroupingOptionsSchema

/* ---------------------------------------- */

class GCATraitGroupingBlock extends DataModel<GCATraitGroupingBlockSchema> {
  static override defineSchema(): GCATraitGroupingBlockSchema {
    return gcaTraitGroupingBlockSchema
  }

  /* ---------------------------------------- */

  static fromXML(xml: HTMLElement): GCATraitGroupingBlock {
    const data: Partial<DataModel.CreateData<GCATraitGroupingBlockSchema>> = {}

    data.groupingoptions = Array.from(xml.getElementsByTagName('groupingoptions')).map(node =>
      GCAGroupingOptions.fromXML(node as HTMLElement)
    )
    data.$count = parseInt(xml.getAttribute('count') ?? '0')

    return new this(data)
  }
}

const gcaTraitGroupingBlockSchema = {
  groupingoptions: new fields.ArrayField(new fields.EmbeddedDataField(GCAGroupingOptions), {
    required: true,
    nullable: false,
  }),
  $count: new fields.NumberField({ required: true, nullable: false }),
}

type GCATraitGroupingBlockSchema = typeof gcaTraitGroupingBlockSchema

/* ---------------------------------------- */

class GCAFlagSymbol extends DataModel<GCAFlagSymbolSchema> {
  static override defineSchema(): GCAFlagSymbolSchema {
    return gcaFlagSymbolSchema
  }
}

const gcaFlagSymbolSchema = {
  name: new fields.StringField({ required: true, nullable: false }),
  filename: new fields.StringField({ required: true, nullable: false }),
  criteria: new fields.StringField({ required: true, nullable: false }),
  image: new fields.StringField({ required: true, nullable: false }),
}

type GCAFlagSymbolSchema = typeof gcaFlagSymbolSchema

/* ---------------------------------------- */

class GCASymbolsBlock extends DataModel<GCASymbolsBlockSchema> {
  static override defineSchema(): GCASymbolsBlockSchema {
    return gcaSymbolsBlockSchema
  }
}

const gcaSymbolsBlockSchema = {
  symbol: new fields.ArrayField(new fields.EmbeddedDataField(GCAFlagSymbol), { required: true, nullable: false }),
  $count: new fields.NumberField({ required: true, nullable: false }),
}

type GCASymbolsBlockSchema = typeof gcaSymbolsBlockSchema

/* ---------------------------------------- */

class GCAMessage extends DataModel<GCAMessageSchema> {
  static override defineSchema(): GCAMessageSchema {
    return gcaMessageSchema
  }
}

const gcaMessageSchema = {
  caption: new fields.StringField({ required: true, nullable: false }),
  text: new fields.StringField({ required: true, nullable: false }),
}

type GCAMessageSchema = typeof gcaMessageSchema

/* ---------------------------------------- */

class GCAMessagesBlock extends DataModel<GCAMessagesBlockSchema> {
  static override defineSchema(): GCAMessagesBlockSchema {
    return gcaMessagesBlockSchema
  }
}

const gcaMessagesBlockSchema = {
  message: new fields.ArrayField(new fields.EmbeddedDataField(GCAMessage), { required: true, nullable: false }),
}

type GCAMessagesBlockSchema = typeof gcaMessagesBlockSchema

/* ---------------------------------------- */

class GCAUnknownTag extends DataModel<GCAUnknownTagSchema> {
  static override defineSchema(): GCAUnknownTagSchema {
    return gcaUnknownTagSchema
  }
}

const gcaUnknownTagSchema = {
  caption: new fields.StringField({ required: true, nullable: false }),
  text: new fields.StringField({ required: true, nullable: false }),
}

type GCAUnknownTagSchema = typeof gcaUnknownTagSchema

/* ---------------------------------------- */

class GCAExtendedTagsBlock extends DataModel<GCAExtendedTagsBlockSchema> {
  static override defineSchema(): GCAExtendedTagsBlockSchema {
    return gcaExtendedTagsBlockSchema
  }
}

const gcaExtendedTagsBlockSchema = {
  extendedtag: new fields.ArrayField(new fields.EmbeddedDataField(GCAUnknownTag), { required: true, nullable: false }),
}

type GCAExtendedTagsBlockSchema = typeof gcaExtendedTagsBlockSchema

/* ---------------------------------------- */

class GCABonus extends DataModel<GCABonusSchema> {
  static override defineSchema(): GCABonusSchema {
    return gcaBonusSchema
  }
}

const gcaBonusSchema = {
  targetprefix: new fields.StringField({ required: true, nullable: true }),
  targetname: new fields.StringField({ required: true, nullable: false }),
  targettext: new fields.StringField({ required: true, nullable: true }),
  targettag: new fields.StringField({ required: true, nullable: true }),
  targettype: new fields.StringField({ required: true, nullable: false }),
  affects: new fields.StringField({ required: true, nullable: false }),
  bonuspart: new fields.StringField({ required: true, nullable: false }),
  // this is an unsignedByte in GCA5, but we use a NumberField here
  bonustype: new fields.NumberField({ required: true, nullable: false }),
  fullbonustext: new fields.StringField({ required: true, nullable: false }),
  upto: new fields.StringField({ required: true, nullable: true }),
  value: new fields.NumberField({ required: true, nullable: false }),
  stringvalue: new fields.StringField({ required: true, nullable: true }),
  stringvaluetext: new fields.StringField({ required: true, nullable: true }),
  notes: new fields.StringField({ required: true, nullable: true }),
  listas: new fields.StringField({ required: true, nullable: true }),
  unless: new fields.StringField({ required: true, nullable: true }),
  onlyif: new fields.StringField({ required: true, nullable: true }),
  classes: new fields.StringField({ required: true, nullable: true }),

  fromname: new fields.StringField({ required: true, nullable: true }),
  fromtype: new fields.StringField({ required: true, nullable: true }),
  fromprefix: new fields.StringField({ required: true, nullable: true }),
  fromext: new fields.StringField({ required: true, nullable: true }),
  fromtag: new fields.StringField({ required: true, nullable: true }),
}

type GCABonusSchema = typeof gcaBonusSchema

/* ---------------------------------------- */

class GCABonusesBlock extends DataModel<GCABonusesBlockSchema> {
  static override defineSchema(): GCABonusesBlockSchema {
    return gcaBonusesBlockSchema
  }
}

const gcaBonusesBlockSchema = {
  bonus: new fields.ArrayField(new fields.EmbeddedDataField(GCABonus), { required: true, nullable: false }),
}

type GCABonusesBlockSchema = typeof gcaBonusesBlockSchema

/* ---------------------------------------- */

class GCABodyItem extends DataModel<GCABodyItemSchema> {
  static override defineSchema(): GCABodyItemSchema {
    return gcaBodyItemSchema
  }
}

const gcaBodyItemSchema = {
  name: new fields.StringField({ required: true, nullable: false }),
  cat: new fields.StringField({ required: true, nullable: false }),
  group: new fields.StringField({ required: true, nullable: false }),
  basedb: new fields.StringField({ required: true, nullable: false }),
  basedr: new fields.StringField({ required: true, nullable: false }),
  basehp: new fields.StringField({ required: true, nullable: false }),
  display: new fields.StringField({ required: true, nullable: false }),
  posx: new fields.NumberField({ required: true, nullable: false }),
  posy: new fields.NumberField({ required: true, nullable: false }),
  width: new fields.NumberField({ required: true, nullable: true }),
  height: new fields.NumberField({ required: true, nullable: true }),
  expanded: new fields.BooleanField({ required: true, nullable: false }),
  layers: new fields.NumberField({ required: true, nullable: false }),
  db: new fields.StringField({ required: true, nullable: false }),
  dr: new fields.StringField({ required: true, nullable: false }),
  hp: new fields.StringField({ required: true, nullable: false }),
}

type GCABodyItemSchema = typeof gcaBodyItemSchema

/* ---------------------------------------- */

class GCABody extends DataModel<GCABodySchema> {
  static override defineSchema(): GCABodySchema {
    return gcaBodySchema
  }
}

const gcaBodySchema = {
  bodyitem: new fields.ArrayField(new fields.EmbeddedDataField(GCABodyItem), { required: true, nullable: false }),
}

type GCABodySchema = typeof gcaBodySchema

/* ---------------------------------------- */

class GCALayerItem extends DataModel<GCALayerItemSchema> {
  static override defineSchema(): GCALayerItemSchema {
    return gcaLayerItemSchema
  }
}

const gcaLayerItemSchema = {
  itemname: new fields.StringField({ required: true, nullable: false }),
  isinnate: new fields.BooleanField({ required: true, nullable: false }),
  countaslayer: new fields.BooleanField({ required: true, nullable: false }),
  isflexible: new fields.BooleanField({ required: true, nullable: false }),
  $idkey: new fields.StringField({ required: true, nullable: false }),
}

type GCALayerItemSchema = typeof gcaLayerItemSchema

/* ---------------------------------------- */

class GCAOrderedLayers extends DataModel<GCAOrderedLayersSchema> {
  static override defineSchema(): GCAOrderedLayersSchema {
    return gcaOrderedLayersSchema
  }
}

const gcaOrderedLayersSchema = {
  layeritem: new fields.ArrayField(new fields.EmbeddedDataField(GCALayerItem), { required: true, nullable: false }),
  $count: new fields.NumberField({ required: true, nullable: false }),
}

type GCAOrderedLayersSchema = typeof gcaOrderedLayersSchema

/* ---------------------------------------- */

class GCACategory extends DataModel<GCACategorySchema> {
  static override defineSchema(): GCACategorySchema {
    return gcaCategorySchema
  }
}

const gcaCategorySchema = {
  name: new fields.StringField({ required: true, nullable: false }),
  code: new fields.StringField({ required: true, nullable: true }),
  itemtype: new fields.StringField({ required: true, nullable: false }),
}

type GCACategorySchema = typeof gcaCategorySchema

/* ---------------------------------------- */

class GCACategoriesBlock extends DataModel<GCACategoriesBlockSchema> {
  static override defineSchema(): GCACategoriesBlockSchema {
    return gcaCategoriesBlockSchema
  }
}

const gcaCategoriesBlockSchema = {
  category: new fields.ArrayField(new fields.EmbeddedDataField(GCACategory), { required: true, nullable: false }),
  $count: new fields.NumberField({ required: true, nullable: false }),
}

type GCACategoriesBlockSchema = typeof gcaCategoriesBlockSchema

/* ---------------------------------------- */

class GCAModifier extends DataModel<GCAModifierSchema> {
  static override defineSchema(): GCAModifierSchema {
    return gcaModifierSchema
  }
}

const gcaModifierSchema = {
  name: new fields.StringField({ required: true, nullable: false }),
  nameext: new fields.StringField({ required: true, nullable: true }),
  group: new fields.StringField({ required: true, nullable: false }),
  cost: new fields.StringField({ required: true, nullable: false }),
  formula: new fields.StringField({ required: true, nullable: true }),
  forceformula: new fields.StringField({ required: true, nullable: true }),
  level: new fields.NumberField({ required: true, nullable: false }),
  premodsvalue: new fields.StringField({ required: true, nullable: false }),
  value: new fields.StringField({ required: true, nullable: false }),
  valuenum: new fields.NumberField({ required: true, nullable: false }),

  gives: new fields.StringField({ required: true, nullable: true }),
  conditional: new fields.StringField({ required: true, nullable: true }),
  round: new fields.StringField({ required: true, nullable: true }),
  shortname: new fields.StringField({ required: true, nullable: true }),
  page: new fields.StringField({ required: true, nullable: true }),
  mods: new fields.StringField({ required: true, nullable: true }),
  tier: new fields.StringField({ required: true, nullable: true }),
  upto: new fields.StringField({ required: true, nullable: true }),
  levelnames: new fields.StringField({ required: true, nullable: true }),

  extended: new fields.EmbeddedDataField(GCAExtendedTagsBlock, { required: true, nullable: true }),

  // NOTE: This should be fields.EmbeddedDataField<GCAModifiersBlock> but that would be a cicrular reference.
  // TODO: Find a way to fix this.
  modifiers: new fields.ObjectField({ required: true, nullable: true }),
  bonuses: new fields.EmbeddedDataField(GCABonusesBlock, { required: true, nullable: true }),
  conditionals: new fields.EmbeddedDataField(GCAMessagesBlock, { required: true, nullable: true }),

  $idkey: new fields.StringField({ required: true, nullable: false }),
}

type GCAModifierSchema = typeof gcaModifierSchema

/* ---------------------------------------- */

class GCAModifiersBlock extends DataModel<GCAModifiersBlockSchema> {
  static override defineSchema(): GCAModifiersBlockSchema {
    return gcaModifiersBlockSchema
  }
}

const gcaModifiersBlockSchema = {
  modifier: new fields.ArrayField(new fields.EmbeddedDataField(GCAModifier), { required: true, nullable: false }),
  $count: new fields.NumberField({ required: true, nullable: false }),
}

type GCAModifiersBlockSchema = typeof gcaModifiersBlockSchema

/* ---------------------------------------- */

class GCAAttackMode extends DataModel<GCAAttackModeSchema> {
  static override defineSchema(): GCAAttackModeSchema {
    return gcaAttackModeSchema
  }
}

const gcaAttackModeSchema = {
  name: new fields.StringField({ required: true, nullable: true }),

  acc: new fields.StringField({ required: true, nullable: true }),
  armordivisor: new fields.StringField({ required: true, nullable: true }),
  break: new fields.StringField({ required: true, nullable: true }),
  bulk: new fields.StringField({ required: true, nullable: true }),
  damage: new fields.StringField({ required: true, nullable: true }),
  damtype: new fields.StringField({ required: true, nullable: true }),
  dmg: new fields.StringField({ required: true, nullable: true }),
  lc: new fields.StringField({ required: true, nullable: true }),
  minst: new fields.StringField({ required: true, nullable: true }),
  notes: new fields.StringField({ required: true, nullable: true }),
  parry: new fields.StringField({ required: true, nullable: true }),
  rangehalfdam: new fields.StringField({ required: true, nullable: true }),
  rangemax: new fields.StringField({ required: true, nullable: true }),
  radius: new fields.StringField({ required: true, nullable: true }),
  rcl: new fields.StringField({ required: true, nullable: true }),
  reach: new fields.StringField({ required: true, nullable: true }),
  rof: new fields.StringField({ required: true, nullable: true }),
  shots: new fields.StringField({ required: true, nullable: true }),
  skillused: new fields.StringField({ required: true, nullable: true }),
  stcap: new fields.StringField({ required: true, nullable: true }),

  damagebasedon: new fields.StringField({ required: true, nullable: true }),
  minstbasedon: new fields.StringField({ required: true, nullable: true }),
  reachbasedon: new fields.StringField({ required: true, nullable: true }),
  damageistext: new fields.StringField({ required: true, nullable: true }),

  characc: new fields.StringField({ required: true, nullable: true }),
  chararmordivisor: new fields.StringField({ required: true, nullable: true }),
  charbreak: new fields.StringField({ required: true, nullable: true }),
  charbulk: new fields.StringField({ required: true, nullable: true }),
  chardamage: new fields.StringField({ required: true, nullable: true }),
  chardamtype: new fields.StringField({ required: true, nullable: true }),
  chareffectivest: new fields.StringField({ required: true, nullable: true }),
  charminst: new fields.StringField({ required: true, nullable: true }),
  charparry: new fields.StringField({ required: true, nullable: true }),
  charparryscore: new fields.StringField({ required: true, nullable: true }),
  charradius: new fields.StringField({ required: true, nullable: true }),
  charrangehalfdam: new fields.StringField({ required: true, nullable: true }),
  charrangemax: new fields.StringField({ required: true, nullable: true }),
  charrcl: new fields.StringField({ required: true, nullable: true }),
  charreach: new fields.StringField({ required: true, nullable: true }),
  charrof: new fields.StringField({ required: true, nullable: true }),
  charshots: new fields.StringField({ required: true, nullable: true }),
  charskillscore: new fields.StringField({ required: true, nullable: true }),
  charskillused: new fields.StringField({ required: true, nullable: true }),

  itemnotes: new fields.StringField({ required: true, nullable: true }),
}

type GCAAttackModeSchema = typeof gcaAttackModeSchema

/* ---------------------------------------- */

class GCAAttackModesBlock extends DataModel<GCAAttackModesBlockSchema> {
  static override defineSchema(): GCAAttackModesBlockSchema {
    return gcaAttackModesBlockSchema
  }
}

const gcaAttackModesBlockSchema = {
  attackmode: new fields.ArrayField(new fields.EmbeddedDataField(GCAAttackMode), { required: true, nullable: false }),
  $count: new fields.NumberField({ required: true, nullable: false }),
}

type GCAAttackModesBlockSchema = typeof gcaAttackModesBlockSchema

/* ---------------------------------------- */

class GCATrait extends DataModel<GCATraitSchema> {
  static override defineSchema(): GCATraitSchema {
    return gcaTraitSchema
  }
}

const gcaTraitSchema = {
  name: new fields.StringField({ required: true, nullable: false }),
  nameext: new fields.StringField({ required: true, nullable: true }),
  symbol: new fields.StringField({ required: true, nullable: true }),
  parentkey: new fields.StringField({ required: true, nullable: true }),
  childkeylist: new fields.StringField({ required: true, nullable: true }),
  cat: new fields.StringField({ required: true, nullable: true }),
  tl: new fields.StringField({ required: true, nullable: true }),
  bonuslist: new fields.StringField({ required: true, nullable: true }),
  conditionallist: new fields.StringField({ required: true, nullable: true }),
  needscheck: new fields.BooleanField({ required: true, nullable: true }),
  taboofailed: new fields.BooleanField({ required: true, nullable: true }),
  points: new fields.NumberField({ required: true, nullable: true }),
  score: new fields.NumberField({ required: true, nullable: true }),
  type: new fields.StringField({ required: true, nullable: true }),
  level: new fields.NumberField({ required: true, nullable: true }),
  step: new fields.StringField({ required: true, nullable: true }),
  stepoff: new fields.StringField({ required: true, nullable: true }),
  cost: new fields.NumberField({ required: true, nullable: true }),
  count: new fields.NumberField({ required: true, nullable: true }),
  weight: new fields.NumberField({ required: true, nullable: true }),
  parrylevel: new fields.NumberField({ required: true, nullable: true }),
  blocklevel: new fields.NumberField({ required: true, nullable: true }),
  hide: new fields.StringField({ required: true, nullable: true }),
  locked: new fields.StringField({ required: true, nullable: true }),

  calcs: new fields.SchemaField(
    {
      cost: new fields.StringField({ required: true, nullable: true }),
      sd: new fields.StringField({ required: true, nullable: true }),
      deflevel: new fields.StringField({ required: true, nullable: true }),
      deffrom: new fields.StringField({ required: true, nullable: true }),
      deffromid: new fields.StringField({ required: true, nullable: true }),
      pointmult: new fields.StringField({ required: true, nullable: true }),
      levelmult: new fields.StringField({ required: true, nullable: true }),
      syslevels: new fields.StringField({ required: true, nullable: true }),
      bonuslevels: new fields.StringField({ required: true, nullable: true }),
      extralevels: new fields.StringField({ required: true, nullable: true }),
      baselevel: new fields.StringField({ required: true, nullable: true }),
      basepoints: new fields.StringField({ required: true, nullable: true }),
      multpoints: new fields.StringField({ required: true, nullable: true }),
      apppoints: new fields.StringField({ required: true, nullable: true }),
      premodspoints: new fields.StringField({ required: true, nullable: true }),

      preformulacost: new fields.StringField({ required: true, nullable: true }),
      preformulaweight: new fields.StringField({ required: true, nullable: true }),
      postformulacost: new fields.StringField({ required: true, nullable: true }),
      postformulaweight: new fields.StringField({ required: true, nullable: true }),
      prechildrencost: new fields.StringField({ required: true, nullable: true }),
      prechildrenweight: new fields.StringField({ required: true, nullable: true }),

      childpoints: new fields.StringField({ required: true, nullable: true }),
      baseapppoints: new fields.StringField({ required: true, nullable: true }),
      defpoints: new fields.StringField({ required: true, nullable: true }),
      extrapoints: new fields.StringField({ required: true, nullable: true }),
      basecost: new fields.StringField({ required: true, nullable: true }),
      baseweight: new fields.StringField({ required: true, nullable: true }),
      childrencost: new fields.StringField({ required: true, nullable: true }),
      childrenweights: new fields.StringField({ required: true, nullable: true }),
      precountcost: new fields.StringField({ required: true, nullable: true }),
      precountweight: new fields.StringField({ required: true, nullable: true }),
      premodscost: new fields.StringField({ required: true, nullable: true }),
      basevalue: new fields.StringField({ required: true, nullable: true }),
      maxscore: new fields.StringField({ required: true, nullable: true }),
      minscore: new fields.StringField({ required: true, nullable: true }),
      up: new fields.StringField({ required: true, nullable: true }),
      down: new fields.StringField({ required: true, nullable: true }),
      step: new fields.StringField({ required: true, nullable: true }),
      round: new fields.StringField({ required: true, nullable: true }),
      basescore: new fields.StringField({ required: true, nullable: true }),
      parryat: new fields.StringField({ required: true, nullable: true }),
      blockat: new fields.StringField({ required: true, nullable: true }),
      upto: new fields.StringField({ required: true, nullable: true }),
      downto: new fields.StringField({ required: true, nullable: true }),
      levelnames: new fields.StringField({ required: true, nullable: true }),
    },
    { required: true, nullable: false }
  ),

  weaponmodesdata: new fields.SchemaField(
    {
      mode: new fields.StringField({ required: true, nullable: true }),
      damage: new fields.StringField({ required: true, nullable: true }),
      damtype: new fields.StringField({ required: true, nullable: true }),
      dmg: new fields.StringField({ required: true, nullable: true }),
      reach: new fields.StringField({ required: true, nullable: true }),
      parry: new fields.StringField({ required: true, nullable: true }),
      minst: new fields.StringField({ required: true, nullable: true }),
      skillused: new fields.StringField({ required: true, nullable: true }),
      acc: new fields.StringField({ required: true, nullable: true }),
      rangehalfdam: new fields.StringField({ required: true, nullable: true }),
      rangemax: new fields.StringField({ required: true, nullable: true }),
      rof: new fields.StringField({ required: true, nullable: true }),
      rcl: new fields.StringField({ required: true, nullable: true }),
      shots: new fields.StringField({ required: true, nullable: true }),
      armordivisor: new fields.StringField({ required: true, nullable: true }),
      break: new fields.StringField({ required: true, nullable: true }),
      radius: new fields.StringField({ required: true, nullable: true }),
      bulk: new fields.StringField({ required: true, nullable: true }),
      damagebasedon: new fields.StringField({ required: true, nullable: true }),
      minstbasedon: new fields.StringField({ required: true, nullable: true }),
      reachbasedon: new fields.StringField({ required: true, nullable: true }),
      damageistext: new fields.StringField({ required: true, nullable: true }),

      calcrange: new fields.StringField({ required: true, nullable: true }),
      chardamage: new fields.StringField({ required: true, nullable: true }),
      chardamtype: new fields.StringField({ required: true, nullable: true }),
      charreach: new fields.StringField({ required: true, nullable: true }),
      charparry: new fields.StringField({ required: true, nullable: true }),
      charminst: new fields.StringField({ required: true, nullable: true }),
      charskillused: new fields.StringField({ required: true, nullable: true }),
      charskillscore: new fields.StringField({ required: true, nullable: true }),
      charparryscore: new fields.StringField({ required: true, nullable: true }),
      characc: new fields.StringField({ required: true, nullable: true }),
      charrangehalfdam: new fields.StringField({ required: true, nullable: true }),
      charrangemax: new fields.StringField({ required: true, nullable: true }),
      charrof: new fields.StringField({ required: true, nullable: true }),
      charrcl: new fields.StringField({ required: true, nullable: true }),
      charshots: new fields.StringField({ required: true, nullable: true }),
      chararmordivisor: new fields.StringField({ required: true, nullable: true }),
      charbreak: new fields.StringField({ required: true, nullable: true }),
      charradius: new fields.StringField({ required: true, nullable: true }),
      chareffectivest: new fields.StringField({ required: true, nullable: true }),

      charbulk: new fields.StringField({ required: true, nullable: true }),
      stcap: new fields.StringField({ required: true, nullable: true }),
    },
    { required: true, nullable: true }
  ),

  armordata: new fields.SchemaField(
    {
      dr: new fields.StringField({ required: true, nullable: true }),
      chardr: new fields.StringField({ required: true, nullable: true }),
      db: new fields.StringField({ required: true, nullable: true }),
      chardb: new fields.StringField({ required: true, nullable: true }),

      chardeflect: new fields.NumberField({ required: true, nullable: true }),
      charfortify: new fields.NumberField({ required: true, nullable: true }),

      location: new fields.StringField({ required: true, nullable: true }),

      coverage: new fields.StringField({ required: true, nullable: true }),
      charlocation: new fields.StringField({ required: true, nullable: true }),
      locationcoverage: new fields.StringField({ required: true, nullable: true }),

      aa: new fields.StringField({ required: true, nullable: true }),
    },
    { required: true, nullable: true }
  ),

  ref: new fields.SchemaField(
    {
      basedon: new fields.StringField({ required: true, nullable: true }),
      page: new fields.StringField({ required: true, nullable: true }),
      itemnotes: new fields.StringField({ required: true, nullable: true }),
      usernotes: new fields.StringField({ required: true, nullable: true }),
      familiarities: new fields.StringField({ required: true, nullable: true }),
      notes: new fields.StringField({ required: true, nullable: true }),
      description: new fields.StringField({ required: true, nullable: true }),

      units: new fields.StringField({ required: true, nullable: true }),

      shortcat: new fields.StringField({ required: true, nullable: true }),
      prereqcount: new fields.NumberField({ required: true, nullable: true }),
      magery: new fields.StringField({ required: true, nullable: true }),
      class: new fields.StringField({ required: true, nullable: true }),
      time: new fields.StringField({ required: true, nullable: true }),
      duration: new fields.StringField({ required: true, nullable: true }),
      castingcost: new fields.StringField({ required: true, nullable: true }),

      needs: new fields.StringField({ required: true, nullable: true }),
      gives: new fields.StringField({ required: true, nullable: true }),
      conditional: new fields.StringField({ required: true, nullable: true }),
      taboo: new fields.StringField({ required: true, nullable: true }),
      default: new fields.StringField({ required: true, nullable: true }),
      mods: new fields.StringField({ required: true, nullable: true }),
      initmods: new fields.StringField({ required: true, nullable: true }),
      techlvl: new fields.StringField({ required: true, nullable: true }),
      load: new fields.StringField({ required: true, nullable: true }),
      lc: new fields.StringField({ required: true, nullable: true }),
      ndl: new fields.StringField({ required: true, nullable: true }),

      highlight: new fields.StringField({ required: true, nullable: true }),
      highlightme: new fields.StringField({ required: true, nullable: true }),
      hideme: new fields.StringField({ required: true, nullable: true }),
      collapse: new fields.StringField({ required: true, nullable: true }),
      collapseme: new fields.StringField({ required: true, nullable: true }),

      keep: new fields.StringField({ required: true, nullable: true }),
      owned: new fields.StringField({ required: true, nullable: true }),
      locked: new fields.StringField({ required: true, nullable: true }),
      owns: new fields.StringField({ required: true, nullable: true }),
      pkids: new fields.StringField({ required: true, nullable: true }),

      gms: new fields.StringField({ required: true, nullable: true }),
      mainwin: new fields.StringField({ required: true, nullable: true }),
      display: new fields.StringField({ required: true, nullable: true }),
      isparent: new fields.StringField({ required: true, nullable: true }),
      noresync: new fields.StringField({ required: true, nullable: true }),
      disadat: new fields.StringField({ required: true, nullable: true }),

      appliedsymbols: new fields.StringField({ required: true, nullable: true }),
    },
    { required: true, nullable: true }
  ),

  attackmodes: new fields.EmbeddedDataField(GCAAttackModesBlock, { required: true, nullable: true }),

  extended: new fields.EmbeddedDataField(GCAExtendedTagsBlock, { required: true, nullable: true }),

  modifiers: new fields.EmbeddedDataField(GCAModifiersBlock, { required: true, nullable: true }),
  bonuses: new fields.EmbeddedDataField(GCABonusesBlock, { required: true, nullable: true }),
  conditionals: new fields.EmbeddedDataField(GCABonusesBlock, { required: true, nullable: true }),

  $type: new fields.StringField({ required: true, nullable: true }),
  $idkey: new fields.StringField({ required: true, nullable: false }),
}

type GCATraitSchema = typeof gcaTraitSchema

/* ---------------------------------------- */

class GCACharacter extends DataModel<GCACharacterSchema> {
  static override defineSchema(): GCACharacterSchema {
    return gcaCharacterSchema
  }

  /* ---------------------------------------- */

  static fromXML(xml: HTMLElement): GCACharacter {
    const data: Partial<DataModel.CreateData<GCACharacterSchema>> = {}

    data.author = ((node: HTMLElement) => {
      return {
        name: node.getElementsByTagName('name')[0]?.textContent ?? null,
        version: node.getElementsByTagName('version')[0]?.textContent ?? null,
        copyright: node.getElementsByTagName('copyright')[0]?.textContent ?? null,
        datecreated: node.getElementsByTagName('datecreated')[0]?.textContent ?? null,
      }
    })(xml.getElementsByTagName('author')[0] as HTMLElement)

    data.system = ((node: HTMLElement) => {
      return {
        version: node.getElementsByTagName('version')[0]?.textContent ?? null,
        lastkey: parseInt(node.getElementsByTagName('lastkey')[0]?.textContent ?? '0', 10),
      }
    })(xml.getElementsByTagName('system')[0] as HTMLElement)

    data.library = ((node: HTMLElement) => {
      return {
        name: node.getElementsByTagName('name')[0]?.textContent ?? null,
        book: Array.from(node.getElementsByTagName('book')).map(book => book.textContent ?? ''),
      }
    })(xml.getElementsByTagName('library')[0] as HTMLElement)

    data.settings = ((node: HTMLElement) => {
      return {
        ruleof: parseInt(node.getElementsByTagName('ruleof')[0]?.textContent ?? '0'),
        globalruleof: parseInt(node.getElementsByTagName('globalruleof')[0]?.textContent ?? '0'),
        modmultpercents: parseInt(node.getElementsByTagName('modmultpercents')[0]?.textContent ?? '0'),
        usediceaddsconversion: parseInt(node.getElementsByTagName('usediceaddsconversion')[0]?.textContent ?? '0'),
        allownoniqoptspecs: parseInt(node.getElementsByTagName('allownoniqoptspecs')[0]?.textContent ?? '0'),
        allowstackingdeflect: parseInt(node.getElementsByTagName('allowstackingdeflect')[0]?.textContent ?? '0'),
        allowstackingforitfy: parseInt(node.getElementsByTagName('allowstackingforitfy')[0]?.textContent ?? '0'),
        inplay: parseInt(node.getElementsByTagName('inplay')[0]?.textContent ?? '0'),
        showcharactertraitsymbols: parseInt(
          node.getElementsByTagName('showcharactertraitsymbols')[0]?.textContent ?? '0'
        ),

        rendernonloadoutitemsinactive: parseInt(
          node.getElementsByTagName('rendernonloadoutitemsinactive')[0]?.textContent ?? '0'
        ),
        grayoutinactiveitems: parseInt(node.getElementsByTagName('grayoutinactiveitems')[0]?.textContent ?? '0'),

        includeunasigneditemsincurrentloadout: parseInt(
          node.getElementsByTagName('includeunasigneditemsincurrentloadout')[0]?.textContent ?? '0'
        ),

        nodefaultleveldiscount: parseInt(node.getElementsByTagName('nodefaultleveldiscount')[0]?.textContent ?? '0'),

        allowusertraitordering: parseInt(node.getElementsByTagName('allowusertraitordering')[0]?.textContent ?? '0'),

        traitgrouping: GCATraitGroupingBlock.fromXML(node.getElementsByTagName('traitgrouping')[0] as HTMLElement),
      }
    })(xml.getElementsByTagName('settings')[0] as HTMLElement)

    data.name = xml.getElementsByTagName('name')[0]?.textContent ?? ''
    data.player = Array.from(xml.getElementsByTagName('player')).map(player => player.textContent ?? '')
    data.bodytype = xml.getElementsByTagName('bodytype')[0]?.textContent ?? null
    data.bodyimagefile = xml.getElementsByTagName('bodyimagefile')[0]?.textContent ?? null
    // TODO: Handle base64 image data properly
    data.bodyimage = null
    data.currentloadout = xml.getElementsByTagName('currentloadout')[0]?.textContent ?? ''
    data.currenttransform = xml.getElementsByTagName('currenttransform')[0]?.textContent ?? null

    data.output = ((node: HTMLElement) => {
      return {
        sheetviewsheet: node.getElementsByTagName('sheetviewsheet')[0]?.textContent ?? null,
        charactersheet: node.getElementsByTagName('charactersheet')[0]?.textContent ?? null,
        altcharactersheet: Array.from(node.getElementsByTagName('altcharactersheet')).map(
          sheet => sheet.textContent ?? ''
        ),
        exportsheet: node.getElementsByTagName('exportsheet')[0]?.textContent ?? null,
        altexportsheet: Array.from(node.getElementsByTagName('altexportsheet')).map(sheet => sheet.textContent ?? ''),
      }
    })(xml.getElementsByTagName('output')[0] as HTMLElement)

    data.vitals = ((node: HTMLElement) => {
      return {
        race: node.getElementsByTagName('race')[0]?.textContent ?? null,
        height: node.getElementsByTagName('height')[0]?.textContent ?? null,
        weight: node.getElementsByTagName('weight')[0]?.textContent ?? null,
        age: node.getElementsByTagName('age')[0]?.textContent ?? null,
        appearance: node.getElementsByTagName('appearance')[0]?.textContent ?? null,
        portraitfile: node.getElementsByTagName('portraitfile')[0]?.textContent ?? null,
        // TODO: Handle base64 image data properly
        portraitimage: null,
      }
    })(xml.getElementsByTagName('vitals')[0] as HTMLElement)

    data.basicdefense = ((node: HTMLElement) => {
      return {
        parryidkey: parseInt(node.getElementsByTagName('parryidkey')[0]?.textContent ?? '0'),
        parryusing: node.getElementsByTagName('parryusing')[0]?.textContent ?? '',
        parryscore: parseInt(node.getElementsByTagName('parryscore')[0]?.textContent ?? '0'),
        blockidkey: parseInt(node.getElementsByTagName('blockidkey')[0]?.textContent ?? '0'),
        blockusing: node.getElementsByTagName('blockusing')[0]?.textContent ?? '',
        blockscore: parseInt(node.getElementsByTagName('blockscore')[0]?.textContent ?? '0'),
      }
    })(xml.getElementsByTagName('basicdefense')[0] as HTMLElement)

    data.description = xml.getElementsByTagName('description')[0]?.textContent ?? null
    data.notes = xml.getElementsByTagName('notes')[0]?.textContent ?? null

    // data.body = GCABody.fromXML(xml.getElementsByTagName('body')[0] as HTMLElement)
    //
    // data.tags = GCAExtendedTagsBlock.fromXML(xml.getElementsByTagName('tags')[0] as HTMLElement)
    // data.messages = GCAMessagesBlock.fromXML(xml.getElementsByTagName('messages')[0] as HTMLElement)

    return new this(data, { strict: false })
  }
}

const gcaCharacterSchema = {
  author: new fields.SchemaField(
    {
      name: new fields.StringField({ required: true, nullable: true }),
      version: new fields.StringField({ required: true, nullable: true }),
      copyright: new fields.StringField({ required: true, nullable: true }),
      datecreated: new fields.StringField({ required: true, nullable: true }),
    },
    { required: true, nullable: true }
  ),

  system: new fields.SchemaField(
    {
      version: new fields.StringField({ required: true, nullable: false }),
      lastkey: new fields.NumberField({ required: true, nullable: false }),
    },
    { required: true, nullable: false }
  ),

  library: new fields.SchemaField(
    {
      name: new fields.StringField({ required: true, nullable: false }),
      book: new fields.ArrayField(new fields.StringField({ required: true, nullable: false })),
    },
    { required: true, nullable: true }
  ),

  settings: new fields.SchemaField(
    {
      ruleof: new fields.NumberField({ required: true, nullable: true }),
      globalruleof: new fields.NumberField({ required: true, nullable: true }),
      modmultpercents: new fields.NumberField({ required: true, nullable: true }),
      usediceaddsconversion: new fields.NumberField({ required: true, nullable: true }),
      allownoniqoptspecs: new fields.NumberField({ required: true, nullable: true }),
      allowstackingdeflect: new fields.NumberField({ required: true, nullable: true }),
      allowstackingforitfy: new fields.NumberField({ required: true, nullable: true }),
      inplay: new fields.NumberField({ required: true, nullable: true }),
      showcharactertraitsymbols: new fields.NumberField({ required: true, nullable: true }),

      rendernonloadoutitemsinactive: new fields.NumberField({ required: true, nullable: true }),
      grayoutinactiveitems: new fields.NumberField({ required: true, nullable: true }),

      includeunasigneditemsincurrentloadout: new fields.NumberField({ required: true, nullable: true }),

      nodefaultleveldiscount: new fields.NumberField({ required: true, nullable: true }),

      allowusertraitordering: new fields.NumberField({ required: true, nullable: true }),

      traitgrouping: new fields.EmbeddedDataField(GCATraitGroupingBlock, { required: true, nullable: true }),
    },
    { required: true, nullable: true }
  ),

  name: new fields.StringField({ required: true, nullable: false }),
  player: new fields.ArrayField(new fields.StringField({ required: true, nullable: true })),
  bodytype: new fields.StringField({ required: true, nullable: true }),
  bodyimagefile: new fields.StringField({ required: true, nullable: true }),
  bodyimage: new fields.StringField({ required: true, nullable: true }),
  currentloadout: new fields.StringField({ required: true, nullable: false }),
  currenttransform: new fields.StringField({ required: true, nullable: true }),

  output: new fields.SchemaField(
    {
      sheetviewsheet: new fields.StringField({ required: true, nullable: true }),
      charactersheet: new fields.StringField({ required: true, nullable: true }),
      altcharactersheet: new fields.ArrayField(new fields.StringField({ required: true, nullable: true })),
      exportsheet: new fields.StringField({ required: true, nullable: true }),
      altexportsheet: new fields.ArrayField(new fields.StringField({ required: true, nullable: true })),
    },
    { required: true, nullable: true }
  ),

  vitals: new fields.SchemaField(
    {
      race: new fields.StringField({ required: true, nullable: true }),
      height: new fields.StringField({ required: true, nullable: true }),
      weight: new fields.StringField({ required: true, nullable: true }),
      age: new fields.StringField({ required: true, nullable: true }),
      appearance: new fields.StringField({ required: true, nullable: true }),
      portraitfile: new fields.StringField({ required: true, nullable: true }),
      // base64 encoded image data
      portraitimage: new fields.StringField({ required: true, nullable: true }),
    },
    { required: true, nullable: true }
  ),

  basicdefense: new fields.SchemaField(
    {
      parryidkey: new fields.NumberField({ required: true, nullable: false }),
      parryusing: new fields.StringField({ required: true, nullable: false }),
      parryscore: new fields.NumberField({ required: true, nullable: false }),
      blockidkey: new fields.NumberField({ required: true, nullable: false }),
      blockusing: new fields.StringField({ required: true, nullable: false }),
      blockscore: new fields.NumberField({ required: true, nullable: false }),
    },
    { required: true, nullable: true }
  ),

  description: new fields.StringField({ required: true, nullable: true }),
  notes: new fields.StringField({ required: true, nullable: true }),

  body: new fields.EmbeddedDataField(GCABody, { required: true, nullable: true }),

  tags: new fields.EmbeddedDataField(GCAExtendedTagsBlock, { required: true, nullable: true }),
  messages: new fields.EmbeddedDataField(GCAMessagesBlock, { required: true, nullable: true }),

  traits: new fields.SchemaField(
    {
      attributes: new fields.SchemaField(
        {
          trait: new fields.ArrayField(new fields.EmbeddedDataField(GCATrait), { required: true, nullable: false }),
          $count: new fields.NumberField({ required: true, nullable: false }),
        },
        { required: true, nullable: false }
      ),
      cultures: new fields.SchemaField(
        {
          trait: new fields.ArrayField(new fields.EmbeddedDataField(GCATrait), { required: true, nullable: false }),
          $count: new fields.NumberField({ required: true, nullable: false }),
        },
        { required: true, nullable: false }
      ),
      languages: new fields.SchemaField(
        {
          trait: new fields.ArrayField(new fields.EmbeddedDataField(GCATrait), { required: true, nullable: false }),
          $count: new fields.NumberField({ required: true, nullable: false }),
        },
        { required: true, nullable: false }
      ),
      advantages: new fields.SchemaField(
        {
          trait: new fields.ArrayField(new fields.EmbeddedDataField(GCATrait), { required: true, nullable: false }),
          $count: new fields.NumberField({ required: true, nullable: false }),
        },
        { required: true, nullable: false }
      ),
      disadvantages: new fields.SchemaField(
        {
          trait: new fields.ArrayField(new fields.EmbeddedDataField(GCATrait), { required: true, nullable: false }),
          $count: new fields.NumberField({ required: true, nullable: false }),
        },
        { required: true, nullable: false }
      ),
      quirks: new fields.SchemaField(
        {
          trait: new fields.ArrayField(new fields.EmbeddedDataField(GCATrait), { required: true, nullable: false }),
          $count: new fields.NumberField({ required: true, nullable: false }),
        },
        { required: true, nullable: false }
      ),
      perks: new fields.SchemaField(
        {
          trait: new fields.ArrayField(new fields.EmbeddedDataField(GCATrait), { required: true, nullable: false }),
          $count: new fields.NumberField({ required: true, nullable: false }),
        },
        { required: true, nullable: false }
      ),
      features: new fields.SchemaField(
        {
          trait: new fields.ArrayField(new fields.EmbeddedDataField(GCATrait), { required: true, nullable: false }),
          $count: new fields.NumberField({ required: true, nullable: false }),
        },
        { required: true, nullable: true }
      ),
      skills: new fields.SchemaField(
        {
          trait: new fields.ArrayField(new fields.EmbeddedDataField(GCATrait), { required: true, nullable: false }),
          $count: new fields.NumberField({ required: true, nullable: false }),
        },
        { required: true, nullable: false }
      ),
      spells: new fields.SchemaField(
        {
          trait: new fields.ArrayField(new fields.EmbeddedDataField(GCATrait), { required: true, nullable: false }),
          $count: new fields.NumberField({ required: true, nullable: false }),
        },
        { required: true, nullable: false }
      ),
      equipment: new fields.SchemaField(
        {
          trait: new fields.ArrayField(new fields.EmbeddedDataField(GCATrait), { required: true, nullable: false }),
          $count: new fields.NumberField({ required: true, nullable: false }),
        },
        { required: true, nullable: false }
      ),
      templates: new fields.SchemaField(
        {
          trait: new fields.ArrayField(new fields.EmbeddedDataField(GCATrait), { required: true, nullable: false }),
          $count: new fields.NumberField({ required: true, nullable: false }),
        },
        { required: true, nullable: false }
      ),
    },
    { required: true, nullable: false }
  ),

  loadouts: new fields.SchemaField(
    {
      loadout: new fields.ArrayField(
        new fields.SchemaField({
          name: new fields.StringField({ required: true, nullable: false }),
          weight: new fields.NumberField({ required: true, nullable: false }),
          shielddb: new fields.NumberField({ required: true, nullable: false }),
          hexmask: new fields.StringField({ required: true, nullable: false }),
          alwaysautocalcarmor: new fields.StringField({ required: true, nullable: true }),
          userorderedlayers: new fields.StringField({ required: true, nullable: true }),

          facingdb: new fields.SchemaField({
            leftlank: new fields.NumberField({ required: true, nullable: false }),
            leftfront: new fields.NumberField({ required: true, nullable: false }),
            centerfront: new fields.NumberField({ required: true, nullable: false }),
            rightfront: new fields.NumberField({ required: true, nullable: false }),
            rightflank: new fields.NumberField({ required: true, nullable: false }),
            rightrear: new fields.NumberField({ required: true, nullable: false }),
          }),

          items: new fields.SchemaField({
            item: new fields.ArrayField(
              new fields.SchemaField({
                name: new fields.StringField({ required: true, nullable: false }),
                $idkey: new fields.NumberField({ required: true, nullable: false }),
              }),
              { required: true, nullable: false }
            ),
            $count: new fields.NumberField({ required: true, nullable: false }),
          }),

          armoritems: new fields.SchemaField({
            item: new fields.ArrayField(
              new fields.SchemaField({
                name: new fields.StringField({ required: true, nullable: false }),
                $idkey: new fields.NumberField({ required: true, nullable: false }),
              })
            ),
            $count: new fields.NumberField({ required: true, nullable: false }),
          }),

          shielditems: new fields.SchemaField({
            item: new fields.ArrayField(
              new fields.SchemaField({
                name: new fields.StringField({ required: true, nullable: false }),
                shieldarc: new fields.StringField({ required: true, nullable: false }),
                $idkey: new fields.NumberField({ required: true, nullable: false }),
              })
            ),
            $count: new fields.NumberField({ required: true, nullable: false }),
          }),

          orderedlayers: new fields.EmbeddedDataField(GCAOrderedLayers, { required: true, nullable: true }),

          body: new fields.EmbeddedDataField(GCABody, { required: true, nullable: true }),
        }),
        { required: true, nullable: false }
      ),

      $count: new fields.NumberField({ required: true, nullable: false }),
    },
    { required: true, nullable: false }
  ),

  transforms: new fields.SchemaField(
    {
      transform: new fields.ArrayField(
        new fields.SchemaField({
          name: new fields.StringField({ required: true, nullable: false }),
          points: new fields.NumberField({ required: true, nullable: false }),
          items: new fields.SchemaField({
            item: new fields.ArrayField(
              new fields.SchemaField({
                name: new fields.StringField({ required: true, nullable: false }),
                $idkey: new fields.NumberField({ required: true, nullable: false }),
              }),
              { required: true, nullable: false }
            ),
            $count: new fields.NumberField({ required: true, nullable: false }),
          }),
        }),
        { required: true, nullable: true }
      ),

      $count: new fields.NumberField({ required: true, nullable: false }),
    },
    { required: true, nullable: true }
  ),

  campaign: new fields.SchemaField({
    name: new fields.StringField({ required: true, nullable: false }),
    basetl: new fields.NumberField({ required: true, nullable: false }),
    basepoints: new fields.NumberField({ required: true, nullable: false }),
    disadlimit: new fields.NumberField({ required: true, nullable: false }),
    quirklimit: new fields.NumberField({ required: true, nullable: false }),
    hasdisadlimit: new fields.BooleanField({ required: true, nullable: false }),
    hasquirklimit: new fields.BooleanField({ required: true, nullable: false }),
    loggedpoints: new fields.NumberField({ required: true, nullable: false }),
    otherpoints: new fields.NumberField({ required: true, nullable: false }),
    totalpoints: new fields.NumberField({ required: true, nullable: false }),

    loggedmoney: new fields.NumberField({ required: true, nullable: true }),
    othermoney: new fields.NumberField({ required: true, nullable: true }),
    totalmoney: new fields.NumberField({ required: true, nullable: true }),

    logentries: new fields.SchemaField({
      logentry: new fields.ArrayField(
        new fields.SchemaField({
          entrydate: new fields.StringField({ required: true, nullable: false }),
          campaigndate: new fields.StringField({ required: true, nullable: false }),
          charpoints: new fields.NumberField({ required: true, nullable: false }),

          charmoney: new fields.NumberField({ required: true, nullable: true }),

          caption: new fields.StringField({ required: true, nullable: false }),
          notes: new fields.StringField({ required: true, nullable: false }),
        })
      ),

      $count: new fields.NumberField({ required: true, nullable: false }),
    }),
  }),

  basicdamages: new fields.SchemaField({
    basicdamage: new fields.ArrayField(
      new fields.SchemaField({
        st: new fields.NumberField({ required: true, nullable: false }),
        thbase: new fields.StringField({ required: true, nullable: false }),
        thadd: new fields.StringField({ required: true, nullable: false }),
        swbase: new fields.StringField({ required: true, nullable: false }),
        swadd: new fields.StringField({ required: true, nullable: false }),
      })
    ),

    $count: new fields.NumberField({ required: true, nullable: false }),
  }),

  damagebreaks: new fields.SchemaField({
    damagebreak: new fields.ArrayField(
      new fields.SchemaField({
        break: new fields.NumberField({ required: true, nullable: false }),
        adddice: new fields.NumberField({ required: true, nullable: false }),
        subtract: new fields.NumberField({ required: true, nullable: false }),
      })
    ),

    $count: new fields.NumberField({ required: true, nullable: false }),
  }),

  skilltypes: new fields.SchemaField({
    skilltype: new fields.ArrayField(
      new fields.SchemaField({
        name: new fields.StringField({ required: true, nullable: false }),
        costs: new fields.StringField({ required: true, nullable: false }),
        baseadjust: new fields.StringField({ required: true, nullable: false }),
        adds: new fields.NumberField({ required: true, nullable: false }),
        defaultstat: new fields.StringField({ required: true, nullable: false }),
        relname: new fields.StringField({ required: true, nullable: false }),
        zeropointsokay: new fields.NumberField({ required: true, nullable: false }),
        subzero: new fields.NumberField({ required: true, nullable: false }),
      })
    ),

    $count: new fields.NumberField({ required: true, nullable: false }),
  }),

  groups: new fields.SchemaField({
    group: new fields.ArrayField(
      new fields.SchemaField({
        name: new fields.StringField({ required: true, nullable: false }),

        groupitem: new fields.ArrayField(
          new fields.SchemaField({
            name: new fields.StringField({ required: true, nullable: false }),
            nameext: new fields.StringField({ required: true, nullable: false }),
            itemtype: new fields.StringField({ required: true, nullable: false }),
          })
        ),

        $count: new fields.NumberField({ required: true, nullable: false }),
      })
    ),

    $count: new fields.NumberField({ required: true, nullable: false }),
  }),

  categories: new fields.EmbeddedDataField(GCACategoriesBlock, { required: true, nullable: true }),

  symbols: new fields.EmbeddedDataField(GCASymbolsBlock, { required: true, nullable: true }),

  bonusclasses: new fields.EmbeddedDataField(GCABonusClassesBlock, { required: true, nullable: true }),
}

type GCACharacterSchema = typeof gcaCharacterSchema

/* ---------------------------------------- */

class GCA5 extends DataModel<GCA5Schema> {
  static override defineSchema(): GCA5Schema {
    return gca5Schema
  }

  /* ---------------------------------------- */

  static fromXML(xml: HTMLElement): GCA5 {
    const characters: GCACharacter[] = []
    for (const child of xml.getElementsByTagName('character')) {
      const character = GCACharacter.fromXML(child as HTMLElement)
      characters.push(character)
    }
    console.log(characters)
    return new this({ character: characters }, { strict: false })
  }
}

const gca5Schema = {
  character: new fields.ArrayField(new fields.EmbeddedDataField(GCACharacter), { required: true, nullable: false }),
}

type GCA5Schema = typeof gca5Schema

export {
  GCABonusClass,
  GCABonusClassesBlock,
  GCAGroupingOptions,
  GCATraitGroupingBlock,
  GCAFlagSymbol,
  GCASymbolsBlock,
  GCAMessage,
  GCAMessagesBlock,
  GCAUnknownTag,
  GCAExtendedTagsBlock,
  GCABonus,
  GCABonusesBlock,
  GCABodyItem,
  GCABody,
  GCALayerItem,
  GCAOrderedLayers,
  GCACategory,
  GCACategoriesBlock,
  GCAModifier,
  GCAModifiersBlock,
  GCAAttackMode,
  GCAAttackModesBlock,
  GCATrait,
  GCACharacter,
  GCA5,
}
