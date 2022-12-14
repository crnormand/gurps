import { SETTINGS, SYSTEM_NAME } from "@module/data"
import { i18n } from "@util"
import { TokenModifierWindow } from "./window"

export class TokenModifierControl {
	static EFFECT_MOD_NAME = "TokenModWindowGURPS"

	private _showWindow: boolean

	private _ui?: TokenModifierWindow

	token: Token | null

	constructor() {
		this._showWindow = false
		this.token = null
		Hooks.once("init", this._registerSetting.bind(this))
		Hooks.on("getSceneControlButtons", this._createTokenModifierButton.bind(this))
		Hooks.on("controlToken", this._controlToken.bind(this))
		Hooks.on("updateToken", this._updateToken.bind(this))
		Hooks.on("createActiveEffects", this._createActiveEffect.bind(this))
		Hooks.on("targetToken", this._targetToken.bind(this))
		Hooks.once("ready", () => (this._ui = new TokenModifierWindow(null, this)))
		Hooks.on("closeTokenModifierWindow", () => (this._showWindow = false))
	}

	getWindowEnabled(): boolean {
		return (game as Game).settings.get(SYSTEM_NAME, SETTINGS.SHOW_TOKEN_MODIFIERS) as boolean
	}

	toggleWindow(closeOptions: Application.CloseOptions): void {
		this._showWindow = !this._showWindow

		// Show the token control as active
		let toggle = $(document).find(`ol > li[data-tool=${SETTINGS.SHOW_TOKEN_MODIFIERS}]`)
		if (this._showWindow && !toggle[0].classList.value.includes("active")) toggle[0]?.classList.add("active")
		else if (!this._showWindow && toggle[0].classList.value.includes("active"))
			toggle[0]?.classList.remove("active")
		this.toggleTokenModifierWindow(closeOptions)
	}

	_registerSetting() {
		;(game as Game).settings.register(SYSTEM_NAME, SETTINGS.SHOW_TOKEN_MODIFIERS, {
			name: "gurps.settings.show_token_modifiers.name",
			hint: "gurps.settings.show_token_modifiers.hint",
			scope: "client",
			config: true,
			type: Boolean,
			default: true,
			onChange: value => console.log(`${SETTINGS.SHOW_TOKEN_MODIFIERS} : ${value}`),
		})
	}

	_createTokenModifierButton(controls: SceneControl[]) {
		if (this.getWindowEnabled()) {
			const tokenButton = controls.find(b => b.name === "token")
			if (tokenButton) {
				tokenButton.tools.push({
					name: SETTINGS.SHOW_TOKEN_MODIFIERS,
					title: i18n("gurps.token_modifier_window.button"),
					icon: "fas fa-list",
					toggle: true,
					active: this._showWindow,
					visible: true,
					onClick: () => {
						this.toggleWindow({})
					},
				})
			}
		}
	}

	_createActiveEffect(effect: ActiveEffect, _: any, __: any) {
		const id = effect?.parent?.id
		const actorId = this.token?.actor?.id
		if (id === actorId) this._ui?.render(false)
	}

	_updateToken(token: Token) {
		const id = token.document?.id
		const actorId = this.token?.actor?.id
		if (id === actorId) this._ui?.render(false)
	}

	_targetToken(_user: StoredDocument<User>, _token: Token, _targeted: Token) {
		this._ui?.render(false)
	}

	_controlToken(token: Token, isControlled: boolean): void {
		if (isControlled) this.token = token
		else if (this.token === token) this.token = null

		this._ui?.setToken(this.token)

		setTimeout(() => this._ui?.render(false), 200)
	}

	async close(options: Application.CloseOptions): Promise<void> {
		if (this._showWindow) this.toggleWindow(options)
	}

	toggleTokenModifierWindow(closeOptions: any) {
		if (this._showWindow) {
			this._ui?.setToken(this.token)
			this._ui?.render(true)
		} else {
			this._ui?.closeApp(closeOptions)
		}
	}
}
