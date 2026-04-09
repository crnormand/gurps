import { getGame } from '@module/util/guards.js'

export function shouldMigrateCompendium(pack: CompendiumCollection<any>): boolean {
  // We only care about actor and item migrations
  if (!['Actor', 'Item'].includes(pack.documentName)) return false

  // World compendiums should all be migrated, system ones should never be migrated
  if (pack.metadata.packageType === 'world') return true
  if (pack.metadata.packageType === 'system') return false

  // Module compendiums should only be migrated if they don't have a download or manifest URL
  //
  const module = getGame().modules.get(pack.metadata.packageName)

  return !!module && !module.download && !module.manifest
}
