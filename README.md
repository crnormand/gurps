# GURPS 4e game system for Foundry VTT
Implementing the Generic Universal Roleplaying System 4e rules for Foundry VTT

Version 0.6.0

Design philosophy: Use GCS (or GCA) to create and modify the characters, and use FVTT for rolling (but allow some editing).

TODO items:

- Get the Modifier Bucket to actually display the current (local) global modifier.
- Import Equipment
- Allow Items to be added as Equipment (so some can come from import, and some from the Items list).
- Import DR list (protection)
- Build a dialog for Modifier Bucket to edit current list, and display list of common modifiers
- Allow GM to "send" current modifier stack to another player (and optionally "see" the individual player's stacks).
- Build editors for many of the collections (skills, spells, ads, disads, etc.).   
- Investigate "status effects" and define (or adapt to ) standard GURPS status (Stunned, Shock, etc.) and see how they can add to the Modifier stack.
- Can we open a specialize character sheet on the currently selected item in the combat tracker?  Can we embed it in the tracker (and/or should we try)?
- Apply Range modifier to global Modifier stack.
- Allow dragging a "damage" chat message to a character sheet (or entry in the combat tracker) to apply damage
- When we drop damage, display a dialog with combat options (subtract DR per location, apply wound modifiers, etc.)
- add button to quick cycle through character sheets (each sheet should remember its opened location).
- Add [PDF:B376] "On-the-Fly" format.
- Add [sw+2 cr] "On-the-Fly"
- Add Import Character to Actors tab (in addition to create character and then import).


##"On the Fly" formats

- [ST]
    - Roll against the character's attribute(s).   ST, IQ, DX, HT, WILL (or Will), PER (or Per).
- [IQ+2]
    - Roll against attribute, adding or subtracting from the target.
- [DX-1 text]
    - As above, but with additional text displayed in the chat record. 
- [CR: 15 text]
    - Self Control roll vs 15, with optional text displayed in chat.   NOTE:  GCS already does this.
- [1d+3 text]
    - An unopposed roll using the formula Xd[+/-Y], with optional text displayed in chat.
- [1d-3! text]
    - As above, but with a minimum result of 1 (instead of 0).   EX: [1d-3! Healing]
- [2d cut]
    - The above format is considered a "Damage" roll (and displayed as such in the chat), if the optional text is one of the recognized GURPS damage types:  burn, cor, cr, cut, fat, imp, pi-, pi, pi+, pi++, tox.  No other optional text is allowed.
- [skill]
    - Roll against the character's skill level.
- [skill-2]
    - Roll against the skilllevel, adding or subtracting from the level.
- [skill*]
    - As above, but find the first skill name that starts with "skill".  Useful for skills that append tech level.   EX: [First Aid*] vs [First Aid/TL3]
- [ST26 text]
    - Roll against ST 26.   Useful when describing powers that operate at a set level.  NOTE:  No additional modifiers may be added/subtracted.
- [+2 text]
    - Add a global modifier described with text.   EX: [-2 to hit], [+2 Mighty Blow], etc.
- [PDF:B208]
    - Create a link for PDFoundry
- [SW+2 cut] / [Thr-1 imp]
    - Roll damage based on the character's basic swing and thrust



##Versions
- 0.6.0 
    - Imported Notes & Equipment
    - Incorporated new "combat-focused" character sheet.  
    -	Fixed import of GCA exports (using Fantasy Ground format).   
    - Made current FP and HP editable.
    -	Continuing work on editable entries.   
    -	Reworked template.json to remove arrays (All characters prior to 0.6.0 must be deleted and reimported!)
- 0.5.1 - Due to overwhelming pressure (3 people), I did my best to fix the "jumpy" buttons that cause the page to constantly shift.
- 0.5.0 - Atropos fixed my persistance issue.   Youtube demo made.
- 0.4.0 - Rollables and PDF (pagerefs) work
- 0.3.0 - Introduction of GCS character sheet

