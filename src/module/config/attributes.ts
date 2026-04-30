import { fields } from '@gurps-types/foundry/index.js'
import { GcsAttributeDefinition } from '@module/actor/data/gcs-character/attribute-definition.js'
import { AttributeThreshold } from '@module/actor/data/gcs-character/attribute-threshold.js'

type AttrData = fields.DataField.AssignmentTypeFor<fields.EmbeddedDataField<typeof GcsAttributeDefinition>>
type ThresholdData = fields.DataField.AssignmentTypeFor<fields.EmbeddedDataField<typeof AttributeThreshold>>

const withId = (data: Omit<AttrData, '_id'>): [string, AttrData] => {
  const _id = foundry.utils.randomID()

  return [_id, { ...data, _id } as AttrData]
}

const withThresholdId = (data: Omit<ThresholdData, '_id'>): [string, ThresholdData] => {
  const _id = foundry.utils.randomID()

  return [_id, { ...data, _id } as ThresholdData]
}

/* ---------------------------------------- */

const defaultAttributes = (): Record<string, AttrData> => {
  return Object.fromEntries([
    withId({
      attrId: 'st',
      type: GcsAttributeDefinition.TYPES.Integer,
      placement: GcsAttributeDefinition.PLACEMENTS.Automatic,
      base: '10',
      name: 'ST',
      fullName: 'Strength',
      costPerPoint: 10,
      costAdjustmentPerSizeMod: 10,
    }),
    withId({
      attrId: 'dx',
      type: GcsAttributeDefinition.TYPES.Integer,
      placement: GcsAttributeDefinition.PLACEMENTS.Automatic,
      base: '10',
      name: 'DX',
      fullName: 'Dexterity',
      costPerPoint: 20,
      costAdjustmentPerSizeMod: 0,
    }),
    withId({
      attrId: 'iq',
      type: GcsAttributeDefinition.TYPES.Integer,
      placement: GcsAttributeDefinition.PLACEMENTS.Automatic,
      base: '10',
      name: 'IQ',
      fullName: 'Intelligence',
      costPerPoint: 20,
      costAdjustmentPerSizeMod: 0,
    }),
    withId({
      attrId: 'ht',
      type: GcsAttributeDefinition.TYPES.Integer,
      placement: GcsAttributeDefinition.PLACEMENTS.Automatic,
      base: '10',
      name: 'HT',
      fullName: 'Health',
      costPerPoint: 10,
      costAdjustmentPerSizeMod: 0,
    }),
    withId({
      attrId: 'will',
      type: GcsAttributeDefinition.TYPES.Integer,
      placement: GcsAttributeDefinition.PLACEMENTS.Automatic,
      base: '$iq',
      name: 'Will',
      fullName: '',
      costPerPoint: 5,
      costAdjustmentPerSizeMod: 0,
    }),
    withId({
      attrId: 'fright_check',
      type: GcsAttributeDefinition.TYPES.Integer,
      placement: GcsAttributeDefinition.PLACEMENTS.Automatic,
      base: '$will',
      name: 'Fright Check',
      fullName: '',
      costPerPoint: 2,
      costAdjustmentPerSizeMod: 0,
    }),
    withId({
      attrId: 'per',
      type: GcsAttributeDefinition.TYPES.Integer,
      placement: GcsAttributeDefinition.PLACEMENTS.Automatic,
      base: '$iq',
      name: 'Per',
      fullName: 'Perception',
      costPerPoint: 5,
      costAdjustmentPerSizeMod: 0,
    }),
    withId({
      attrId: 'hearing',
      type: GcsAttributeDefinition.TYPES.Integer,
      placement: GcsAttributeDefinition.PLACEMENTS.Automatic,
      base: '$per',
      name: 'Hearing',
      fullName: '',
      costPerPoint: 2,
      costAdjustmentPerSizeMod: 0,
    }),
    withId({
      attrId: 'vision',
      type: GcsAttributeDefinition.TYPES.Integer,
      placement: GcsAttributeDefinition.PLACEMENTS.Automatic,
      base: '$per',
      name: 'Vision',
      fullName: '',
      costPerPoint: 2,
      costAdjustmentPerSizeMod: 0,
    }),
    withId({
      attrId: 'taste_smell',
      type: GcsAttributeDefinition.TYPES.Integer,
      placement: GcsAttributeDefinition.PLACEMENTS.Automatic,
      base: '$per',
      name: 'Taste & Smell',
      fullName: '',
      costPerPoint: 2,
      costAdjustmentPerSizeMod: 0,
    }),
    withId({
      attrId: 'touch',
      type: GcsAttributeDefinition.TYPES.Integer,
      placement: GcsAttributeDefinition.PLACEMENTS.Automatic,
      base: '$per',
      name: 'Touch',
      fullName: '',
      costPerPoint: 2,
      costAdjustmentPerSizeMod: 0,
    }),
    withId({
      attrId: 'basic_speed',
      type: GcsAttributeDefinition.TYPES.Decimal,
      placement: GcsAttributeDefinition.PLACEMENTS.Automatic,
      base: '($dx + $ht) / 4',
      name: 'Basic Speed',
      fullName: '',
      costPerPoint: 20,
      costAdjustmentPerSizeMod: 0,
    }),
    withId({
      attrId: 'basic_move',
      type: GcsAttributeDefinition.TYPES.Integer,
      placement: GcsAttributeDefinition.PLACEMENTS.Automatic,
      base: 'Math.floor($basic_speed)',
      name: 'Basic Move',
      fullName: '',
      costPerPoint: 5,
      costAdjustmentPerSizeMod: 0,
    }),
    withId({
      attrId: 'fp',
      type: GcsAttributeDefinition.TYPES.Pool,
      placement: GcsAttributeDefinition.PLACEMENTS.Automatic,
      base: '$ht',
      name: 'fp',
      fullName: 'Fatigue Points',
      costPerPoint: 3,
      costAdjustmentPerSizeMod: 0,
      _thresholds: Object.fromEntries([
        withThresholdId({
          state: 'Unconscious',
          value: '-$fp',
          explanation: '',
          ops: [
            GcsAttributeDefinition.OPS.HalveMove,
            GcsAttributeDefinition.OPS.HalveDodge,
            GcsAttributeDefinition.OPS.HalveST,
          ],
        }),
        withThresholdId({
          state: 'Collapse',
          value: '0',
          explanation:
            '- Roll vs. Will to do anything besides talk or rest; failure causes unconsciousness\n' +
            '- Each FP you lose below 0 also causes 1 HP of injury\n' +
            '- Move, Dodge and ST are halved (B426)',
          ops: [
            GcsAttributeDefinition.OPS.HalveMove,
            GcsAttributeDefinition.OPS.HalveDodge,
            GcsAttributeDefinition.OPS.HalveST,
          ],
        }),
        withThresholdId({
          state: 'Tired',
          value: 'Math.ceil($fp / 3) - 1',
          explanation: 'Move, Dodge and ST are halved (B426)',
          ops: [
            GcsAttributeDefinition.OPS.HalveMove,
            GcsAttributeDefinition.OPS.HalveDodge,
            GcsAttributeDefinition.OPS.HalveST,
          ],
        }),
        withThresholdId({
          state: 'Tiring',
          value: '$fp - 1',
          explanation: '',
          ops: [],
        }),
        withThresholdId({
          state: 'Rested',
          value: '$fp',
          explanation: '',
          ops: [],
        }),
      ]),
    }),
    withId({
      attrId: 'hp',
      type: GcsAttributeDefinition.TYPES.Pool,
      placement: GcsAttributeDefinition.PLACEMENTS.Automatic,
      base: '$st',
      name: 'hp',
      fullName: 'Hit Points',
      costPerPoint: 2,
      costAdjustmentPerSizeMod: 10,
      _thresholds: Object.fromEntries([
        withThresholdId({
          state: 'Dead',
          value: 'Math.round(-$hp * 5)',
          explanation: '',
          ops: [GcsAttributeDefinition.OPS.HalveMove, GcsAttributeDefinition.OPS.HalveDodge],
        }),
        withThresholdId({
          state: 'Dying #4',
          value: 'Math.round(-$hp * 4)',
          explanation:
            '- Roll vs. HT to avoid death\n' +
            '- Roll vs. HT-4 every second to avoid falling unconscious\n' +
            '- Move and Dodge are halved (B419)\n',
          ops: [GcsAttributeDefinition.OPS.HalveMove, GcsAttributeDefinition.OPS.HalveDodge],
        }),
        withThresholdId({
          state: 'Dying #3',
          value: 'Math.round(-$hp * 3)',
          explanation:
            '- Roll vs. HT to avoid death\n' +
            '- Roll vs. HT-3 every second to avoid falling unconscious\n' +
            '- Move and Dodge are halved (B419)\n',
          ops: [GcsAttributeDefinition.OPS.HalveMove, GcsAttributeDefinition.OPS.HalveDodge],
        }),
        withThresholdId({
          state: 'Dying #2',
          value: 'Math.round(-$hp * 2)',
          explanation:
            '- Roll vs. HT to avoid death\n' +
            '- Roll vs. HT-2 every second to avoid falling unconscious\n' +
            '- Move and Dodge are halved (B419)\n',
          ops: [GcsAttributeDefinition.OPS.HalveMove, GcsAttributeDefinition.OPS.HalveDodge],
        }),
        withThresholdId({
          state: 'Dying #1',
          value: 'Math.round(-$hp * 1)',
          explanation:
            '- Roll vs. HT to avoid death\n' +
            '- Roll vs. HT-1 every second to avoid falling unconscious\n' +
            '- Move and Dodge are halved (B419)\n',
          ops: [GcsAttributeDefinition.OPS.HalveMove, GcsAttributeDefinition.OPS.HalveDodge],
        }),
        withThresholdId({
          state: 'Collapse',
          value: '0',
          explanation: '- Roll vs. HT every second to avoid falling unconscious' + '- Move and Dodge are halved (B419)',
          ops: [GcsAttributeDefinition.OPS.HalveMove, GcsAttributeDefinition.OPS.HalveDodge],
        }),
        withThresholdId({
          state: 'Reeling',
          value: 'Math.ceil($hp / 3) - 1',
          explanation: 'Move and Dodge are halved (B419)',
          ops: [GcsAttributeDefinition.OPS.HalveMove, GcsAttributeDefinition.OPS.HalveDodge],
        }),
        withThresholdId({
          state: 'Wounded',
          value: '$hp - 1',
          explanation: '',
          ops: [],
        }),
        withThresholdId({
          state: 'Healthy',
          value: '$hp',
          explanation: '',
          ops: [],
        }),
      ]),
    }),
  ])
}

/* ---------------------------------------- */

export { defaultAttributes }
