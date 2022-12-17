import { SYSTEM_NAME } from "@module/data"
import { SettingsMenuGURPS } from "./menu"

export class ColorSettings extends SettingsMenuGURPS {
	static override readonly namespace = "colors"

	static override readonly SETTINGS = ["modePreference", "colors"] as const

	static override get defaultOptions(): FormApplicationOptions {
		const options = super.defaultOptions
		options.classes.push("gurps")
		options.classes.push("settings-menu")

		return mergeObject(options, {
			title: `gurps.settings.${this.namespace}.name`,
			id: `${this.namespace}-settings`,
			template: `systems/${SYSTEM_NAME}/templates/system/settings/${this.namespace}.hbs`,
			width: 480,
			height: "auto",
			submitOnClose: true,
			submitOnChange: true,
			closeOnSubmit: false,
			resizable: true,
		} as FormApplicationOptions)
	}

	protected static override get settings(): Record<string, any> {
		return {
			modePreference: {
				name: "gurps.settings.colors.modePreference.name",
				hint: "gurps.settings.colors.modePreference.hint",
				default: "auto",
				type: String,
				choices: {
					auto: "gurps.select.color_mode_preference.auto",
					dark: "gurps.select.color_mode_preference.dark",
					light: "gurps.select.color_mode_preference.light",
				},
			},
			colors: {
				name: "",
				hint: "",
				default: {
					colorBackground: { light: "#eeeeee", dark: "#303030" },
					colorOnBackground: { light: "#000000", dark: "#dddddd" },
					colorContent: { light: "#ffffff", dark: "#202020" },
					colorOnContent: { light: "#000000", dark: "#dddddd" },
					colorBanding: { light: "#ebebdc", dark: "#2a2a2a" },
					colorOnBanding: { light: "#000000", dark: "#dddddd" },
					colorHeader: { light: "#2b2b2b", dark: "#404040" },
					colorOnHeader: { light: "#ffffff", dark: "#c0c0c0" },
					colorFocusedTab: { light: "#e0d4af", dark: "#446600" },
					colorOnFocusedTab: { light: "#000000", dark: "#dddddd" },
					colorCurrentTab: { light: "#d3cfc5", dark: "#293d00" },
					colorOnCurrentTab: { light: "#000000", dark: "#dddddd" },
					colorEditable: { light: "#ffffff", dark: "#202020" },
					colorOnEditable: { light: "#0000a0", dark: "#649999" },
					colorSelection: { light: "#0060a0", dark: "#0060a0" },
					colorOnSelection: { light: "#ffffff", dark: "#ffffff" },
					colorInactiveSelection: { light: "#004080", dark: "#004080" },
					colorOnInactiveSelection: { light: "#e4e4e4", dark: "#e4e4e4" },
					colorIndirectSelection: { light: "#e6f7ff", dark: "#002b40" },
					colorOnIndirectSelection: { light: "#000000", dark: "#e4e4e4" },
					colorScroll: { light: "#c0c0c0", dark: "#808080" },
					colorScrollRollover: { light: "#c0c0c0", dark: "#808080" },
					colorScrollEdge: { light: "#808080", dark: "#a0a0a0" },
					colorControlEdge: { light: "#606060", dark: "#606060" },
					colorControl: { light: "#f8f8ff", dark: "#404040" },
					colorOnControl: { light: "#000000", dark: "#dddddd" },
					colorPressedControl: { light: "#0060a0", dark: "#0060a0" },
					colorOnPressedControl: { light: "#ffffff", dark: "#ffffff" },
					colorDivider: { light: "#c0c0c0", dark: "#666666" },
					colorInteriorDivider: { light: "#d8d8d8", dark: "#353535" },
					colorIconButton: { light: "#606060", dark: "#808080" },
					colorIconButtonRollover: { light: "#000000", dark: "#c0c0c0" },
					colorPressedIconButton: { light: "#0060a0", dark: "#0060a0" },
					colorHint: { light: "#808080", dark: "#404040" },
					colorTooltip: { light: "#fcfcc4", dark: "#fcfcc4" },
					colorOnTooltip: { light: "#000000", dark: "#000000" },
					colorSearchList: { light: "#e0ffff", dark: "#002b2b" },
					colorOnSearchList: { light: "#000000", dark: "#cccccc" },
					colorMarker: { light: "#fcf2c4", dark: "#003300" },
					colorOnMarker: { light: "#000000", dark: "#dddddd" },
					colorError: { light: "#c04040", dark: "#732525" },
					colorOnError: { light: "#ffffff", dark: "#dddddd" },
					colorWarning: { light: "#e08000", dark: "#c06000" },
					colorOnWarning: { light: "#ffffff", dark: "#dddddd" },
					colorOverloaded: { light: "#c04040", dark: "#732525" },
					colorOnOverloaded: { light: "#ffffff", dark: "#dddddd" },
					colorPage: { light: "#ffffff", dark: "#101010" },
					colorOnPage: { light: "#000000", dark: "#a0a0a0" },
					colorPageStandout: { light: "#dddddd", dark: "#404040" },
					colorOnPageStandout: { light: "#404040", dark: "#a0a0a0" },
					colorPageVoid: { light: "#808080", dark: "#000000" },
					colorDropArea: { light: "#cc0033", dark: "#ff0000" },
					colorLink: { light: "#739925", dark: "#008000" },
					colorLinkPressed: { light: "#0080FF", dark: "#0060A0" },
					colorLinkRollover: { light: "#00C000", dark: "#00B300" },
					colorAccent: { light: "#006666", dark: "#649999" },
					colorButtonRoll: { light: "#fff973", dark: "#55b6b9" },
					colorOnButtonRoll: { light: "#000000", dark: "#dddddd" },
					colorButtonRollRollover: { light: "#fff426", dark: "#48999c" },
					colorOnButtonRollRollover: { light: "#000000", dark: "#dddddd" },
					colorButtonMod: { light: "#f7954a", dark: "#598c15" },
					colorOnButtonMod: { light: "#000000", dark: "#dddddd" },
					colorButtonModRollover: { light: "#f56c00", dark: "#5ea600" },
					colorOnButtonModRollover: { light: "#000000", dark: "#dddddd" },
					colorSkill: { light: "#103060", dark: "#103060" },
					colorSuccess: { light: "#10a020", dark: "#10a020" },
					colorFailure: { light: "#a02010", dark: "#a02010" },
					colorCriticalSuccess: { light: "#00a010", dark: "#00a010" },
					colorCriticalFailure: { light: "#a01000", dark: "#a01000" },
				},
			},
		}
	}

	activateListeners(html: JQuery<HTMLElement>): void {
		super.activateListeners(html)
		html.find(".reset").on("click", event => this._onReset(event))
		// Html.find(".reset-all").on("click", event => this._onResetAll(event))
	}

	async _onReset(event: JQuery.ClickEvent) {
		event.preventDefault()
		const id = $(event.currentTarget).data("id")
		const colors = (game as Game).settings.get(SYSTEM_NAME, `${this.namespace}.colors`) as any
		const defaults = (game as Game).settings.settings.get(`${SYSTEM_NAME}.${this.namespace}.colors`)?.default as any
		colors[id] = defaults[id]
		await (game as Game).settings.set(SYSTEM_NAME, `${this.namespace}.colors`, colors)
		ColorSettings.applyColors()
		this.render()
	}

	override async _onResetAll(event: JQuery.ClickEvent) {
		event.preventDefault()
		const constructor = this.constructor
		for (const setting of constructor.SETTINGS) {
			const defaults = (game as Game).settings.settings.get(`${SYSTEM_NAME}.${this.namespace}.${setting}`)
				?.default as any
			await (game as Game).settings.set(SYSTEM_NAME, `${this.namespace}.${setting}`, defaults)
		}
		ColorSettings.applyColors()
		this.render()
	}

	override async getData(): Promise<any> {
		const options = await super.getData()
		const modePreference = (game as Game).settings.get(SYSTEM_NAME, `${this.namespace}.modePreference`)
		const colors = (game as Game).settings.get(SYSTEM_NAME, `${this.namespace}.colors`) as any
		const colorSettings: any = {}
		for (const e of Object.keys(colors)) {
			colorSettings[e] = {
				key: e,
				value: colors[e],
			}
		}
		return mergeObject(options, {
			modePreference: modePreference,
			colorSettings: colorSettings,
			config: (CONFIG as any).GURPS,
		})
	}

	protected override async _updateObject(_event: Event, formData: any): Promise<void> {
		for (const k of Object.keys(formData)) {
			if (k === "modePreference") continue
			const key = k.replace(/\.light|\.dark/g, "")
			formData.colors ??= {}
			formData.colors[key] ??= {}
			if (k.endsWith("light")) formData.colors[key].light = formData[k]
			if (k.includes("dark")) formData.colors[key].dark = formData[k]
			delete formData[k]
		}
		for await (const key of (this.constructor as typeof SettingsMenuGURPS).SETTINGS) {
			const settingKey = `${this.namespace}.${key}`
			await (game as Game).settings.set(SYSTEM_NAME, settingKey, formData[key])
		}
		ColorSettings.applyColors()
	}

	static applyColors() {
		const modePreference = (game as Game).settings.get(SYSTEM_NAME, "colors.modePreference")
		const colors: any = (game as Game).settings.get(SYSTEM_NAME, "colors.colors")
		Object.keys(colors).forEach(e => {
			if (!e.startsWith("color")) return
			const name = `--${e.replace(/(\w)([A-Z])/g, "$1-$2").toLowerCase()}`
			const value = colors[e]
			// @ts-ignore until types v10
			value.light = Color.fromString(value.light)
				.rgb.map((i: number) => i * 255)
				.join(", ")
			// @ts-ignore until types v10
			value.dark = Color.fromString(value.dark)
				.rgb.map((i: number) => i * 255)
				.join(", ")
			if (modePreference === "light") $(":root").css(name, value.light)
			else if (modePreference === "dark") $(":root").css(name, value.dark)
			else if (window.matchMedia("(prefers-color-scheme: dark)").matches) $(":root").css(name, value.dark)
			else $(":root").css(name, value.light)
		})
	}
}
