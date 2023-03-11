// Import { ActorFlags } from "@actor/base/data"
// import { RollModifier, SYSTEM_NAME } from "@module/data"
// import { i18n } from "@util"
// import { TokenModifierControl } from "."

// interface ModifierTarget {
// 	name: string
// 	targetModifiers: RollModifier[]
// }

// export class TokenModifierWindow extends Application {
// 	_token: Token | null

// 	_callback: TokenModifierControl

// 	selected: Token | null = null

// 	constructor(token: Token | null, callback: TokenModifierControl, options = {}) {
// 		super(options)
// 		this._token = token
// 		this._callback = callback
// 	}

// 	static get defaultOptions(): ApplicationOptions {
// 		return mergeObject(super.defaultOptions, {
// 			template: `systems/${SYSTEM_NAME}/templates/app/token-modifier-window.hbs`,
// 			classes: ["gurps", "token-modifier-app"],
// 			popOut: true,
// 			top: 0,
// 			width: 400,
// 			height: "auto",
// 			minimizable: true,
// 			jQuery: true,
// 			resizable: false,
// 			title: i18n("gurps.token_modifier_window.title"),
// 		})
// 	}

// 	activateListeners(html: JQuery<HTMLElement>): void {
// 		super.activateListeners(html)
// 	}

// 	getToken(): Token | null {
// 		return this._token
// 	}

// 	async setToken(value: Token | null) {
// 		this._token = value
// 		await this.render(false)
// 	}

// 	get targets(): ModifierTarget[] {
// 		const results = []
// 		for (const target of Array.from(game.user!.targets)) {
// 			const result: ModifierTarget = {
// 				name: target.name,
// 				targetModifiers:
// 					(target.actor?.getFlag(SYSTEM_NAME, ActorFlags.TargetModifiers) as RollModifier[]) || [],
// 			}
// 			results.push(result)
// 		}
// 		return results
// 	}

// 	getData(options?: Partial<ApplicationOptions> | undefined): object | Promise<object> {
// 		return mergeObject(super.getData(options), {
// 			selected: this.selected,
// 			selfModifiers: this._token ? this._token?.actor?.getFlag(SYSTEM_NAME, ActorFlags.SelfModifiers) : [],
// 			targetModifiers: this._token ? this._token?.actor?.getFlag(SYSTEM_NAME, ActorFlags.TargetModifiers) : [],
// 			targets: this.targets,
// 		})
// 	}

// 	async close(options: Application.CloseOptions) {
// 		this._callback.close(options)
// 	}

// 	async closeApp(options: Application.CloseOptions) {
// 		super.close(options)
// 	}
// }
