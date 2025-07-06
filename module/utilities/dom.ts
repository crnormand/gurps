/**
 * A helper method for constructing an HTML button based on given parameters.
 * @param {object} config Options forwarded to the button
 * @param {string} config.label
 * @param {Record<string, string>} [config.dataset={}]
 * @param {string[]} [config.classes=[]]
 * @param {string} [config.icon=""]
 * @param {"button" | "submit"} [config.type="button"]
 * @param {boolean} [config.disabled=false]
 * @returns {HTMLButtonElement}
 */
function constructHTMLButton({
  label,
  dataset = {},
  classes = [],
  icon = '',
  type = 'button',
  disabled = false,
}: {
  label: string
  dataset?: Record<string, string>
  classes?: string[]
  icon?: string
  type?: 'button' | 'submit'
  disabled?: boolean
}): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = type

  for (const [key, value] of Object.entries(dataset)) {
    button.dataset[key] = value
  }
  button.classList.add(...classes)
  if (icon) icon = `<i class="${icon}"></i> `
  if (disabled) button.disabled = true
  button.innerHTML = `${icon}${label}`

  return button
}

/* ---------------------------------------- */

function htmlClosest(element: HTMLElement, selector: string): HTMLElement | null {
  return element.closest(selector) as HTMLElement | null
}

/* ---------------------------------------- */

function htmlQuerySelector(element: HTMLElement, selector: string): HTMLElement | null {
  return element.querySelector(selector) as HTMLElement | null
}

/* ---------------------------------------- */

function htmlQuerySelectorAll(element: HTMLElement, selector: string): NodeListOf<HTMLElement> {
  return element.querySelectorAll(selector) as NodeListOf<HTMLElement>
}

/* ---------------------------------------- */

export { constructHTMLButton, htmlClosest, htmlQuerySelector, htmlQuerySelectorAll }
