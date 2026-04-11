import { HitLocationRole, RulesHitLocationTable } from './types.js'

const humanoid: RulesHitLocationTable = {
  name: 'Humanoid',
  roll: '3d6',
  locations: [
    {
      name: 'Eyes',
      dr: 0,
      penalty: -9,
      role: HitLocationRole.Eye,
      slots: 0,
    },
    {
      name: 'Skull',
      dr: 2,
      penalty: -7,
      role: HitLocationRole.Skull,
      slots: 2,
    },
    {
      name: 'Face',
      dr: 0,
      penalty: -5,
      role: HitLocationRole.Face,
      slots: 1,
    },
    {
      name: 'Right Leg',
      dr: 0,
      penalty: -2,
      role: HitLocationRole.Limb,
      slots: 2,
    },
    {
      name: 'Right Arm',
      dr: 0,
      penalty: -2,
      role: HitLocationRole.Limb,
      slots: 1,
    },
    {
      name: 'Torso',
      dr: 0,
      penalty: 0,
      role: HitLocationRole.Chest,
      slots: 2,
    },
    {
      name: 'Groin',
      dr: 0,
      penalty: -3,
      role: HitLocationRole.Groin,
      slots: 1,
    },
    {
      name: 'Left Arm',
      dr: 0,
      penalty: -2,
      role: HitLocationRole.Limb,
      slots: 1,
    },
    {
      name: 'Left Leg',
      dr: 0,
      penalty: -2,
      role: HitLocationRole.Limb,
      slots: 2,
    },
    {
      name: 'Hand',
      dr: 0,
      penalty: -4,
      role: HitLocationRole.Extremity,
      slots: 1,
    },
    {
      name: 'Foot',
      dr: 0,
      penalty: -4,
      role: HitLocationRole.Extremity,
      slots: 1,
    },
    {
      name: 'Neck',
      dr: 0,
      penalty: -5,
      role: HitLocationRole.Neck,
      slots: 2,
    },
    {
      name: 'Vitals',
      dr: 0,
      penalty: -3,
      role: HitLocationRole.Vitals,
      slots: 0,
    },
  ],
}

export const HitLocationTables = {
  humanoid,
}
