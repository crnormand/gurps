/**
 * Multiple tokens are selected -- prompt the user for which tokens to apply some function to.
 */
export default async function selectTarget(
  targets: HTMLElement[],
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
      const tokenCheckboxes: HTMLInputElement[] =
        Array.from(dialog.element.querySelectorAll('input[name="tokens"]')) ?? []

      if (selectOptions.single) {
        tokenCheckboxes.forEach((token: HTMLInputElement) => {
          token.addEventListener('change', () => {
            tokenCheckboxes.filter(checkbox => checkbox !== token).forEach(checkbox => (checkbox.checked = false))
          })
        })
      } else {
        const allCheckbox: HTMLInputElement = dialog.element.querySelector('input[name="all"]')

        if (selectOptions.selectAll) {
          allCheckbox.checked = true
          tokenCheckboxes.forEach(checkbox => (checkbox.checked = true))
        }

        allCheckbox.addEventListener('change', event =>
          tokenCheckboxes.forEach(checkbox => (checkbox.checked = (event.target as HTMLInputElement).checked))
        )

        tokenCheckboxes.forEach(checkbox => {
          checkbox.addEventListener('change', event => {
            if (!(event.target as HTMLInputElement).checked) allCheckbox.checked = false
          })
        })
      }
    },
  })

  return result ?? []
}
