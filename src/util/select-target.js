/**
 * @description Multiple tokens are selected -- prompt the user for which tokens to apply some function to.
 *
 * @param {Array} targets - An array of tokens to select from.
 * @param {boolean} [selected=false] - Whether to pre-select all targets.
 * @returns {Promise<Array>} - A promise that resolves with the selected targets.
 */
export default async function selectTarget(targets, selectOptions = { selectAll: false, single: false }) {
  return await foundry.applications.api.DialogV2.prompt({
    window: { title: game.i18n.localize('GURPS.selectToken'), resizable: true },
    content: await foundry.applications.handlebars.renderTemplate(
      'systems/gurps/templates/apply-damage/select-token.hbs',
      {
        tokens: targets,
        single: selectOptions.single,
      }
    ),
    ok: {
      callback: (event, button) => {
        const allTokens = button.form.elements.tokens
        const ids = Array.from(allTokens)
          .filter(token => token.checked)
          .map(token => token.value)

        const selected = []

        ids.forEach(id => {
          const target = targets.find(token => token.id === id)

          if (target) selected.push(target)
        })

        return selected
      },
    },
    render: (event, dialog) => {
      // COMPATIBILITY: v12
      const element = game.release.generation >= 13 ? dialog.element : dialog

      const tokenCheckboxes = Array.from(element.querySelectorAll('input[name="tokens"]')) ?? []

      if (selectOptions.single) {
        tokenCheckboxes.forEach(token => {
          token.addEventListener('change', () => {
            tokenCheckboxes.filter(cb => cb !== token).forEach(cb => (cb.checked = false))
          })
        })
      } else {
        const allCheckbox = element.querySelector('input[name="all"]')

        if (selectOptions.selectAll) {
          allCheckbox.checked = true
          tokenCheckboxes.forEach(checkbox => (checkbox.checked = true))
        }

        allCheckbox.addEventListener('change', event =>
          tokenCheckboxes.forEach(checkbox => (checkbox.checked = event.target.checked))
        )

        tokenCheckboxes.forEach(checkbox => {
          checkbox.addEventListener('change', event => {
            if (!event.target.checked) allCheckbox.checked = false
          })
        })
      }
    },
  })
}
