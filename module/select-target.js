/**
 * Multiple targets are selected -- prompt the user for
 * which target to apply some function to.
 */
export default async function selectTarget() {
  let html = await renderTemplate('systems/gurps/templates/apply-damage/select-token.html', {
    tokens: game.user.targets,
  })

  return new Promise(resolve =>
    new Dialog(
      {
        title: game.i18n.localize('GURPS.selectToken'),
        content: html,
        buttons: {
          apply: {
            icon: '<i class="fas fa-check"></i>',
            label: game.i18n.localize('GURPS.addApply'),
            callback: html => {
              let name = html.find('select option:selected').text().trim()
              let target = [...game.user.targets].find(token => token.name === name)
              resolve(target)
            },
          },
        },
        default: 'apply',
        tokens: game.user.targets,
      },
      { width: 300 }
    ).render(true)
  )
}
