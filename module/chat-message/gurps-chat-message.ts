class GurpsChatMessage<SubType extends ChatMessage.SubType> extends ChatMessage<SubType> {
  override prepareDerivedData(): void {
    console.log(this.rolls)
    super.prepareDerivedData()
  }
}

/* ---------------------------------------- */

export { GurpsChatMessage }
