import { fields } from '../../types/foundry/index.js'
import { Feature, SkillBonus } from '../features/index.ts'

const featureHolderSchema = () => {
  return {
    features: new fields.ArrayField(new fields.TypedSchemaField({ skillBonus: SkillBonus })),
  }
}

/* ---------------------------------------- */

interface IFeatureHolder {
  // List of features contained within this holder
  features: Feature[]

  // Apply bonuses from all contained features
  applyBonuses(): void
}

/* ---------------------------------------- */

class FeatureHolder {}

/* ---------------------------------------- */

export { FeatureHolder, featureHolderSchema, type IFeatureHolder }
