import { RollModifier, UserFlags } from "@module/data";
import { SYSTEM_NAME } from "@module/settings";
import { ModifierWindow } from "./window";

export class ModifierList extends Application {
	constructor(window: ModifierWindow, list: any[], options = {}) {
		super(options);

		this.window = window;
		this.mods = list;
		this.selection = -1;
		this.customMod = null;
	}

	static get defaultOptions(): ApplicationOptions {
		return mergeObject(super.defaultOptions, {
			id: "ModifierList",
			template: `systems/${SYSTEM_NAME}/templates/modifier-app/list.hbs`,
			popOut: false,
			minimizable: false,
			classes: ["modifier-app-list"],
		});
	}

	activateListeners(html: JQuery<HTMLElement>): void {
		super.activateListeners(html);

		// Get position
		const parent = $("#modifier-app-window").find(".searchbar");
		const parentTop = parent.offset()?.top ?? 0; // Might use position() depending on as yet unencountered issues
		const parentLeft = parent.offset()?.left ?? 0;
		// Let parentWidth = parseFloat(parent.css("width").replace("px", ""));
		let height = parseFloat(html.css("height").replace("px", ""));

		let left = Math.max(parentLeft, 10);
		html.css("left", `${left}px`);
		html.css("top", `${parentTop - height}px`);
		parent.css("width", html.css("width"));

		html.find(".entry").on("mouseenter", event => this._onEntryMouseEnter(event));
		html.find(".entry").on("click", event => this._onEntryClick(event));
	}

	_onEntryMouseEnter(event: JQuery.MouseEnterEvent) {
		if (this.selection === $(event.currentTarget).data("index")) return;
		event.preventDefault();
		event.stopPropagation();
		this.selection = $(event.currentTarget).data("index");
		this.render();
	}

	_onEntryClick(event: JQuery.ClickEvent) {
		event.preventDefault();
		if (event.shiftKey) return this.window.togglePin();
		return this.window.addModFromList();
	}

	getData(options?: Partial<ApplicationOptions> | undefined): object | Promise<object> {
		if (this.customMod && !this.mods.includes(this.customMod)) {
			this.mods.unshift(this.customMod);
			this.selection = 0;
		}

		const mods: any[] = this.mods;
		const pinnedMods: any[] = ((game as Game).user?.getFlag(SYSTEM_NAME, UserFlags.ModifierPinned) as []) ?? [];
		for (const m of mods) {
			if (pinnedMods.find(e => e.name === m.name && e.modifier && m.modifier)) m.pinned = true;
			else m.pinned = false;
		}

		return mergeObject(super.getData(options), {
			mods: mods,
			pinnedMods: pinnedMods,
			selection: this.selection,
		});
	}
}

export interface ModifierList extends Application {
	mods: RollModifier[];
	customMod: RollModifier | null;
	selection: number;
	window: ModifierWindow;
}
