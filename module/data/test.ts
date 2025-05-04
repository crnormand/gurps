import { LengthField } from './fields/index.js'
import DataModel = foundry.abstract.DataModel

const testSchema = () => {
  return {
    text: new foundry.data.fields.StringField({ required: true, initial: 'test' }),
    length: new LengthField(),
    metres: new LengthField(),
  }
}

type TestSchema = ReturnType<typeof testSchema>

/* ---------------------------------------- */

class TestModel<Parent extends DataModel.Any | null> extends DataModel<TestSchema, Parent> {
  constructor(data: DataModel.CreateData<TestSchema>, options?: DataModel.DataValidationOptions<Parent>) {
    super(data, options)
  }

  static override defineSchema(): TestSchema {
    return testSchema()
  }
}

export { TestModel }
