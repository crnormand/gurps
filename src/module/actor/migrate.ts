import { fields, DataModel } from '@gurps-types/foundry/index.js'

import { ActorV1Model } from './legacy/actorv1-interface.js'

async function migrateActorSystem(
  oldData: ActorV1Model
): Promise<fields.SchemaField.CreateData<DataModel.SchemaOf<Actor.SystemOfType<'characterV2'>>>> {
  const newData: fields.SchemaField.CreateData<DataModel.SchemaOf<Actor.SystemOfType<'characterV2'>>> = {
    attributes: oldData.attributes,
    HP: oldData.HP,
    FP: oldData.FP,
    QP: oldData.QP,
    dodge: oldData.dodge,
    basicmove: {
      value: Number(oldData.basicmove.value),
      points: oldData.basicmove.points,
    },
    basicspeed: {
      value: Number(oldData.basicspeed.value),
      points: oldData.basicspeed.points,
    },
    frightcheck: oldData.frightcheck,
    hearing: oldData.hearing,
    tastesmell: oldData.tastesmell,
    vision: oldData.vision,
    touch: oldData.touch,

    thrust: oldData.thrust,
    swing: oldData.swing,

    additionalresources: {
      qnotes: oldData.additionalresources?.qnotes,
      bodyplan: oldData.additionalresources?.bodyplan,
      // NOTE: Ideally tracker would be a TypedObjectField
      // instead of an ArrayField so we can updated trackers without
      // replacing the whole array.
      // TODO: Discuss and consider.
      tracker: Object.values(oldData.additionalresources?.tracker),
      importname: oldData.additionalresources?.importname,
      importpath: oldData.additionalresources?.importpath,
    },

    conditionalinjury: {
      RT: {
        value: Number(oldData.conditionalinjury.RT.value),
        points: oldData.conditionalinjury.RT.points,
      },
      injury: {
        severity: oldData.conditionalinjury.injury.severity,
        daystoheal: oldData.conditionalinjury.injury.daystoheal,
      },
    },

    traits: {
      title: oldData.traits.title,
      race: oldData.traits.race,
      height: oldData.traits.height,
      weight: oldData.traits.weight,
      age: oldData.traits.age,
      birthday: oldData.traits.birthday,
      religion: oldData.traits.religion,
      gender: oldData.traits.gender,
      eyes: oldData.traits.eyes,
      hair: oldData.traits.hair,
      hand: oldData.traits.hand,
      skin: oldData.traits.skin,
      sizemod: Number(oldData.traits.sizemod),
      techlevel: oldData.traits.techlevel,
      createdon: oldData.traits.createdon,
      modifiedon: oldData.traits.modifiedon,
      player: oldData.traits.player,
    },

    conditions: {
      actions: {
        maxActions: oldData.conditions.actions?.maxActions,
        maxBlocks: oldData.conditions.actions?.maxBlocks,
      },
      posture: oldData.conditions.posture,
      maneuver: oldData.conditions.maneuver,
      // TODO: Check why this is number | string
      move: String(oldData.conditions.move),
      self: {
        modifiers: [],
      },
      target: {
        modifiers: [],
      },
      usermods: [],

      reeling: oldData.conditions.reeling,
      exhausted: oldData.conditions.exhausted,

      damageAccumulators: [],
    },

    // TODO: Change note into an Item or something, really shouldn't have this vestigial
    // non-Foundry items Array present
    allNotes: [],
  }

  // Check for missing fields or other bad info
  if (!newData.traits?.sizemod || isNaN(newData.traits.sizemod)) {
    // Should never happen but better than a non-null assertion.
    newData.traits ||= {}
    newData.traits.sizemod = 0
  }

  // NOTE: Again, this should be a TypedObjectField instead of an ArrayField.
  // Potentially a candidate for PseudoDocument collection.
  // TODO: Discuss with the team.
  newData.hitlocationsV2 = []

  newData.moveV2 = []

  return newData
}

export { migrateActorSystem }
