import { BasePrereq, PrereqList, PrereqType } from '@module/prereqs/index.js'

import { NumericComparison } from '../criteria/number-criteria.js'
import { CollectionField } from '../fields/collection-field.js'
import { ModelCollection } from '../model-collection.js'

const prereqsSchema = () => {
  const _id = foundry.utils.randomID()

  return {
    _prereqs: new CollectionField(BasePrereq, {
      initial: () => {
        return {
          [_id]: {
            _id,
            type: PrereqType.List,
            containerId: null,
            all: true,
            whenTl: { compare: NumericComparison.Any, qualifier: null },
          },
        }
      },
    }),
  }
}

/* ---------------------------------------- */

interface IPrereqsBaseData {
  prereqs: PrereqList
}

interface IPrereqs {
  // List of prereqs contained within this item
  _prereqs: ModelCollection<BasePrereq<BasePrereq.Schema>>

  prereqs: PrereqList

  // process all contained prereqs
  processPrereqs(): void
}

/* ---------------------------------------- */

function preparePrereqs(this: IPrereqs & { parent: { name: string } }) {
  this._prereqs.forEach(prereq => prereq.prepareBaseData())

  const rootPrereq = this._prereqs.find(prereq => prereq.isOfType(PrereqType.List) && prereq.containerId === null)

  if (!rootPrereq) {
    console.error(`No root prereq found for equipment item ${this.parent.name}`)
  } else {
    this.prereqs = rootPrereq as unknown as PrereqList
  }
}

/* ---------------------------------------- */

export { prereqsSchema, type IPrereqs, type IPrereqsBaseData, preparePrereqs }
