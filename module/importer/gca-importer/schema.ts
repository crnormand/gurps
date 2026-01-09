import { AnyMutableObject } from 'fvtt-types/utils'
import fields = foundry.data.fields
import DataModel = foundry.abstract.DataModel

/**
 * These classes use Foundry's own DataModel system for its inbuilt validation and easy translation into useful data.
 * It serves as the back-bone of native GCA5 data handling.
 *
 * Elements use the normal name found in the GCA5 .xsd schema, while attributes are prefixed with "$"
 * For elements with minOccurs set to 0, the field is set to nullable, but still remains required.
 * This lets us just deal with null values rather than undefined ones.
 *
 * The following XML element types are not implemented, because their implementation is reducible to an array of a
 * different type:
 * - GCAAttackModesBlock
 * - GCABody
 * - GCABonusClassesBlock
 * - GCABonusesBlock
 * - GCACategoriesBlock
 * - GCAExtendedTagsBlock
 * - GCAMessagesBlock
 * - GCAModifiersBlock
 * - GCAOrderedLayers
 * - GCASymbolsBlock
 * - GCATraitGroupingBlock
 */

/* ---------------------------------------- */

class GCASchemaBlock<Schema extends fields.DataSchema> extends DataModel<Schema> {
  static _primitiveFieldsFromXML<Schema extends fields.DataSchema>(
    xml: HTMLElement,
    schema: fields.SchemaField<Schema>['fields'],
    exclusions: string[] = []
  ): DataModel.CreateData<Schema> {
    const data: AnyMutableObject = {}

    Object.entries(schema).forEach(([key, field]) => {
      if (exclusions.includes(key)) return

      if (key.startsWith('$')) {
        const attribute = xml.getAttribute(key.slice(1))
        if (!attribute) return
        switch (field.constructor) {
          case fields.StringField:
            data[key] = attribute
            break
          case fields.NumberField:
            data[key] = parseFloat(attribute ?? '0')
            break
          case fields.BooleanField:
            data[key] = attribute === '1'
            break
        }
      } else {
        const element = xml.querySelector(`:scope > ${key}`)
        if (!element) return
        switch (field.constructor) {
          case fields.StringField:
            data[key] = element.textContent ?? null
            break
          case fields.NumberField:
            data[key] = parseFloat(element.textContent ?? '0')
            break
          case fields.BooleanField:
            data[key] = element.textContent === '1'
            break
        }
      }
    })

    return data as DataModel.CreateData<Schema>
  }
}

/* ---------------------------------------- */

class GCABonusClass extends GCASchemaBlock<GCABonusClassSchema> {
  static override defineSchema(): GCABonusClassSchema {
    return gcaBonusClassSchema()
  }

  /* ---------------------------------------- */

  static fromXML(xml: HTMLElement): GCABonusClass {
    const data: Partial<DataModel.CreateData<GCABonusClassSchema>> = this._primitiveFieldsFromXML(
      xml,
      this.schema.fields
    )
    return new this(data)
  }
}

const gcaBonusClassSchema = () => {
  return {
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
}

type GCABonusClassSchema = ReturnType<typeof gcaBonusClassSchema>

/* ---------------------------------------- */

class GCAGroupingOptions extends GCASchemaBlock<GCAGroupingOptionsSchema> {
  static override defineSchema(): GCAGroupingOptionsSchema {
    return gcaGroupingOptionsSchema()
  }

  /* ---------------------------------------- */

  static fromXML(xml: HTMLElement): GCAGroupingOptions {
    const data: Partial<DataModel.CreateData<GCAGroupingOptionsSchema>> = this._primitiveFieldsFromXML(
      xml,
      this.schema.fields
    )

    return new this(data)
  }
}

const gcaGroupingOptionsSchema = () => {
  return {
    traittype: new fields.StringField({ required: true, nullable: false }),
    groupingtype: new fields.StringField({ required: true, nullable: false }),
    specifiedtag: new fields.StringField({ required: true, nullable: false }),
    includetagpartinheader: new fields.BooleanField({ required: true, nullable: false }),
    specifiedvaluesonly: new fields.BooleanField({ required: true, nullable: false }),
    specifiedvalueslist: new fields.StringField({ required: true, nullable: false }),
    groupsatend: new fields.BooleanField({ required: true, nullable: false }),
  }
}
type GCAGroupingOptionsSchema = ReturnType<typeof gcaGroupingOptionsSchema>

/* ---------------------------------------- */

class GCAFlagSymbol extends GCASchemaBlock<GCAFlagSymbolSchema> {
  static override defineSchema(): GCAFlagSymbolSchema {
    return gcaFlagSymbolSchema()
  }

  /* ---------------------------------------- */

  static fromXML(xml: HTMLElement): GCAFlagSymbol {
    const data: Partial<DataModel.CreateData<GCAFlagSymbolSchema>> = this._primitiveFieldsFromXML(
      xml,
      this.schema.fields
    )
    return new this(data)
  }
}

const gcaFlagSymbolSchema = () => {
  return {
    name: new fields.StringField({ required: true, nullable: false }),
    filename: new fields.StringField({ required: true, nullable: false }),
    criteria: new fields.StringField({ required: true, nullable: false }),
    image: new fields.StringField({ required: true, nullable: false }),
  }
}

type GCAFlagSymbolSchema = ReturnType<typeof gcaFlagSymbolSchema>

/* ---------------------------------------- */

class GCAMessage extends GCASchemaBlock<GCAMessageSchema> {
  static override defineSchema(): GCAMessageSchema {
    return gcaMessageSchema()
  }

  /* ---------------------------------------- */

  static fromXML(xml: HTMLElement): GCAMessage {
    const data: Partial<DataModel.CreateData<GCAMessageSchema>> = this._primitiveFieldsFromXML(xml, this.schema.fields)
    return new this(data)
  }
}

const gcaMessageSchema = () => {
  return {
    caption: new fields.StringField({ required: true, nullable: false }),
    text: new fields.StringField({ required: true, nullable: false }),
  }
}
type GCAMessageSchema = ReturnType<typeof gcaMessageSchema>

/* ---------------------------------------- */

class GCAUnknownTag extends GCASchemaBlock<GCAUnknownTagSchema> {
  static override defineSchema(): GCAUnknownTagSchema {
    return gcaUnknownTagSchema()
  }

  /* ---------------------------------------- */

  static fromXML(xml: HTMLElement): GCAUnknownTag {
    const data: Partial<DataModel.CreateData<GCAUnknownTagSchema>> = this._primitiveFieldsFromXML(
      xml,
      this.schema.fields
    )
    return new this(data)
  }
}

const gcaUnknownTagSchema = () => {
  return {
    caption: new fields.StringField({ required: true, nullable: false }),
    text: new fields.StringField({ required: true, nullable: false }),
  }
}
type GCAUnknownTagSchema = ReturnType<typeof gcaUnknownTagSchema>

/* ---------------------------------------- */

class GCABonus extends GCASchemaBlock<GCABonusSchema> {
  static override defineSchema(): GCABonusSchema {
    return gcaBonusSchema()
  }

  /* ---------------------------------------- */

  static fromXML(xml: HTMLElement): GCABonus {
    const data: DataModel.CreateData<GCABonusSchema> = this._primitiveFieldsFromXML<GCABonusSchema>(
      xml,
      this.schema.fields
    )
    return new this(data)
  }
}

const gcaBonusSchema = () => {
  return {
    targetprefix: new fields.StringField({ required: true, nullable: true }),
    targetname: new fields.StringField({ required: true, nullable: false }),
    targettext: new fields.StringField({ required: true, nullable: true }),
    targettag: new fields.StringField({ required: true, nullable: true }),
    targettype: new fields.StringField({ required: true, nullable: false }),
    affects: new fields.StringField({ required: true, nullable: false }),
    bonuspart: new fields.StringField({ required: true, nullable: false }),
    // NOTE: this is an unsignedByte in GCA5, but we use a NumberField here
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
}
type GCABonusSchema = ReturnType<typeof gcaBonusSchema>

/* ---------------------------------------- */

class GCABodyItem extends GCASchemaBlock<GCABodyItemSchema> {
  static override defineSchema(): GCABodyItemSchema {
    return gcaBodyItemSchema()
  }

  /* ---------------------------------------- */

  static fromXML(xml: HTMLElement): GCABodyItem {
    const data: DataModel.CreateData<GCABodyItemSchema> = this._primitiveFieldsFromXML<GCABodyItemSchema>(
      xml,
      this.schema.fields
    )
    return new this(data)
  }
}

const gcaBodyItemSchema = () => {
  return {
    name: new fields.StringField({ required: true, nullable: false }),
    cat: new fields.StringField({ required: true, nullable: false }),
    group: new fields.StringField({ required: true, nullable: false }),
    basedb: new fields.StringField({ required: true, nullable: false }),
    basedr: new fields.StringField({ required: true, nullable: false }),
    basehp: new fields.StringField({ required: true, nullable: false }),
    display: new fields.NumberField({ required: true, nullable: false }),
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
}
type GCABodyItemSchema = ReturnType<typeof gcaBodyItemSchema>

/* ---------------------------------------- */

class GCALayerItem extends GCASchemaBlock<GCALayerItemSchema> {
  static override defineSchema(): GCALayerItemSchema {
    return gcaLayerItemSchema()
  }

  /* ---------------------------------------- */

  static fromXML(xml: HTMLElement): GCALayerItem {
    const data: Partial<DataModel.CreateData<GCALayerItemSchema>> = this._primitiveFieldsFromXML(
      xml,
      this.schema.fields
    )
    return new this(data)
  }
}

const gcaLayerItemSchema = () => {
  return {
    itemname: new fields.StringField({ required: true, nullable: false }),
    isinnate: new fields.BooleanField({ required: true, nullable: false }),
    countaslayer: new fields.BooleanField({ required: true, nullable: false }),
    isflexible: new fields.BooleanField({ required: true, nullable: false }),
    $idkey: new fields.StringField({ required: true, nullable: false }),
  }
}
type GCALayerItemSchema = ReturnType<typeof gcaLayerItemSchema>

/* ---------------------------------------- */

class GCACategory extends GCASchemaBlock<GCACategorySchema> {
  static override defineSchema(): GCACategorySchema {
    return gcaCategorySchema()
  }

  /* ---------------------------------------- */

  static fromXML(xml: HTMLElement): GCACategory {
    const data: Partial<DataModel.CreateData<GCACategorySchema>> = this._primitiveFieldsFromXML(xml, this.schema.fields)
    return new this(data)
  }
}

const gcaCategorySchema = () => {
  return {
    name: new fields.StringField({ required: true, nullable: false }),
    code: new fields.StringField({ required: true, nullable: true }),
    itemtype: new fields.StringField({ required: true, nullable: false }),
  }
}
type GCACategorySchema = ReturnType<typeof gcaCategorySchema>

/* ---------------------------------------- */

class GCAModifier extends GCASchemaBlock<GCAModifierSchema> {
  static override defineSchema() {
    return gcaModifierSchema()
  }

  /* ---------------------------------------- */

  static fromXML(xml: HTMLElement): GCAModifier {
    const data: DataModel.CreateData<GCAModifierSchema> = this._primitiveFieldsFromXML<GCAModifierSchema>(
      xml,
      this.schema.fields
    )
    return new this(data)
  }
}

const gcaModifierSchema = () => {
  return {
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

    extended: new fields.ArrayField(new fields.EmbeddedDataField(GCAUnknownTag), { required: true, nullable: true }),

    // NOTE: This should be fields.EmbeddedDataField<GCAModifier> but that would be a cicrular reference.
    modifiers: new fields.ArrayField(new fields.ObjectField(), { required: true, nullable: true }),
    bonuses: new fields.ArrayField(new fields.EmbeddedDataField(GCABonus), {
      required: true,
      nullable: false,
    }),
    conditionals: new fields.ArrayField(new fields.EmbeddedDataField(GCAMessage), { required: true, nullable: true }),

    $idkey: new fields.StringField({ required: true, nullable: false }),
  }
}

type GCAModifierSchema = ReturnType<typeof gcaModifierSchema>

/* ---------------------------------------- */

class GCAAttackMode extends GCASchemaBlock<GCAAttackModeSchema> {
  static override defineSchema(): GCAAttackModeSchema {
    return gcaAttackModeSchema()
  }
}

const gcaAttackModeSchema = () => {
  return {
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
    charblockscore: new fields.StringField({ required: true, nullable: true }),
    charradius: new fields.StringField({ required: true, nullable: true }),
    charrangehalfdam: new fields.StringField({ required: true, nullable: true }),
    charrangemax: new fields.StringField({ required: true, nullable: true }),
    charrcl: new fields.StringField({ required: true, nullable: true }),
    charreach: new fields.StringField({ required: true, nullable: true }),
    charrof: new fields.StringField({ required: true, nullable: true }),
    charshots: new fields.StringField({ required: true, nullable: true }),
    charskillscore: new fields.NumberField({ required: true, nullable: true }),
    charskillused: new fields.StringField({ required: true, nullable: true }),

    itemnotes: new fields.StringField({ required: true, nullable: true }),
  }
}
type GCAAttackModeSchema = ReturnType<typeof gcaAttackModeSchema>

/* ---------------------------------------- */

class GCATrait extends GCASchemaBlock<GCATraitSchema> {
  static override defineSchema(): GCATraitSchema {
    return gcaTraitSchema()
  }

  /* ---------------------------------------- */

  static fromXML(xml: HTMLElement): GCATrait {
    const schema = this.schema.fields

    const data: Partial<DataModel.CreateData<GCATraitSchema>> = this._primitiveFieldsFromXML(xml, schema)

    data.calcs = this._primitiveFieldsFromXML(
      xml.querySelector(':scope > calcs') as HTMLElement,
      schema.calcs.fields
    ) as AnyMutableObject

    data.ref = this._primitiveFieldsFromXML(
      xml.querySelector(':scope > ref') as HTMLElement,
      schema.ref.fields
    ) as AnyMutableObject

    // GCA always produces at least one attackmode child node. For traits which do not have an attack,
    // this node is empty except for a <name> child node. Sometimes a <notes> node is also present, but this
    // does not constitute an full attack as far as GGA is concerned. If only 2 fields are present (which should
    // never be the case for any real attacks), the import is skipped.
    data.attackmodes = Array.from(
      xml.querySelector(':scope > attackmodes')?.querySelectorAll('attackmode') ?? []
    ).reduce((acc: DataModel.CreateData<GCAAttackModeSchema>[], node) => {
      if (node.children.length > 2)
        acc.push(GCAAttackMode._primitiveFieldsFromXML(node as HTMLElement, GCAAttackMode.schema.fields))
      return acc
    }, [])

    return new this(data)
  }

  /* ---------------------------------------- */

  getChildren(list: GCATrait[]): GCATrait[] {
    const children: GCATrait[] = []
    const childKeyList = this.childkeylist?.split(',').map(e => e.trim()) ?? []

    for (const childKey of childKeyList) {
      const child = list.find(trait => `k${trait.$idkey}` === childKey)
      if (child) children.push(child)
    }

    return children
  }
}

const gcaTraitSchema = () => {
  return {
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
        postchildrencost: new fields.StringField({ required: true, nullable: true }),
        postchildrenweight: new fields.StringField({ required: true, nullable: true }),

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

    attackmodes: new fields.ArrayField(new fields.EmbeddedDataField(GCAAttackMode), { required: true, nullable: true }),

    extended: new fields.ArrayField(new fields.EmbeddedDataField(GCAUnknownTag), { required: true, nullable: true }),

    modifiers: new fields.ArrayField(new fields.EmbeddedDataField(GCAModifier), { required: true, nullable: true }),
    bonuses: new fields.ArrayField(new fields.EmbeddedDataField(GCABonus), { required: true, nullable: true }),
    conditionals: new fields.ArrayField(new fields.EmbeddedDataField(GCABonus), { required: true, nullable: true }),

    $type: new fields.StringField({ required: true, nullable: true }),
    $idkey: new fields.StringField({ required: true, nullable: false }),
  }
}
type GCATraitSchema = ReturnType<typeof gcaTraitSchema>

/* ---------------------------------------- */

class GCACharacter extends GCASchemaBlock<GCACharacterSchema> {
  static override defineSchema(): GCACharacterSchema {
    return gcaCharacterSchema()
  }

  /* ---------------------------------------- */

  static fromXML(xml: HTMLElement): GCACharacter {
    const schema = this.schema.fields

    const data: Partial<DataModel.CreateData<GCACharacterSchema>> = this._primitiveFieldsFromXML(xml, schema, [
      'bodyimagefile',
    ])

    data.author = this._primitiveFieldsFromXML(
      xml.querySelector(':scope > author') as HTMLElement,
      schema.author.fields
    ) as AnyMutableObject

    data.system = this._primitiveFieldsFromXML(
      xml.querySelector(':scope > system') as HTMLElement,
      schema.system.fields
    ) as AnyMutableObject

    data.library = this._primitiveFieldsFromXML(
      xml.querySelector(':scope > library') as HTMLElement,
      schema.library.fields
    ) as AnyMutableObject

    data.settings = this._primitiveFieldsFromXML(
      xml.querySelector(':scope > settings') as HTMLElement,
      schema.settings.fields
    ) as AnyMutableObject

    data.output = this._primitiveFieldsFromXML(
      xml.querySelector(':scope > output') as HTMLElement,
      schema.output.fields
    ) as AnyMutableObject

    data.vitals = this._primitiveFieldsFromXML(
      xml.querySelector(':scope > vitals') as HTMLElement,
      schema.vitals.fields,
      ['portraitimage']
    ) as AnyMutableObject

    data.basicdefense = this._primitiveFieldsFromXML(
      xml.querySelector(':scope > basicdefense') as HTMLElement,
      schema.basicdefense.fields
    ) as AnyMutableObject

    data.body = Array.from(xml.querySelector(':scope > body')?.querySelectorAll('bodyitem') ?? []).map(node =>
      GCABodyItem.fromXML(node as HTMLElement)
    )

    data.tags =
      (xml.querySelectorAll(':scope > tags') ?? [].length > 0)
        ? Array.from(xml.querySelector(':scope > tags')?.querySelectorAll('extendedtag') ?? []).map(node =>
            GCAUnknownTag.fromXML(node as HTMLElement)
          )
        : []

    data.messages =
      (xml.querySelectorAll(':scope > messages') ?? [].length > 0)
        ? Array.from(xml.querySelector(':scope > messages')?.querySelectorAll('message') ?? []).map(node =>
            GCAMessage.fromXML(node as HTMLElement)
          )
        : []

    data.traits = {
      attributes: Array.from(xml.querySelector(':scope > traits > attributes')?.querySelectorAll('trait') ?? []).map(
        node => GCATrait.fromXML(node as HTMLElement)
      ),
      cultures: Array.from(
        xml.querySelector(':scope > traits > cultures')?.querySelectorAll(':scope > trait') ?? []
      ).map(node => GCATrait.fromXML(node as HTMLElement)),
      languages: Array.from(
        xml.querySelector(':scope > traits > languages')?.querySelectorAll(':scope > trait') ?? []
      ).map(node => GCATrait.fromXML(node as HTMLElement)),
      advantages: Array.from(
        xml.querySelector(':scope > traits > advantages')?.querySelectorAll(':scope > trait') ?? []
      ).map(node => GCATrait.fromXML(node as HTMLElement)),
      disadvantages: Array.from(
        xml.querySelector(':scope > traits > disadvantages')?.querySelectorAll(':scope > trait') ?? []
      ).map(node => GCATrait.fromXML(node as HTMLElement)),
      perks: Array.from(xml.querySelector(':scope > traits > perks')?.querySelectorAll(':scope > trait') ?? []).map(
        node => GCATrait.fromXML(node as HTMLElement)
      ),
      quirks: Array.from(xml.querySelector(':scope > traits > quirks')?.querySelectorAll(':scope > trait') ?? []).map(
        node => GCATrait.fromXML(node as HTMLElement)
      ),
      features: Array.from(
        xml.querySelector(':scope > traits > features')?.querySelectorAll(':scope > trait') ?? []
      ).map(node => GCATrait.fromXML(node as HTMLElement)),
      skills: Array.from(xml.querySelector(':scope > traits > skills')?.querySelectorAll(':scope > trait') ?? []).map(
        node => GCATrait.fromXML(node as HTMLElement)
      ),
      spells: Array.from(xml.querySelector(':scope > traits > spells')?.querySelectorAll(':scope > trait') ?? []).map(
        node => GCATrait.fromXML(node as HTMLElement)
      ),
      equipment: Array.from(
        xml.querySelector(':scope > traits > equipment')?.querySelectorAll(':scope > trait') ?? []
      ).map(node => GCATrait.fromXML(node as HTMLElement)),
      templates: Array.from(
        xml.querySelector(':scope > traits > templates')?.querySelectorAll(':scope > trait') ?? []
      ).map(node => GCATrait.fromXML(node as HTMLElement)),
    }

    data.loadouts = Array.from(xml.querySelector(':scope > loadouts')?.querySelectorAll(':scope > loadout') ?? []).map(
      node => this._getLoadoutFromXML(node as HTMLElement)
    )

    data.transforms = Array.from(
      xml.querySelector(':scope > transforms')?.querySelectorAll(':scope > transform') ?? []
    ).map(node => this._getTransformFromXML(node as HTMLElement))

    data.campaign = {
      ...this._primitiveFieldsFromXML(xml.querySelector(':scope > campaign') as HTMLElement, schema.campaign.fields),
      logentries: Array.from(xml.querySelector(':scope > logentries')?.querySelectorAll(':scope > logentry') ?? []).map(
        node => this._primitiveFieldsFromXML(node as HTMLElement, schema.campaign.fields.logentries.element.fields)
      ) as AnyMutableObject[],
    }

    data.basicdamages = Array.from(
      xml.querySelector(':scope > basicdamages')?.querySelectorAll(':scope > basicdamage') ?? []
    ).map(node =>
      this._primitiveFieldsFromXML(node as HTMLElement, schema.basicdamages.element.fields)
    ) as AnyMutableObject[]

    data.damagebreaks = Array.from(
      xml.querySelector(':scope > damagebreaks')?.querySelectorAll(':scope > damagebreak') ?? []
    ).map(node =>
      this._primitiveFieldsFromXML(node as HTMLElement, schema.damagebreaks.element.fields)
    ) as AnyMutableObject[]

    data.skilltypes = Array.from(
      xml.querySelector(':scope > skilltypes')?.querySelectorAll(':scope > skilltype') ?? []
    ).map(node =>
      this._primitiveFieldsFromXML(node as HTMLElement, schema.skilltypes.element.fields)
    ) as AnyMutableObject[]

    data.groups = Array.from(xml.querySelector(':scope > groups')?.querySelectorAll(':scope > group') ?? []).map(
      node => {
        return {
          ...this._primitiveFieldsFromXML(node as HTMLElement, schema.groups.element.fields),
          groupitems:
            (node.querySelectorAll(':scope > groupitems') ?? [].length === 1)
              ? Array.from(node.querySelector(':scope > groupitems')?.querySelectorAll(':scope > groupitem') ?? []).map(
                  itemNode =>
                    this._primitiveFieldsFromXML(
                      itemNode as HTMLElement,
                      schema.groups.element.fields.groupitem.element.fields
                    )
                )
              : [],
        }
      }
    ) as AnyMutableObject[]

    data.categories =
      (xml.querySelectorAll(':scope > categories') ?? [].length > 0)
        ? Array.from(xml.querySelector(':scope > categories')?.querySelectorAll(':scope > category') ?? []).map(node =>
            GCACategory.fromXML(node as HTMLElement)
          )
        : []

    data.symbols =
      (xml.querySelectorAll(':scope > symbols') ?? [].length > 0)
        ? Array.from(xml.querySelector(':scope > symbols')?.querySelectorAll(':scope > symbol') ?? []).map(node =>
            GCAFlagSymbol.fromXML(node as unknown as HTMLElement)
          )
        : []

    data.bonusclasses =
      (xml.querySelectorAll(':scope > bonusclasses') ?? [].length > 0)
        ? Array.from(xml.querySelector(':scope > bonusclasses')?.querySelectorAll(':scope > bonusclass') ?? []).map(
            node => GCABonusClass.fromXML(node as HTMLElement)
          )
        : []

    return new this(data, { strict: false })
  }

  /* ---------------------------------------- */

  protected static _getLoadoutFromXML(xml: HTMLElement): Partial<DataModel.CreateData<GCALoadoutSchema>> {
    const data: Partial<DataModel.CreateData<GCALoadoutSchema>> = this._primitiveFieldsFromXML(xml, gcaLoadoutSchema())

    const schema = this.schema.fields.loadouts.element.fields

    data.facingdb = this._primitiveFieldsFromXML(
      xml.querySelector(':scope > facingdb') as HTMLElement,
      schema.facingdb.fields
    ) as AnyMutableObject

    data.items = Array.from(xml.querySelector(':scope > items')?.querySelectorAll(':scope > item') ?? []).map(node =>
      this._primitiveFieldsFromXML(node as HTMLElement, schema.items.element.fields)
    ) as AnyMutableObject[]

    data.armoritems = Array.from(xml.querySelector(':scope > armoritems')?.querySelectorAll(':scope > item') ?? []).map(
      node => this._primitiveFieldsFromXML(node as HTMLElement, schema.armoritems.element.fields)
    ) as AnyMutableObject[]

    data.shielditems = Array.from(
      xml.querySelector(':scope > shielditems')?.querySelectorAll(':scope > item') ?? []
    ).map(node =>
      this._primitiveFieldsFromXML(node as HTMLElement, schema.armoritems.element.fields)
    ) as AnyMutableObject[]

    data.orderedlayers = Array.from(
      xml.querySelector(':scope > orderedlayers')?.querySelectorAll(':scope > layer') ?? []
    ).map(node => GCALayerItem.fromXML(node as HTMLElement))

    data.body = Array.from(xml.querySelector(':scope > body')?.querySelectorAll(':scope > bodyitem') ?? []).map(node =>
      GCABodyItem.fromXML(node as HTMLElement)
    )

    return data
  }

  protected static _getTransformFromXML(xml: HTMLElement): Partial<DataModel.CreateData<GCATransformSchema>> {
    const data: Partial<DataModel.CreateData<GCATransformSchema>> = this._primitiveFieldsFromXML(
      xml,
      gcaTransformSchema()
    )

    const schema = this.schema.fields.transforms.element.fields

    data.items = Array.from(xml.querySelector(':scope > items')?.querySelectorAll(':scope > item') ?? []).map(node =>
      this._primitiveFieldsFromXML(node as HTMLElement, schema.items.element.fields)
    ) as AnyMutableObject[]

    return data
  }
}

/* ---------------------------------------- */

const gcaLoadoutSchema = () => {
  return {
    name: new fields.StringField({ required: true, nullable: false }),
    weight: new fields.NumberField({ required: true, nullable: false }),
    shielddb: new fields.NumberField({ required: true, nullable: false }),
    hexmask: new fields.StringField({ required: true, nullable: false }),
    alwaysautocalcarmor: new fields.StringField({ required: true, nullable: true }),
    userorderedlayers: new fields.StringField({ required: true, nullable: true }),

    facingdb: new fields.SchemaField(
      {
        leftflank: new fields.NumberField({ required: true, nullable: false }),
        leftfront: new fields.NumberField({ required: true, nullable: false }),
        centerfront: new fields.NumberField({ required: true, nullable: false }),
        rightfront: new fields.NumberField({ required: true, nullable: false }),
        rightflank: new fields.NumberField({ required: true, nullable: false }),
        rear: new fields.NumberField({ required: true, nullable: false }),
      },
      { required: true, nullable: false }
    ),

    items: new fields.ArrayField(
      new fields.SchemaField({
        name: new fields.StringField({ required: true, nullable: false }),
        $idkey: new fields.NumberField({ required: true, nullable: false }),
      }),
      { required: true, nullable: false }
    ),

    armoritems: new fields.ArrayField(
      new fields.SchemaField({
        name: new fields.StringField({ required: true, nullable: false }),
        $idkey: new fields.NumberField({ required: true, nullable: false }),
      })
    ),

    shielditems: new fields.ArrayField(
      new fields.SchemaField({
        name: new fields.StringField({ required: true, nullable: false }),
        shieldarc: new fields.StringField({ required: true, nullable: false }),
        $idkey: new fields.NumberField({ required: true, nullable: false }),
      })
    ),

    orderedlayers: new fields.ArrayField(new fields.EmbeddedDataField(GCALayerItem), {
      required: true,
      nullable: false,
    }),

    body: new fields.ArrayField(new fields.EmbeddedDataField(GCABodyItem), { required: true, nullable: true }),
  }
}

type GCALoadoutSchema = ReturnType<typeof gcaLoadoutSchema>

/* ---------------------------------------- */

const gcaTransformSchema = () => {
  return {
    name: new fields.StringField({ required: true, nullable: false }),
    points: new fields.NumberField({ required: true, nullable: false }),
    items: new fields.ArrayField(
      new fields.SchemaField({
        name: new fields.StringField({ required: true, nullable: false }),
        $idkey: new fields.NumberField({ required: true, nullable: false }),
      }),
      { required: true, nullable: false }
    ),
  }
}

type GCATransformSchema = ReturnType<typeof gcaTransformSchema>

/* ---------------------------------------- */

const gcaCharacterSchema = () => {
  return {
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

        traitgrouping: new fields.ArrayField(new fields.EmbeddedDataField(GCAGroupingOptions), {
          required: true,
          nullable: true,
        }),
      },
      { required: true, nullable: true }
    ),

    name: new fields.StringField({ required: true, nullable: false }),
    player: new fields.StringField({ required: true, nullable: true }),
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

    body: new fields.ArrayField(new fields.EmbeddedDataField(GCABodyItem), { required: true, nullable: true }),

    tags: new fields.ArrayField(new fields.EmbeddedDataField(GCAUnknownTag), { required: true, nullable: true }),
    messages: new fields.ArrayField(new fields.EmbeddedDataField(GCAMessage), { required: true, nullable: true }),

    traits: new fields.SchemaField(
      {
        attributes: new fields.ArrayField(new fields.EmbeddedDataField(GCATrait), { required: true, nullable: false }),
        cultures: new fields.ArrayField(new fields.EmbeddedDataField(GCATrait), { required: true, nullable: false }),
        languages: new fields.ArrayField(new fields.EmbeddedDataField(GCATrait), { required: true, nullable: false }),
        advantages: new fields.ArrayField(new fields.EmbeddedDataField(GCATrait), { required: true, nullable: false }),
        disadvantages: new fields.ArrayField(new fields.EmbeddedDataField(GCATrait), {
          required: true,
          nullable: false,
        }),
        perks: new fields.ArrayField(new fields.EmbeddedDataField(GCATrait), { required: true, nullable: false }),
        quirks: new fields.ArrayField(new fields.EmbeddedDataField(GCATrait), { required: true, nullable: false }),
        features: new fields.ArrayField(new fields.EmbeddedDataField(GCATrait), { required: true, nullable: false }),
        skills: new fields.ArrayField(new fields.EmbeddedDataField(GCATrait), { required: true, nullable: false }),
        spells: new fields.ArrayField(new fields.EmbeddedDataField(GCATrait), { required: true, nullable: false }),
        equipment: new fields.ArrayField(new fields.EmbeddedDataField(GCATrait), { required: true, nullable: false }),
        templates: new fields.ArrayField(new fields.EmbeddedDataField(GCATrait), { required: true, nullable: false }),
      },
      { required: true, nullable: false }
    ),

    loadouts: new fields.ArrayField(new fields.SchemaField(gcaLoadoutSchema()), { required: true, nullable: false }),

    transforms: new fields.ArrayField(new fields.SchemaField(gcaTransformSchema()), { required: true, nullable: true }),

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

      logentries: new fields.ArrayField(
        new fields.SchemaField({
          entrydate: new fields.StringField({ required: true, nullable: false }),
          campaigndate: new fields.StringField({ required: true, nullable: false }),
          charpoints: new fields.NumberField({ required: true, nullable: false }),

          charmoney: new fields.NumberField({ required: true, nullable: true }),

          caption: new fields.StringField({ required: true, nullable: false }),
          notes: new fields.StringField({ required: true, nullable: false }),
        })
      ),
    }),

    basicdamages: new fields.ArrayField(
      new fields.SchemaField({
        st: new fields.NumberField({ required: true, nullable: false }),
        // NOTE: These values seem to always be numbers but are treated as strings by the GCA schema.
        thbase: new fields.StringField({ required: true, nullable: false }),
        thadd: new fields.StringField({ required: true, nullable: false }),
        swbase: new fields.StringField({ required: true, nullable: false }),
        swadd: new fields.StringField({ required: true, nullable: false }),
      })
    ),

    damagebreaks: new fields.ArrayField(
      new fields.SchemaField({
        break: new fields.NumberField({ required: true, nullable: false }),
        adddice: new fields.NumberField({ required: true, nullable: false }),
        subtract: new fields.NumberField({ required: true, nullable: false }),
      })
    ),

    skilltypes: new fields.ArrayField(
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

    groups: new fields.ArrayField(
      new fields.SchemaField({
        name: new fields.StringField({ required: true, nullable: false }),
        groupitem: new fields.ArrayField(
          new fields.SchemaField({
            name: new fields.StringField({ required: true, nullable: false }),
            nameext: new fields.StringField({ required: true, nullable: false }),
            itemtype: new fields.StringField({ required: true, nullable: false }),
          })
        ),
      }),
      { required: true, nullable: false }
    ),

    categories: new fields.ArrayField(new fields.EmbeddedDataField(GCACategory), {
      required: true,
      nullable: false,
    }),

    symbols: new fields.ArrayField(new fields.EmbeddedDataField(GCAFlagSymbol), { required: true, nullable: true }),

    bonusclasses: new fields.ArrayField(new fields.EmbeddedDataField(GCABonusClass), {
      required: true,
      nullable: true,
    }),
  }
}
type GCACharacterSchema = ReturnType<typeof gcaCharacterSchema>

/* ---------------------------------------- */

class GCA5 extends GCASchemaBlock<GCA5Schema> {
  static override defineSchema(): GCA5Schema {
    return gca5Schema()
  }

  /* ---------------------------------------- */

  static fromXML(xml: Document): GCA5 {
    const data: Partial<DataModel.CreateData<GCA5Schema>> = {}
    const characters: GCACharacter[] = []

    for (const child of xml.querySelectorAll(':scope > character') ?? []) {
      const character = GCACharacter.fromXML(child as HTMLElement)
      characters.push(character)
    }
    data.character = characters

    return new this(data, { strict: false })
  }
}

const gca5Schema = () => {
  return {
    character: new fields.ArrayField(new fields.EmbeddedDataField(GCACharacter), { required: true, nullable: false }),
  }
}
type GCA5Schema = ReturnType<typeof gca5Schema>

export {
  GCABonusClass,
  GCAGroupingOptions,
  GCAFlagSymbol,
  GCAMessage,
  GCAUnknownTag,
  GCABonus,
  GCABodyItem,
  GCALayerItem,
  GCACategory,
  GCAModifier,
  GCAAttackMode,
  GCATrait,
  GCACharacter,
  GCA5,
}
