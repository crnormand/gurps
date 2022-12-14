import { SYSTEM_NAME } from "./data"

/**
 *
 */
export async function preloadTemplates(): Promise<Handlebars.TemplateDelegate[]> {
	const templatePaths: string[] = [
		// Add paths to "systems/gurps/templates"

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
		"actor/character/sections/macros",
		"actor/character/sections/melee-attack",
		"actor/character/sections/miscellaneous",
		"actor/character/sections/move",
		"actor/character/sections/note",
		"actor/character/sections/other-equipment",
		"actor/character/sections/points",
		"actor/character/sections/pool-attributes",
		"actor/character/sections/portrait",
		"actor/character/sections/primary-attributes",
		"actor/character/sections/ranged-attack",
		"actor/character/sections/reaction",
		"actor/character/sections/resource-trackers",
		"actor/character/sections/secondary-attributes",
		"actor/character/sections/skill",
		"actor/character/sections/spell",
		"actor/character/sections/trait",

		"actor/character/config/sheet-settings",
		"actor/character/config/attributes",
		"actor/character/config/threshold",
		"actor/character/config/body-type",
		"actor/character/config/location",
		"actor/character/config/resource-trackers",

		"actor/static_character/sections/attributes",
		"actor/static_character/sections/basic-damage",
		"actor/static_character/sections/ci-editor",
		// "actor/static_character/sections/conditional-injury",
		// "actor/static_character/sections/conditionalmods",
		"actor/static_character/sections/conditions",
		"actor/static_character/sections/description",
		"actor/static_character/sections/encumbrance",
		"actor/static_character/sections/equipment",
		"actor/static_character/sections/footer",
		"actor/static_character/sections/hit-location",
		"actor/static_character/sections/hpfp-editor",
		"actor/static_character/sections/hpfp-tracker",
		"actor/static_character/sections/identity",
		"actor/static_character/sections/lifting",
		"actor/static_character/sections/macros",
		"actor/static_character/sections/melee-attack",
		"actor/static_character/sections/miscellaneous",
		"actor/static_character/sections/move",
		"actor/static_character/sections/note",
		"actor/static_character/sections/other-equipment",
		"actor/static_character/sections/points",
		"actor/static_character/sections/pool-attributes",
		"actor/static_character/sections/portrait",
		"actor/static_character/sections/primary-attributes",
		"actor/static_character/sections/quicknote",
		"actor/static_character/sections/ranged-attack",
		"actor/static_character/sections/reaction",
		"actor/static_character/sections/resource-trackers",
		"actor/static_character/sections/secondary-attributes",
		"actor/static_character/sections/skill",
		"actor/static_character/sections/speed-range-table",
		"actor/static_character/sections/spell",
		"actor/static_character/sections/trackers",
		"actor/static_character/sections/trait",

		"actor/static_character/config/sheet-settings",
		"actor/static_character/config/resource-trackers",
		"actor/static_character/config/threshold",

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
		"item/sections/prereq/equipped-equipment-prereq",
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
		"item/sections/feature/weapon-dr-divisor-bonus",
		"item/sections/feature/cost-reduction",
		"item/sections/feature/contained-weight-reduction",

		"item/sections/study",

		"item/sections/trait-mod",
		"item/sections/eqp-mod",
		"item/sections/melee",
		"item/sections/ranged",
		"item/sections/defaults",

		"chat/import-character-error",

		"compendium-browser/searchbar",
		"compendium-browser/trait",
		"compendium-browser/modifier",
		"compendium-browser/skill",
		"compendium-browser/spell",
		"compendium-browser/equipment",
		"compendium-browser/eqp_modifier",
		"compendium-browser/note",
		"compendium-browser/item-notes",
		"compendium-browser/settings",

		"modifier-bucket/active",
		"modifier-bucket/collapsible",
		"modifier-bucket/modifier",
		"modifier-bucket/player",
	]
	const formattedPaths: string[] = []
	for (let filename of templatePaths) {
		const name = filename
		filename = `systems/${SYSTEM_NAME}/templates/${filename}.hbs`
		// Const match = filename.match(`.*/(.*).hbs`);
		// const name = match ? match[1] : "";
		fetch(filename)
			.then(it => it.text())
			.then(async text => {
				if (name) Handlebars.registerPartial(name, text)
				formattedPaths.push(name)
			})
	}
	return loadTemplates(formattedPaths)
}
