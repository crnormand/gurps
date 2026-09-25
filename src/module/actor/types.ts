export enum ActorType {
  Character = 'character',
  GcsCharacter = 'gcsCharacter',
  GcsLoot = 'gcsLoot',
}

/* ---------------------------------------- */

interface CheckInfo {
  img?: any
  symbol: string
  label: string
  mode?: string
  value: number | string
  damage?: string
  notes?: string
  otf: string
  otfDamage?: string
  isOTF?: boolean
  type?: string
}
/* ---------------------------------------- */

export { type CheckInfo }
