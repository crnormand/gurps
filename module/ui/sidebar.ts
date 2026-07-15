import { AnyObject } from 'fvtt-types/utils'

class GurpsSidebar<
  RenderContext extends Sidebar.RenderContext = Sidebar.RenderContext,
  Configuration extends Sidebar.Configuration = Sidebar.Configuration,
  RenderOptions extends Sidebar.RenderOptions = Sidebar.RenderOptions,
> extends Sidebar<RenderContext, Configuration, RenderOptions> {
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
