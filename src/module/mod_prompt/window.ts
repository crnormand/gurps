import { RollModifier, UserFlags } from "@module/data";
import { SYSTEM_NAME } from "@module/settings";
import { fSearch } from "@util/fuse";
import { ModifierBrowse } from "./browse";
import { ModifierButton } from "./button";
import { ModifierList } from "./list";

export class ModifierWindow extends Application {
	constructor(button: ModifierButton, options = {}) {
		super(options);

		this.value = "";
		this.button = button;
		this.list = new ModifierList(this, []);
		this.browse = new ModifierBrowse(this);
	}

	static get defaultOptions(): ApplicationOptions {
		return mergeObject(super.defaultOptions, {
			id: "ModifierWindow",
			template: `systems/${SYSTEM_NAME}/templates/modifier-app/window.hbs`,
			popOut: false,
			minimizable: false,
			classes: ["modifier-app-window"],
		});
	}

	async render(force?: boolean | undefined, options?: Application.RenderOptions<ApplicationOptions> | undefined) {
		this.button.showing = true;
		await super.render(force, options);
		this.list.render(force, options);
		this.browse.render(force, options);
	}

	close(options?: Application.CloseOptions | undefined): Promise<void> {
		this.button.showing = false;
		this.list.mods = [];
		this.list.close(options);
		this.browse.close(options);
		return super.close(options);
	}

	getData(options?: Partial<ApplicationOptions> | undefined): object | Promise<object> {
		const user = (game as Game).user;
		let modStack = user?.getFlag(SYSTEM_NAME, UserFlags.ModifierStack) ?? [];

		return mergeObject(super.getData(options), {
			value: this.value,
			applied_mods: modStack,
		});
	}

	activateListeners(html: JQuery<HTMLElement>): void {
		super.activateListeners(html);

		// Get position
		const button = $("#modifier-app");
		// Const buttonTop = button.offset()?.top ?? 0; // might use position() depending on as yet unencountered issues
		// const buttonLeft = button.offset()?.left ?? 0;
		const buttonTop = button.position()?.top ?? 0;
		const buttonLeft = button.position()?.left + 220 ?? 0;
		let buttonWidth = parseFloat(button.css("width").replace("px", ""));
		// Let width = parseFloat(html.find(".searchbar").css("width").replace("px", ""));
		const width = 180;
		let height = parseFloat(html.css("height").replace("px", ""));

		let left = Math.max(buttonLeft + buttonWidth / 2 - width / 2, 10);
		html.css("left", `${left}px`);
		html.css("top", `${buttonTop - height - 10}px`);

		// Focus the textbox on show
		const searchbar = html.find(".searchbar");
		searchbar.trigger("focus");

		// Detect changes to input
		searchbar.on("input", event => this._updateQuery(event, searchbar));
		searchbar.on("keydown", event => this._keyDown(event));

		// Modifier Deleting
		html.find(".click-delete").on("click", event => this.removeModifier(event));
	}

	_updateQuery(event: JQuery.TriggeredEvent, html: JQuery<HTMLElement>) {
		const input = String($(event.currentTarget).val());
		html.css("min-width", `max(${input.length}ch, 180px)`);
		this.value = input;
		this.list.mods = fSearch((CONFIG as any).GURPS.modifiers, input, {
			includeMatches: true,
			includeScore: true,
			keys: ["name", "modifier", "tags"],
		}).map(e => e.item);
		if (this.list.mods.length > 0) this.list.selection = 0;
		else this.list.selection = -1;

		// Set custom mod
		const customMod: RollModifier = { name: "", modifier: 0, tags: [] };
		const modifierMatch = input.match(/[-+]?[0-9]+\s*/);
		if (modifierMatch) {
			customMod.modifier = parseInt(modifierMatch[0]) ?? 0;
			customMod.name = input.replace(modifierMatch[0], "");
		}
		if (customMod.modifier === 0) this.list.customMod = null;
		else this.list.customMod = customMod;
		this.list.render();
	}

	_keyDown(event: JQuery.KeyDownEvent) {
		if (
			["ArrowUp", "ArrowDown", "Enter", "Escape"].includes(event.key) ||
			// Vim keys
			(["j", "k"].includes(event.key) && event.ctrlKey)
		) {
			event.preventDefault();
			switch (event.key) {
				case "k":
				case "ArrowUp":
					if (this.list.mods.length === 0) return this.getPinnedMods();
					this.list.selection += 1;
					if (this.list.selection >= this.list.mods.length) this.list.selection = 0;
					return this.list.render();
				case "j":
				case "ArrowDown":
					this.list.selection -= 1;
					if (this.list.selection < 0) this.list.selection = this.list.mods.length - 1;
					return this.list.render();
				case "Enter":
					if (event.shiftKey) return this.togglePin();
					return this.addModFromList();
				case "Escape":
					return this.close();
			}
		}
	}

	togglePin() {
		if (this.list.selection === -1) return;
		const pinnedMods: RollModifier[] =
			((game as Game).user?.getFlag(SYSTEM_NAME, UserFlags.ModifierPinned) as RollModifier[]) ?? [];
		const selectedMod: RollModifier = this.list.mods[this.list.selection];
		const matchingMod = pinnedMods.find(e => e.name === selectedMod.name);
		if (matchingMod) {
			pinnedMods.splice(pinnedMods.indexOf(matchingMod), 1);
		} else {
			pinnedMods.push(selectedMod);
		}
		(game as Game).user?.setFlag(SYSTEM_NAME, UserFlags.ModifierPinned, pinnedMods);
		this.list.render();
	}

	getPinnedMods() {
		const pinnedMods: RollModifier[] =
			((game as Game).user?.getFlag(SYSTEM_NAME, UserFlags.ModifierPinned) as RollModifier[]) ?? [];
		this.list.mods = pinnedMods;
		this.list.render();
	}

	addModFromList() {
		const newMod: RollModifier = this.list.mods[this.list.selection];
		if (!newMod) return;
		return this.addModifier(newMod);
	}

	addModFromBrowse() {
		let newMod = null;
		// Const newMod: RollModifier = this.browse.categories[this.browse.selection[1]].mods[this.browse.selection[2]];
		const cat = this.browse.categories[this.browse.selection[1]];
		if (cat) newMod = cat.mods[this.browse.selection[2]];
		if (!newMod) return;
		return this.addModifier(newMod);
	}

	addModifier(mod: RollModifier) {
		const modList: RollModifier[] =
			((game as Game).user?.getFlag(SYSTEM_NAME, UserFlags.ModifierStack) as RollModifier[]) ?? [];
		const oldMod = modList.find(e => e.name === mod.name);
		if (oldMod) oldMod.modifier += mod.modifier;
		else modList.push(mod);
		(game as Game).user?.setFlag(SYSTEM_NAME, UserFlags.ModifierStack, modList);
		this.list.customMod = null;
		this.list.mods = [];
		this.list.selection = -1;
		this.value = "";
		this.render();
		this.button.render();
	}

	removeModifier(event: JQuery.ClickEvent) {
		event.preventDefault();
		const modList: RollModifier[] =
			((game as Game).user?.getFlag(SYSTEM_NAME, UserFlags.ModifierStack) as RollModifier[]) ?? [];
		const index = $(event.currentTarget).data("index");
		modList.splice(index, 1);
		(game as Game).user?.setFlag(SYSTEM_NAME, UserFlags.ModifierStack, modList);
		this.render();
		this.button.render();
	}
}

export interface ModifierWindow extends Application {
	button: ModifierButton;
	list: ModifierList;
	browse: ModifierBrowse;
	value: string;
}
