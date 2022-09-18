import { RollModifier, UserFlags } from "@module/data";
import { SYSTEM_NAME } from "@module/settings";
import { i18n } from "@util";
import { ModifierWindow } from "./window";

export class ModifierButton extends Application {
	constructor(options = {}) {
		super(options);
		this.showing = false;
		this.window = new ModifierWindow(this, {});
	}

	async render(
		force?: boolean | undefined,
		options?: Application.RenderOptions<ApplicationOptions> | undefined
	): Promise<unknown> {
		await this.recalculateModTotal((game as Game).user);
		if (this.window.rendered) await this.window.render();
		return super.render(force, options);
	}

	static get defaultOptions(): ApplicationOptions {
		return mergeObject(super.defaultOptions, {
			popOut: false,
			minimizable: false,
			resizable: false,
			id: "ModifierButton",
			template: `systems/${SYSTEM_NAME}/templates/modifier-app/button.hbs`,
			classes: ["modifier-button"],
		});
	}

	getData(options?: Partial<ApplicationOptions> | undefined): object {
		const user = (game as Game).user;
		let total = user?.getFlag(SYSTEM_NAME, UserFlags.ModifierTotal) ?? 0;
		let buttonMagnet = "";
		if (user?.getFlag(SYSTEM_NAME, UserFlags.ModifierSticky) === true) buttonMagnet = "sticky";
		let buttonColor = "total-white";
		if (total > 0) buttonColor = "total-green";
		if (total < 0) buttonColor = "total-red";

		return mergeObject(super.getData(options), {
			total: total,
			buttonColor: buttonColor,
			buttonMagnet: buttonMagnet,
		});
	}

	protected _injectHTML(html: JQuery<HTMLElement>): void {
		if ($("body").find("#modifier-app").length === 0) {
			html.insertAfter($("body").find("#hotbar-page-controls"));
			this._element = html;
		} else {
			throw new Error(i18n("gurps.error.modifier_app_load_failed"));
		}
	}

	activateListeners(html: JQuery<HTMLElement>): void {
		super.activateListeners(html);
		html.on("click", event => this._onClick(event));
		html.on("wheel", event => this._onMouseWheel(event));
		html.find(".magnet").on("click", event => this._onMagnetClick(event));
		html.find(".trash").on("click", event => this.resetMods(event));
	}

	async _onClick(event: JQuery.ClickEvent): Promise<void> {
		event.preventDefault();
		if (this.showing) {
			this.window.close();
		} else {
			await this.window.render(true);
		}
	}

	async _onMagnetClick(event: JQuery.ClickEvent): Promise<unknown> {
		event.preventDefault();
		event.stopPropagation();
		const sticky = (game as Game).user?.getFlag(SYSTEM_NAME, UserFlags.ModifierSticky) ?? false;
		await (game as Game).user?.setFlag(SYSTEM_NAME, UserFlags.ModifierSticky, !sticky);
		return this.render();
	}

	async resetMods(event: JQuery.ClickEvent): Promise<unknown> {
		event.preventDefault();
		event.stopPropagation();
		await (game as Game).user?.setFlag(SYSTEM_NAME, UserFlags.ModifierStack, []);
		return this.render();
	}

	async _onMouseWheel(event: JQuery.TriggeredEvent) {
		const originalEvent = event.originalEvent;
		if (originalEvent instanceof WheelEvent) {
			const delta = Math.round(originalEvent.deltaY / -100);
			return this.window.addModifier({
				name: "",
				modifier: delta,
				tags: [],
			});
		}
	}

	async recalculateModTotal(user: StoredDocument<User> | null): Promise<unknown> {
		if (!user) return;
		let total = 0;
		const mods: RollModifier[] = (user.getFlag(SYSTEM_NAME, UserFlags.ModifierStack) as RollModifier[]) ?? [];
		if (mods.length > 0)
			for (const m of mods) {
				total += m.modifier;
			}
		await user.setFlag(SYSTEM_NAME, UserFlags.ModifierTotal, total);
	}
}

export interface ModifierButton extends Application {
	showing: boolean;
	window: ModifierWindow;
}
