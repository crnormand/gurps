import { SYSTEM_NAME } from "@module/data"

class DocumentSheetConfigGURPS extends DocumentSheetConfig {
	getData(options?: Partial<FormApplicationOptions> | undefined): MaybePromise<object> {
		const data = super.getData(options) as any
		delete data.sheetClasses[`${SYSTEM_NAME}.MookGeneratorSheet`]
		delete data.defaultClasses[`${SYSTEM_NAME}.MookGeneratorSheet`]
		return data
	}
}

export { DocumentSheetConfigGURPS }
