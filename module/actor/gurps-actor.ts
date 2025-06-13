class GurpsActorV2<SubType extends Actor.SubType> extends Actor<SubType> {
  /* ---------------------------------------- */

  isOfType<SubType extends Actor.SubType>(...types: SubType[]): this is ConfiguredActor<SubType>
  isOfType(...types: string[]): boolean {
    return types.includes(this.type as Actor.SubType)
  }

  /* ---------------------------------------- */

  // NOTE: changed from getOnwers() in old system
  get owners(): User.Implementation[] {
    return game.users?.filter(user => user.isOwner) ?? []
  }

  /* ---------------------------------------- */

  // NOTE: STUB. Not convinced this is needed in the new system.
  //
  async openSheet(_newSheet: foundry.applications.api.ApplicationV2): Promise<void> {}

  /* ---------------------------------------- */

  /* ---------------------------------------- */
  /*  Data Preparation                        */
  /* ---------------------------------------- */
}

export { GurpsActorV2 }
