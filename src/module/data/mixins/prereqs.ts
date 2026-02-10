import { BasePrereq } from '../../prereqs/index.js'
import { CollectionField } from '../fields/collection-field.js'
import { ModelCollection } from '../model-collection.js'

const prereqsSchema = () => {
  return {
    prereqs: new CollectionField(BasePrereq),
  }
}

/* ---------------------------------------- */

interface IPrereqs {
  // List of prereqs contained within this item
  prereqs: ModelCollection<BasePrereq<any>>

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
