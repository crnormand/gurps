import { SYSTEM_NAME } from "./settings";

/**
 *
 */
export async function preloadTemplates(): Promise<Handlebars.TemplateDelegate[]> {
	const templatePaths: string[] = [
		// Add paths to "systems/gurps/templates"

		"actor/character/sections/trait",
		"actor/character/sections/basic-damage",
		"actor/character/sections/conditional-modifier",
		"actor/character/sections/description",
		"actor/character/sections/dropdown-closed",
		"actor/character/sections/dropdown-open",
		"actor/character/sections/encumbrance",
		"actor/character/sections/equipment",
		"actor/character/sections/hit-location",
		"actor/character/sections/identity",
		"actor/character/sections/item-notes",
		"actor/character/sections/lifting",
		"actor/character/sections/melee-attack",
		"actor/character/sections/miscellaneous",
		"actor/character/sections/note",
		"actor/character/sections/other-equipment",
		"actor/character/sections/points",
		"actor/character/sections/pool-attributes",
		"actor/character/sections/portrait",
		"actor/character/sections/primary-attributes",
		"actor/character/sections/ranged-attack",
		"actor/character/sections/reaction",
		"actor/character/sections/secondary-attributes",
		"actor/character/sections/skill",
		"actor/character/sections/spell",

		"actor/character/sections/error",
		"actor/drag-image",

		"sections/input-text",
		"sections/textarea",

		"actor/import",

		"item/sections/prerequisites",
		"item/sections/prereq",
		"item/sections/prereq/trait-prereq",
		"item/sections/prereq/attribute-prereq",
		"item/sections/prereq/contained-quantity-prereq",
		"item/sections/prereq/contained-weight-prereq",
		"item/sections/prereq/skill-prereq",
		"item/sections/prereq/spell-prereq",

		"item/sections/features",
		"item/sections/feature/attribute-bonus",
		"item/sections/feature/cond-mod",
		"item/sections/feature/dr-bonus",
		"item/sections/feature/reaction-bonus",
		"item/sections/feature/skill-bonus",
		"item/sections/feature/skill-point-bonus",
		"item/sections/feature/spell-bonus",
		"item/sections/feature/spell-point-bonus",
		"item/sections/feature/weapon-bonus",
		"item/sections/feature/cost-reduction",
		"item/sections/feature/contained-weight-reduction",

		"item/sections/trait-mod",
		"item/sections/eqp-mod",
		"item/sections/melee",
		"item/sections/ranged",
		"item/sections/defaults",

		"chat/import-character-error",

		"compendium-browser/trait",
		"compendium-browser/modifier",
		"compendium-browser/skill",
		"compendium-browser/spell",
		"compendium-browser/equipment",
		"compendium-browser/eqp_modifier",
		"compendium-browser/note",
		"compendium-browser/item-notes",
		"compendium-browser/settings",
	];
	const formattedPaths: string[] = [];
	for (let filename of templatePaths) {
		const name = filename;
		filename = `systems/${SYSTEM_NAME}/templates/${filename}.hbs`;
		// Const match = filename.match(`.*/(.*).hbs`);
		// const name = match ? match[1] : "";
		fetch(filename)
			.then(it => it.text())
			.then(async text => {
				if (name) Handlebars.registerPartial(name, text);
				formattedPaths.push(name);
			});
	}
	return loadTemplates(formattedPaths);
}
