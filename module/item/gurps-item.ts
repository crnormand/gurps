class GurpsItemV2<SubType extends Item.SubType = Item.SubType> extends Item<SubType> {
  // NOTE: migrated from getItemAttacks
  get attacks(): ConfiguredItem<'meleeAtk' | 'rangedAtk'>[]
}

export { GurpsItemV2 }
