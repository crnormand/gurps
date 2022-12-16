import { BaseActorGURPS } from "@actor/base"
import { SYSTEM_NAME } from "@module/data"

export const TokenUtil = {
	/**
	 * @param point location to "search" for Tokens.
	 * @param point.x the x coordinate.
	 * @param point.y the y coordinate.
	 * @returns {Token[]} the Set of tokens found.
	 */
	getCanvasTokensAtPosition: function (point: { x: number; y: number }): Token[] {
		const g = game as Game

		// Remember the user's current targets (so we can restore them afterwards).
		const oldTargets = [...g.user!.targets]

		// Create a rectangle the size of a grid element centered on the point.
		const gridSize = (canvas!.scene as any).grid!.size
		const rectangle = {
			x: point.x - (gridSize / 2),
			y: point.y - (gridSize / 2),
			height: gridSize,
			width: gridSize,
		}

		// Target all Tokens that fall inside the rectangle.
		canvas!.tokens!.targetObjects(rectangle, { releaseOthers: true })
		const newTargets = [...g.user!.targets]

		// Now that we have the list of targets, reset the target selection back to whatever the user previously had.
		// First, remove the newTargets...
		newTargets.forEach(t => t.setTarget(false, { releaseOthers: false, groupSelection: true }))
		// ...Finally, re-select the oldTargets.
		oldTargets.forEach(t => t.setTarget(true, { releaseOthers: false, groupSelection: true }))

		return newTargets
	},

	/**
	 * Given a list of Tokens, ask the user which to apply the given function to.
	 * @param tokens
	 * @param handler
	 */
	askWhichTokenAndApply: async function (tokens: Token[], handler: (actor: BaseActorGURPS) => void): Promise<void> {
		const g = game as Game

		interface MyDialogOptions {
			tokens: Token[]
		}

		const d = new Dialog(
			{
				title: g.i18n.localize("gurps.token.select"),
				content: await renderTemplate(`systems/${SYSTEM_NAME}/templates/token/select_token.hbs`, {
					tokens: tokens,
				}),
				buttons: {
					apply: {
						icon: '<i class="icon-checkmark"></i>',
						callback: (html: HTMLElement | JQuery<HTMLElement>) => {
							let name = (html as JQuery<HTMLElement>).find("select option:selected").text().trim()
							let target = tokens.find(token => token.name === name)
							handler(target?.actor as BaseActorGURPS)
						},
					},
				},
				default: "apply",
			},
			{ width: 300 }
		)
		await d.render(true)
	},
}
