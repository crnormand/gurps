# TO DO

## In Progress

-   Implement GCS-style attribute editor
    -   Adding draggable attributes
        -   Change indicator when halfway down an entry
        -   Functionally reorder attribute on drop
    -   Functional Delete and Add button
    -   Pool Attribute UI
        -   Functional Threshold Button
        -   Draggable thresholds
        -   Add \_updateObject options for threshold ops
        -   apply attribute type
        -   maybe go back to live updates
        -   !! use cached values when updating, and update actor only on close !!
-   Implement 5.3 optimization
-   Resource tracker editor
    -   enfore max/min checkboxes
-   Replace "input-text" partial with sensible function
-   Live update input field to red if data is invalid (i.e. if attribute id is taken)

## 1.0.0

-   Drag rollable buttons to hotbar or message box for macros
-   GCS 5.3 Study Time support
-   Finish the Damage Calculator conversion
-   Finish "static" character (0.15 and older) compatibility
-   Convert OTFs and chat commands
    -   roll chat command
-   Implement "static" items (0.15 and older) compatibility
    -   add deprecation warning to static items
-   Add conversion from "static" to newer "dynamic" characters
-   Finish GCA5 direct import
    -   prereqs (leave for later)
    -   appearance
    -   finish features
    -   meta-traits
    -   racial templates
    -   alternate abilities
-   Convert the modifier bucket over
-   Apply consistent UI styling to everything
-   Convert over the Active Effects implementation and add to it
-   Convert over module compatibility
-   Convert over resource tracker functionality
-   Convert over as much of the old localization files as we can
-   Implement UI customization settings (colors, fonts)
-   Implement GCS-style hit location table editor
-   probably a bunch of other stuff I'm forgetting
-   Dynamic Character changes
    -   add non-attribute resource trackers to dynamic character (optional, could think of better solution)
    -   add move modes to dynamic character
    -   add move advantage parsing (by name? or feature? or VTT notes?) for "Flight", "Walk on Air".
        the names parsed should be customizable via an object-type system setting. the names(?) value should be an array of strings
    -   add optional encumbrance to dynamic character
    -   (?) add optional reeling to dynamic character (maybe add ability to manually switch pool state for purposes of move etc. calculation)
    -   add posture to dynamic character
    -   add maneuver to dynamic character
-   Global Foundry styling
-   (compact) NPC sheet
-   Character export/sync
-   Manual Light & Dark Mode
-   Style (font & color) settings
-   Customizable default attributes/body plan/sheet settings
-   Active Effects with Features
-   Incorporate v10 tooltip API
-   Skill Defaults from compendium
-   @X@ notation dialog box for items
-   Support custom hit location tables in damage calculator
-   Tech Level Modifiers (B168)
-   update Nordlond sheet & compendium entries with dynamic characters
-   Change unsatisfied prerequisite messages for better formatting & localization
-   Redo drag & drop indicators
-   automatically pop out effect mod window when choosing maneuver / posture / effect
-   switch between number and dice display for skill rolls

## 1.1.0 and beyond

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
