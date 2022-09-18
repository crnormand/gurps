import { ImagePath } from "@module/data";
import { openPDF } from "@module/pdf";
import { SYSTEM_NAME } from "@module/settings";
import { i18n } from "@util";
import { BrowserTab, PackInfo, TabData, TabName } from "./data";
import * as browserTabs from "./tabs";

export class CompendiumBrowser extends Application {
	settings!: CompendiumBrowserSettings;

	dataTabsList = ["trait", "modifier", "skill", "spell", "equipment", "eqp_modifier", "note"] as const;

	tabs: Record<Exclude<TabName, "settings">, BrowserTab>;

	packLoader = new PackLoader();

	activeTab!: TabName;

	navigationTab!: Tabs;

	initialFilter: any = {};

	constructor(options = {}) {
		super(options);
		this.tabs = {
			trait: new browserTabs.Trait(this),
			modifier: new browserTabs.TraitModifier(this),
			skill: new browserTabs.Skill(this),
			spell: new browserTabs.Spell(this),
			equipment: new browserTabs.Equipment(this),
			eqp_modifier: new browserTabs.EquipmentModifier(this),
			note: new browserTabs.Note(this),
		};

		this.loadSettings();
		this.initCompendiumList();
		this.hookTab();
	}

	override get title(): string {
		return i18n("gurps.compendium_browser.title");
	}

	// Override render(force?: boolean | undefined, options?: Application.RenderOptions<ApplicationOptions> | undefined): unknown {
	// 	this.initCompendiumList();
	// 	return super.render(force, options);
	// }

	// Private async renderReultsList(html: HTMLElement, list: HTMLUListElement, start = 0): Promise<void> {
	// 	const currentTab = this.activeTab !== "settings" ? this.tabs[this.activeTab] : null;
	// 	if (!currentTab) return;

	// 	const newResults = await currentTab.renderResults(start);
	// 	this.activateResultListeners(newResults);
	// 	const fragment = document.createDocumentFragment();
	// 	fragment.append(...newResults);
	// 	list.append(fragment);
	// 	for (const dragDropHandler of this._dragDrop) {
	// 		dragDropHandler.bind(html);
	// 	}
	// }

	// private activateResultListeners(liElements: HTMLLIElement[] = []): void {
	// 	for (const liElement of liElements) {
	// 		const { entryUuid } = liElement.dataset;
	// 		if (!entryUuid) continue;

	// 		const nameAnchor = liElement.querySelector<HTMLAnchorElement>("div.name > a");
	// 		if (nameAnchor) {
	// 			nameAnchor.addEventListener("click", async () => {
	// 				const document = (await fromUuid(entryUuid)) as any;
	// 				if (document?.sheet) {
	// 					document.sheet.render(true);
	// 				}
	// 			});
	// 		}
	// 	}
	// }

	static override get defaultOptions(): ApplicationOptions {
		return mergeObject(super.defaultOptions, {
			id: "compendium-browser",
			classes: ["gcs"],
			template: `systems/${SYSTEM_NAME}/templates/compendium-browser/compendium-browser.hbs`,
			width: 800,
			height: 700,
			resizable: true,
			dragDrop: [{ dragSelector: ".item" }],
			tabs: [
				{
					navSelector: "nav",
					contentSelector: "section.content",
					initital: "landing-page",
				},
			],
			scrollY: [".item-list"],
		});
	}

	override activateListeners(html: JQuery<HTMLElement>): void {
		const _html = html[0];
		super.activateListeners(html);
		html.find(".item").on("dblclick", event => this._onClickEntry(event));
		html.find(".dropdown-toggle").on("click", event => this._onCollapseToggle(event));
		html.find(".reference").on("click", event => this._handlePDF(event));

		const activeTabName = this.activeTab;

		// Settings Tab
		if (activeTabName === "settings") {
			const form = _html.querySelector<HTMLFormElement>(".compendium-browser-settings form");
			if (form) {
				form.querySelector("button.save-settings")?.addEventListener("click", async () => {
					const formData = new FormData(form);
					for (const [t, packs] of Object.entries(this.settings) as [string, { [key: string]: PackInfo }][]) {
						for (const [key, pack] of Object.entries(packs) as [string, PackInfo][]) {
							pack.load = formData.has(`${t}-${key}`);
						}
					}
					await (game as Game).settings.set(SYSTEM_NAME, "compendiumBrowserPacks", this.settings);
					this.loadSettings();
					this.initCompendiumList();
					for (const tab of Object.values(this.tabs)) {
						if (tab.isInitialized) {
							await tab.init();
							// Tab.scrollLimit = 100;
						}
					}
					this.render(true);
				});
			}
		}

		// Const currentTab = this.tabs[activeTabName];
		// const controlArea =
		// 	_html.querySelector<HTMLDivElement>("div.control-area");
		// if (!controlArea) return;

		// const list = _html.querySelector<HTMLUListElement>(
		// 	".tab.active ul.item-list",
		// );
		// console.warn(list);
		// if (!list) return;
		// list.addEventListener("scroll", () => {
		// 	if (list.scrollTop + list.clientHeight >= list.scrollHeight - 5) {
		// 		const currentValue = currentTab.scrollLimit;
		// 		const maxValue = currentTab.totalItemCount ?? 0;
		// 		if (currentValue < maxValue) {
		// 			currentTab.scrollLimit = Math.clamped(
		// 				currentValue + 100,
		// 				100,
		// 				maxValue,
		// 			);
		// 			this.renderReultsList(_html, list, currentValue);
		// 		}
		// 	}
		// });
		html.find("input.input").on("change", event => this._updateQuery(event));

		// This.renderReultsList(_html, list);
	}

	protected async _onCollapseToggle(event: JQuery.ClickEvent): Promise<unknown> {
		event.preventDefault();
		const uuid: string = $(event.currentTarget).data("uuid");
		// Console.log(uuid);
		const open = !!$(event.currentTarget).attr("class")?.includes("closed");
		const item = (await fromUuid(uuid)) as Item;
		await item?.update({ _id: uuid.split(".").at(-1), "system.open": open });
		// Const gparent = await fromUuid(uuid.split(".").splice(0, 4).join("."));
		// console.log(item);
		// console.log(item, gparent);
		if (this.activeTab !== "settings") await this.tabs[this.activeTab].init();
		return this.render();
	}

	_updateQuery(event: JQuery.TriggeredEvent): void {
		if (this.activeTab === "settings") return;
		this.tabs[this.activeTab].filterData.searchQuery = String($(event.currentTarget).val());
		this.render();
	}

	override getData(): object | Promise<object> {
		const activeTab = this.activeTab;

		// Settings
		if (activeTab === "settings") {
			this.initCompendiumList();
			return {
				user: (game as Game).user,
				settings: this.settings,
			};
		}

		// Active Tab
		const tab = this.tabs[activeTab];
		if (tab) {
			const indexData = tab.getIndexData(0);
			return {
				user: (game as Game).user,
				[activeTab]: {
					filterData: tab.filterData,
					indexData: indexData,
				},
				scrollLimit: tab.scrollLimit,
			};
		}
		return {
			user: (game as Game).user,
		};
	}

	protected async _onClickEntry(event: JQuery.DoubleClickEvent) {
		event.preventDefault();
		const li = event.currentTarget;
		const uuid = $(li!).data("uuid");
		const pack: string = this.loadedPacks(this.activeTab).find((e: string) => uuid.includes(e)) ?? "";
		// Const item = await (game as Game).packs.get(pack)?.getDocument(uuid.split(".").at(-1));
		const item = await fromUuid(uuid);
		if (!item) return;
		const sheet = (item as any).sheet;
		if (sheet._minimized) return sheet.maximize();
		else
			return sheet?.render(true, {
				editable: (game as Game).user?.isGM && !(game as Game).packs.get(pack)?.locked,
			});
	}

	protected async _handlePDF(event: JQuery.ClickEvent): Promise<void> {
		event.preventDefault();
		const pdf = $(event.currentTarget).data("pdf");
		if (pdf) return openPDF(pdf);
	}

	private initCompendiumList(): void {
		const settings: Omit<TabData<Record<string, PackInfo | undefined>>, "settings"> = {
			trait: {},
			modifier: {},
			skill: {},
			spell: {},
			equipment: {},
			eqp_modifier: {},
			note: {},
		};

		for (const pack of (game as Game).packs) {
			// @ts-ignore
			const types = new Set(pack.index.map(entry => entry.type));
			if (types.size === 0) continue;

			if (["trait", "trait_container"].some(type => types.has(type))) {
				const load = this.settings.trait?.[pack.collection]?.load ?? false;
				settings.trait![pack.collection] = {
					load,
					name: pack.metadata.label,
				};
			}
			if (["modifier", "modifier_container"].some(type => types.has(type))) {
				const load = this.settings.modifier?.[pack.collection]?.load ?? false;
				settings.modifier![pack.collection] = {
					load,
					name: pack.metadata.label,
				};
			}
			if (["skill", "technique", "skill_container"].some(type => types.has(type))) {
				const load = this.settings.skill?.[pack.collection]?.load ?? false;
				settings.skill![pack.collection] = {
					load,
					name: pack.metadata.label,
				};
			}
			if (["spell", "ritual_magic_spell", "spell_container"].some(type => types.has(type))) {
				const load = this.settings.spell?.[pack.collection]?.load ?? false;
				settings.spell![pack.collection] = {
					load,
					name: pack.metadata.label,
				};
			}
			if (["equipment", "equipment_container"].some(type => types.has(type))) {
				const load = this.settings.equipment?.[pack.collection]?.load ?? false;
				settings.equipment![pack.collection] = {
					load,
					name: pack.metadata.label,
				};
			}
			if (["eqp_modifier", "eqp_modifier_container"].some(type => types.has(type))) {
				const load = this.settings.eqp_modifier?.[pack.collection]?.load ?? false;
				settings.eqp_modifier![pack.collection] = {
					load,
					name: pack.metadata.label,
				};
			}
			if (["note", "note_container"].some(type => types.has(type))) {
				const load = this.settings.note?.[pack.collection]?.load ?? false;
				settings.note![pack.collection] = {
					load,
					name: pack.metadata.label,
				};
			}
		}

		for (const tab of this.dataTabsList) {
			settings[tab] = Object.fromEntries(
				Object.entries(settings[tab]!).sort(([_collectionA, dataA], [_collectionB, dataB]) => {
					return (dataA?.name ?? "") > (dataB?.name ?? "") ? 1 : -1;
				})
			);
		}

		this.settings = settings;
	}

	loadSettings(): void {
		const settings: string | any = (game as Game).settings.get(SYSTEM_NAME, "compendiumBrowserPacks");
		if (typeof settings === "string") this.settings = JSON.parse(settings);
		else this.settings = settings;
	}

	// OpenTab(tab: "trait", filter?: any): Promise<void>;

	// openTab(tab: "modifier", filter?: any): Promise<void>;

	// openTab(tab: "skill", filter?: any): Promise<void>;

	// openTab(tab: "spell", filter?: any): Promise<void>;

	// openTab(tab: "equipment", filter?: any): Promise<void>;

	// openTab(tab: "eqp_modifier", filter?: any): Promise<void>;

	// openTab(tab: "note", filter?: any): Promise<void>;

	async openTab(tab: TabName, filter: any = {}): Promise<void> {
		this.initialFilter = filter;
		await this._render(true);
		this.initialFilter = filter;
		this.navigationTab.activate(tab, { triggerCallback: true });
	}

	async loadTab(tab: TabName): Promise<void> {
		this.activeTab = tab;

		// Settings Tab
		if (tab === "settings") {
			await this.render(true);
			return;
		}
		const currentTab = this.tabs[tab];
		if (!currentTab.isInitialized) await currentTab?.init();

		this.render(true);
	}

	hookTab(): void {
		this.navigationTab = this._tabs[0];
		const tabCallback = this.navigationTab.callback;
		// @ts-ignore
		this.navigationTab.callback = async (event: JQuery.TriggeredEvent | null, tabs: Tabs, active: TabName) => {
			// @ts-ignore
			tabCallback?.(event, tabs, active);
			await this.loadTab(active);
		};
	}

	loadedPacks(tab: TabName): string[] {
		if (tab === "settings") return [];
		return Object.entries(this.settings[tab] ?? []).flatMap(([collection, info]) => {
			return info?.load ? [collection] : [];
		});
	}

	async _onDragStart(event: DragEvent) {
		const li = event.currentTarget;
		const type: "Item" | "Actor" = $(li!).data("type");
		const uuid = $(li!).data("uuid");
		// Const pack: string = this.loadedPacks(this.activeTab).find((e: string) => uuid.includes(e)) ?? "";
		const item = (await fromUuid(uuid)) as Item | Actor;
		// Let item = this.packLoader.loadedPacks[type][pack]?.index.get(uuid.split(".").at(3));
		event.dataTransfer?.setData(
			"text/plain",
			JSON.stringify({
				type: type,
				uuid: uuid,
			})
		);

		const dragImage = document.createElement("div");
		dragImage.innerHTML = await renderTemplate(`systems/${SYSTEM_NAME}/templates/actor/drag-image.hbs`, {
			name: `${item?.name}`,
			type: `${item?.type.replace("_container", "").replaceAll("_", "-")}`,
		});
		dragImage.id = "drag-ghost";
		document.body.querySelectorAll("#drag-ghost").forEach(e => e.remove());
		document.body.appendChild(dragImage);
		const height = (document.body.querySelector("#drag-ghost") as HTMLElement).offsetHeight;
		event.dataTransfer?.setDragImage(dragImage, 0, height / 2);
	}

	protected override _getHeaderButtons(): Application.HeaderButton[] {
		const buttons: Application.HeaderButton[] = [];
		const all_buttons = [...buttons, ...super._getHeaderButtons()];
		all_buttons.at(-1)!.label = "";
		all_buttons.at(-1)!.icon = "gcs-circled-x";
		return all_buttons;
	}
}

class PackLoader {
	loadedPacks: {
		Actor: Record<string, { pack: CompendiumCollection<any>; index: CompendiumIndex } | undefined>;
		Item: Record<string, { pack: CompendiumCollection<any>; index: CompendiumIndex } | undefined>;
	} = { Actor: {}, Item: {} };

	async *loadPacks(documentType: "Actor" | "Item", packs: string[], indexFields: string[]) {
		this.loadedPacks[documentType] ??= {};
		// TODO: add progress bar
		// const progress = new Progress
		for (const packId of packs) {
			let data = this.loadedPacks[documentType][packId];
			if (data) {
				// Pack already loaded
				// const pack = data;
			} else {
				const pack = (game as Game).packs.get(packId);
				if (!pack) continue;
				if (pack.documentName === documentType) {
					// TODO: fix
					const index = (await pack.getIndex({
						fields: indexFields,
					} as any)) as any;
					const firstResult: Partial<CompendiumIndexData> = index.contents.at(0) ?? {};
					if (firstResult.system) {
						data = { pack, index };
						this.loadedPacks[documentType][packId] = data;
					} else continue;
				} else continue;
			}
			yield data;
		}
	}
}

type CompendiumIndex = Collection<CompendiumIndexData>;

export interface CompendiumIndexData {
	_id: string;
	type: string;
	name: string;
	img: ImagePath;
	// Img?: string | null;
	[key: string]: any;
}

type CompendiumBrowserSettings = Omit<TabData<Record<string, PackInfo | undefined>>, "settings">;
