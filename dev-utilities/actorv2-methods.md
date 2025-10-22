# Actor Class API Surface (auto-generated)

- Generated on: 2025-10-13T18:05:42.510Z

## GurpsActorV2 (module/actor/gurps-actor.ts)

### Getters

- \_additionalResources() — [get]
- \_hitLocationRolls() — [get]
- damageAccumulators() — [get]
- defaultHitLocation() — [get]
- displayname() — [get]
- hitLocationsWithDR() — [get]
- isNewActorType() — [private, get]
- model() — [private, get]
- owners() — [get]
- temporaryEffects() — [override, get]
- torsoDr() — [get]
- usingQuintessence() — [get]

### Methods

- \_findEqtkeyForId()
- \_findSysKeyForId()
- \_preUpdate() — [async, override]
- \_removeItemAdditions()
- \_sanityCheckItemSettings() — [async]
- \_updateItemFromForm() — [async]
- \#checkForMerge() — [async, private]
- \#convertLegacyItemKey() — [private]
- \#createEquipment() — [async, private]
- \#parseItemKey() — [private]
- \#promptEquipmentQuantity() — [async, private]
- \#splitEquipment() — [async, private]
- \#translateAdsData() — [async, private]
- \#translateHitLocationsV2() — [private]
- \#translateLegacyEncumbranceData() — [private]
- \#translateLegacyHitlocationData() — [private]
- \#translateMoveData() — [private]
- addNewItemData()
- applyDamageAccumulator() — [async]
- canConsumeAction()
- changeDR() — [async]
- clearDamageAccumulator() — [async]
- decrementDamageAccumulator() — [async]
- deleteEquipment() — [async]
- deleteItem() — [async]
- doForEachEmbedded()
- findEquipmentByName()
- getAllActivePostureEffects() — [private]
- getChecks()
- getEmbeddedPseudoDocumentCollection()
- getItemAttacks()
- getItemReactions()
- getOwners()
- getTorsoDr()
- handleDamageDrop()
- handleEquipmentDrop() — [async]
- incrementDamageAccumulator() — [async]
- internalUpdate() — [async]
- isEffectActive()
- isEmptyActor()
- isFeatureV2() — [private]
- isOfType()
- isPostureEffect() — [private]
- moveEquipment() — [async]
- moveItem() — [async]
- openSheet() — [async]
- prepareBaseData() — [override]
- prepareDerivedData() — [override]
- prepareEmbeddedDocuments() — [override]
- refreshDR() — [async]
- reorderItem() — [async]
- replaceManeuver() — [async]
- replacePosture() — [async]
- runOTF() — [async]
- sendChatMessage()
- setMoveDefault() — [async]
- toggleExpand() — [async]
- updateEqtCount() — [async]
- updateEqtCountV2() — [async]
- updateItemAdditionsBasedOn()
