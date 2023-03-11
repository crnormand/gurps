import MainTranslation from "@lang/en.json"
type TranslationsGURPS = Record<string, Localization.Translations> & typeof MainTranslation

export class LocalizeGURPS {
	static ready = false

	private static _translations: TranslationsGURPS

	static get translations(): TranslationsGURPS {
		if (!this.ready) {
			throw Error("LocalizeGURPS instantiated too early")
		}
		if (this._translations === undefined) {
			this._translations = mergeObject(game.i18n._fallback, game.i18n.translations, {
				enforceTypes: true,
			}) as TranslationsGURPS
		}
		return this._translations
	}

	static format(stringId: string, data?: { [key: string]: string | number | boolean | null }): string {
		return game.i18n.format(stringId, data)
	}
}
