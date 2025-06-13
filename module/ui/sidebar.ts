import { AnyObject } from 'fvtt-types/utils'

class GurpsSidebar extends Sidebar {
  override toggleExpanded(expanded: boolean): void {
    super.toggleExpanded(expanded)
    GURPS.ModifierBucket.refreshPosition()
  }

  override changeTab(tab: string, group: string, options: AnyObject): void {
    super.changeTab(tab, group, options)
    if (this.expanded) {
      GURPS.ModifierBucket.refreshPosition()
    }
  }
}

export { GurpsSidebar }
