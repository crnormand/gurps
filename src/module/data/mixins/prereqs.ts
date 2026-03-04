import { AnyPrereq, AnyPrereqClass, BasePrereq, PrereqList, PrereqType } from '@module/prereqs/index.js'

import { NumericComparison } from '../criteria/number-criteria.js'
import { CollectionField } from '../fields/collection-field.js'
import { ModelCollection } from '../model-collection.js'

const RootPrereqID = 'RdIneBreTqzetRFN'

const prereqsSchema = () => {
  return {
    _prereqs: new CollectionField(BasePrereq as AnyPrereqClass, {
      initial: () => {
        return {
          [RootPrereqID]: {
            _id: RootPrereqID,
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
  _prereqs: ModelCollection<AnyPrereq>

  prereqs: PrereqList

  // process all contained prereqs
  processPrereqs(): void
}

/* ---------------------------------------- */

function preparePrereqs(this: IPrereqs & { parent: { name: string } }) {
  this._prereqs.forEach(prereq => prereq.prepareBaseData())

  const rootPrereq = this._prereqs.find(prereq => prereq.type === PrereqType.List && prereq.containerId === null)

  if (!rootPrereq) {
    console.error(`No root prereq found for equipment item ${this.parent.name}`)
  } else {
    this.prereqs = rootPrereq as PrereqList
  }
}

/* ---------------------------------------- */

export { prereqsSchema, type IPrereqs, type IPrereqsBaseData, preparePrereqs }
