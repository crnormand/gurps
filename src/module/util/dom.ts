type HTMLButtonOptions = {
  label?: string
  dataset?: Record<string, string>
  classes?: string[]
  icon?: string
  img?: string
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
}

export function constructHTMLButton({
  label = '',
  dataset = {},
  classes = [],
  icon = '',
  img = '',
  type = 'button',
  disabled = false,
}: HTMLButtonOptions): HTMLButtonElement {
  const button = document.createElement('button')

  button.type = type

  for (const [key, value] of Object.entries(dataset)) {
    button.dataset[key] = value
  }

  button.classList.add(...classes)
  let image = ''

  if (img) image = `<img src="${img}" alt="${label}">`
  else if (icon) image = `<i class="${icon}"></i> `
  if (disabled) button.disabled = true
  button.innerHTML = `${image}${label}`

  return button
}
