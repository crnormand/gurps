enum PrereqType {
  List = 'prereqList',
  Trait = 'traitPrereq',
  Attribute = 'attributePrereq',
  ContainedQuantity = 'containedQuantityPrereq',
  ContainedWeight = 'containedWeightPrereq',
  EquippedEquipment = 'equippedEquipment',
  Skill = 'skillPrereq',
  Spell = 'spellPrereq',
  Script = 'scriptPrereq',
}

enum SpellPrereqSubType {
  Name = 'name',
  Tag = 'tag',
  College = 'college',
  CollegeCount = 'collegeCount',
  Any = 'any',
}

export { PrereqType, SpellPrereqSubType }
