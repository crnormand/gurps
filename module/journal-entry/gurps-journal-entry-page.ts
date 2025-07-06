class GurpsJournalEntryPage<SubType extends JournalEntryPage.SubType> extends JournalEntryPage<SubType> {
  /* ---------------------------------------- */

  isOfType<SubType extends JournalEntryPage.SubType>(...types: SubType[]): this is JournalEntryPage.OfType<SubType>
  isOfType(...types: string[]): boolean {
    return types.includes(this.type as JournalEntryPage.SubType)
  }

  /* ---------------------------------------- */
}

/* ---------------------------------------- */

export { GurpsJournalEntryPage }
