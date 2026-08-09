import { AnyObject } from 'fvtt-types/utils'

class GurpsSidebar<
  RenderContext extends
    foundry.applications.sidebar.Sidebar.RenderContext = foundry.applications.sidebar.Sidebar.RenderContext,
  Configuration extends
    foundry.applications.sidebar.Sidebar.Configuration = foundry.applications.sidebar.Sidebar.Configuration,
  RenderOptions extends
    foundry.applications.sidebar.Sidebar.RenderOptions = foundry.applications.sidebar.Sidebar.RenderOptions,
> extends foundry.applications.sidebar.Sidebar<RenderContext, Configuration, RenderOptions> {
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
