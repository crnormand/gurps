export class GurpsJournalEntryPage extends JournalEntryPage {
  constructor(data, context = {}) {
    if (context.gurps?.ready) {
      super(data, context)
      this.system.code ??= ''
      this.system.offset ??= 0
    } else {
      foundry.utils.mergeObject(context, { gurps: { ready: true } })
      if (data.type === 'pdf') return new GurpsJournalEntryPage(data, context)
      else return new JournalEntryPage(data, context)
    }
  }
}
