// Context Menu
export default class GgaContextMenu extends ContextMenu {
  constructor(container, element, selector, title, menuItems, events = { eventName: 'contextmenu' }) {
    super(element, selector, menuItems, events)

    this.title = title

    // HTML element that acts as a viewport for this menu item. The code will do
    // 'best effor' to position the menu to be visible.
    this.container = container
  }

  /**
   * Render the Context Menu by iterating over the menuItems it contains.
   * Check the visibility of each menu item, and only render ones which are allowed by the item's logical condition.
   * Attach a click handler to each item which is rendered.
   * @param {jQuery} target     The target element to which the context menu is attached
   */
  render(target) {
    let html = $('#context-menu').length ? $('#context-menu') : $('<nav id="context-menu"></nav>')
    let title = $(`<h3 style='padding: 0 0.5em; border-bottom: 1px double grey;'>${this.title}</h3>`)
    html.html(title)
    let ol = $('<ol class="context-items"></ol>')
    html.append(ol)

    // Build menu items
    for (let item of this.menuItems) {
      // Determine menu item visibility (display unless false)
      let display = true
      if (item.condition !== undefined) {
        display = item.condition instanceof Function ? item.condition(target) : item.condition
      }
      if (!display) continue

      // Construct and add the menu item
      let name = game.i18n.localize(item.name)
      let li = $(`<li class="context-item">${item.icon}${name}</li>`)
      li.children('i').addClass('fa-fw')
      li.click(e => {
        e.preventDefault()
        e.stopPropagation()
        item.callback(target)
        this.close()
      })
      ol.append(li)
    }

    // Bail out if there are no children
    if (ol.children().length === 0) return

    // Append to target
    this._setPosition(html, target)

    // Animate open the menu
    return this._animateOpen(html)
  }

  /**
   * Set the position of the context menu, taking into consideration whether the menu should expand upward or downward,
   * AND sliding it to the right or left to fit into its container.
   * @private
   */
  _setPosition(html, target) {
    const container = this.container || target[0].parentElement

    // Append to target and get the context bounds
    target.css('position', 'relative')
    html.css('visibility', 'hidden')
    target.append(html)
    const contextRect = html[0].getBoundingClientRect()
    const parentRect = target[0].getBoundingClientRect()
    const containerRect = container[0].getBoundingClientRect()

    // Determine whether to expand upwards
    const contextTop = parentRect.top - contextRect.height
    const contextBottom = parentRect.bottom + contextRect.height
    const canOverflowUp = contextTop > containerRect.top || getComputedStyle(container).overflowY === 'visible'

    // If it overflows the container bottom, but not the container top
    const containerUp = contextBottom > containerRect.bottom && contextTop >= containerRect.top
    const windowUp = contextBottom > window.innerHeight && contextTop > 0 && canOverflowUp
    this._expandUp = containerUp || windowUp

    // Display the menu
    if (contextRect.right > containerRect.right) {
      html.css({
        left: `${parentRect.width - contextRect.width}px`,
      })
    } else if (contextRect.left < containerRect.left) {
      html.css({
        left: `0px`,
      })
    }

    html.addClass(this._expandUp ? 'expand-up' : 'expand-down')
    html.css('visibility', '')
    target.addClass('context')
  }
}
