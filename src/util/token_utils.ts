import { SYSTEM_NAME } from "@module/data"

export const TokenUtil = {
	askWhichToken: async function (tokens: Token[]): Promise<Token | undefined> {
		const d = await new Promise<Token | undefined>(async (resolve, reject) => {
			new Dialog(
				{
					title: game.i18n.localize("gurps.token.select"),
					content: await renderTemplate(`systems/${SYSTEM_NAME}/templates/token/select_token.hbs`, {
						tokens: tokens,
					}),
					buttons: {
						apply: {
							icon: '<i class="apply-button gcs-checkmark"></i>',
							label: game.i18n.localize("gurps.misc.apply"),
							callback: html => {
								let name = (html as JQuery<HTMLElement>).find("select option:selected").text().trim()
								let target = tokens.find(token => token.name === name)
								resolve(target)
							},
						},
					},
					default: "apply",
					close: () => resolve(undefined),
				},
				{ width: 300 }
			).render(true)
		})

		return d
	},
}
