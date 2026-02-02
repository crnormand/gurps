import { AnyFeature, FeatureClasses } from '../../features/index.ts'
import { fields } from '../../types/foundry/index.ts'

const featuresSchema = (types = FeatureClasses) => {
  return {
    features: new fields.TypedObjectField(new fields.TypedSchemaField(types)),
  }
}

/* ---------------------------------------- */

interface IFeatures {
  // List of features contained within this item
  features: Record<string, AnyFeature>

  // Apply bonuses from all contained features
  applyBonuses(): void
}

/* ---------------------------------------- */

export { featuresSchema, type IFeatures }
