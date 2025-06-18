import fields = foundry.data.fields

/* ---------------------------------------- */

class TrackerInstance extends foundry.abstract.DataModel<ResourceTrackerSchema> {
  static override defineSchema() {
    return resourceTrackerSchema()
  }

  static fromTemplate(template: ResourceTrackerTemplate, actor: Actor.Implementation): TrackerInstance {
    const tracker = new TrackerInstance(template.tracker.toObject())

    if (template.initialValue !== null) {
      tracker.value = parseInt(template.initialValue) || 0
      if (isNaN(tracker.value)) {
        // try to use initialValue as a path to another value
        tracker.value = foundry.utils.getProperty(actor, 'system.' + template.initialValue) ?? template.tracker.value
      }
    }

    return tracker
  }

  // TODO: verify this works
  async applyTemplate(template: ResourceTrackerTemplate) {
    const data = template.tracker.toObject()
    return this.updateSource(data)
  }
}

/* ---------------------------------------- */

const resourceTrackerSchema = () => {
  return {
    name: new fields.StringField({ required: true, nullable: false }),
    alias: new fields.StringField({ required: true, nullable: false }),
    pdf: new fields.StringField({ required: true, nullable: false }),
    max: new fields.NumberField({ required: true, nullable: false }),
    min: new fields.NumberField({ required: true, nullable: false }),
    value: new fields.NumberField({ required: true, nullable: false }),
    isDamageType: new fields.BooleanField({ required: true, nullable: false }),
    isDamageTracker: new fields.BooleanField({ required: true, nullable: false }),
    breakpoints: new fields.BooleanField({ required: true, nullable: false }),
    thresholds: new fields.ArrayField(
      new fields.EmbeddedDataField(ResourceTrackerThreshold, { required: true, nullable: false }),
      {
        required: true,
        nullable: false,
      }
    ),
  }
}

type ResourceTrackerSchema = ReturnType<typeof resourceTrackerSchema>

/* ---------------------------------------- */

class ResourceTrackerThreshold extends foundry.abstract.DataModel<ResourceTrackerThresholdSchema> {
  static override defineSchema() {
    return resourceTrackerThresholdSchema()
  }
}

/* ---------------------------------------- */

const resourceTrackerThresholdSchema = () => {
  return {
    comparison: new fields.StringField({ required: true, nullable: false }),
    operator: new fields.StringField({ required: true, nullable: false }),
    value: new fields.NumberField({ required: true, nullable: false }),
    condition: new fields.StringField({ required: true, nullable: false }),
    color: new fields.StringField({ required: true, nullable: false }),
  }
}

type ResourceTrackerThresholdSchema = ReturnType<typeof resourceTrackerThresholdSchema>

/* ---------------------------------------- */

class ResourceTrackerTemplate extends foundry.abstract.DataModel<ResourceTrackerTemplateSchema> {
  static override defineSchema() {
    return resourceTrackerTemplateSchema()
  }
}

/* ---------------------------------------- */

const resourceTrackerTemplateSchema = () => {
  return {
    tracker: new fields.EmbeddedDataField(TrackerInstance, { required: true, nullable: false }),
    initialValue: new fields.StringField({ required: true, nullable: false }),
    slot: new fields.BooleanField({ required: true, nullable: true, initial: false }),
    autoapply: new fields.BooleanField({ required: true, nullable: true, initial: false }),
  }
}

type ResourceTrackerTemplateSchema = ReturnType<typeof resourceTrackerTemplateSchema>

/* ---------------------------------------- */

export {
  TrackerInstance,
  ResourceTrackerThreshold,
  ResourceTrackerTemplate,
  type ResourceTrackerSchema,
  type ResourceTrackerThresholdSchema,
  type ResourceTrackerTemplateSchema,
}
