import { PDFViewerSheet } from "@module/pdf/sheet";
import { SYSTEM_NAME } from "@module/settings";
import { i18n } from "@util";

export const SJG_links = {
	ACT1: "http://www.warehouse23.com/products/gurps-action-1-heroes",
	ACT3: "http://www.warehouse23.com/products/gurps-action-3-furious-fists",
	B: "http://www.warehouse23.com/products/gurps-basic-set-characters-and-campaigns",
	BS: "http://www.warehouse23.com/products/gurps-banestorm",
	DF1: "http://www.warehouse23.com/products/gurps-dungeon-fantasy-1-adventurers-1",
	DF3: "http://www.warehouse23.com/products/gurps-dungeon-fantasy-3-the-next-level-1",
	DF4: "http://www.warehouse23.com/products/gurps-dungeon-fantasy-4-sages-1",
	DF8: "http://www.warehouse23.com/products/gurps-dungeon-fantasy-8-treasure-tables",
	DF11: "http://www.warehouse23.com/products/gurps-dungeon-fantasy-11-power-ups",
	DF12: "http://www.warehouse23.com/products/gurps-dungeon-fantasy-12-ninja",
	DF13: "http://www.warehouse23.com/products/gurps-dungeon-fantasy-13-loadouts",
	DF14: "http://www.warehouse23.com/products/gurps-dungeon-fantasy-14-psi",
	DFM1: "http://www.warehouse23.com/products/gurps-dungeon-fantasy-monsters-1",
	DFA: "http://www.warehouse23.com/products/dungeon-fantasy-roleplaying-game",
	DFM: "http://www.warehouse23.com/products/dungeon-fantasy-roleplaying-game",
	DFS: "http://www.warehouse23.com/products/dungeon-fantasy-roleplaying-game",
	DFE: "http://www.warehouse23.com/products/dungeon-fantasy-roleplaying-game",
	DR: "http://www.warehouse23.com/products/gurps-dragons-1",
	F: "http://www.warehouse23.com/products/gurps-fantasy",
	FDG: "https://gamingballistic.com/product/fantastic-dungeon-grappling-pdf-dfrpg/",
	GUL: "https://www.gamesdiner.com/gulliver/",
	H: "http://www.warehouse23.com/products/gurps-horror-1",
	HF: "http://www.mygurps.com/historical_folks_4e.pdf",
	HT: "http://www.warehouse23.com/products/gurps-high-tech-2",
	IW: "http://www.warehouse23.com/products/gurps-infinite-worlds-1",
	LT: "http://www.warehouse23.com/products/gurps-fourth-edition-low-tech",
	LTC1: "http://www.warehouse23.com/products/gurps-low-tech-companion-1-philosophers-and-kings",
	LTIA: "http://www.warehouse23.com/products/gurps-low-tech-instant-armor",
	LITE: "http://www.warehouse23.com/products/SJG31-0004",
	M: "http://www.warehouse23.com/products/gurps-magic-5",
	MPS: "http://www.warehouse23.com/products/gurps-magic-plant-spells",
	MA: "http://www.warehouse23.com/products/gurps-martial-arts",
	MAFCCS: "http://www.warehouse23.com/products/gurps-martial-arts-fairbairn-close-combat-systems",
	MATG: "http://www.warehouse23.com/products/gurps-martial-arts-technical-grappling",
	MH1: "http://www.warehouse23.com/products/gurps-monster-hunters-1-champions",
	MYST: "http://www.warehouse23.com/products/gurps-mysteries-1",
	MYTH: "http://www.sjgames.com/gurps/books/myth/",
	P: "http://www.warehouse23.com/products/gurps-powers",
	PDF: "http://www.warehouse23.com/products/gurps-powers-divine-favor",
	PSI: "http://www.warehouse23.com/products/gurps-psionic-powers",
	PU1: "http://www.warehouse23.com/products/gurps-power-ups-1-imbuements-1",
	PU2: "http://www.warehouse23.com/products/gurps-power-ups-2-perks",
	PU3: "http://www.warehouse23.com/products/gurps-power-ups-3-talents",
	"PY#": "http://www.warehouse23.com/products?utf8=%E2%9C%93&keywords=pyramid+magazine&x=0&y=0",
	RSWL: "http://www.warehouse23.com/products/gurps-reign-of-steel-will-to-live",
	SU: "http://www.warehouse23.com/products/gurps-supers-3",
	TMS: "http://www.warehouse23.com/products/gurps-thaumatology-magical-styles",
	TRPM: "http://www.warehouse23.com/products/gurps-thaumatology-ritual-path-magic",
	TS: "http://www.warehouse23.com/products/gurps-tactical-shooting",
	TSOR: "http://www.warehouse23.com/products/gurps-thaumatology-sorcery",
	UT: "http://www.warehouse23.com/products/gurps-ultra-tech",
	VOR: "http://www.warehouse23.com/products/vorkosigan-saga-sourcebook-and-roleplaying-game",
};

/**
 *
 * @param {string} pdfs
 */
export function openPDF(pdfs: string) {
	for (let link of pdfs.split(",")) {
		link = link.trim();
		const colonIndex = link.indexOf(":");
		let book = "";
		let page = 0;
		if (colonIndex > 0) {
			book = link.substring(0, colonIndex).trim();
			page = parseInt(link.substring(colonIndex + 1));
		} else {
			book = link.replaceAll(/\d/g, "").trim();
			page = parseInt(link.replaceAll(/\D/g, ""));
		}

		if (book === "B") {
			const s = (game as Game).settings.get(SYSTEM_NAME, "basic_set_pdf");
			if (page > 336) {
				if (s === "separate") {
					book = "BX";
					page = page - 335;
				} else page += 2;
			}
		}

		console.log(book);
		if ((game as Game).journal?.size === 0) {
			let url = (SJG_links as any)[book];
			if (!url) {
				if (pdfs.includes("http")) url = pdfs;
				else url = "http://www.warehouse23.com/products?taxons%5B%5D=558398545-sb";
			}
			window.open(url, "_blank");
		} else {
			const pdfPages: any[] = [];
			(game as Game).journal?.forEach(j => {
				(j as any).pages.forEach((p: any) => {
					if (p.type === "pdf") pdfPages.push(p);
				});
			});
			let journalPage;
			if (pdfPages.length) journalPage = pdfPages.find((e: any) => e.type === "pdf" && e.system.code === book);
			if (journalPage) {
				const viewer = new PDFViewerSheet(journalPage, { pageNumber: page });
				viewer.render(true);
			}
		}
	}
}
