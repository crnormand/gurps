# FoundryVTT v12 Incompatibility Analysis

## Summary

This document identifies code incompatibilities between the current codebase and FoundryVTT v12. The code currently targets v13 with some v12 fallbacks, but there are several breaking changes that prevent full v12 compatibility.

---

## Critical Incompatibilities

### 1. **Application API - V12 vs V13 Architecture Change**

**Status:** BREAKING CHANGE - No Fallback Available

**Issue:** v13 introduced a completely redesigned application system:

- v12: Legacy `Application`, `FormApplication`, `DocumentSheet` classes
- v13: New `ApplicationV2` with `HandlebarsApplicationMixin`

**Files Affected:**

- `module/token/quick-roll-settings.ts` - Uses `ApplicationV2` and `HandlebarsApplicationMixin`
- `module/pdf/settings.ts` - Uses `ApplicationV2` and `HandlebarsApplicationMixin`

**Current Code:**

```typescript
class QuickRollSettings extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) { ... }

class PDFSettingsApplication extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) { ... }
```

**Why Incompatible:**

- `ApplicationV2` and `HandlebarsApplicationMixin` don't exist in v12
- These classes use v13's new configuration system (`DEFAULT_OPTIONS`, `PARTS`)
- No compatible v12 alternative can replace this without complete rewrite

**Recommendation:** These classes **must be rewritten** as `FormApplication` for v12 compatibility, or kept as v13-only features.

---

### 2. **ContextMenu Constructor Signature Change**

**Status:** BREAKING CHANGE - Incompatible API

**Issue:** v12 vs v13 ContextMenu constructor signatures differ

**File:** `module/utilities/contextmenu.js` (Line 1-4)

**Current Code:**

```javascript
export default class GgaContextMenu extends foundry.applications.ux.ContextMenu {
  constructor(container, element, selector, title, menuItems, events = { eventName: 'contextmenu' }) {
    super(element, selector, menuItems, events)
    // ...
  }
}
```

**v12 Signature:**

```
ContextMenu(element, selector, menuItems, events = {})
```

**v13 Signature:** (Likely similar but needs verification)

**Why Incompatible:**

- The custom `GgaContextMenu` class adds a `container` parameter not in v12
- The `title` parameter handling may not work in v12
- Rendering implementation differs significantly

**Recommendation:** Conditional implementation needed or v13-only feature.

---

### 3. **Dialog and Application `.element` Property**

**Status:** BREAKING CHANGE - Property Access Pattern Changed

**Issue:** Dialog/Application element access differs between versions

**Files Affected:**

- `module/utilities/select-target.js` (Line 32)
- `module/file-handlers/chrome-file-handler.js` (Line 56)
- `module/chat/frightcheck.js` (Line 85)

**Current Code (v13 Compatible):**

```javascript
const element = game.release.generation >= 13 ? dialog.element : dialog
```

**Problem:** This code already acknowledges the incompatibility!

- v13: Uses `.element` property
- v12: Uses the dialog object itself as a jQuery object

**Current Status:** Already has a fallback check in place - **GOOD**

---

### 4. **Sheet Registration API Changes**

**Status:** BREAKING CHANGE - Multiple Location Inconsistency

**Files Affected:**

- `module/gurps.js` (Lines 1970-1982)
- `module/pdf/sheet.js` (Lines 9-27, 29-30, 61-62, 92-103)
- `module/effects/active-effect-config.js` (Line 3)

**Current Code (Partial Compatibility):**

```javascript
// v13
if (game.release.generation >= 13) {
  foundry.applications.apps.DocumentSheetConfig.unregisterSheet(
    ActiveEffect,
    'core',
    foundry.applications.sheets.ActiveEffectConfig
  )
  foundry.applications.apps.DocumentSheetConfig.registerSheet(...)
} else {
  // v12
  DocumentSheetConfig.unregisterSheet(ActiveEffect, 'core', ActiveEffectConfig)
  DocumentSheetConfig.registerSheet(ActiveEffect, 'gurps', GurpsActiveEffectConfig, ...)
}
```

**v12 Location:** `DocumentSheetConfig` (global)
**v13 Location:** `foundry.applications.apps.DocumentSheetConfig` (namespaced)

**v12 Classes:**

- `ActiveEffectConfig` (global)
- `AmbientLightConfig` (global)

**v13 Classes:**

- `foundry.applications.sheets.ActiveEffectConfig`
- `foundry.applications.sheets.AmbientLightConfig`

**Issues:**

- Namespace reorganization - classes moved into `foundry` namespace
- These incompatibilities are documented in the code but not always handled

**Current Status:** **Partially handled** with version checks in some places, but inconsistent

---

### 5. **GurpsActiveEffectConfig Class Definition**

**Status:** POTENTIALLY BREAKING

**File:** `module/effects/active-effect-config.js` (Line 3)

**Current Code:**

```javascript
export default class GurpsActiveEffectConfig extends ActiveEffectConfig {
```

**Issues:**

- Extends `ActiveEffectConfig` (v12 name)
- Works in v12 but may have issues if the parent class API changed significantly
- The registration logic is version-conditional (see #4), so this may work in both versions

---

### 6. **Legacy Application Classes Still in Use**

**Status:** DEPRECATED - Not fully compatible with v13, but works in v12

**Classes Still Using Legacy API:**

- `lib/npc-input.js` - `FormApplication`
- `lib/change-log.js` - `FormApplication`
- `module/damage/applydamage.js` - `Application`
- `module/resource-tracker/resource-tracker-editor.js` - `Application`
- `module/resource-tracker/resource-tracker-manager.js` - `FormApplication`
- `module/color-character-sheet/color-character-sheet-html.js` - `FormApplication`
- `module/actor/move-mode-editor.js` - `Application`
- `module/actor/splitdr-editor.js` - `Application`
- `module/actor/effect-modifier-popout.js` - `Application` & `FormApplication`
- `module/actor/effect-picker.js` - `Application`
- `module/actor/multiple-import-app.js` - `Application`
- `module/actor/actor-sheet.js` - Multiple legacy Application subclasses
- `module/effects/active-effect-list.js` - `Application`
- `module/effects/global-active-effect-data-manager.js` - `Application` & `FormApplication`
- `module/item-sheet.js` - `ItemSheet`
- `module/modifier-bucket/select-journals.js` - `FormApplication`
- `module/modifier-bucket/tooltip-window.js` - `Application`
- `module/modifier-bucket/bucket-app.js` - `Application`
- `module/modifier-bucket/resolve-diceroll-app.js` - `Application`
- `module/chat/slam.js` - `FormApplication`

**Why This Is A Problem:**

- These legacy classes exist in both v12 and v13, but v13 is transitioning away from them
- v13 may deprecate or remove these in future versions
- Mixed usage of legacy and v13 APIs creates maintenance burden

**Positive Note:** These DO work in v12, so they're actually compatible!

---

### 7. **Sheet Template Conditional Logic**

**Status:** INCOMPATIBLE RENDERING - v13 Feature Only

**Files Affected:**

- `templates/pdf/edit.hbs` (Lines 1-22)

**Current Code:**

```handlebars
{{#if v13}}
  {{log 'Using v13 Edit PDF template'}}
  <!-- v13-specific template -->
{{else}}
  {{log 'Using legacy Edit PDF template'}}
  <!-- Legacy template -->
{{/if}}
```

**Issue:**

- Template rendering depends on `v13` context variable
- This must be set correctly in `module/pdf/sheet.js`
- Different template code for v12 vs v13

**Current Status:** Has fallback, appears to be handled

---

## Summary Table of Incompatibilities

| Issue                                      | File(s)                                     | Severity | Status            | Fix Required?                 |
| ------------------------------------------ | ------------------------------------------- | -------- | ----------------- | ----------------------------- |
| ApplicationV2 & HandlebarsApplicationMixin | `quick-roll-settings.ts`, `pdf/settings.ts` | CRITICAL | V13 Only          | YES - Complete Rewrite        |
| ContextMenu Constructor                    | `contextmenu.js`                            | CRITICAL | Needs Check       | YES - Conditional or V13 Only |
| Namespace Changes (.sheets, .apps)         | Multiple                                    | HIGH     | Partially Handled | YES - Inconsistent Coverage   |
| Legacy Application Classes                 | 20+ files                                   | MEDIUM   | Works in V12      | NO - Backward Compatible      |
| Dialog.element Property                    | 3 files                                     | MEDIUM   | Handled           | NO - Has Fallback             |
| GurpsActiveEffectConfig                    | `active-effect-config.js`                   | MEDIUM   | Conditional       | Maybe - Needs Testing         |
| Template Conditionals                      | `pdf/edit.hbs`                              | MEDIUM   | Handled           | NO - Has Fallback             |

---

## Recommendations for V12 Compatibility

### Priority 1: CRITICAL - Must Fix for V12 Support

1. **Rewrite or Remove ApplicationV2 Classes**
   - Convert `QuickRollSettings` from `ApplicationV2` to `FormApplication`
   - Convert `PDFSettingsApplication` from `ApplicationV2` to `FormApplication`
   - Or mark as v13-only and conditionally disable

2. **Fix ContextMenu Implementation**
   - Test custom `GgaContextMenu` in v12
   - Add version-conditional implementation if needed
   - Ensure both v12 and v13 signatures are supported

3. **Unify Sheet Registration Logic**
   - Ensure all sheet registration uses consistent version checks
   - Test both v12 and v13 registration paths

### Priority 2: HIGH - Should Fix

1. **Create v12 Feature Flags**
   - Set `v12` context variable in all sheet getRenderContext methods
   - Use consistently in templates

2. **Test All Version Checks**
   - Verify `game.release.generation` checks are correct throughout codebase
   - Ensure fallback paths actually work

### Priority 3: MEDIUM - Nice to Have

1. **Migrate Legacy Classes Gradually**
   - Don't rush; these work in both versions
   - Plan for v13 transition in future updates

2. **Documentation**
   - Document which features are v13-only
   - Create migration guide for v12→v13 transition

---

## Files Requiring Immediate Action

### 1. `module/token/quick-roll-settings.ts`

- **Action:** Rewrite as `FormApplication` OR make v13-only
- **Current:** Uses `ApplicationV2` + `HandlebarsApplicationMixin`
- **Fallback:** Create v12 version using legacy API

### 2. `module/pdf/settings.ts`

- **Action:** Rewrite as `FormApplication` OR make v13-only
- **Current:** Uses `ApplicationV2` + `HandlebarsApplicationMixin`
- **Fallback:** Create v12 version using legacy API

### 3. `module/utilities/contextmenu.js`

- **Action:** Test in v12 and add conditional implementation
- **Current:** Custom class extending `foundry.applications.ux.ContextMenu`
- **Risk:** Constructor signature may be incompatible with v12

### 4. `module/effects/active-effect-config.js`

- **Action:** Test the registration mechanism in v12
- **Current:** Conditional registration exists in `gurps.js`
- **Risk:** Parent class API may differ

---

## Conclusion

The codebase has **good partial v12 compatibility** with several version checks in place. However, there are **3 critical incompatibilities** that prevent full v12 support:

1. **ApplicationV2-based classes** (quick-roll-settings.ts, pdf/settings.ts)
2. **Potentially incompatible ContextMenu** (contextmenu.js)
3. **Namespace reorganization** (sheets, apps packages)

To achieve full v12 compatibility, these three areas must be addressed. Most other code uses legacy APIs that work in both versions, which is actually beneficial for v12 support.

**Estimated Effort:**

- ApplicationV2 conversion: 4-6 hours (per file)
- ContextMenu fix: 2-3 hours
- Namespace unification: 2-4 hours
- Testing and QA: 4-8 hours

**Total: ~16-25 hours of development work**
