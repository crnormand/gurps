## mjeffw: Compare GurpsActor and GurpsActorV2. What functions on GrpsActor do not have a counterpart on GurpsActorV2?

GitHub Copilot: To compare `GurpsActor` (classic, v1-style) and `GurpsActorV2` (modern, v2-style), we look for functions present in `GurpsActor` that **do not** have a direct counterpart in `GurpsActorV2`.

### **How to Compare**
- `GurpsActorV2` moves most data logic to the `CharacterModel` (and related data models).
- Many methods in `GurpsActor` are marked as "migrated" or "not needed" in comments, indicating their logic has moved or is obsolete.
- Some methods are now handled by the sheet classes or by the new data model system.

---

## **Functions in GurpsActor Without a Direct Counterpart in GurpsActorV2**

Below are functions that are present in `GurpsActor` but **do not** have a direct, 1:1 method in `GurpsActorV2` (either because they are obsolete, moved to the data model, or their logic is now handled differently):

### **Sheet/UI/Foundry Integration**
- `openSheet(newSheet)`
- `getRollData()`
- `asGurpsActor()`
- `getOwners()`
- `get Damage` (getter for `GURPS.modules.Damage`)

### **Item/Equipment Management**
- `handleItemDrop(dragData)`
- `handleEquipmentDrop(dragData)`
- `promptEquipmentQuantity(eqt, title)`
- `updateItem(item)`
- `addNewItemData(itemData, targetkey)`
- `addItemData(itemData, targetkey)`
- `_addNewItemEquipment(itemData, targetkey)`
- `_addItemAdditions(itemData, eqtkey)`
- `updateItemAdditionsBasedOn(eqt, targetPath)`
- `_updateEqtStatus(eqt, eqtkey, carried, equipped)`
- `_addItemElement(itemData, eqtkey, key)`
- `_addChildItemElement(parentItem, childItemData, key, list)`
- `deleteEquipment(path, depth)`
- `_removeItemAdditions(itemid)`
- `_removeItemEffect(itemId)`
- `_removeItemElement(itemid, key)`
- `moveEquipment(srckey, targetkey, shiftkey)`
- `toggleExpand(path, expandOnly)`
- `_splitEquipment(srckey, targetkey)`
- `_checkForMerging(srckey, targetkey)`
- `findByOriginalName(name, include)`
- `findEquipmentByName(pattern, otherFirst)`

### **Equipment/Item Calculation**
- `_updateEquipmentCalc(equipKey)`
- `_updateItemFromForm(item)`
- `_sanityCheckItemSettings(actorComp)`

### **Data Preparation/Calculation**
- `_initializeStartingValues()`
- `_applyItemBonuses()`
- `_collapseQuantumEq(list, isMelee)`
- `_calculateWeights()`
- `_calculateEncumbranceIssues()`
- `_getStep()`
- `_getCurrentMoveMode()`
- `_getCurrentMove(move, threshold)`
- `_getMoveAdjustedForManeuver(move, threshold)`
- `_adjustMove(move, threshold, value, reason)`
- `_getMoveAdjustedForPosture(move, threshold)`
- `_calculateRangedRanges()`
- `_recalcItemFeatures()`
- `_getSkillLevelFromOTF(otf)`

### **Resource Trackers**
- `setResourceTrackers()`
- `_initializeTrackerValues(template)`
- `applyTrackerTemplate(path, template)`
- `clearTracker(path)`
- `removeTracker(path)`
- `addTracker()`
- `updateParentOf(srckey, updatePuuid)`
- `updateEqtCount(eqtkey, count)`
- `isEmptyActor()`
- `getTrackersAsArray(data)`
- `addTrackerToDataObject(data, trackerData)`

### **Damage Accumulators**
- `accumulateDamageRoll(action)`
- `incrementDamageAccumulator(index)`
- `decrementDamageAccumulator(index)`
- `clearDamageAccumulator(index)`
- `applyDamageAccumulator(index)`
- `get damageAccumulators` (getter)

### **DR/Hit Location**
- `get hitLocationsWithDR`
- `get hitLocationByWhere`
- `get _hitLocationRolls`
- `get defaultHitLocation()`
- `getCurrentDodge()`
- `getCurrentMove()`
- `getTorsoDr()`
- `getEquipped(key)`
- `getEquippedParry()`
- `getEquippedBlock()`
- `getEquippedDefenseBonuses()`
- `getDRTooltip(locationKey)`
- `_getDRFromItems(actorLocations, update)`
- `_changeDR(drFormula, hitLocation)`
- `refreshDR()`
- `changeDR(drFormula, drLocations)`

### **Status Effects and Conditions**
- `toggleStatusEffect(statusId, { active, overlay })`
- `getAllActivePostureEffects()`
- `replaceManeuver(maneuverText)`
- `replacePosture(changeData)`
- `isEffectActive(effect)`
- `get _additionalResources()`
- `get displayname()`

### **Checks and Rolls**
- `getChecks(checkType)`
- `addTaggedRollModifiers(chatThing, optionalArgs, attack)`
- `canConsumeAction(action, chatThing, actorComp)`
- `canRoll(action, token, chatThing, actorComp)`
- `findUsingAction(action, chatting, formula, thing)`
- `runOTF(otf)`
- `usingQuintessence` (getter)

### **Miscellaneous**
- `removeAccents(str)`
- `getPortraitPath()`
- `postImport()`
- `syncLanguages()`
- `applyItemModEffects(commit, append)`
- `checkEncumbance(currentWeight)`

---

## **Why Are These Missing in GurpsActorV2?**

- **Moved to Data Models:**  
  Many of these methods are now implemented in `CharacterModel` or other data models, as part of the v2 architecture.
- **Moved to Sheets:**  
  UI and drag-and-drop logic is now handled by actor/item sheet classes.
- **Obsolete:**  
  Some methods are no longer needed due to Foundry's improved item/actor handling.
- **Replaced by Foundry Core:**  
  Some logic is now handled by Foundry's core v2 document and data preparation lifecycle.

---

## **Summary Table**

| Category                | Example Methods (GurpsActor only)         | Where to Find in V2 / Reason for Absence         |
|-------------------------|-------------------------------------------|--------------------------------------------------|
| Sheet/UI                | openSheet, getRollData                    | Sheet classes, core Foundry                      |
| Item/Equipment          | handleItemDrop, addNewItemData            | Data models, sheet classes, core Foundry         |
| Data Preparation        | _initializeStartingValues, _applyItemBonuses | CharacterModel, data models                   |
| DR/Hit Location         | getTorsoDr, getEquippedParry              | CharacterModel, data models                      |
| Status Effects          | toggleStatusEffect, replaceManeuver       | CharacterModel, data models                      |
| Checks/Rolls            | getChecks, addTaggedRollModifiers         | CharacterModel, data models                      |
| Miscellaneous           | removeAccents, getPortraitPath            | Not needed, utility modules                      |

---

**In summary:**  
Most of the logic in `GurpsActor` has been migrated to the new data model (`CharacterModel`), sheet classes, or is now handled by Foundry itself. The functions listed above are either obsolete, moved, or refactored in the v2 architecture and do not have a direct 1:1 counterpart in `GurpsActorV2`.