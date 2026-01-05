# Unused CSS Cleanup Guide

This document outlines the **182 unused CSS selectors** detected by PurgeCSS analysis on 2025-12-30.

## Summary

- **Total unused selectors:** 182
- **Analysis scope:** `dist/gurps.css` (compiled SCSS) vs. templates and module files
- **Report generated:** `examples/unused-css-report.txt`
- **Tool:** PurgeCSS v7.0.2 with safelist for dynamic `.fa-*`, `.icon-*`, `.ui-*`, `.dialog-*`, `.gm-*`, `.selected`, indent classes, and standard Foundry state classes

```diff
-WARNING: Don't take the script's word for anything, verify before removing!
```

## Major Unused Blocks by File

### styles/apps.css (~50 selectors)

**Legacy UI components, HUD, tooltip, and utility selectors:**

- `.system-gurps .token-effect` - Legacy token HUD display
- `.system-gurps .effect-control` - Legacy effect controls
- `.gga-meta-group` - Unused grouping utility
- `.gga-group .shaded` - Legacy shade utility (duplicate functionality)
- `.gga-app .fab`, `.gga-app .fad`, `.gga-app .fal` - FontAwesome legacy icon selectors
- `.gurps .ranged_options` - Legacy ranged weapon display
- `#combat-sheet .resource-spinner button/input` - Legacy spinner styling
- `.addtrackericon:hover` - Unused hover state
- `#condition .fieldblock .field[name='system.conditions.combatmove']` - Legacy field styling
- `#combat-sheet .fieldblock .field[name='system.conditions.combatmove']` - Legacy field styling
- `#bucket-container.force-left` - Legacy bucket positioning
- `#modtooltipcenter`, `#modtooltipright`, `.modtooltipgroup` - Legacy modifier tooltip grid (deprecated UI)
- `.standalonggurpslink` and hover/active states - Legacy link styling
- `#token-hud .maneuver-content` - Legacy HUD maneuver positioning
- `#token-hud .status-maneuvers` and related `.effect-control` - Legacy maneuver grid (deprecated HUD)
- `.window-app .window-header .window-title .document-debug-link` - Debug mode only
- `.debug-content` - Debug display
- `.apply-damage-quick` - Legacy damage dialog utility
- `.w100`, `.mw50` - Generic width utilities
- `.color-equipment`, `.color-spell`, `.color-skill`, `.color-feature` - Legacy color tagging
- `.cr-damage-type` - Legacy damage type display

### styles/simple.css (~100+ selectors)

**Legacy classic sheet and combat view styles (completely unused in modern UI):**

- `#combat-weapons`, `#combat-location`, `#combat-identity`, `#combat-encumber` - Legacy combat view panels
- `#combat-encumber-container` and all `.encmarker*`, `.enc*`, `.load*`, `.move*`, `.dodge*` variants - Legacy encumbrance grid
- `#combat-location .roll`, `.where`, `.penalty`, `.dr`, etc. - Legacy hit location table columns
- `#combat-attrs-*` - Legacy attribute display in legacy combat view
- `.gurps .sheet-header h1.charname` - Legacy classic sheet header
- `.gurps .attributes-header`, `.attributes-list` - Legacy attributes section (classic sheet)
- `.gurps .item-list .item-name`, `.item-controls` - Legacy item list (classic sheet)
- `.gga-chat-messsage .gurpslink` (note: typo in class name) - Malformed chat class
- `.simple-container .gurpslink` - Legacy container styling
- `.gga-tableheader.two-header` - Legacy table header
- `#encumbrance.dodgeh`, `#encumbrance .dodgeh` - Legacy encumbrance header styling
- `#spells .spellsmenu i:hover`, `#skills .skillsmenu i:hover`, `#notes .spellsmenu i:hover` - Legacy menu icons
- `.points-fp` - Legacy point display
- `.gurpsactorsheet .indent1` through `.indent9` - Legacy indentation classes (safelisted; may have hidden runtime usage)
- `#combat-tab #combat-status deatils[open]>summary` - Legacy combat tab (malformed: "deatils" instead of "details")

### styles/css_boilerplate.css (~35 selectors)

**Generic boilerplate styles for systems using the template:**

- `.grid-4col` through `.grid-12col` - Generic grid utilities (boilerplate only)
- `.flex-group-right` - Generic flex utility (boilerplate only)
- `.directory-list .directory-item.actor` - Actor directory styling (boilerplate)
- `.boilerplate .item-form`, `.sheet-header`, `.header-fields` - Generic boilerplate sheet layout
- `.boilerplate .tox .tox-editor-container`, `.tox-edit-area` - TinyMCE editor (boilerplate)
- `.boilerplate .resource-label`, `.items-list` - Generic resource and item list (boilerplate)

### styles/npc-input.css (~8 selectors)

**NPC sheet input dialog (legacy or unused form):**

- `.npc-sheet-grid-container` and `#portrait .img-display` - Legacy NPC grid layout
- `.npc-input-nt`, `.npc-input-img` - NPC input form elements

### Compiled from SCSS:

- `body.theme-light`, `body.theme-dark` - Journal entry theme switches (may be unused or dynamic)
- `section.window-content article.journal-entry-page` - Journal page styling (may be unused)
- `.journal-entry-page.pdf.view` - PDF view mode (may be unused or hidden)

## Recommendations

### 1. **Safe to Remove (High Confidence)**

Remove entire CSS blocks for:

- Legacy combat view (`#combat-*` IDs in simple.css, except actively used ones)
- Legacy token HUD tooltip styling (modtooltipgroup, modtooltipcenter, modtooltipright)
- Boilerplate grid utilities (`.grid-*col`) if not using boilerplate sheets
- NPC sheet styling if feature is deprecated
- Debug-only selectors (`.debug-content`, `.document-debug-link`)
- FontAwesome legacy icon selectors (`.fab`, `.fad`, `.fal` – keep `.fa`, `.far`, `.fas`)

### 2. **Caution – Verify Before Removing**

These may have hidden runtime usage via JavaScript:

- Indent classes (`.indent1`–`.indent9`) – already safelisted; keep for now
- Color tagging (`.color-*`) – check if applied dynamically
- Journal/PDF theme classes – verify if used in dynamic content rendering
- Any selector prefixed with `-` is likely a typo or legacy artifact

### 3. **Cleanup Strategy**

1. **Phase 1:** Remove debug and clearly deprecated UI blocks (combat view, HUD tooltip, boilerplate utilities)
2. **Phase 2:** Search codebase for any remaining JS references to blocked selectors
3. **Phase 3:** Re-run `node dev-utilities/find-unused-css.mjs` to verify reductions
4. **Phase 4:** Consider merging modern SCSS partials and removing old .css files entirely

## Re-running Analysis

```bash
# Run full analysis
node dev-utilities/find-unused-css.mjs

# Compare against safelist (update safelist in find-unused-css.mjs if needed)
# and re-run to verify cleanup
```

## Files Affected

- `styles/apps.css` – Remove ~50 unused selectors
- `styles/simple.css` – Remove ~100+ unused selectors (legacy classic sheet)
- `styles/css_boilerplate.css` – Remove ~35 boilerplate utilities
- `styles/npc-input.css` – Remove ~8 unused form selectors

---

**Generated:** 2025-12-30 by `dev-utilities/find-unused-css.mjs`
**Reference:** `examples/unused-css-report.txt`
