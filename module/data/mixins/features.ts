import { fields } from '../../types/foundry/index.ts'
import { Feature, SkillBonus } from '../features/index.ts'

const featuresSchema = () => {
  return {
    features: new fields.ArrayField(new fields.TypedSchemaField({ skillBonus: SkillBonus })),
  }
}

/* ---------------------------------------- */

interface IFeatures {
  // List of features contained within this item
  features: Feature[]

  // Apply bonuses from all contained features
  applyBonuses(): void
}

/* ---------------------------------------- */

export { featuresSchema, type IFeatures }
