import { AnyObject } from 'fvtt-types/utils'

class GurpsSidebar extends Sidebar {
  // @ts-expect-error: Waiting for types to catch up
  override toggleExpanded(expanded: boolean): void {
    // @ts-expect-error: Waiting for types to catch up
    super.toggleExpanded(expanded)
    GURPS.ModifierBucket.refreshPosition()
  }

  override changeTab(tab: string, group: string, options: AnyObject): void {
    super.changeTab(tab, group, options)
    // @ts-expect-error: Waiting for types to catch up
    if (this.expanded) {
      GURPS.ModifierBucket.refreshPosition()
    }
  }
}

export { GurpsSidebar }
