import { GcsAttributeDefinition } from '../actor/data/gcs-attribute-definition.ts'
import { DataModel } from '../types/foundry/index.ts'

const defaultAttributes = (): DataModel.CreateData<DataModel.SchemaOf<GcsAttributeDefinition>>[] => [
  {
    id: 'st',
    type: GcsAttributeDefinition.TYPES.Integer,
    base: '10',
    name: 'ST',
    fullName: 'Strength',
    costPerPoint: 10,
    costAdjPerSm: 10,
  },
  {
    id: 'dx',
    type: GcsAttributeDefinition.TYPES.Integer,
    base: '10',
    name: 'DX',
    fullName: 'Dexterity',
    costPerPoint: 20,
    costAdjPerSm: 0,
  },
  {
    id: 'iq',
    type: GcsAttributeDefinition.TYPES.Integer,
    base: '10',
    name: 'IQ',
    fullName: 'Intelligence',
    costPerPoint: 20,
    costAdjPerSm: 0,
  },
  {
    id: 'ht',
    type: GcsAttributeDefinition.TYPES.Integer,
    base: '10',
    name: 'HT',
    fullName: 'Health',
    costPerPoint: 10,
  },
  {
    id: 'ht',
    type: GcsAttributeDefinition.TYPES.Integer,
    base: '10',
    name: 'HT',
    fullName: 'Health',
    costPerPoint: 10,
  },
  {
    id: 'will',
    type: GcsAttributeDefinition.TYPES.Integer,
    base: '$iq',
    name: 'Will',
    costPerPoint: 5,
  },
  {
    id: 'fright_check',
    type: GcsAttributeDefinition.TYPES.Integer,
    base: '$will',
    name: 'Fright Check',
    costPerPoint: 2,
  },
  {
    id: 'per',
    type: GcsAttributeDefinition.TYPES.Integer,
    base: '$iq',
    name: 'Per',
    fullName: 'Perception',
    costPerPoint: 5,
  },
  {
    id: 'hearing',
    type: GcsAttributeDefinition.TYPES.Integer,
    base: '$per',
    name: 'Hearing',
    costPerPoint: 2,
  },
  {
    id: 'vision',
    type: GcsAttributeDefinition.TYPES.Integer,
    base: '$per',
    name: 'Vision',
    costPerPoint: 2,
  },
  {
    id: 'taste_smell',
    type: GcsAttributeDefinition.TYPES.Integer,
    base: '$per',
    name: 'Taste & Smell',
    costPerPoint: 2,
  },
  {
    id: 'touch',
    type: GcsAttributeDefinition.TYPES.Integer,
    base: '$per',
    name: 'Touch',
    costPerPoint: 2,
  },
  {
    id: 'basic_speed',
    type: GcsAttributeDefinition.TYPES.Decimal,
    base: '($dx + $ht) / 4',
    name: 'Basic Speed',
    costPerPoint: 20,
  },
  {
    id: 'basic_move',
    type: GcsAttributeDefinition.TYPES.Integer,
    base: 'Math.floor($basic_speed)',
    name: 'Basic Move',
    costPerPoint: 5,
  },
  {
    id: 'fp',
    type: GcsAttributeDefinition.TYPES.Pool,
    base: '$ht',
    name: 'fp',
    fullName: 'Fatigue Points',
    costPerPoint: 3,
    thresholds: [
      {
        state: 'Unconscious',
        value: '-$fp',
        explanation: '',
        ops: [
          GcsAttributeDefinition.OPS.HalveMove,
          GcsAttributeDefinition.OPS.HalveDodge,
          GcsAttributeDefinition.OPS.HalveST,
        ],
      },
      {
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
      },
      {
        state: 'Tired',
        value: 'Math.ceil($fp / 3) - 1',
        explanation: 'Move, Dodge and ST are halved (B426)',
        ops: [
          GcsAttributeDefinition.OPS.HalveMove,
          GcsAttributeDefinition.OPS.HalveDodge,
          GcsAttributeDefinition.OPS.HalveST,
        ],
      },
      {
        state: 'Tiring',
        value: '$fp - 1',
        explanation: '',
        ops: [],
      },
      {
        state: 'Rested',
        value: '$fp',
        explanation: '',
        ops: [],
      },
    ],
  },
  {
    id: 'hp',
    type: GcsAttributeDefinition.TYPES.Pool,
    base: '$st',
    name: 'hp',
    fullName: 'Hit Points',
    costPerPoint: 2,
    costAdjPerSm: 10,
    thresholds: [
      {
        state: 'Dead',
        value: 'Math.round(-$hp * 5)',
        explanation: '',
        ops: [GcsAttributeDefinition.OPS.HalveMove, GcsAttributeDefinition.OPS.HalveDodge],
      },
      {
        state: 'Dying #4',
        value: 'Math.round(-$hp * 4)',
        explanation:
          '- Roll vs. HT to avoid death\n' +
          '- Roll vs. HT-4 every second to avoid falling unconscious\n' +
          '- Move and Dodge are halved (B419)\n',
        ops: [GcsAttributeDefinition.OPS.HalveMove, GcsAttributeDefinition.OPS.HalveDodge],
      },
      {
        state: 'Dying #3',
        value: 'Math.round(-$hp * 3)',
        explanation:
          '- Roll vs. HT to avoid death\n' +
          '- Roll vs. HT-3 every second to avoid falling unconscious\n' +
          '- Move and Dodge are halved (B419)\n',
        ops: [GcsAttributeDefinition.OPS.HalveMove, GcsAttributeDefinition.OPS.HalveDodge],
      },
      {
        state: 'Dying #2',
        value: 'Math.round(-$hp * 2)',
        explanation:
          '- Roll vs. HT to avoid death\n' +
          '- Roll vs. HT-4 every second to avoid falling unconscious\n' +
          '- Move and Dodge are halved (B419)\n',
        ops: [GcsAttributeDefinition.OPS.HalveMove, GcsAttributeDefinition.OPS.HalveDodge],
      },
      {
        state: 'Dying #2',
        value: 'Math.round(-$hp * 2)',
        explanation:
          '- Roll vs. HT to avoid death\n' +
          '- Roll vs. HT-2 every second to avoid falling unconscious\n' +
          '- Move and Dodge are halved (B419)\n',
        ops: [GcsAttributeDefinition.OPS.HalveMove, GcsAttributeDefinition.OPS.HalveDodge],
      },
      {
        state: 'Dying #1',
        value: 'Math.round(-$hp * 1)',
        explanation:
          '- Roll vs. HT to avoid death\n' +
          '- Roll vs. HT-1 every second to avoid falling unconscious\n' +
          '- Move and Dodge are halved (B419)\n',
        ops: [GcsAttributeDefinition.OPS.HalveMove, GcsAttributeDefinition.OPS.HalveDodge],
      },
      {
        state: 'Collapse',
        value: '0',
        explanation: '- Roll vs. HT every second to avoid falling unconscious' + '- Move and Dodge are halved (B419)',
        ops: [GcsAttributeDefinition.OPS.HalveMove, GcsAttributeDefinition.OPS.HalveDodge],
      },
      {
        state: 'Reeling',
        value: 'Math.ceil($hp / 3) - 1',
        explanation: 'Move and Dodge are halved (B419)',
        ops: [GcsAttributeDefinition.OPS.HalveMove, GcsAttributeDefinition.OPS.HalveDodge],
      },
      {
        state: 'Wounded',
        value: '$hp - 1',
        explanation: '',
        ops: [],
      },
      {
        state: 'Healthy',
        value: '$hp',
        explanation: '',
        ops: [],
      },
    ],
  },
]

/* ---------------------------------------- */

export { defaultAttributes }
