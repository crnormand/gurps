import fields = foundry.data.fields

const attributeSchema = () => {
  return {
    import: new fields.NumberField({ required: true, nullable: false, initial: 10 }),
    value: new fields.NumberField({ required: true, nullable: false, initial: 10 }),
    points: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
  }
}

const poolSchema = () => {
  return {
    value: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    min: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    max: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    points: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
  }
}

export { attributeSchema, poolSchema }
