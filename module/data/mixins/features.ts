import { BaseFeature } from '../../features/index.ts'
import { CollectionField } from '../fields/collection-field.ts'
import { ModelCollection } from '../model-collection.ts'

const featuresSchema = () => {
  return {
    features: new CollectionField(BaseFeature),
  }
}

/* ---------------------------------------- */

interface IFeatures {
  // List of features contained within this item
  features: ModelCollection<BaseFeature<any>>

  // Apply bonuses from all contained features
  applyBonuses(): void
}

/* ---------------------------------------- */

export { featuresSchema, type IFeatures }
