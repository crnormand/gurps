# TODO

- Re-do equipment-table with new DisplayEquipment interface
- Fix type issues caused by overriding name initial value on PseudoDocument subclasses
- consolidate resource tracker partial for modern and GCS sheets (can keep different styling, shouldn't be hard)
- consolidate resource tracker prepared data interface for modern and GCS sheets
- make sure all modern sheet events are still working (check dropdowns for item sections especially, and all pool types)

## After

- Split branch into 3, in order:

1. PseudoDocument refactor
2. Sheet migration to modern DataModel only
3. Migration refactor
