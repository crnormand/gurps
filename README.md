# GURPS 4e game system for Foundry VTT
Implementing the Generic Universal Roleplaying System 4e rules for Foundry VTT

Version 0.6.0

Design philosophy: Use GCS (or GCA) to create and modify the characters, and use FVTT for rolling (but allow some editing).

TODO items:

- Get the Modifier Bucket to actually display the current (local) global modifier.
- Build a dialog for Modifier Bucket to edit current list, and display list of common modifiers
- Allow GM to "send" current modifier stack to another player (and optionally "see" the individual player's stacks).
- Build editors for many of the collections (skills, spells, ads, disads, etc.).   
- Investigate "status effects" and define (or adapt to ) standard GURPS status (Stunned, Shock, etc.) and see how they can add to the Modifier stack.
- Can we open a specialize character sheet on the currently selected item in the combat tracker?  Can we embed it in the tracker (and/or should we try)?
- Apply Range modifier to global Modifier stack.
- Allow dragging a "damage" chat message to a character sheet (or entry in the combat tracker) to apply damage
- When we drop damage, display a dialog with combat options (subtract DR per location, apply wound modifiers, etc.)


##Versions
- 0.6.0 - Incorporated new "combat-focused" character sheet.  
-	Fixed import of GCA exports (using Fantasy Ground format).   
-	Continuing work on editable entries.   
- Made current FP and HP editable.
-	Reworked template.json to remove arrays (All characters prior to 0.6.0 must be deleted and reimported!)
- 0.5.1 - Due to overwhelming pressure (3 people), I did my best to fix the "jumpy" buttons that cause the page to constantly shift.
- 0.5.0 - Atropos fixed my persistance issue.   Youtube demo made.
- 0.4.0 - Rollables and PDF (pagerefs) work
- 0.3.0 - Introduction of GCS character sheet

