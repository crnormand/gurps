## GurpsItemV2 — properties, getters, and methods

Source: `./module/item/gurps-item.ts`

This document lists the members (instance methods, accessors, and static members) that are defined directly on the `GurpsItemV2` class. It includes short descriptions and signatures where available.

---

### Type guard

- `isOfType<SubType extends Item.Sub.Type>(...types: SubType[]): this is Item.OfType<SubType>`
  - Type-guard overload signature available in TypeScript.
- `isOfType(...types: string[]): boolean`
  - Implementation: `return types.includes(this.type as Item.SubType)`

---

### Accessors (getters)

- `get isContained(): boolean`
  - Returns `(this.system as BaseItemModel).isContained`.

- `get containedBy(): string | null`
  - Returns `(this.system as BaseItemModel).containedBy ?? null`.

- `get contents(): Item.Implementation[]`
  - Returns `(this.system as BaseItemModel).contents`.

- `get allContents(): Item.Implementation[]`
  - Returns `(this.system as BaseItemModel).allContents`.

- `get disabled(): boolean`
  - Returns whether this item is disabled; treats containment specially (a contained item is disabled when its container is disabled).

- `get notes(): string | null`
  - Returns `(this.system as BaseItemModel).component?.notes ?? null`.

- `get hasAttacks(): boolean`
  - Returns `this.getItemAttacks().length > 0`.

---

### Overrides / Document lifecycle

- `override getEmbeddedDocument<EmbeddedName extends Item.Embedded.CollectionName>(embeddedName, id, options)`
  - Looks up pseudo-document embedded metadata on the item system and returns the embedded pseudo-document from the model collection; otherwise falls back to `super.getEmbeddedDocument`.

- `override delete(operation?: Item.Database.DeleteOperation & { deleteContents?: boolean })`
  - Calls `super.delete(operation)` (keeps the signature and supports `deleteContents`).

- `override async deleteDialog(options = {})`
  - If the item contains other items, shows a custom confirmation dialog allowing the user to choose whether to delete contents.

- `override prepareBaseData()`
  - Calls `super.prepareBaseData()` and then calls `prepareBaseData()` for each pseudo-document collection on the system model.

- `override prepareDerivedData()`
  - Calls `super.prepareDerivedData()` and then calls `prepareDerivedData()` for each pseudo-document collection on the system model.

- `override update(data: Item.UpdateData, options?: Item.Database.UpdateOptions): Promise<this | undefined>`
  - Debugging hook: logs call and calls `super.update(data, options)`.

---

### Utilities

- `getItemAttacks(options?: { attackType: 'melee' | 'ranged' | 'both' })`
  - Overloads provided for typed returns:
    - `getItemAttacks({ attackType: 'melee' }): MeleeAttackModel[]`
    - `getItemAttacks({ attackType: 'ranged' }): RangedAttackModel[]`
    - `getItemAttacks({ attackType: 'both' }): (MeleeAttackModel | RangedAttackModel)[]`
  - Implementation: If `this.system` is not a `BaseItemModel` or the system is not enabled, returns []; otherwise filters `this.system.actions` by attack type.

- `toggleEnabled(enabled: boolean | null = null): Promise<Item.UpdateData | undefined>`
  - Toggles `system.equipped` for `equipmentV2` items. Returns `this.update({ 'system.equipped': ... })` or `undefined` if not applicable.

- `toggleEquipped(equipped: boolean | null = null): Promise<Item.UpdateData | undefined>`
  - Alias wrapper for `toggleEnabled`.

---

### Legacy compatibility

- `get addToQuickRoll(): boolean`
  - Returns `(this.system as TraitModel).addToQuickRoll` (legacy accessor kept for compatibility).

- `get component(): TraitComponent | SkillComponent | SpellComponent | EquipmentComponent | null`
  - Returns `fea`/`ski`/`spl`/`eqt` depending on the item subtype.

- `get fea(): TraitComponent | null`
  - Returns `this.system.fea` if `this.system` is a `TraitModel`, otherwise `null`.

- `get ski(): SkillComponent | null`
  - Returns `this.system.ski` if `this.system` is a `SkillModel`, otherwise `null`.

- `get spl(): SpellComponent | null`
  - Returns `this.system.spl` if `this.system` is a `SpellModel`, otherwise `null`.

- `get eqt(): EquipmentComponent | null`
  - Returns `this.system.eqt` if `this.system` is an `EquipmentModel`, otherwise `null`.

- `get contains()`
  - Returns `this.contents.sort((a, b) => a.sort - b.sort) ?? []`.

- `get actorComponentKey()`
  - Maps item types to actor system keys for compatibility (similar to legacy `actorComponentKey`) and throws if mapping not found.

- `toggleCollapsed(expandOnly: boolean = false): void`
  - Toggles `system.open` (calls `this.update({ 'system.open': newValue })`) unless `expandOnly` prevents collapsing.

---

### Notes & guidance

- Many accessors rely on the typed item system models (`BaseItemModel`, `TraitModel`, `SkillModel`, `SpellModel`, `EquipmentModel`) and on `metadata.embedded` to manage pseudo-documents.
- `getItemAttacks` was redesigned to return full attack models rather than the previous component wrappers.

If you'd like, I can also append short TypeScript signatures and example usage for each member, or add these entries to the existing `dev/static/items-methods.md` file for cross-reference.

File generated from `module/item/gurps-item.ts`.
