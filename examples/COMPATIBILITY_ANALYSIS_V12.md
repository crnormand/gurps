# FoundryVTT v12 Incompatibility Analysis

## Summary

This document identifies code incompatibilities between the current codebase and FoundryVTT v12. The code currently targets v13 with some v12 fallbacks, but there are several breaking changes that prevent full v12 compatibility.

---

## Critical Incompatibilities (v12 blockers)

### 1) DialogV2 API (missing in v12)

**Status:** BREAKING – v12 has only `Dialog`

**What:** Calls to `foundry.applications.api.DialogV2.*` for prompt/wait/confirm are v13-only.

**Examples:**

- `module/damage/resolve-damage-roll-action.js` (roll resolution dialogs)
- `module/dierolls/dieroll.js` (roll dialogs)
- `module/actor/actor-importer.js` (import flows)
- `module/actor/actor.js` (multiple prompt flows)
- `module/utilities/select-target.js`, `module/utilities/get-user-input.js`
- `module/gurps.js` (attack/utility dialogs)

**Fix:** Replace with v12 `Dialog` equivalents or implement a thin compatibility wrapper that uses `Dialog` on v12 and `DialogV2` on v13.

---

### 2) ApplicationV2 + HandlebarsApplicationMixin

**Status:** BREAKING – classes absent in v12

**Files:**

- `module/token/quick-roll-settings.ts`
- `module/pdf/settings.ts`
- `module/token/token-hud.ts`

**Fix:** Rewrite as `Application`/`FormApplication` for v12, or gate these features to v13 only.

---

### 3) Namespaced sheet registration (apps/sheets)

**Status:** PARTIAL – guarded in some places, but relies on v13 namespaces when generation ≥13

**Files:**

- `module/gurps.js` (ActiveEffect sheet registration)
- `module/pdf/sheet.js` (Journal PDF sheet registration)

**Fix:** Ensure both branches are correct: use global `DocumentSheetConfig` and global sheet classes on v12; namespaced variants on v13. Test both paths.

---

## Additional Risks / Checks

- **Context menu subclass** (`module/utilities/contextmenu.js`): Extends `ContextMenu` and adds custom title/container handling. v12 has a compatible `ContextMenu` signature, but verify in-runtime on v12 to confirm no regressions.
- **Version checks**: Multiple `game.release.generation` guards exist (e.g., modifier bucket, effect modifier control). These appear correct but should be smoke-tested on v12.
- **Template conditionals**: PDF templates (`templates/pdf/edit.hbs`, `templates/pdf/view.hbs`) switch on `v13`. Ensure the render context sets the flag properly for v12.

## Summary Table of Incompatibilities

| Issue                                      | File(s) (examples)                                                                                    | Severity | Status            | Fix Needed for v12?        |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------- | -------- | ----------------- | -------------------------- |
| DialogV2 usage                             | `resolve-damage-roll-action.js`, `actor-importer.js`, `dieroll.js`, `actor.js`, `gurps.js`, utilities | CRITICAL | Unhandled in v12  | Yes – replace or polyfill  |
| ApplicationV2 + HandlebarsApplicationMixin | `quick-roll-settings.ts`, `pdf/settings.ts`, `token-hud.ts`                                           | CRITICAL | V13-only classes  | Yes – rewrite or gate      |
| Namespaced sheet registration              | `gurps.js`, `pdf/sheet.js`                                                                            | HIGH     | Partially guarded | Yes – verify both branches |
| Context menu subclass                      | `utilities/contextmenu.js`                                                                            | MEDIUM   | Likely OK         | Test on v12                |
| Template v13 conditionals                  | `templates/pdf/*.hbs`                                                                                 | MEDIUM   | Guarded           | Ensure context flag on v12 |
| Legacy Application/FormApplication usage   | Many (see list)                                                                                       | LOW      | Works on v12      | No – compatible            |

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
