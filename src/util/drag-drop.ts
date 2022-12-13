export const DnD = {
	TEXT_PLAIN: "text/plain",

	getDragData(event: DragEvent, format: string): any {
		return JSON.parse(event.dataTransfer!.getData(format) ?? "")
	},

	setDragData(event: DragEvent, type: string, payload: any, format: string): void {
		event.dataTransfer!.setData(format, JSON.stringify({ type: type, payload: payload }))
	},
}
