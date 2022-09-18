import { CompendiumBrowser, CompendiumIndexData } from "..";
import { TabName } from "../data";
import { FilterData } from "./data";

export abstract class CompendiumTab {
	/** A reference to the parent CompendiumBrowser */
	protected browser: CompendiumBrowser;

	/** An unmodified copy of this.filterData */
	defaultFilterData!: FilterData;

	/** The full CompendiumIndex of this tab */
	// protected indexData: CompendiumIndexData[] = [];
	indexData: CompendiumIndexData[] = [];

	/** Is this tab initialized? */
	isInitialized = false;

	/** The filter schema for this tab; The tabs filters are rendered based on this.*/
	filterData!: FilterData;

	/** The total count of items in the currently filtered index */
	totalItemCount = 0;

	/** The initial display limit for this tab; Scrolling is currently hardcoded to +100 */
	// TODO: change later
	scrollLimit = 10000;

	/** The name of this tab */
	tabName: Exclude<TabName, "settings">;

	/** The path to the result list template of this tab */
	abstract templatePath: string;

	get searchFields(): string[] {
		return ["name", "tags", "reference", "notes"];
	}

	constructor(browser: CompendiumBrowser, tabName: Exclude<TabName, "settings">) {
		this.browser = browser;
		this.tabName = tabName;
		this.prepareFilterData();
	}

	async init(): Promise<void> {
		await this.loadData();
		this.isInitialized = true;
		this.defaultFilterData = deepClone(this.filterData);
	}

	/** Load and prepare the compendium index and set filter options */
	protected async loadData(): Promise<void> {
		this.indexData = [];
	}

	/** Prepare the filterData object of this tab */
	protected prepareFilterData(): void {
		this.filterData = {
			searchQuery: "",
			order: {
				by: "name",
				direction: "asc",
				options: {},
			},
		};
	}

	/**
	 * Filter indexData
	 * @param {CompendiumIndexData} entry
	 */
	protected filterIndexData(entry: CompendiumIndexData): boolean {
		const { searchQuery } = this.filterData;

		// Name
		if (searchQuery) {
			for (const i of this.searchFields) {
				const term = String(getProperty(entry, i));
				if (
					term
						.toLocaleLowerCase((game as Game).i18n.lang)
						.includes(searchQuery.toLocaleLowerCase((game as Game).i18n.lang))
				)
					return true;
			}
			return false;
		}
		return true;
	}

	getIndexData(start: number): CompendiumIndexData[] {
		const currentIndex = this.sortResult(this.indexData.filter(this.filterIndexData.bind(this)));
		this.totalItemCount = currentIndex.length;
		// Return currentIndex.slice(start, this.scrollLimit);
		return currentIndex;
	}

	protected sortResult(result: CompendiumIndexData[]): CompendiumIndexData[] {
		const { order } = this.filterData;
		const lang = (game as Game).i18n.lang;
		const sorted = result.sort((entryA, entryB) => {
			switch (order.by) {
				case "name":
					return entryA.name.localeCompare(entryB.name, lang);
				case "tags":
					return entryA.tags.localeCompare(entryB.tags, lang);
				case "reference":
					return entryA.reference.localeCompare(entryB.reference, lang);
				default:
					return 0;
			}
		});
		return order.direction === "asc" ? sorted : sorted.reverse();
	}

	async renderResults(start: number): Promise<HTMLLIElement[]> {
		if (!this.templatePath) throw Error(`Tab "${this.tabName}" has no valid template path.`);
		const indexData = this.getIndexData(start);
		const domParser = new DOMParser();
		const liElements: HTMLLIElement[] = [];
		for (const entry of indexData) {
			const htmlString = await renderTemplate(this.templatePath, {
				entry,
				filterData: this.filterData,
			});
			const html = domParser.parseFromString(htmlString, "text/html");
			liElements.push(html.body.firstElementChild as HTMLLIElement);
		}
		// Console.log("liElements", liElements);
		return liElements;
	}
}
