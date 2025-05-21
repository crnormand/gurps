import * as Settings from '../../lib/miscellaneous-settings.js'

class GurpsSidebar extends Sidebar {
  // @ts-expect-error: Waiting for types to catch up
  override toggleExpanded(expanded: boolean): void {
    // @ts-expect-error: Waiting for types to catch up
    super.toggleExpanded(expanded)

    if (game.settings?.get(Settings.SYSTEM_NAME, Settings.SETTING_BUCKET_POSITION) !== 'right') return

    const bucketElement = GURPS.ModifierBucket.element[0]
    // @ts-expect-error: Waiting for types to catch up
    if (this.expanded) {
      // @ts-expect-error: Waiting for types to catch up
      const sidebarElement = (ui.sidebar?.element as HTMLElement) ?? null
      sidebarElement.parentNode?.insertBefore(bucketElement, sidebarElement)
    } else {
      const uiRightElement = document.getElementById('ui-right') ?? null
      uiRightElement?.prepend(bucketElement)
    }
  }
}

export { GurpsSidebar }
