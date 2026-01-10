## GurpsItem — properties, getters, and methods

Source: `./module/item.js`

This document lists the members (static, instance methods, and accessors) that are defined directly on the GurpsItem class in `module/item.js`. It includes a short description and the signature where available.

### Notes

- Helpers imported at top of file: `parselink`, `recurselist`.
- The class extends Foundry's `Item` and therefore also inherits standard `Item` properties like `id`, `name`, `img`, `system`, `actor`, `update()`, etc. Only members implemented in `module/item.js` are listed below.

---

### Static

- `static asGurpsItem(item)`
  - Signature: `(item: Item) => GurpsItem` (cast/adapter helper).
  - Purpose: Cast a generic `Item` to the `GurpsItem` type for convenience.

- `static get TYPES()`
  - Signature: `() => BaseItem.SubType[]`
  - Purpose: Returns the available item subtypes for this item model (filters out `*Atk` keys).

---

### Instance methods & accessors

- ~~`prepareData()`~~

- `getItemAttacks(getAttOptions = {})`
  - Signature: `(getAttOptions?: { attackType?: 'both'|'melee'|'ranged', checkOnly?: boolean }) => Array|boolean`
  - Purpose: Search the owning actor's `melee` and `ranged` component lists for entries that correspond to this Item (matches by `uuid`, `originalName`, `name`, or `fromItem`). Returns an array of objects `{ component, key }` or — if `checkOnly` is true — a boolean indicating presence.

- `get hasAttacks()`
  - Getter. Returns a boolean that indicates whether `getItemAttacks({ checkOnly: true })` found entries.

- `getItemOTFs(checkOnly = false)`
  - Signature: `(checkOnly?: boolean) => { text: string, action?: Action } | boolean`
  - Purpose: Parses `system[ itemSysKey ].notes` via `parselink` and returns the parsed action structure (or a boolean if `checkOnly`).

- `get hasOTFs()`
  - Getter. Intended to return `!!this.getItemOTFs(true)`. (Note: the implementation in the source file lacks an explicit `return` and therefore is a bug.)

- `async toogleEquip(equipped)`
  - Signature: `async (equipped: boolean|undefined) => Promise<void>`
  - Purpose: Toggle equipment state for legacy equipment items. Updates actor equipment entries and item/system fields. (Note: method name is spelled `toogleEquip` in source.)

- `async internalUpdate(data, context)`
  - Wrapper around `this.update(data, ctx)` that respects `this.ignoreRender` and merges provided context with `{ render: !this.ignoreRender }`.

- `get actorComponentKey()`
  - Getter. Maps the item `type` to the corresponding actor system key:
    - `equipment` → `equipment`
    - `feature` → `ads`
    - `skill` → `skills`
    - `spell` → `spells`
    - `meleeAtk` → `melee`
    - `rangedAtk` → `ranged`
  - Throws if no mapping is found.

- `get itemSysKey()`
  - Getter. Maps the item `type` to the item system key used on `this.system`:
    - `equipment` → `eqt`
    - `feature` → `fea`
    - `skill` → `ski`
    - `spell` → `spl`
    - `meleeAtk` → `mel`
    - `rangedAtk` → `rng`
  - Throws if no mapping is found.

- `getItemInfo()`
  - Signature: `() => { id, img, name, system }`
  - Purpose: Return a shallow backup/summary object of the item suitable for storing on an actor component.

---

### Implementation quirks / notes

- `hasOTFs` is implemented without `return` — it evaluates the expression but doesn't return it. That looks like a bug and should be changed to `return !!this.getItemOTFs(true)`.
- `toogleEquip` is likely a misspelling of `toggleEquip`. Renaming would be a breaking change for other modules that might call it, so consider adding a compatibility alias if you rename.
- `getItemAttacks` uses `recurselist` to traverse actor component lists and the actor helper methods `_findSysKeyForId` / `_findEqtkeyForId`.

If you want this added to other documentation formats (table with signatures, TypeScript augmentation, or examples for each member), tell me which format you prefer and I can extend this file.

---

File generated from `module/item.js`.
