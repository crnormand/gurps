/**
 * @description Multiple tokens are selected -- prompt the user for which tokens to apply some function to.
 *
 * @param {Array} targets - An array of tokens to select from.
 * @param {boolean} [selected=false] - Whether to pre-select all targets.
 * @returns {Promise<Array>} - A promise that resolves with the selected targets.
 */
export default async function selectTarget(targets, selected = false) {
  return new Promise(async resolve => {
    const dialog = await new foundry.applications.api.DialogV2({
      window: { title: game.i18n.localize('GURPS.selectToken'), resizable: true },
      content: await renderTemplate('systems/gurps/templates/apply-damage/select-token.hbs', {
        tokens: targets,
      }),
      buttons: [
        {
          icon: 'fas fa-save',
          label: 'GURPS.addApply',
          callback: (event, button, dialog) => {
            console.log(dialog)
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
    }).render({ force: true })

    const allCheckbox = dialog.element.querySelector('input[name="all"]')

    // Default to checked if selected is true.
    if (selected) allCheckbox.checked = true

    const otherCheckboxes = dialog.element.querySelectorAll('input[name="tokens"]')

    // Default to checked if selected is true.
    if (selected) otherCheckboxes.forEach(checkbox => (checkbox.checked = true))

    allCheckbox.addEventListener('change', event => {
      const isChecked = event.target.checked
      otherCheckboxes.forEach(checkbox => (checkbox.checked = isChecked))
    })

    Array.from(otherCheckboxes).forEach(checkbox => {
      checkbox.addEventListener('change', event => {
        const isChecked = event.target.checked
        if (!isChecked) {
          allCheckbox.checked = false
        }
      })
    })
  })
}
