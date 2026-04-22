import { fields, DataModel } from '@gurps-types/foundry/index.js'
import { AnyMutableObject } from 'fvtt-types/utils'

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

const nullableStringField = () =>
  new fields.StringField({ required: true, nullable: true, blank: false, initial: null })

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
    affects: nullableStringField(),
    stacks: nullableStringField(),
    upto: nullableStringField(),
    downto: nullableStringField(),
    // NOTE: Not sure what this does yet
    uptoisset: new fields.NumberField({ required: true, nullable: true }),
    downtoisset: new fields.NumberField({ required: true, nullable: true }),
    best: nullableStringField(),
    worst: nullableStringField(),
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
    targetprefix: nullableStringField(),
    targetname: new fields.StringField({ required: true, nullable: false }),
    targettext: nullableStringField(),
    targettag: nullableStringField(),
    targettype: new fields.StringField({ required: true, nullable: false }),
    affects: new fields.StringField({ required: true, nullable: false }),
    bonuspart: new fields.StringField({ required: true, nullable: false }),
    // NOTE: this is an unsignedByte in GCA5, but we use a NumberField here
    bonustype: new fields.NumberField({ required: true, nullable: false }),
    fullbonustext: new fields.StringField({ required: true, nullable: false }),
    upto: nullableStringField(),
    value: new fields.NumberField({ required: true, nullable: false }),
    stringvalue: nullableStringField(),
    stringvaluetext: nullableStringField(),
    notes: nullableStringField(),
    listas: nullableStringField(),
    unless: nullableStringField(),
    onlyif: nullableStringField(),
    classes: nullableStringField(),

    fromname: nullableStringField(),
    fromtype: nullableStringField(),
    fromprefix: nullableStringField(),
    fromext: nullableStringField(),
    fromtag: nullableStringField(),
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
    code: nullableStringField(),
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
    nameext: nullableStringField(),
    group: new fields.StringField({ required: true, nullable: false }),
    cost: new fields.StringField({ required: true, nullable: false }),
    formula: nullableStringField(),
    forceformula: nullableStringField(),
    level: new fields.NumberField({ required: true, nullable: false }),
    premodsvalue: new fields.StringField({ required: true, nullable: false }),
    value: new fields.StringField({ required: true, nullable: false }),
    valuenum: new fields.NumberField({ required: true, nullable: false }),

    gives: nullableStringField(),
    conditional: nullableStringField(),
    round: nullableStringField(),
    shortname: nullableStringField(),
    page: nullableStringField(),
    mods: nullableStringField(),
    tier: nullableStringField(),
    upto: nullableStringField(),
    levelnames: nullableStringField(),
    description: nullableStringField(),

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
    name: nullableStringField(),

    acc: nullableStringField(),
    armordivisor: nullableStringField(),
    break: nullableStringField(),
    bulk: nullableStringField(),
    damage: nullableStringField(),
    damtype: nullableStringField(),
    dmg: nullableStringField(),
    lc: nullableStringField(),
    minst: nullableStringField(),
    notes: nullableStringField(),
    parry: nullableStringField(),
    rangehalfdam: nullableStringField(),
    rangemax: nullableStringField(),
    radius: nullableStringField(),
    rcl: nullableStringField(),
    reach: nullableStringField(),
    rof: nullableStringField(),
    shots: nullableStringField(),
    skillused: nullableStringField(),
    stcap: nullableStringField(),

    scopeacc: nullableStringField(),
    malf: nullableStringField(),

    damagebasedon: nullableStringField(),
    minstbasedon: nullableStringField(),
    reachbasedon: nullableStringField(),
    damageistext: nullableStringField(),

    characc: nullableStringField(),
    chararmordivisor: nullableStringField(),
    charbreak: nullableStringField(),
    charbulk: nullableStringField(),
    chardamage: nullableStringField(),
    chardamtype: nullableStringField(),
    chareffectivest: nullableStringField(),
    charminst: nullableStringField(),
    charparry: nullableStringField(),
    charparryscore: nullableStringField(),

    charblockscore: nullableStringField(),

    charradius: nullableStringField(),
    charrangehalfdam: nullableStringField(),
    charrangemax: nullableStringField(),
    charrcl: nullableStringField(),
    charreach: nullableStringField(),
    charrof: nullableStringField(),
    charshots: nullableStringField(),
    charskillscore: new fields.NumberField({ required: true, nullable: true }),
    charskillused: nullableStringField(),

    charskillusedkey: nullableStringField(),

    charscopeacc: nullableStringField(),
    charmalf: nullableStringField(),

    uses: nullableStringField(),
    uses_sections: nullableStringField(),
    uses_used: nullableStringField(),
    uses_settings: nullableStringField(),

    itemnotes: nullableStringField(),

    vttmodenotes: nullableStringField(),

    rollto: nullableStringField(),
    rolltophrase: nullableStringField(),

    minimode_damage: nullableStringField(),
    minimode_damtype: nullableStringField(),
    minimode_armordivisor: nullableStringField(),
    minimode_radius: nullableStringField(),
  }
}

type GCAAttackModeSchema = ReturnType<typeof gcaAttackModeSchema>

/* ---------------------------------------- */

class GCAHitLocationLine extends GCASchemaBlock<GCAHitLocationLineSchema> {
  static override defineSchema(): GCAHitLocationLineSchema {
    return gcaHitLocationLineSchema()
  }

  /* ---------------------------------------- */

  static fromXML(xml: HTMLElement): GCAHitLocationLine {
    const schema = this.schema.fields

    const data: Partial<DataModel.CreateData<GCAHitLocationLineSchema>> = this._primitiveFieldsFromXML(xml, schema)

    return new this(data)
  }
}

const gcaHitLocationLineSchema = () => {
  return {
    roll: new fields.StringField({ required: true, nullable: false }),
    location: new fields.StringField({ required: true, nullable: false }),
    penalty: new fields.StringField({ required: true, nullable: false }),
    notes: new fields.StringField({ required: true, nullable: false }),
  }
}

type GCAHitLocationLineSchema = ReturnType<typeof gcaHitLocationLineSchema>

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
    const childKeyList = this.childkeylist?.split(',').map(childKey => childKey.trim()) ?? []

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
    nameext: nullableStringField(),
    symbol: nullableStringField(),
    parentkey: nullableStringField(),
    childkeylist: nullableStringField(),
    cat: nullableStringField(),
    tl: nullableStringField(),
    bonuslist: nullableStringField(),
    conditionallist: nullableStringField(),
    needscheck: new fields.BooleanField({ required: true, nullable: true }),
    taboofailed: new fields.BooleanField({ required: true, nullable: true }),
    points: new fields.NumberField({ required: true, nullable: true }),
    score: new fields.NumberField({ required: true, nullable: true }),
    type: nullableStringField(),
    level: new fields.NumberField({ required: true, nullable: true }),
    step: nullableStringField(),
    stepoff: nullableStringField(),
    cost: new fields.NumberField({ required: true, nullable: true }),
    count: new fields.NumberField({ required: true, nullable: true }),
    weight: new fields.NumberField({ required: true, nullable: true }),
    parrylevel: new fields.NumberField({ required: true, nullable: true }),
    blocklevel: new fields.NumberField({ required: true, nullable: true }),
    hide: nullableStringField(),
    lock: nullableStringField(),

    displaynameformula: nullableStringField(),
    vars: nullableStringField(),

    calcs: new fields.SchemaField(
      {
        cost: nullableStringField(),
        sd: nullableStringField(),
        deflevel: nullableStringField(),
        deffrom: nullableStringField(),
        deffromid: nullableStringField(),
        pointmult: nullableStringField(),
        levelmult: nullableStringField(),
        syslevels: nullableStringField(),
        bonuslevels: nullableStringField(),
        extralevels: nullableStringField(),
        baselevel: nullableStringField(),
        basepoints: nullableStringField(),
        multpoints: nullableStringField(),
        apppoints: nullableStringField(),
        premodspoints: nullableStringField(),

        preformulacost: nullableStringField(),
        preformulaweight: nullableStringField(),
        postformulacost: nullableStringField(),
        postformulaweight: nullableStringField(),
        prechildrencost: nullableStringField(),
        prechildrenweight: nullableStringField(),
        postchildrencost: nullableStringField(),
        postchildrenweight: nullableStringField(),

        childpoints: nullableStringField(),
        baseapppoints: nullableStringField(),
        defpoints: nullableStringField(),
        extrapoints: nullableStringField(),
        basecost: nullableStringField(),
        baseweight: nullableStringField(),
        childrencost: nullableStringField(),
        childrenweights: nullableStringField(),
        precountcost: nullableStringField(),
        precountweight: nullableStringField(),
        premodscost: nullableStringField(),
        basevalue: nullableStringField(),
        maxscore: nullableStringField(),
        minscore: nullableStringField(),
        up: nullableStringField(),
        down: nullableStringField(),
        step: nullableStringField(),
        round: nullableStringField(),
        basescore: nullableStringField(),
        parryat: nullableStringField(),
        blockat: nullableStringField(),
        upto: nullableStringField(),
        downto: nullableStringField(),
        levelnames: nullableStringField(),
      },
      { required: true, nullable: false }
    ),

    weaponmodesdata: new fields.SchemaField(
      {
        mode: nullableStringField(),
        damage: nullableStringField(),
        damtype: nullableStringField(),
        dmg: nullableStringField(),
        reach: nullableStringField(),
        parry: nullableStringField(),
        minst: nullableStringField(),
        skillused: nullableStringField(),
        acc: nullableStringField(),
        rangehalfdam: nullableStringField(),
        rangemax: nullableStringField(),
        rof: nullableStringField(),
        rcl: nullableStringField(),
        shots: nullableStringField(),
        armordivisor: nullableStringField(),
        break: nullableStringField(),
        radius: nullableStringField(),
        bulk: nullableStringField(),
        damagebasedon: nullableStringField(),
        minstbasedon: nullableStringField(),
        reachbasedon: nullableStringField(),
        damageistext: nullableStringField(),

        calcrange: nullableStringField(),
        chardamage: nullableStringField(),
        chardamtype: nullableStringField(),
        charreach: nullableStringField(),
        charparry: nullableStringField(),
        charminst: nullableStringField(),
        charskillused: nullableStringField(),
        charskillscore: nullableStringField(),
        charparryscore: nullableStringField(),
        characc: nullableStringField(),
        charrangehalfdam: nullableStringField(),
        charrangemax: nullableStringField(),
        charrof: nullableStringField(),
        charrcl: nullableStringField(),
        charshots: nullableStringField(),
        chararmordivisor: nullableStringField(),
        charbreak: nullableStringField(),
        charradius: nullableStringField(),
        chareffectivest: nullableStringField(),

        charbulk: nullableStringField(),
        stcap: nullableStringField(),
      },
      { required: true, nullable: true }
    ),

    armordata: new fields.SchemaField(
      {
        dr: nullableStringField(),
        chardr: nullableStringField(),
        db: nullableStringField(),
        chardb: nullableStringField(),

        chardeflect: new fields.NumberField({ required: true, nullable: true }),
        charfortify: new fields.NumberField({ required: true, nullable: true }),

        location: nullableStringField(),

        coverage: nullableStringField(),
        charlocation: nullableStringField(),
        locationcoverage: nullableStringField(),

        aa: nullableStringField(),
      },
      { required: true, nullable: true }
    ),

    ref: new fields.SchemaField(
      {
        basedon: nullableStringField(),
        page: nullableStringField(),
        itemnotes: nullableStringField(),
        usernotes: nullableStringField(),
        familiarities: nullableStringField(),
        notes: nullableStringField(),
        description: nullableStringField(),

        units: nullableStringField(),

        shortcat: nullableStringField(),
        prereqcount: new fields.NumberField({ required: true, nullable: true }),
        magery: nullableStringField(),
        class: nullableStringField(),
        time: nullableStringField(),
        duration: nullableStringField(),
        castingcost: nullableStringField(),

        needs: nullableStringField(),
        gives: nullableStringField(),
        conditional: nullableStringField(),
        taboo: nullableStringField(),
        default: nullableStringField(),
        mods: nullableStringField(),
        initmods: nullableStringField(),
        techlvl: nullableStringField(),
        load: nullableStringField(),
        lc: nullableStringField(),
        ndl: nullableStringField(),

        highlight: nullableStringField(),
        highlightme: nullableStringField(),
        hideme: nullableStringField(),
        collapse: nullableStringField(),
        collapseme: nullableStringField(),

        keep: nullableStringField(),
        owned: nullableStringField(),
        locked: nullableStringField(),
        owns: nullableStringField(),
        pkids: nullableStringField(),

        gms: nullableStringField(),
        mainwin: nullableStringField(),
        display: nullableStringField(),
        isparent: nullableStringField(),
        noresync: nullableStringField(),
        disadat: nullableStringField(),

        vttnotes: nullableStringField(),

        appliedsymbols: nullableStringField(),
      },
      { required: true, nullable: true }
    ),

    attackmodes: new fields.ArrayField(new fields.EmbeddedDataField(GCAAttackMode), { required: true, nullable: true }),

    extended: new fields.ArrayField(new fields.EmbeddedDataField(GCAUnknownTag), { required: true, nullable: true }),

    modifiers: new fields.ArrayField(new fields.EmbeddedDataField(GCAModifier), { required: true, nullable: true }),
    bonuses: new fields.ArrayField(new fields.EmbeddedDataField(GCABonus), { required: true, nullable: true }),
    conditionals: new fields.ArrayField(new fields.EmbeddedDataField(GCABonus), { required: true, nullable: true }),

    $type: nullableStringField(),
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

    // Remove whitespace from base64 data
    data.vitals.portraitimage = xml.querySelector(':scope > vitals > portraitimage')?.textContent.replace(/\s+/g, '')

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

    data.hitlocationtable = {
      ...this._primitiveFieldsFromXML(
        xml.querySelector(':scope > hitlocationtable') as HTMLElement,
        schema.hitlocationtable.fields
      ),
      hitlocationlines: Array.from(
        xml.querySelector(':scope > hitlocationtable')?.querySelectorAll('hitlocationline') ?? []
      ).map(node => GCAHitLocationLine.fromXML(node as HTMLElement)),
    }

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
    alwaysautocalcarmor: nullableStringField(),
    userorderedlayers: nullableStringField(),

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
        name: nullableStringField(),
        version: nullableStringField(),
        copyright: nullableStringField(),
        datecreated: nullableStringField(),
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

        flagoverspentskills: new fields.NumberField({ required: true, nullable: true }),

        applydbtoactivedefenses: new fields.NumberField({ required: true, nullable: true }),

        traitgrouping: new fields.ArrayField(new fields.EmbeddedDataField(GCAGroupingOptions), {
          required: true,
          nullable: true,
        }),
      },
      { required: true, nullable: true }
    ),

    name: new fields.StringField({ required: true, nullable: false }),
    player: nullableStringField(),
    bodytype: nullableStringField(),
    bodyimagefile: nullableStringField(),
    bodyimage: nullableStringField(),
    currentloadout: new fields.StringField({ required: true, nullable: false }),
    currenttransform: nullableStringField(),

    output: new fields.SchemaField(
      {
        sheetviewsheet: nullableStringField(),
        charactersheet: nullableStringField(),
        altcharactersheet: new fields.ArrayField(nullableStringField()),
        exportsheet: nullableStringField(),
        altexportsheet: new fields.ArrayField(nullableStringField()),
      },
      { required: true, nullable: true }
    ),

    vitals: new fields.SchemaField(
      {
        race: nullableStringField(),
        height: nullableStringField(),
        weight: nullableStringField(),
        age: nullableStringField(),
        appearance: nullableStringField(),
        portraitfile: nullableStringField(),
        // base64 encoded image data
        portraitimage: nullableStringField(),
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

    description: nullableStringField(),
    notes: nullableStringField(),

    body: new fields.ArrayField(new fields.EmbeddedDataField(GCABodyItem), { required: true, nullable: true }),

    tags: new fields.ArrayField(new fields.EmbeddedDataField(GCAUnknownTag), { required: true, nullable: true }),
    messages: new fields.ArrayField(new fields.EmbeddedDataField(GCAMessage), { required: true, nullable: true }),

    hitlocationtable: new fields.SchemaField({
      name: new fields.StringField({ required: true, nullable: false }),
      description: nullableStringField(),
      hitlocationlines: new fields.ArrayField(new fields.EmbeddedDataField(GCAHitLocationLine), {
        required: true,
        nullable: false,
      }),
    }),

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
