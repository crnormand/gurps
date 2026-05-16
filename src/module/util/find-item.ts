import { MeleeAttackModel } from '@module/action/melee-attack.js'
import { RangedAttackModel } from '@module/action/ranged-attack.js'
import { CharacterModel } from '@module/actor/data/character.js'
import { ActorType } from '@module/actor/types.js'
import { ItemType } from '@module/item/types.js'

type CharacterOrActor = Actor.Implementation | CharacterModel

function resolveCharacterModel(actor: CharacterOrActor): CharacterModel | null {
  if (actor instanceof CharacterModel) return actor
  const actorDoc = actor as Actor.Implementation

  return actorDoc.isOfType(ActorType.Character) ? actorDoc.system : null
}

/* ---------------------------------------- */

export function findSkill(actor: CharacterOrActor, name: string): Item.OfType<ItemType.Skill> | null {
  return resolveCharacterModel(actor)?.findSkill(name) ?? null
}

/* ---------------------------------------- */

export function findSpell(actor: CharacterOrActor, name: string): Item.OfType<ItemType.Spell> | null {
  return resolveCharacterModel(actor)?.findSpell(name) ?? null
}

/* ---------------------------------------- */

export function findSkillSpell(
  actor: CharacterOrActor,
  name: string,
  isSkillOnly: true,
  isSpellOnly?: false
): Item.OfType<ItemType.Skill> | null
export function findSkillSpell(
  actor: CharacterOrActor,
  name: string,
  isSkillOnly: false | undefined,
  isSpellOnly: true
): Item.OfType<ItemType.Spell> | null
export function findSkillSpell(
  actor: CharacterOrActor,
  name: string,
  isSkillOnly?: boolean,
  isSpellOnly?: boolean
): Item.OfType<ItemType.Skill | ItemType.Spell> | null

export function findSkillSpell(
  actor: CharacterOrActor,
  name: string,
  isSkillOnly = false,
  isSpellOnly = false
): Item.OfType<ItemType.Skill | ItemType.Spell> | null {
  return resolveCharacterModel(actor)?.findSkillSpell(name, isSkillOnly, isSpellOnly) ?? null
}

/* ---------------------------------------- */

export function findAdDisad(actor: CharacterOrActor, name: string): Item.OfType<ItemType.Trait> | null {
  return resolveCharacterModel(actor)?.findAdvantage(name) ?? null
}

/* ---------------------------------------- */

export function findAttack(
  actor: CharacterOrActor,
  name: string,
  isMelee: true,
  isRanged: false
): MeleeAttackModel | null
export function findAttack(
  actor: CharacterOrActor,
  name: string,
  isMelee: false,
  isRanged: true
): RangedAttackModel | null
export function findAttack(
  actor: CharacterOrActor,
  name: string,
  isMelee?: boolean,
  isRanged?: boolean
): MeleeAttackModel | RangedAttackModel | null

export function findAttack(
  actor: CharacterOrActor,
  name: string,
  isMelee = true,
  isRanged = true
): MeleeAttackModel | RangedAttackModel | null {
  return resolveCharacterModel(actor)?.findAttack(name, isMelee, isRanged) ?? null
}
