import { DataModel } from '@gurps-types/foundry/index.js'
import { GcsBody } from '@module/actor/data/gcs-character/body.js'

// NOTE: These IDs are entirely arbitrary and I'm not convinced they need
// to be defined. They are defined here solely so that we don't have to run
// foundry.util.randomID() several times when a character is initialized, but
// this config will be replaced with a system setting which will override them
// anyway.
const DEFAULT_HIT_LOCATION_IDS = {
  root: 'c7PF42VF2r8YpSr4',
  eye: 'bLM23MN4BhH8M51m',
  skull: 'Zx3il92nP2KVNU5W',
  face: 'SV8i8PlVHFOh8rDJ',
  leg: 'z9gLtxDli6DR2ny0',
  arm: 'E2DByAda186bXzAt',
  torso: 'D2XDhfxih1zlH0bw',
  groin: 'AoggKLqq64FbRcuj',
  hand: 'D81oAKua35jm9EUp',
  foot: '0PRNdGnroByikZa8',
  neck: 'KfwJHJNW34STtBXZ',
  vitals: 'WfU8Dm7yJvG8HGoA',
}

const foo = 'WfU8Dm7yJvG8HGoB'

const defaultBodyType = (): DataModel.CreateData<DataModel.SchemaOf<GcsBody>> => {
  return {
    _id: DEFAULT_HIT_LOCATION_IDS.root,
    name: 'Humanoid',
    roll: '3d',
    _subTables: {
      [foo]: {
        _id: foo,
        roll: '',
        sort: 0,
        _owningLocation: DEFAULT_HIT_LOCATION_IDS.skull,
      },
    },
    _locations: {
      [DEFAULT_HIT_LOCATION_IDS.eye]: {
        _id: DEFAULT_HIT_LOCATION_IDS.eye,
        sort: 0,
        _owningTable: foo,
        drBonus: 0,
        notes: '',
        locationId: 'eye',
        choiceName: 'Eyes',
        tableName: 'Eyes',
        slots: 0,
        hitPenalty: -9,
        description:
          'An attack that misses by 1 hits the torso instead. Only\nimpaling (imp), piercing (pi-, pi, pi+, pi++), and\ntight-beam burning (burn) attacks can target the eye – and\nonly from the front or sides. Injury over HP÷10 blinds the\neye. Otherwise, treat as skull, but without the extra DR!',
      },
      [DEFAULT_HIT_LOCATION_IDS.skull]: {
        _id: DEFAULT_HIT_LOCATION_IDS.skull,
        sort: 1,
        _owningTable: null,
        notes: '',
        locationId: 'skull',
        choiceName: 'Skull',
        tableName: 'Skull',
        slots: 2,
        hitPenalty: -7,
        drBonus: 2,
        description:
          'An attack that misses by 1 hits the torso instead. Wounding\nmodifier is x4. Knockdown rolls are at -10. Critical hits\nuse the Critical Head Blow Table (B556). Exception: These\nspecial effects do not apply to toxic (tox) damage.',
      },
      [DEFAULT_HIT_LOCATION_IDS.face]: {
        _id: DEFAULT_HIT_LOCATION_IDS.face,
        sort: 2,
        _owningTable: null,
        drBonus: 0,
        notes: '',
        locationId: 'face',
        choiceName: 'Face',
        tableName: 'Face',
        slots: 1,
        hitPenalty: -5,
        description:
          'An attack that misses by 1 hits the torso instead. Jaw,\ncheeks, nose, ears, etc. If the target has an open-faced\nhelmet, ignore its DR. Knockdown rolls are at -5. Critical\nhits use the Critical Head Blow Table (B556). Corrosion\n(cor) damage gets a x1½ wounding modifier, and if it\ninflicts a major wound, it also blinds one eye (both eyes on\ndamage over full HP). Random attacks from behind hit the\nskull instead.',
      },
      [DEFAULT_HIT_LOCATION_IDS.leg]: {
        _id: DEFAULT_HIT_LOCATION_IDS.leg,
        sort: 3,
        _owningTable: null,
        drBonus: 0,
        notes: '',
        locationId: 'leg',
        choiceName: 'Leg',
        tableName: 'Right Leg',
        slots: 2,
        hitPenalty: -2,
        description:
          'Reduce the wounding multiplier of large piercing (pi+), huge\npiercing (pi++), and impaling (imp) damage to x1. Any major\nwound (loss of over ½ HP from one blow) cripples the limb.\nDamage beyond that threshold is lost.',
      },
      [DEFAULT_HIT_LOCATION_IDS.arm]: {
        _id: DEFAULT_HIT_LOCATION_IDS.arm,
        sort: 4,
        _owningTable: null,
        drBonus: 0,
        notes: '',
        locationId: 'arm',
        choiceName: 'Arm',
        tableName: 'Right Arm',
        slots: 1,
        hitPenalty: -2,
        description:
          'Reduce the wounding multiplier of large piercing (pi+), huge\npiercing (pi++), and impaling (imp) damage to x1. Any major\nwound (loss of over ½ HP from one blow) cripples the limb.\nDamage beyond that threshold is lost. If holding a shield,\ndouble the penalty to hit: -4 for shield arm instead of -2.',
      },
      [DEFAULT_HIT_LOCATION_IDS.torso]: {
        _id: DEFAULT_HIT_LOCATION_IDS.torso,
        sort: 5,
        _owningTable: null,
        drBonus: 0,
        notes: '',
        locationId: 'torso',
        choiceName: 'Torso',
        tableName: 'Torso',
        slots: 2,
        hitPenalty: 2,
        description: '',
      },
      [DEFAULT_HIT_LOCATION_IDS.groin]: {
        _id: DEFAULT_HIT_LOCATION_IDS.groin,
        sort: 6,
        _owningTable: null,
        drBonus: 0,
        notes: '',
        locationId: 'groin',
        choiceName: 'Groin',
        tableName: 'Groin',
        slots: 1,
        hitPenalty: -3,
        description:
          'An attack that misses by 1 hits the torso instead. Human\nmales and the males of similar species suffer double shock\nfrom crushing (cr) damage, and get -5 to knockdown rolls.\nOtherwise, treat as a torso hit.',
      },
      [DEFAULT_HIT_LOCATION_IDS.arm]: {
        _id: DEFAULT_HIT_LOCATION_IDS.arm,
        sort: 7,
        _owningTable: null,
        drBonus: 0,
        notes: '',
        locationId: 'arm',
        choiceName: 'Arm',
        tableName: 'Left Arm',
        slots: 1,
        hitPenalty: -2,
        description:
          'Reduce the wounding multiplier of large piercing (pi+), huge\npiercing (pi++), and impaling (imp) damage to x1. Any major\nwound (loss of over ½ HP from one blow) cripples the limb.\nDamage beyond that threshold is lost. If holding a shield,\ndouble the penalty to hit: -4 for shield arm instead of -2.',
      },
      [DEFAULT_HIT_LOCATION_IDS.leg]: {
        _id: DEFAULT_HIT_LOCATION_IDS.leg,
        sort: 8,
        _owningTable: null,
        drBonus: 0,
        notes: '',
        locationId: 'leg',
        choiceName: 'Leg',
        tableName: 'Left Leg',
        slots: 2,
        hitPenalty: -2,
        description:
          'Reduce the wounding multiplier of large piercing (pi+), huge\npiercing (pi++), and impaling (imp) damage to x1. Any major\nwound (loss of over ½ HP from one blow) cripples the limb.\nDamage beyond that threshold is lost.',
      },
      [DEFAULT_HIT_LOCATION_IDS.hand]: {
        _id: DEFAULT_HIT_LOCATION_IDS.hand,
        sort: 9,
        _owningTable: null,
        drBonus: 0,
        notes: '',
        locationId: 'hand',
        choiceName: 'Hand',
        tableName: 'Hand',
        slots: 1,
        hitPenalty: -4,
        description:
          'If holding a shield, double the penalty to hit: -8 for\nshield hand instead of -4. Reduce the wounding multiplier of\nlarge piercing (pi+), huge piercing (pi++), and impaling\n(imp) damage to x1. Any major wound (loss of over ⅓ HP\nfrom one blow) cripples the extremity. Damage beyond that\nthreshold is lost.',
      },
      [DEFAULT_HIT_LOCATION_IDS.foot]: {
        _id: DEFAULT_HIT_LOCATION_IDS.foot,
        sort: 10,
        _owningTable: null,
        drBonus: 0,
        notes: '',
        locationId: 'foot',
        choiceName: 'Foot',
        tableName: 'Foot',
        slots: 1,
        hitPenalty: -4,
        description:
          'Reduce the wounding multiplier of large piercing (pi+), huge\npiercing (pi++), and impaling (imp) damage to x1. Any major\nwound (loss of over ⅓ HP from one blow) cripples the\nextremity. Damage beyond that threshold is lost.',
      },
      [DEFAULT_HIT_LOCATION_IDS.neck]: {
        _id: DEFAULT_HIT_LOCATION_IDS.neck,
        sort: 11,
        _owningTable: null,
        drBonus: 0,
        notes: '',
        locationId: 'neck',
        choiceName: 'Neck',
        tableName: 'Neck',
        slots: 2,
        hitPenalty: -5,
        description:
          'An attack that misses by 1 hits the torso instead. Neck and\nthroat. Increase the wounding multiplier of crushing (cr)\nand corrosion (cor) attacks to x1½, and that of cutting\n(cut) damage to x2. At the GM’s option, anyone killed by a\ncutting (cut) blow to the neck is decapitated!',
      },
      [DEFAULT_HIT_LOCATION_IDS.vitals]: {
        _id: DEFAULT_HIT_LOCATION_IDS.vitals,
        sort: 12,
        _owningTable: null,
        drBonus: 0,
        notes: '',
        locationId: 'vitals',
        choiceName: 'Vitals',
        tableName: 'Vitals',
        slots: 0,
        hitPenalty: -3,
        description:
          'An attack that misses by 1 hits the torso instead. Heart,\nlungs, kidneys, etc. Increase the wounding modifier for an\nimpaling (imp) or any piercing (pi-, pi, pi+, pi++) attack\nto x3. Increase the wounding modifier for a tight-beam\nburning (burn) attack to x2. Other attacks cannot target the\nvitals.',
      },
    },
  }
}

/* ---------------------------------------- */

export { defaultBodyType }
