# TO DO

## In Progress

-   Convert the modifier bucket over
    -   premade lists
    -   pinned appears as category always (for awareness)
    -   modifier bucket journals
-   Finish the Damage Calculator conversion
-   Convert OTFs and chat commands
    -   roll chat command
-   Implement "static" items (0.15 and older) compatibility
    -   add deprecation warning to static items

## 1.0.0

-   Drag rollable buttons to hotbar or message box for macros
-   Finish "static" character (0.15 and older) compatibility
-   Convert over the Active Effects implementation and add to it
-   Convert over module compatibility
-   Dynamic Character changes
    -   add move modes to dynamic character
    -   add optional encumbrance to dynamic character
    -   add posture to dynamic character
    -   add maneuver to dynamic character
-   Active Effects with Features
-   @X@ notation dialog box for items
-   update Nordlond sheet & compendium entries with dynamic characters
-   Change unsatisfied prerequisite messages for better formatting & localization
-   automatically pop out effect mod window when choosing maneuver / posture / effect
-	negative value stat support for tokens

## 1.1.0 and beyond

-   Skill Defaults from compendium
-   Incorporate v10 tooltip API
-   Drag items to chat, get item chat entry with name, notes, rollables, etc.
-	completely redo the way roll messages are handled
	-	default roll templates are re-rendered when opening the world, while ours are static
		changing this so the templates are dynamic would improve the way they are handled in the future
-   send modifiers from prompt
-   Tech Level Modifiers (B168)
-   Dynamic Character changes
    -   add move advantage parsing (by name? or feature? or VTT notes?) for "Flight", "Walk on Air".
        the names parsed should be customizable via an object-type system setting. the names(?) value should be an array of strings
-   when skill is rolled from tree, show which skill is rolled
-   (compact) NPC sheet
-   roll skills based on other attributes
-   add way to hide specific result, target, and mods of roll but just show success/failure/crit
-   reimporting a character over another one doesn't visibly change portrait until refresh because it is stored in cache. fix?
-   Global Foundry styling
-   import/export for settings (colors, attributes, body type, resource trackers, sheet settings)
-   Finish GCA5 direct import
    -   prereqs (leave for later)
    -   appearance
    -   finish features
    -   meta-traits
    -   racial templates
    -   alternate abilities
-   mass import characters (add to library browser)
-   autofill bio
-   Fix textarea height
-   focus on field of newly created attribute/location/etc. on creation
-   GCS 5.3 Template support
-   Vehicles
    -   Spaceships
    -   3e(?) Vehicles
-   Mass Combat Elements
-   Mook Generator
    -   Autocomplete traits, skills, etc. from compendiums
-   G-Force calculator (affects encumbrance & move)
    -   Toggleable sidebar button
    -   Affects clicked on tokens / current map / current character
-   Support rolling on custom hit location tables (e.g. grand unified hit location table)
-   Tours implementation for UI
-   metric system conversion
-   Roll20 style notes about character in place of character sheet (for players with limited access?)
-   fully customizable sheet layout wit dragging around elements
-   Different attribute based skill rolls
-   Library Import
    -   Overwrite items instead of appending
    -   When importing to world items, overwrite items with the same GCS UUID
-   Sort character items on import
-   Polygot module support for Dynamic Characters
-   Add "children" section to sheets for items which can have children
-   Add native hex token size support (especially for elongated hexes)
-   Add native "drag ruler" type support
    -   Color green within maneuver range
    -   Color yellow for one hex (1FP extra effort?/extra step) maybe toggleable
    -   Color red beyond limit
