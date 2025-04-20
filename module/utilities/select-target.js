/**
 * @description Multiple tokens are selected -- prompt the user for which tokens to apply some function to.
 *
 * @param {Array} targets - An array of tokens to select from.
 * @param {boolean} [selected=false] - Whether to pre-select all targets.
 * @returns {Promise<Array>} - A promise that resolves with the selected targets.
 */
export default async function selectTarget(targets, selectOptions = { selectAll: false, single: false }) {
  return new Promise(async resolve => {
    const dialog = await new DialogWithListeners(
      {
        window: { title: game.i18n.localize('GURPS.selectToken'), resizable: true },
        content: await renderTemplate('systems/gurps/templates/apply-damage/select-token.hbs', {
          tokens: targets,
          single: selectOptions.single,
        }),
        buttons: [
          {
            icon: 'fas fa-save',
            label: 'GURPS.addApply',
            callback: (event, button, dialog) => {
              const allTokens = button.form.elements.tokens
              const names = Array.from(allTokens)
                .filter(token => token.checked)
                .map(token => token.value)

              const selected = []
              names.forEach(name => {
                const target = targets.find(token => token.name === name)
                if (target) selected.push(target)
              })
              resolve(selected) // Resolve with the selected targets
            },
          },
        ],
      },
      selectOptions
    ).render({ force: true })

    console.log(dialog)
  })
}

class DialogWithListeners extends foundry.applications.api.DialogV2 {
  constructor(options, selectOptions) {
    super(options)
    this.selectOptions = selectOptions
  }

  _onRender(context, options) {
    super._onRender(context, options)

    const checkboxes = this.element.querySelectorAll('input[name="tokens"]')

    if (this.selectOptions.single) {
      checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
          if (checkbox.checked) {
            checkboxes.forEach(cb => {
              if (cb !== checkbox) cb.checked = false
            })
          }
        })
      })
    } else {
      const allCheckbox = this.element.querySelector('input[name="all"]')

      // Default to checked if selected is true.
      if (this.selectOptions.selectAll) allCheckbox.checked = true

      allCheckbox.addEventListener('change', event => {
        const isChecked = event.target.checked
        checkboxes.forEach(checkbox => (checkbox.checked = isChecked))
      })

      // Default to checked if selected is true.
      if (this.selectOptions.selectAll) checkboxes.forEach(checkbox => (checkbox.checked = true))

      Array.from(checkboxes).forEach(checkbox => {
        checkbox.addEventListener('change', event => {
          const isChecked = event.target.checked
          if (!isChecked) {
            allCheckbox.checked = false
          }
        })
      })
    }
  }
}
