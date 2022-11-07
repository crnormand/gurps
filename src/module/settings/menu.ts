import { SYSTEM_NAME } from "."

abstract class SettingsMenuGURPS extends FormApplication {
	static readonly namespace: string

	static override get defaultOptions(): FormApplicationOptions {
		const options = super.defaultOptions
		options.classes.push("gurps")
		options.classes.push("settings-menu")

		return mergeObject(options, {
			title: `gurps.settings.${this.namespace}.name`,
			id: `${this.namespace}-settings`,
			template: `systems/${SYSTEM_NAME}/templates/system/settings/${this.namespace}.hbs`,
			width: 440,
			height: "auto",
			submitOnClose: true,
			submitOnChange: true,
			closeOnSubmit: false,
			resizable: true,
		} as FormApplicationOptions)
	}

	get namespace(): string {
		return this.constructor.namespace
	}

	static readonly SETTINGS: readonly string[]

	protected static get settings(): Record<string, any> {
		return {}
	}

	static registerSettings(): void {
		const settings = this.settings
		for (const setting of this.SETTINGS) {
			;(game as Game).settings.register(SYSTEM_NAME, `${this.namespace}.${setting}`, {
				...settings[setting],
				config: false,
			})
		}
	}

	override async getData(): Promise<any> {
		const settings = (this.constructor as typeof SettingsMenuGURPS).settings
		console.log(settings)
		const templateData: any[] = Object.entries(settings).map(([key, setting]) => {
			const value = (game as Game).settings.get(SYSTEM_NAME, `${this.namespace}.${key}`)
			return {
				...setting,
				key,
				value,
				isSelect: !!setting.choices,
				isCheckbox: setting.type === Boolean,
			}
		})
		return mergeObject(await super.getData(), {
			settings: templateData,
			instructions: `gurps.settings.${this.namespace}.hint`,
		})
	}

	protected override async _updateObject(_event: Event, formData: any): Promise<void> {
		for await (const key of (this.constructor as typeof SettingsMenuGURPS).SETTINGS) {
			const settingKey = `${this.namespace}.${key}`
			await (game as Game).settings.set(SYSTEM_NAME, settingKey, formData[key])
		}
	}
}

interface SettingsMenuGURPS extends FormApplication {
	constructor: typeof SettingsMenuGURPS
}

export { SettingsMenuGURPS }
