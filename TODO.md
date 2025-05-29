# TODO

This is a developer TODO file. It is not meant to be read by users.

## Master Notes

- I believe that the migration from using actor components to using native items (for all characters) as well as the migration
  from the old, non-DataModel actor to a DataModel actor should be done in a single step. The alternative, dealing with a data
  model which does not make use of Foundry's native data validation methods, is unnecessarily cumbersome.
- This migration is an excellent opportunity to clean up existing actor code, enforce stricter standards for the way we write
  code concerning the actor and items, and to make the code more readable and maintainable.
- To avoid having to deal with old code in the new DataModel, I propose to migrate actors to a new actor type while keeping
  the old one intact. This way, we can keep the old code intact and allow users to voluntarily migrate their actors to the new
  data type when they are ready. This will make for much easier deprecation of the old code as we begin the transition from the
  legacy data-model to an intermediary DataModel Actor (and DataModel items), and then finally to a GCS-based DataModel Actor
  and Items later down the line. There will be no need to mess with the old code, and we can focus on the new code only when
  we reach that stage in the migration.

## Importing GCA5 XML files directly

- The GCA5 XML files can be imported directly into the new DataModel Actor and Item system.
  The data will likely not need to be transformed much, as the GCA5 XML files are already the basis for the current
  data structure in some sense.
- The GCA5 schemas currently used schema fields which could be transformed into Array Fields as the only non-child
  nodes in them are the $count attribute.
- Attributes are displayed in GCA based on the number in the "mainwin" attribute. This is not used in the current data model
  even with the GCS data model but can be used in the future to hide some attributes form the sheet. This can potentially
  effectively allow us to use GCA-style attributes in a GCS-based Actor DataModel, which would be nice.

## Actor DataModel Migration

### Notes

- There is no easy way of knowing whether an actor was imported using the "Use Foundry Items" setting or not (i.e. there is no
  flag in the import data indicating this). The "use foundry items" setting can be turned on and off at will and actors don't
  automatically update their data to match the setting. However, since the "Use Foundry Items" setting does not seem to change
  the fact that the item data is stored/duplicated in the actor's own system data. Therefore, we can avoid checking whether this
  setting is used or not, ignore the item documents on the actor, and use only the actor's system data as migration data.

## Item DataModel Migration

### Move base classes to ItemComponent or sub-classes thereof

#### Fields

##### Shared

- notes: String field for storing notes about the item. Simple text field, but see #setNotes below for further details.
  STATUS: Migrated to StringField in ItemComponent.
- pageref: String field for storing the page reference of the item. It is used to store the page number or link to
  the source material.
  STATUS: Migrated to StringField in ItemComponent.
- contains: Object field used for storing the contents of the item. Used for containers and such. It is a plain object
  whose contents are generated during actor data preparation.
  This object can likely be replaced with a set of IDs pointing to other items. This migration would require creating new items
  for the existing objects.
  STATUS: NOT FULLY IMPLEMENTED
- uuid: String field for storing the unique identifier of the item. See \_getGGAId for more details.
  STATUS: Migrated to StringField in ItemComponent.
- parentuuid: String field for storing the unique identifier of the parent item. It is used to link items together
  in a hierarchy, such as containers and their contents. This will not be needed in the new data model, as it would duplicate the
  functionality of "contains" (above) while providing less information than the above (namely, the order in which the child items
  are stored/displayed in the parent).
  STATUS: NOT NEEDED, NOT YET REMOVED
- originalName: String field used to store the original name of the item. As far as I can tell, this is only needed because
  GGA sometimes changes the name of an item on import. We can likely deprecate this field and rely only on the ID field for
  recognising re-imported items.
  STATUS: NOT NEEDED, NOT YET REMOVED
- points: Number field for storing point cost of an item. Straightforwardly needed.
  STATUS: KEEP
- save: Boolean field. Not sure what it does.
  STATUS: more information needed
- itemid: String field used to store ID of associated Item. Won't be needed in the new data model as this will be
  accessible through the component's parent
  STATUS: NOT NEEDED, NOT YET REMOVED
- itemInfo: Object field used to store additional information about the item. It is a plain object which is essentially
  the equivalent of CommonItemDataSchema. As such, it is not needed and can be removed.
  STATUS: NOT NEEDED, NOT YET REMOVED
- fromItem: String field used to store the ID of an item which contains this component. This is used for the traits, skills,
  spells and weapons which can be stored on any Item.
  We will be moving to a system where ItemComponents will always be stored as singletons on the Item. This field will not be
  needed as the IDs of stored Items will be accessible through the ItemComponent's parent.
  Status: NOT NEEDED, NOT YET REMOVED
- addToQuickRoll: Boolean field used to indicate whether the item should be added to the quick roll menu.
  This is straightforwardly needed
  STATUS: KEEP
- import: Number field (for some reason it accepts strings too, but that's horrible), used for the original/imported level
  of a levelled item (such as a skill or spell). I don't like the name but we can keep it for now. This field is useful.
  Status: KEEP
  level: Number field used to store the level of the item. It is used for levelled items such as skills and spells.
  This field is initially set to 0 and is updated during import, then combined with various bonuses.
  We may want to remove the duplicate data so we're not storing both the pre-processed and post-processed value in the DB,
  but we can keep it for now.
  STATUS: KEEP
- modifierTags: This string field is used to store a set of tags for the item. The tags are used to determine which
  modifiers are automatically applied to rolls related to this item. We can probably replace it with an ArrayField<StringField>
  for cleaner parsing.
  STATUS: TO MIGRATE
- consumeAction: Boolean value to indicate whether the use of the item consumes an action (see TokenActions). This is
  straightforwardly useful and needed as is.
  STATUS: KEEP

##### Skill

- type: String field used to store the Attribute Difficulty of a skill. We may be able to migrate this to a DifficultyField
  for skills, but techniques would be harder as they are not based directly on attributes.
- relativelevel: String field used to store the relative level of a skill compared to the attribute or skill it is based
  on. I don't think this is needed as we can calculate it from the above type field and the level of the skill, but we can
  keep it for now.
  STATUS: KEEP

##### Spell

- class: String field used to store the class of the spell. Needed.
  STATUS: KEEP
- college: String field used to store the college of the spell. Needed. May be converted to an ArrayField<StringField>
  in the future.
  STATUS: KEEP
- cost: String field used to store the cost of the spell. It is used to determine the cost of casting the spell. Needed.
  STATUS: KEEP
- maintain: as above. Keep.
  STATUS: KEEP
- duration: As above. Keep.
  STATUS: KEEP
- resist: As above. Keep.
  STATUS: KEEP
- casttime: As above. Keep.
  STATUS: KEEP
- difficulty: As above. Keep. Equivalent of skill "type" field as far as I can tell.
  We may want to migrate this or the other one so the naming is consistent.
  STATUS: KEEP
- relativelevel: As above. Keep.
  STATUS: KEEP

##### Equipment

- equipped: Boolean field,

#### Methods

Note: I am using "." for static methods and "#" for instance methods. Visibility is not specified by these characters if they are the first character.

##### \_Base

- #pageRef(r: string): void
  This sets the page reference for the item. If the reference is a link, the text is set to "\*Link"
  and the "externallink" field is used instead.
  It is used only during the import process, and the "externallink" value is only queried by one HandlebarsHelper.
  The "externallink" value can be set to deprecated, migrated back to "pageref", and a display only value can instead
  be used for the sheet.
  STATUS: TODO
- #setNotes(n: string): void
  This sets the pageref field for a value if the string "Page Ref:" can be found in the notes. It is used only during
  import and can therefore be removed and replaced with more comprehensive importing.
  STATUS: TODO
- .\_checkComponentInActor<T extends _Base>(actor: Actor, actorComponent: T): T
  This checks if the component exists on the actor as an internal property, using ID matching.
  If it does, the component is transformed with some properties of the item, including the ID, name, image, etc.
  It returns the inputted component.
  This is used only during import and in the actor method #\_addChildItemElement and can be removed as it will be replaced
  with item-specific methods.
  STATUS: TODO

##### Named

- #setName(n: string): void
  This sets the name of the item. It is used only in the constructor (and therefore during import and other instances of data
  initialisation) and can be removed. As #setNotes above, it extracts "Page Ref:" from the name and sets the pageref field.
  It can be replace d with a more comprehensive importing method.
  STATUS: TODO
- #findDefaultImage(): string
  This finds the default image for the item. It is overridden in subclasses to provide a fallback image in case
  the component does not correspond to an item.
  This can be replaced with a metadata property.
  STATUS: TODO
- #\_getGGAId(objProps: {name: string, type: string, generator: string}): string
  This generates a UUID for the component based on an imported ID from GCA or GCS. It returns a string which is
  set as the "uuid" field of the component. The "uuid" field in turn is used to identify the component for various
  actions as well as during import to check if the component already exists and can therefore be updated instead of
  duplicating it by creating a new component.
  The non-import uses of "uuid" can be replaced with Item#id fields, though the import ID should be preserved
  for import purposes.
  STATUS: TODO
- #toItemData(actor: Actor, fromProgram: string): SchemaData<Item<SubType>>
  This produces schema data for an Item. The method is overridden for each subclass. The method is only used during import
  and when creating a new item from the charsheet. It can be removed as the import functionality will be replaced, and the
  item document creation functionality will be taken over by the Item system DataModel.
  STATUS: TODO
- .fromObject<T extends Name>(data: AnyObject|T, actor: Actor): T
  This static method returns an instance of the class from an object. It is only used to construct the ItemComponent at various
  steps (presumably only to make use of its constructor and initialisation methods). It can be replaced with native functionality
  in the new ItemComponent model (or Item system DataModel).
  STATUS: TODO
- #\_itemNeedsUpdate(item: Item<SubType>): boolean
  This method checks if the item data is up-to-date with the item data from an import. It is only ever used during the
  import process, and the data in the import isn't even used fully as the resulting action if this returns "true" is to only
  update some of the string information. It can be removed as the import functionality will be replaced.
  STATUS: TODO

##### NamedCost

### Migrate item importing methods to fit new data model
