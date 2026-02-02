import { AnyPrereq, PrereqClasses } from '../../prereqs/index.ts'
import { fields } from '../../types/foundry/index.ts'
// import { AnyPrereq, Prereq, PrereqClasses, PrereqType } from '../prereqs/index.ts'

const prereqsSchema = (types = PrereqClasses) => {
  return {
    prereqs: new fields.TypedObjectField(new fields.TypedSchemaField(types)),
  }
}

/* ---------------------------------------- */

interface IPrereqs {
  // List of prereqs contained within this item
  prereqs: Record<string, AnyPrereq>

  // // Add a new prereq
  // createPrereq<Type extends PrereqType>(
  //   data?: DataModel.CreateData<DataModel.SchemaOf<Prereq<Type>>>
  // ): Promise<Prereq<Type> | undefined>
  //
  // deletePrereq(id: string): Promise<AnyPrereq | undefined>

  // process all contained prereqs
  processPrereqs(): void
}

/* ---------------------------------------- */

export { prereqsSchema, type IPrereqs }
