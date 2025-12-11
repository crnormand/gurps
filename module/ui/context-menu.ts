/**
 * An extended ContextMenu class which better handles positioning within a container element.
 * Specifically, it ensures that the context menu does not overflow the boundaries of the container
 * by adjusting its horizontal position as needed.
 */
export default class GgaContextMenuV2 extends foundry.applications.ux.ContextMenu {
  constructor(
    target: HTMLElement,
    selector: string | null | undefined,
    menuItems: ContextMenu.Entry<HTMLElement>[],
    container?: HTMLElement,
    options?: ContextMenu.ConstructorOptions<false>
  ) {
    // Force jQuery to be false.
    super(target, selector, menuItems, { eventName: 'contextmenu', ...options, jQuery: false })

    this.container = container
  }

  container: HTMLElement | undefined | null

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
    const containerRect = container!.getBoundingClientRect()

    const menuRect = menu.getBoundingClientRect()
    const parentRect = target.getBoundingClientRect()

    if (menuRect.right > containerRect.right) {
      menu.style.left = `${parentRect.width - menuRect.width}px`
    } else if (menuRect.left < containerRect.left) {
      menu.style.left = `0px`
    }
  }
}
