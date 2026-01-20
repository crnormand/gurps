import * as Settings from './miscellaneous-settings.js'
import { SemanticVersion } from './semver.js'

export class Migration {
  constructor() {
    this.currentVersion = SemanticVersion.fromString(
      game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_MIGRATION_VERSION)
    )
    this.migrationVersion = SemanticVersion.fromString(game.system.version)

    /**
     * To add a new migration, add a new function to this array.
     * The function should take care of determining if the migration is needed.
     *
     * All migrations should be idempotent (i.e. they should be able to run multiple times without causing issues):
     *
     * - If a migration is not needed, it should return early.
     * - If a migration is needed, it should perform the migration and return a promise.
     * - If a migration fails, it should log the error and continue with the next migration.
     * - If a migration is successful, it should log the success message.
     */
    this.migrations = [
      this.showConfirmationDialogIfAutoAddIsTrue.bind(this), // show confirmation dialog if autoAdd is true
      this.migrateBadDamageChatMessages.bind(this), // migrate bad damage chat messages
      this.migrateActorComponentsToItems.bind(this), // migrate system.ads, system.skills, system.spells, system.eqt, and system.melee to Items
    ]
  }

  static run() {
    const migration = new Migration()
    migration.runMigrations()
  }

  runMigrations() {
    for (const migration of this.migrations) {
      migration()
        .then(() => {
          console.log(`Migration ${migration.name} completed successfully.`)
        })
        .catch(error => {
          console.error(`Migration ${migration.name} failed:`, error)
        })
    }
  }

  async showConfirmationDialogIfAutoAddIsTrue() {
    if (this.migrationVersion.isHigherThan(this.currentVersion)) {
      const taggedModifiers = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_TAGGED_MODIFIERS)
      if (!taggedModifiers) {
        return
      }

      if (taggedModifiers.autoAdd) {
        game.settings.set(Settings.SYSTEM_NAME, Settings.SETTING_SHOW_CONFIRMATION_ROLL_DIALOG, true)
      }
    }
  }

  async migrateBadDamageChatMessages() {
    // if (this.migrationVersion.isHigherThan(this.currentVersion)) {
    const chatMessages = game.messages.contents.filter(message =>
      message.content.includes('<div class="damage-chat-message">')
    )

    for (const message of chatMessages) {
      if (!message.flags?.gurps?.transfer) {
        const transfer = message.flags.transfer
        await message.update({ 'flags.gurps.transfer': JSON.parse(transfer) })
      } else {
        console.log(`Already migrated: ${message.id}:`, message.flags)
      }
    }
    // }
  }

  /**
   * Migrate actor components (advantages and skills) from persisted actor.system data to Items.
   * This converts existing data without losing it, storing components as Items instead of actor data.
   */
  async migrateActorComponentsToItems() {
    // Only run if USE_FOUNDRY_ITEMS setting is enabled
    if (!game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_FOUNDRY_ITEMS)) {
      console.log('Skipping actor components migration: USE_FOUNDRY_ITEMS setting is disabled')
      return
    }

    // Only run if version is higher than current (on upgrade)
    if (!this.migrationVersion.isHigherThan(this.currentVersion)) {
      return
    }

    console.log(
      'Starting migration: Convert system.ads, system.skills, system.spells, system.eqt, and system.melee to Items'
    )

    let migratedAdvantages = 0
    let migratedSkills = 0
    let migratedSpells = 0
    let migratedEquipment = 0
    let migratedMelee = 0
    let actorsProcessed = 0

    for (const actor of game.actors.contents) {
      const itemsToCreate = []

      // Check if migration is needed for advantages
      const hasAdvantages = actor.system.ads && Object.keys(actor.system.ads).length > 0
      const hasFeatureItems = actor.items.contents.some(item => item.type === 'feature')

      // Migrate advantages if they exist and no feature Items yet
      if (hasAdvantages && !hasFeatureItems) {
        const processAdvantage = (advantage, parentUuid = '') => {
          if (!advantage.uuid) {
            advantage.uuid = foundry.utils.randomID(16)
          }
          if (parentUuid) {
            advantage.parentuuid = parentUuid
          }

          itemsToCreate.push({
            type: 'feature',
            name: advantage.name || 'Advantage',
            system: {
              fea: advantage,
            },
          })

          migratedAdvantages++

          // Process children in contains
          if (advantage.contains && Object.keys(advantage.contains).length > 0) {
            for (const childKey in advantage.contains) {
              processAdvantage(advantage.contains[childKey], advantage.uuid)
            }
          }
        }

        // Process all top-level advantages
        for (const advKey in actor.system.ads) {
          const advantage = foundry.utils.duplicate(actor.system.ads[advKey])
          processAdvantage(advantage)
        }
      }

      // Check if migration is needed for skills
      const hasSkills = actor.system.skills && Object.keys(actor.system.skills).length > 0
      const hasSkillItems = actor.items.contents.some(item => item.type === 'skill')

      // Migrate skills if they exist and no skill Items yet
      if (hasSkills && !hasSkillItems) {
        const processSkill = (skill, parentUuid = '') => {
          if (!skill.uuid) {
            skill.uuid = foundry.utils.randomID(16)
          }
          if (parentUuid) {
            skill.parentuuid = parentUuid
          }

          itemsToCreate.push({
            type: 'skill',
            name: skill.name || 'Skill',
            system: {
              ski: skill,
            },
          })

          migratedSkills++

          // Process children in contains
          if (skill.contains && Object.keys(skill.contains).length > 0) {
            for (const childKey in skill.contains) {
              processSkill(skill.contains[childKey], skill.uuid)
            }
          }
        }

        // Process all top-level skills
        for (const skillKey in actor.system.skills) {
          const skill = foundry.utils.duplicate(actor.system.skills[skillKey])
          processSkill(skill)
        }
      }

      // Check if migration is needed for spells
      const hasSpells = actor.system.spells && Object.keys(actor.system.spells).length > 0
      const hasSpellItems = actor.items.contents.some(item => item.type === 'spell')

      // Migrate spells if they exist and no spell Items yet
      if (hasSpells && !hasSpellItems) {
        const processSpell = (spell, parentUuid = '') => {
          if (!spell.uuid) {
            spell.uuid = foundry.utils.randomID(16)
          }
          if (parentUuid) {
            spell.parentuuid = parentUuid
          }

          itemsToCreate.push({
            type: 'spell',
            name: spell.name || 'Spell',
            system: {
              spl: spell,
            },
          })

          migratedSpells++

          // Process children in contains
          if (spell.contains && Object.keys(spell.contains).length > 0) {
            for (const childKey in spell.contains) {
              processSpell(spell.contains[childKey], spell.uuid)
            }
          }
        }

        // Process all top-level spells
        for (const spellKey in actor.system.spells) {
          const spell = foundry.utils.duplicate(actor.system.spells[spellKey])
          processSpell(spell)
        }
      }

      // Check if migration is needed for equipment
      const hasEquipment = actor.system.eqt && Object.keys(actor.system.eqt).length > 0
      const hasEquipmentItems = actor.items.contents.some(item => item.type === 'equipment')

      // Migrate equipment if it exists and no equipment Items yet
      if (hasEquipment && !hasEquipmentItems) {
        const processEquipment = (equipment, parentUuid = '') => {
          if (!equipment.uuid) {
            equipment.uuid = foundry.utils.randomID(16)
          }
          if (parentUuid) {
            equipment.parentuuid = parentUuid
          }

          itemsToCreate.push({
            type: 'equipment',
            name: equipment.name || 'Equipment',
            system: {
              eqt: equipment,
            },
          })

          migratedEquipment++

          // Process children in contains
          if (equipment.contains && Object.keys(equipment.contains).length > 0) {
            for (const childKey in equipment.contains) {
              processEquipment(equipment.contains[childKey], equipment.uuid)
            }
          }
        }

        // Process all top-level equipment
        for (const eqtKey in actor.system.eqt) {
          const equipment = foundry.utils.duplicate(actor.system.eqt[eqtKey])
          processEquipment(equipment)
        }
      }

      // Check if migration is needed for melee
      const hasMelee = actor.system.melee && Object.keys(actor.system.melee).length > 0
      const hasMeleeItems = actor.items.contents.some(item => item.type === 'melee')

      // Migrate melee if it exists and no melee Items yet
      if (hasMelee && !hasMeleeItems) {
        const processMelee = (melee, parentUuid = '') => {
          if (!melee.uuid) {
            melee.uuid = foundry.utils.randomID(16)
          }
          if (parentUuid) {
            melee.parentuuid = parentUuid
          }

          itemsToCreate.push({
            type: 'melee',
            name: melee.name || 'Melee',
            system: {
              mel: melee,
            },
          })

          migratedMelee++

          // Process children in contains
          if (melee.contains && Object.keys(melee.contains).length > 0) {
            for (const childKey in melee.contains) {
              processMelee(melee.contains[childKey], melee.uuid)
            }
          }
        }

        // Process all top-level melee
        for (const meleeKey in actor.system.melee) {
          const melee = foundry.utils.duplicate(actor.system.melee[meleeKey])
          processMelee(melee)
        }
      }

      // Create all Items at once if any were added
      if (itemsToCreate.length > 0) {
        try {
          await actor.createEmbeddedDocuments('Item', itemsToCreate)
          actorsProcessed++
          console.log(`Migrated ${itemsToCreate.length} components for actor: ${actor.name}`)
        } catch (error) {
          console.error(`Failed to migrate components for actor ${actor.name}:`, error)
        }
      }
    }

    console.log(
      `Migration complete: ${migratedAdvantages} advantages, ${migratedSkills} skills, ${migratedSpells} spells, ${migratedEquipment} equipment, and ${migratedMelee} melee migrated across ${actorsProcessed} actors`
    )
  }
}
