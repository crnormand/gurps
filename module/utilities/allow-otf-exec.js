/**
 * @description Allow an On-the-Fly (OtF) command to be executed by a user.
 * This function prompts each user who is an owner of a token in the target list to confirm that the command should
 * be executed. If the user confirms, the command is executed.
 *
 * @param {Object} options - Options for the dialog.
 * @param {string} options.actor - The source of the OtF command.
 * @param {string} options.command - The command to execute.
 * @param {string} options.actorname - The name of the actor.
 * @param {Array} options.targets - The target tokens for the command.
 */
export function allowOtfExec(options) {
  options.targets.forEach(tuple => {
    let tokenActor = game.canvas.tokens.get(tuple[1]).actor
    let tokenOwner = tuple[0] ? game.users.get(tuple[0]) : game.user

    if (tokenOwner.isSelf && tokenActor.isOwner) {
      setTimeout(async () => {
        const proceed = await foundry.applications.api.DialogV2.confirm({
          content: `<div>${game.i18n.format('GURPS.chatWantsToExecute', { command: options.command, name: tokenActor.name, source: options.actorname })}</div>`,
          rejectClose: false,
          modal: true,
        })

        if (proceed) {
          let old = GURPS.LastActor

          GURPS.SetLastActor(tokenActor)
          GURPS.executeOTF(options.command).then(() => GURPS.SetLastActor(old))
        }
      }, 50)
    }
  })
}
