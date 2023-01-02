import { BaseActorGURPS } from "@actor/base"
import { SYSTEM_NAME } from "@module/data"

export const TokenUtil = {

	/**
	 * Displays a popup dialog asking which token from an array the user wants.
	 * @param tokens Token[]
	 * @returns Promise<Token | undefined>
	 */
	askWhichToken: async function (tokens: Token[]): Promise<Token | undefined> {
		const g = game as Game

		const d = await new Promise<Token | undefined>(async (resolve, reject) => {
			new Dialog(
				{
					title: g.i18n.localize("gurps.token.select"),
					content: await renderTemplate(`systems/${SYSTEM_NAME}/templates/token/select_token.hbs`, {
						tokens: tokens,
					}),
					buttons: {
						apply: {
							icon: '<i class="apply-button gcs-checkmark"></i>',
							label: g.i18n.localize("gurps.misc.apply"),
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
