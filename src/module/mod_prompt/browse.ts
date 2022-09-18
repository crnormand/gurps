import { RollModifier, UserFlags } from "@module/data";
import { SYSTEM_NAME } from "@module/settings";
import { i18n } from "@util";
import { ModifierWindow } from "./window";

interface ModCategory {
	name: string;
	mods: RollModifier[];
	showing: boolean;
}

export class ModifierBrowse extends Application {
	constructor(window: ModifierWindow, options = {}) {
		super(options);

		this.window = window;
		this.mods = (CONFIG as any).GURPS.modifiers;
		this.selection = [-1, -1, -1];
		this.catShowing = -1;
		this.showing = false;
		this.categories = [];
	}

	static get defaultOptions(): ApplicationOptions {
		return mergeObject(super.defaultOptions, {
			id: "ModifierList",
			template: `systems/${SYSTEM_NAME}/templates/modifier-app/browse.hbs`,
			popOut: false,
			minimizable: false,
			classes: ["modifier-app-browse"],
		});
	}

	activateListeners(html: JQuery<HTMLElement>): void {
		super.activateListeners(html);

		// Get position
		const parent = $("#modifier-app-window").find(".searchbar");
		const parentTop = parent.offset()?.top ?? 0; // Might use position() depending on as yet unencountered issues
		const parentLeft = parent.offset()?.left ?? 0;
		let parentHeight = parseFloat(parent.css("height").replace("px", ""));
		let height = parseFloat(html.css("height").replace("px", ""));
		let width = parseFloat(html.css("width").replace("px", ""));

		html.css("left", `${parentLeft - width - 5}px`);
		html.css("top", `${parentTop + parentHeight - height}px`);

		html.find(".browse").on("click", event => this._onBrowseClick(event));
		html.find(".category").on("click", event => this._onCategoryClick(event));
		// Html.find(".category").on("mouseenter", event => this._onCategoryMouseEnter(event));
		html.find(".entry").on("click", event => this._onEntryClick(event));
		// Html.find(".entry").on("mouseenter", event => this._onEntryMouseEnter(event));
		html.on("mouseleave", event => this._onMouseLeave(event));
	}

	_onMouseLeave(event: JQuery.MouseLeaveEvent) {
		event.preventDefault();
		console.log("mouseLeave");
		this.showing = false;
		for (const c of this.categories) c.showing = false;
		this.catShowing = -1;
		this.render();
	}

	_onBrowseMouseEnter(event: JQuery.MouseEnterEvent) {
		event.preventDefault();
		this.selection[0] = 0;
		this.render();
	}

	_onBrowseClick(event: JQuery.ClickEvent) {
		event.preventDefault();
		this.showing = true;
		this.render();
	}

	// _onCategoryMouseEnter(event: JQuery.MouseEnterEvent) {
	// 	if (this.selection[1] === $(event.currentTarget).data("index")) return;
	// 	event.preventDefault();
	// 	event.stopPropagation();
	// 	this.render();
	// }

	_onCategoryClick(event: JQuery.ClickEvent) {
		event.preventDefault();
		this.selection[1] = $(event.currentTarget).data("index");
		this.catShowing = this.selection[1];
		this.selection[2] = -1;
		return this.render();
	}

	// _onEntryMouseEnter(event: JQuery.MouseEnterEvent) {
	// 	if (this.selection[2] === $(event.currentTarget).data("index")) return;
	// 	event.preventDefault();
	// 	event.stopPropagation();
	// 	this.selection[2] = $(event.currentTarget).data("index");
	// 	this.render();
	// }

	_onEntryClick(event: JQuery.ClickEvent) {
		event.preventDefault();
		this.selection[2] = $(event.currentTarget).data("index");
		return this.window.addModFromBrowse();
	}

	getData(options?: Partial<ApplicationOptions> | undefined): object | Promise<object> {
		const categories: ModCategory[] = [];
		for (const m of this.mods) {
			for (const c of m.tags) {
				let cat = categories.find(e => e.name === c);
				if (!cat) {
					categories.push({ name: c, mods: [], showing: false });
					cat = categories.find(e => e.name === c);
				}
				cat?.mods.push(m);
			}
		}
		categories.sort((a: ModCategory, b: ModCategory) => (a.name > b.name ? 1 : b.name > a.name ? -1 : 0));
		const pinnedMods: RollModifier[] =
			((game as Game).user?.getFlag(SYSTEM_NAME, UserFlags.ModifierPinned) as []) ?? [];
		categories.push({
			name: i18n("gurps.system.modifier_stack.pinned_category"),
			showing: false,
			mods: pinnedMods,
		});
		for (const c of categories) if (c.mods.length === 0) categories.splice(categories.indexOf(c), 1);
		this.categories = categories;
		if (this.catShowing !== -1) categories[this.catShowing].showing = true;

		return mergeObject(super.getData(options), {
			categories: categories,
			selection: this.selection,
			showing: this.showing,
		});
	}
}

export interface ModifierBrowse extends Application {
	mods: RollModifier[];
	categories: ModCategory[];
	selection: [number, number, number];
	showing: boolean;
	window: ModifierWindow;
	catShowing: number;
}
