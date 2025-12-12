export default class GgaContextMenuV2 extends foundry.applications.ux.ContextMenu {
  constructor(
    container: HTMLElement,
    element: HTMLElement,
    selector: string | null | undefined,
    menuItems: ContextMenu.Entry<HTMLElement>[],
    options?: ContextMenu.ConstructorOptions<false>
  ) {
    // Force jQuery to be false.
    super(element, selector, menuItems, { eventName: 'contextmenu', ...options, jQuery: false })

    this.container = container
  }

  container: HTMLElement

  /**
   * Set the position of the context menu, taking into consideration whether the menu should expand upward or downward,
   * AND sliding it to the right or left to fit into its container.
   * @param {HTMLElement} menu    The menu element.
   * @param {HTMLElement} target  The context target.
   * @protected
   */
  override _injectMenu(menu: HTMLElement, target: HTMLElement) {
    super._injectMenu(menu, target)

    const container = this.container || target.parentElement
    const containerRect = container.getBoundingClientRect()

    const contextRect = menu.getBoundingClientRect()
    const parentRect = target.getBoundingClientRect()

    if (contextRect.right > containerRect.right) {
      menu.style.left = `${parentRect.width - contextRect.width}px`
    } else if (contextRect.left < containerRect.left) {
      menu.style.left = `0px`
    }
  }
}
