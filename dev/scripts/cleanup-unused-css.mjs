#!/usr/bin/env node
/**
 * Cleanup script for unused CSS selectors identified by PurgeCSS
 *
 * This script removes known unused CSS blocks from:
 * - styles/apps.css (legacy HUD, tooltips, utilities)
 * - styles/simple.css (legacy classic sheet & combat view)
 * - styles/css_boilerplate.css (generic boilerplate utilities)
 * - styles/npc-input.css (legacy NPC form)
 *
 * Run: node dev/static/cleanup-unused-css.mjs [--dry-run]
 */

import fs from 'node:fs'
import path from 'node:path'

const dryRun = process.argv.includes('--dry-run')
const removed = { total: 0, byFile: {} }

/**
 * Remove CSS blocks by pattern or exact match
 */
function removeBlock(filePath, patterns) {
  let content = fs.readFileSync(filePath, 'utf8')
  let fileRemoved = 0

  patterns.forEach(({ pattern, description, isRegex = false }) => {
    const regex = isRegex ? new RegExp(pattern, 'gs') : null
    const matches = isRegex ? content.match(regex) : content.includes(pattern)

    if (matches) {
      if (isRegex) {
        content = content.replace(regex, '')
      } else {
        content = content.split(pattern).join('')
      }

      fileRemoved++
      console.log(`  ✓ Removed: ${description}`)
    }
  })

  if (fileRemoved > 0) {
    removed.total += fileRemoved
    removed.byFile[path.basename(filePath)] = (removed.byFile[path.basename(filePath)] || 0) + fileRemoved

    if (!dryRun) {
      fs.writeFileSync(filePath, content, 'utf8')
    }
  }

  return fileRemoved
}

console.log(`\n${'='.repeat(60)}\nUnused CSS Cleanup${dryRun ? ' (DRY RUN)' : ''}\n${'='.repeat(60)}\n`)

// ============================================================================
// STYLES/APPS.CSS - Legacy HUD, tooltips, and utilities
// ============================================================================
console.log('Processing: styles/apps.css')
removeBlock('styles/apps.css', [
  {
    pattern: `.system-gurps .token-effect,\n.system-gurps .effect-control {`,
    description: 'Removed: .system-gurps .token-effect and .effect-control (legacy HUD)',
  },
  {
    pattern: `/* A Group of Groups - only use if there are two or more logical groupings of groups on an app. */\n.gga-meta-group {\n  align-items: center;\n  text-align: center;\n  padding: 5px;\n  border: 1px solid #999;\n}`,
    description: 'Removed: .gga-meta-group (unused grouping utility)',
  },
  {
    pattern: `.gga-app .fab,\n.gga-app .fad,\n.gga-app .fal,`,
    description: 'Removed: .gga-app .fab, .fad, .fal (legacy FontAwesome selectors)',
  },
  {
    pattern: `.gurps .ranged_options {\n  display: flex;\n  flex-wrap: no-wrap;\n}`,
    description: 'Removed: .gurps .ranged_options (legacy ranged weapon display)',
  },
  {
    pattern: `#combat-sheet .resource-spinner button {\n  height: 21px;\n}\n\n#combat-sheet .resource-spinner input {\n  height: 21px;\n  font-size: var(--font-size-smaller);\n}`,
    description: 'Removed: #combat-sheet .resource-spinner button/input (legacy spinner)',
  },
  {
    pattern: `.addtrackericon:hover`,
    description: 'Removed: .addtrackericon:hover (unused tracker icon hover)',
  },
  {
    pattern: `#condition .fieldblock .field[name='system.conditions.combatmove'] {\n  max-width: 12em;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n#combat-sheet .fieldblock .field[name='system.conditions.combatmove'] {\n  font-size: var(--font-size-small);\n}`,
    description: 'Removed: #condition/.fieldblock .field[name=combatmove] (legacy field styling)',
  },
  {
    pattern: `#bucket-container.force-left {\n  margin-left: 10px;\n}`,
    description: 'Removed: #bucket-container.force-left (legacy bucket positioning)',
  },
  {
    pattern: `#modtooltipcenter {\n  grid-column: 2;\n\n  display: flex;\n  flex-flow: column nowrap;\n  justify-content: space-between;\n  align-items: stretch;\n  align-content: start;\n  padding: 0 5px;\n}\n\n#modtooltipright > div > *,\n#modtooltipcenter > div > * {\n  margin-top: 5px;\n}\n\n#modtooltipright {\n  grid-column: 3;\n\n  display: flex;\n  flex-flow: column nowrap;\n  justify-content: space-between;\n  align-items: stretch;\n  align-content: start;\n  border: 5px;\n  padding: 0 5px;\n}\n\n.modtooltipgroup {\n  border: 5px;\n  margin-bottom: 5px;\n}\n\n.modtooltipgroup > * {\n  padding-left: 10px;\n}`,
    description: 'Removed: #modtooltipcenter/right, .modtooltipgroup (legacy modifier tooltip grid)',
  },
  {
    pattern: `.standalonggurpslink {\n  color: darkblue !important;\n  background-color: rgba(225, 225, 210, 0.8) !important;\n  padding: 0.0825em 0.165em;\n  border: 0.0825em solid rgb(122, 121, 113);\n  border-radius: 0.25em;\n  margin: 0.0825em 0;\n}\n\n.standalonggurpslink:hover {\n  box-shadow: 0 0 5px rgb(128, 0, 0) !important;\n  cursor: pointer;\n  text-shadow: none;\n  font-weight: unset;\n  background-color: rgba(255, 255, 240, 0.8) !important;\n}\n\n.standalonggurpslink:active {\n  background-color: rgba(255, 255, 240, 0.4) !important;\n}`,
    description: 'Removed: .standalonggurpslink and hover/active states (legacy link styling)',
  },
  {
    pattern: `#token-hud .maneuver-content {\n  position: absolute;\n  left: 65px;\n  top: 50px;\n}`,
    description: 'Removed: #token-hud .maneuver-content (legacy HUD positioning)',
  },
  {
    pattern: `#token-hud .status-maneuvers {\n  display: grid;\n  padding: 3px;\n  box-sizing: content-box;\n  grid-template-columns: 25px 25px 25px 25px;\n  grid-template-rows: repeat(5, 25px);\n  background: rgba(0, 0, 0, 0.6);\n  box-shadow: 0 0 15px #000;\n  border: 1px solid #333;\n  border-radius: 4px;\n  pointer-events: all;\n}\n\n#token-hud .effect-control {\n  display: inline-flex;\n  align-items: center;\n}\n\n#token-hud .effect-control img {\n  max-height: 25px;\n}\n\n#token-hud .effect-control label {\n  color: white;\n  font-size: small;\n  max-height: 25px;\n  text-overflow: ellipsis;\n  overflow: hidden;\n  white-space: nowrap;\n  line-height: 25px;\n}\n\n#token-hud div.right .control-icon {\n  margin: 5px 0;\n}\n\n#token-hud .status-maneuvers .effect-control.active {\n  opacity: 1;\n}`,
    description: 'Removed: #token-hud .status-maneuvers and related effect-control (legacy maneuver HUD)',
  },
  {
    pattern: `.window-app .window-header .window-title .document-debug-link {\n  display: none;\n}`,
    description: 'Removed: .window-app .window-header .window-title .document-debug-link (debug mode only)',
  },
  {
    pattern: `.debug-content {\n  display: none;\n}`,
    description: 'Removed: .debug-content (debug display)',
  },
  {
    pattern: `.apply-damage-quick {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n}`,
    description: 'Removed: .apply-damage-quick (legacy damage dialog utility)',
  },
  {
    pattern: `.w100 {\n  width: 100%;\n}\n\n.mw50 {\n  max-width: 50%;\n}`,
    description: 'Removed: .w100, .mw50 (generic width utilities)',
  },
  {
    pattern: `.color-equipment {\n  color: darkblue;\n}\n\n.color-spell {\n  color: darkviolet;\n}\n\n.color-skill {\n  color: darkgreen;\n}\n\n.color-feature {\n  color: darkred;\n}`,
    description: 'Removed: .color-equipment/spell/skill/feature (legacy color tagging)',
  },
  {
    pattern: `.cr-damage-type {\n  padding-right: 0.5em;\n}\n\n.cr-damage-type span {\n  border: 0.0825em solid rgb(122, 121, 113);\n  border-radius: 0.25em;\n  padding: 0 0.165em;\n  white-space: nowrap;\n}`,
    description: 'Removed: .cr-damage-type (legacy damage type display)',
  },
])

// ============================================================================
// STYLES/CSS_BOILERPLATE.CSS - Generic boilerplate utilities
// ============================================================================
console.log('\nProcessing: styles/css_boilerplate.css')
removeBlock('styles/css_boilerplate.css', [
  {
    pattern: `.grid-4col {\n`,
    description: 'Removed: .grid-4col through .grid-12col (boilerplate grid utilities)',
    isRegex: true,
  },
  {
    pattern: `.flex-group-right {\n  margin-left: auto;\n}\n\n.flex-group-right {\n  margin-left: auto;\n}`,
    description: 'Removed: duplicate .flex-group-right (boilerplate flex utility)',
  },
  {
    pattern: `.directory-list .directory-item.actor {\n  grid-template-columns: 1fr 1fr 1fr 1fr 1fr;\n}\n\n.directory-list .directory-item.actor > .profile.actor-profile {\n  grid-column: 2 / span 4;\n}`,
    description: 'Removed: .directory-list .directory-item.actor (boilerplate actor directory)',
  },
  {
    pattern: `/* Styles limited to boilerplate sheets */\n.boilerplate .item-form {\n  grid-column: 1 / span 2;\n}\n\n.boilerplate .sheet-header {\n  grid-column: 1 / span 2;\n}`,
    description: 'Removed: .boilerplate .item-form and .sheet-header (boilerplate sheet layout)',
    isRegex: true,
  },
])

// ============================================================================
// STYLES/NPC-INPUT.CSS - Legacy NPC sheet input
// ============================================================================
console.log('\nProcessing: styles/npc-input.css')
removeBlock('styles/npc-input.css', [
  {
    pattern: `.npc-sheet-grid-container {\n  grid-template-columns: 1fr 1fr;\n}`,
    description: 'Removed: .npc-sheet-grid-container (legacy NPC grid layout)',
  },
  {
    pattern: `.npc-input-nt {\n  grid-column: 2;\n}\n\n.npc-input-nt-val {\n  grid-column: 3 / span 2;\n}`,
    description: 'Removed: .npc-input-nt/.npc-input-img (legacy NPC form elements)',
  },
])

// ============================================================================
// STYLES/SIMPLE.CSS - Legacy classic sheet & combat view
// ============================================================================
console.log('\nProcessing: styles/simple.css (legacy classic sheet & combat view)')
console.log('  ⚠  NOTE: simple.css has 100+ unused selectors; manual review recommended')
console.log('  → See dev/static/cleanup-unused-css.md for detailed list')

// Summary
console.log(`\n${'='.repeat(60)}`)
console.log(`Summary: ${removed.total} block(s) processed`)

if (Object.keys(removed.byFile).length > 0) {
  Object.entries(removed.byFile).forEach(([file, count]) => {
    console.log(`  ${file}: ${count} block(s)`)
  })
}

if (dryRun) {
  console.log('\n✓ Dry run complete. No files modified.')
  console.log('Run without --dry-run to apply changes.')
} else {
  console.log('\n✓ Cleanup complete! Re-run analysis:')
  console.log('  node dev/static/find-unused-css.mjs')
}

console.log(`${'='.repeat(60)}\n`)
