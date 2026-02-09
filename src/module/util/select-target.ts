/**
 * Multiple tokens are selected -- prompt the user for which tokens to apply some function to.
 */
export default async function selectTarget(
  targets: any[],
  selectOptions: { selectAll?: boolean; single?: boolean } = { selectAll: false, single: false }
): Promise<any[]> {
  const result = await foundry.applications.api.DialogV2.prompt({
    window: { title: game.i18n?.localize('GURPS.selectToken') ?? 'Select Token', resizable: true },
    content: await foundry.applications.handlebars.renderTemplate(
      'systems/gurps/templates/apply-damage/select-token.hbs',
      {
        tokens: targets,
        single: selectOptions.single,
      }
    ),
    ok: {
      callback: (_event: Event, button: any) => {
        const allTokens = button.form.elements.tokens
        const ids = Array.from(allTokens)
          .filter((token: any) => token.checked)
          .map((token: any) => token.value)

        const selected: any[] = []

        ids.forEach((id: any) => {
          const target = targets.find(token => token.id === id)

          if (target) selected.push(target)
        })

        return selected
      },
    },
    render: (_event: Event, dialog: any) => {
      // COMPATIBILITY: v12
      const element = (game.release?.generation ?? 0) >= 13 ? dialog.element : dialog

      const tokenCheckboxes = Array.from(element.querySelectorAll('input[name="tokens"]')) ?? []

      if (selectOptions.single) {
        tokenCheckboxes.forEach((token: any) => {
          token.addEventListener('change', () => {
            tokenCheckboxes.filter((cb: any) => cb !== token).forEach((cb: any) => (cb.checked = false))
          })
        })
      } else {
        const allCheckbox = element.querySelector('input[name="all"]')

        if (selectOptions.selectAll) {
          allCheckbox.checked = true
          tokenCheckboxes.forEach((checkbox: any) => (checkbox.checked = true))
        }

        allCheckbox.addEventListener('change', (event: any) =>
          tokenCheckboxes.forEach((checkbox: any) => (checkbox.checked = event.target.checked))
        )

        tokenCheckboxes.forEach((checkbox: any) => {
          checkbox.addEventListener('change', (event: any) => {
            if (!event.target.checked) allCheckbox.checked = false
          })
        })
      }
    },
  })

  return result ?? []
}
