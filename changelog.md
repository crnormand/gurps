### Users Guide for [GURPS 4e game aid for Foundry VTT](https://bit.ly/2JaSlQd)

This is what we are currently working on:

  0.8.23
  
- Fixed Equipment editing when using The Furnace, because I guess they never thought people might use {{count}} in their own dialogs.
- Merged @Exxar's Damage Reduction code into ADD
- Adjust ADD results to show +3 bonus to HT checks when damage is Ranged, 1/2D.
- Fixed drag and drop macros to be compatible with The Furnace
- Initial implementation of a Slam calculator. Access via the chat message '/slam'.
- Added i18n tags to most of modifier bucket popup. Just need folks to submit translations!

## History

  0.8.22 - 3/31/2021

- Updated German/Deutsch translation
- Add dialog to resource tracker editors on actor's sheets to apply a template, edit the tracker, or remove the tracker.
- Bugfix for pi-, pi+, and pi++ damage types.
- Implemented drag-and-drop for OtFs on character sheets onto the macro bar.
- Drag and drop now works for any OTF on character sheet
- Added sanity check on Resource Tracker alias input.
- Added initial Russian/русский translation (thanks to Discord user @Weirdy)!
- Bugfix for multiple damage drag-and-drop.
- OtF damage types are now case-insensitive (e.g., 'Cut' and 'CUT' become 'cut').
- Dropping the damage chat onto a hex with multiple tokens will now prompt the user to select which token to apply it to.
- Support localization of damage abbreviations (e.g., "cut" can be entered as "corte" in Brazilian Portuguese)
- Fixed DR calculation when Armor Divisor < 1 and location DR is 0.
- Added /fc /frightcheck dialog (Thank you roaoon!)
- Added /rolltable
- Added /ev [OtF] (except PDF, Chat and Modifier)
- Fixed import of unicode characters in names (and elsewhere)
- Fixed damage to resources to allow HP or FP damage to apply to a resource
- Added support for [A:Attack *Costs 1FP]
- Fixed [A:Attack] where skill level includes "*Costs 1FP"
- Added Drag and drop OtF from chat

  0.8.21 - 3/22/2021

- Fixed parse bug where roll has no damage type or comment [3d]
- Added German/Deutsch translation

  0.8.20 - 3/22/2021

- Fixed description of modifier for Skill OtF
- Fixed GM Send to allow blind rolls
- Fixed OtF coloration on skills
- Support adding Resources as a custom damage type (https://github.com/crnormand/gurps/issues/386)
- Allow the ADD to apply resource damage to the actor's resource tracker (https://github.com/crnormand/gurps/issues/385)
- Changed "User Entered DR" in the ADD to override the hit location DR (so you still get the other benefits of hitting a specific body part).
- Added Control Points (Fantastic Dungeon Grappling: https://gamingballistic.com/product/fantastic-dungeon-grappling-pdf-dfrpg/) as a default Resource Tracker.
- Modified Resource Trackers to optionally _accumulate_ damage, rather than subtracting damage from a resource. Enabled via the 'Damage Tracker' checkbox in the Resource Tracker editor.
- Fixed parsing for damage with extraneous text '1d-1 burn/2 points'
- Added GURPS.executeOTF()

  0.8.19 - 3/17/2021

- Translated status effects to German
- Added all RAW armor divisors to ADD (0.1, 0.2., 0.5, 2, 3, 5, 10, 100, Ignores DR)
- Fixed 'Ignores DR' to be affected by Hardened DR
- Updated Hardened DR to include 6 levels (allows 'Ignores DR' to be modified down to 'no Armor Divisor')
- Fixed GM Send Blind rolls
- Fixed non-hover Modifier Bucket tooltip constantly re-opening
- Fixed '+0 &lt;dmgtype&gt;' showing up as a modifier for damage rolls
- Support (-1) armor divisor (as "Ignores DR")
- Support editing of skills/spells with '\*Costs xFP'
- Fixed "\*Max: 9" if not the last modifier
- Create and apply standard resource trackers across the world. Instructions: https://github.com/crnormand/gurps/issues/380#issuecomment-801357042

  0.8.18 - 3/14/2021

- Converted 'mapped' to 'attribute' so [S:Trap|Vision-5] works
- Add blindroll to CR
- Implemented selectable armor divisor in the apply damage dialog
- Added /select ActorName (sets the LastActor)
- Added support for unlinked Actors, which display like "TokenName(ActorName)"
- Added /status clear (clears all status effects)
- Right Mouse Click for NON-GMs sends OtF formula to chat input
- Fixed i18n issues with ranged
- Fixed missing hitlocation modifiers
- Add Quick Note under Encumbrance
- 'Grand' unification of attribute/skill parsing [Parry|Block:Shield|S:Skill|Fright Check|Dodge -2 slow|DX-4 ? "Ouch", "Close!"]
- Skill checks can now cost FP (append '\*Costs 1FP')
- Fixed bug with clearing a resource tracker.
- Added custom thresholds and condition names for resource trackers. For a description and instructions, see this link: https://github.com/crnormand/gurps/issues/380
- Fixed Shotgun RoF (3x9)
- Added system setting to make player chat commands private (GM's chat commands are already private)
- Fixed Skill names that included '(' and ')'

  0.8.17 - 3/8/2021

- Bug fix for names/names containing '%'
- Bug fix for resource tracker mis-alignment (due to arrow)
- Bug fix for missing hitlocation internationalization
- Bug fixes for Navigation buttons
- Bug fix for ADD Shotgun DR
- Bug fix for GCS import individual melee and ranged notes
- /hp /fp now support dice roll /hp +1d

  0.8.16 - 3/6/2021

- Bug fix for GCA exports. Now equipment with melee & ranged attacks appear in both (Spears)
- Bug fix for GCA exports (with Armin's help!) Block is calculated correctly for items with DB (shields)
- Add doubleclick edit to NPC Sheet Notes, Melee, Ranged, Ads, Skill and Spells list
- Bug fix for limb, extremity, and eye crippling calculation. Originally the calculation was taking "crippling" as 1/2 HP or 1/3 HP exactly, but the RAW say it should be _over_ that threshold. Example: 10 HP character is hit in the arm with 8 points of damage; the arm is crippled if it takes _more than_ 5 points of damage (i.e., 6).
- High rate of fire weapons damage is supported directly. Right-click on a damage roll to get a menu to enter the number of hits. There will be a new "ALL THE DAMAGE" draggable section of the damage chat message. Dragging that onto a character will apply all damage rolls in the ADD. The ADD has been enhanced to allow each damage calculation to be displayed, while applying the total.
- Updated GCS import to accept 'uses' and 'maxuses' columns for equipment (requires GCS 4.28 and Master Library 2.9)
- Added Shotgun damage to Apply Damage Dialog.
- Added split buttons to ADD.
- Added navigation footer to GCS Full Sheet.
- Added generic 'weight' icon to character sheet in preparation for (one day) handling metric.
- Added 'apply multiple times' to ADD.
- Added 'Reeling' and 'Tired' buttons to Full and Combat sheet (and Combat tracker)
- Added system setting to allow automatic setting of Reeling and Tired
- Add "Apply Damage to <Target>" button to Damage Chat Message. If the user who rolled the damage also has set a target, this adds the button only for the GM.
- Better parsing of On-the-Fly formulas in Journal entries (especially unicode characters)
- Restrict Apply Damage Calculator to GM only (system setting)
- Updated /sendmb to allow optional OtF modifier: /sendmb [+1 to hit & +3 luck] <playername(s)>
- Allow OtF skill check to use a different attribute than the default. (E.g., make a Per-based Traps skill check at -2 for difficulty: "[S:Traps -2 difficulty (Based:Per)]".)
- Allow conditional text for Attribute and Skill checks [!Per ?"You sense something is there", "You hear nothing!"]
- Bug fix for old chat messages. Can now be clicked on
- Added /hp /fp /qty /trackerN chat commands
- Added /qty /uses /status /tracker(name) chat commands
- Added .ra /sendmbs multiline chat msgs \\

  0.8.15 - 2/17/2021

- Bug fix for 3D6 roll icon (at bottom of screen)
- Bug fix for costs, counts, weights that contain commas ","
- Bug fix for 17&18 always being a failure (even with very high skill)
- Updated GCA export to handle '&' in ad/disad/quirk/perk name
- Bug fix for drag and drop reordering in lists
- For GMs, display LastActor name above Modifier Bucket
- Allow full damage types, e.g. 'crush', 'cutting', etc.
- Bug fix for NPC bodyplan changes

  0.8.14 - 2/11/2021

- Added Explosion damage calculation to Damage Calculator
  - either as a single damage roll applied multiple times to different targets, or right-click on the damage roll to be prompted for the number of rolls to generate
- Fixed a few issues with the Modifier Bucket, Targeted Chat messages, and others.
- pagerefs can be http links (and will show up as '\*Link')
- SHIFT-Apply keeps Damage Dialog open (to allow multiple RoF damage results)
- Removed hitlocation eqt tooltip (no longer valid)
- Allow multiple modifiers [+1 to hit & +2 lucky]
- Fixed actors not having the new calculated values (currentdodge, currentmove, equippedparry, equippedblock)
- Added Mook Generator defaults editor
- GCA export/import now handles parents for Ads/Disads/Spells and Skills
- Rewrite of damage parser, more uniform handling of multipliers/divisors, etc. support for const damage [1 cut]
- Don't tell anyone, but we now support any sided dice for non-targeted, non-derived damage rolls [3d4], [2d20 cut]

  0.8.13 - 2/6/2021

- @Tratz engaged [R.K. Media](https://marketplace.roll20.net/browse/publisher/507/rk-media) to upgrade our icons.
- Allow mook parry to show up in tooltip alt
- Fixed Parry/Blook OtF for mooks
- Fixed more /chat handler bugs

  0.8.12 - 2/5/2021

- Bug fix for chat commands, e.g. "/r 3d6", etc.

  0.8.11 - 2/4/2021

- Fixed the z-index of the modifier bucket (it no longer displays on top of everything!)
- Ongoing internationalization effort by @Gus
- Fixed GCS export to reinstate Self Control Rolls, ex: [CR: 12 Bad Temper] (GCS-3)
- Added chat command: /everyone <commands>
- revamped the chat message handler (it actually works now)
- Added currentdodge, currentmove, equippedparry and equippedblock attributes (for use with modules like Token Tooltip Alt)
- Added GM Send function to Journal entries
- Enhance OtF for damage to allow "*Costs ?FP" [4d-4 burn *Costs 4FP]
- "Best of" skill or attribute OtF [S:Skillname|DX-2], actually infinite, can be used to try other skills [S:Skill1|S:Skill2|ST|S:Skill3|IQ-4 default]
- Copy to chat input (GM Send). Can't do clipboard
- Chat command /:<macro name> - call macro
- OtF formula [/<chat command>] execute chat command as a button
- Fixed GCA export, ranged attacks in the melee list and sanitize pagerefs
- Enhanced the import error warnings
  
  0.8.10 - 1/30/2021

- @Tratz equipment bug fix, portrait fix and logo fix!
- Bug fix for OtF formulas in Skills/Spells in containers
  0.8.9 - 1/29/2021

- Added individual die results to Roll Chat messages (e.g., "Rolled (3, 6, 1) = 10").
- Fixed GCA export to correctly export ranged innate attacks.
- Added Equipment hierarchy to GCA export
- Support GCS v4.27, export hierarchy for Ads/Disads, Skills, Spells and Notes
- Added Page Refs for Notes
- Added collapsible carets for Ads/Disads, Skills, Spells, Notes & Equipment
- Added drag and drop menu 'before' and 'in' for all lists so you can create containers
- Allow user created notes & equipment to survive import

  0.8.8 - 1/24/2021

- Fixed [Parry] bug (if Parry column has "No" in it)
- Added "Send to 'Everyone'" GM option in modifier bucket
- Added QTY +/- buttons to equipment (ugly, but functional)
- Added RMB menu to equipment (Add Before, Delete, Add at end, Add in, Edit)
- Added Equipment edit dialog
- Added Melee and Ranged edit dialog
- Added Advantage, Skill and Spell edit dialog
- Added Note editor and page ref column
- Added RMB to notes (Edit, Delete)
- Restricted editing functions to owners
- Updated chat commands (/help - to see them all)
- Support limited multiline chat macros

  0.8.7 - 1/20/2021

- Bug fix for multiple PDF links (and GCA import failure)

  0.8.6 - 1/20/2021

- Yet more updates to Mook Generator stat block importer
- Support for OtF [Dodge+/-mod text] and [<mapped>+/-mod text] (Vision, Hearing, Fright Check, etc.)
- Fixed weight/cost sum import for GCA
- @Exxar's fix to CI
- Fixed "lost" Automatic Encumbrance system setting
- Support opening multiple PDF links "B101, MA105"

  0.8.5 - 1/17/2021

- Add popup buttons (-10/-5/+5/+10/etc...) to resource tracker current value fields (including HP and FP) and system setting.
- Added @Exxar's wonderful work on Conditional Injury (Pyramid 3/120)
- Shift-click on Resource Tracker increments/decrements by 5 (also affects CI Days to Heal)
- System settings concerning overwriting current HP/FP and Body Plan
- Updated GCA export to support Body Plan
- Allow manual edit of hit locations
- Per actor flag to ignore body plan from import
- LastActor deselection fixed
- Rework the look of the resource trackers and HP/FP trackers to make them more compact.
- Display the current resource tracker thresholds. Right now, that is only "Below" (value is below the minimum), "Over" (value is over the maximum), or "Normal".
- Inline editing of the resource trackers (pencil icon)
- /pr /private chat commands to roll On-the-Fly formulas privately
- [fixed a bunch of bugs](https://github.com/crnormand/gurps/issues?q=is%3Aissue+is%3Aclosed+updated:%3E2021-01-05)
- added system setting for 'SHOW THE MATH'
- Encumbrance level automatically set based on carried equipment weight and system setting

  0.8.4 - 1/5/2021

- Enhanced the Mook Generator to use tabs as a delimiter.
- Added pain penalties for characters with High Pain Threshold (HPT) to the modifier bucket (thanks, @Exxar!)
- Enhanced the character sheet to enable damage formulas based on Swing or Thrust; e.g. "sw+2" or "thr-1".
- Updated the damage chat message to show individual dice results in addition to the sum.
- Support multiple hit location tables: Humanoid, Quadruped, Quadruped (winged), Avian, Centaur, Hexapod, Hexapod (winged),
  Veriform, Snakeman, Winged Serpent, Octopoid, Squid, Cancroid, Scorpion, Ichthyoid, and Arachnoid. Until the GCS import
  can be enhanced, the app makes its best guess at the form of the imported character.
- Enhanced editor to select the hit location table that is in use by that character.
- Updated the Apply Damage Dialog to work with all the hit location tables, including damage effects on non-human limbs and
  extremities.
- Multiple small tweaks to the UI.
- System setting to ignore 'name' attribute during import
- More flexible parsing for stat block attacks

  0.8.3 - 12/22/2020

- Direct roll of On-the-Fly formulas in chat. e.g. /r [Per] or /roll [3d-2 cr]
- Direct roll of On-the-Fly formulas in Rolltables
- Direct roll of On-the-Fly formulas in Macros (multiple lines)
- Added Parry & Block to the On-the-Fly formulas
- Enhancements to the Mook Generator stat block importing
- Journal entries now parse (and display) On-the-Fly formulas.
- Chat Portraits module supported (and recommended!)
- Drag and drop damage onto Tokens
- Drag and drop damage onto Combat Tracker
- General Resource trackers! Full and Combat sheets

  0.8.2 - 12/14/2020

- Rearrange npc sheet (attacks over traits/skills)
- Added notes for Melee, Ranged, Skills and Traits in Mook Generator
- Adding Stat block importing/parsing
- Pressing SHIFT while making a roll makes it private (so GM can "roll behind the screen")
- Added @gmod, @gmodc to roll macros
- Enhancements for Apply Damage Dialog (ADD)
  - Vulnerability
  - Hardened DR
  - Injury Tolerance
- "Show the Math" on damage chat messages
- Additional ranged hits capped at RoF
- Import can now keep current HP & FP
- fix for combined Basic Set PDF link for pages > 336

  0.8.1 - 12/6/2020

- Basic Speed no longer truncates
- Major upgrade to Apply Damage Dialog!
- Allow "defense" to be rollable in Simple sheet
- Simple sheet "Heart" now shows color based on HP condition
- Add [Dodge] to On-the-Fly formulas
- Users Guide link in Foundry. Type "/help" or "!help" in chat
- Current Encumbrance can be set on main/combat sheet. Only current Dodge can be rolled.
- Fixed Full/Combat sheet toggle
- Warn on FG import
- On-the-Fly can now parse "4d+1x2(0.5)" damage rolls
- On-the-Fly can now create "blind" rolls. Useful for GM to ask everyone to roll PER
- Support for generic damage type "dmg"
- Added calculation of additional hits for RoF/Rcl.
- Mook Generator / NPC Sheet
- Shift/Ctrl click Full View/Combat View opens Simplified and NPC/Mini sheets
- Support [Fright Check], [Vision], [Hearing], [Touch], [Taste], [Smell] On-the-Fly rolls.
- Right Click on Attack/Skill/Spell level & On-the-Fly formula to whisper to owner.

**NOTE: If you upgrade to v0.8.0, you MUST delete all of your actors and restart Foundry**

0.8.0 - 11/27/2020

- Enhanced Drag and Drop Damage Dialog.
- Simplified (convention one-shot) character sheet
- Enhanced On-the-Fly parsing for Skills, Spells and Attacks (melee & ranged)
- Apply On-the-Fly parsing to the chat. Now roll tables can include OtF formulas.
- More explicit warning if a user tries to import a GCS file directly.
- Import error notification (mainly "&")
- Added support for Combined or Separate Basic Set PDFs.
- Drag and drop to move equipment between lists or in containers
- Foundry specific GCA export script.
- NOTE: The Fantasy Grounds export is no longer supported.
- - Either use the "Foundy VTT" output template for GCS, or
- - The "export to Foundry VTT.gce" script for GCA

**NOTE: If you upgrade to v0.7.0, YOU MUST delete all of your actors, and Restart Foundry**

0.7.0 - 11/18/2020

- Fixed manifest file to allow for automatic updating
- Added configurable system settings (range system (Basic Set / Monster Hunters 2), etc.)
- Added common modifiers as pulldown lists on tooltip
- Installed GURPS combat initiative (GURPS Turn Sequence B362)
- added support for basic GURPS status and afflictions "effects" (and icons)
- refactored code to make it less of a "prototype" and more of a "pre-alpha"
- fixed import for GCS characters that contain "&" in fields, assuming they turn @ENCODING back on
- Page Ref links to non-existent PDFs will now go to the SJG Warehouse 23 website
- Created Foundry VTT specific GCS export/import and massive performance boost.
- 3d6/1d6 on desktop
- Can edit character sheet
- Started work on drag and drop damage!

  0.6.5 - 11/9/2020

- Removed "+0" range modifiers
- Enabled Full/Combat view for Players
- Fixed font color to be more readable
- Major overhaul of the Modifier Bucket "tool tip"!!

  0.6.4 - 11/6/2020

- HP & FP editable, and Conditions change color.
- ACC and Bulk ranged modifiers work.
- Measuring Ruler automatically creates Range Modifier.
- Started work for Monster Hunters 2 range modifiers.
- Refactored dice rolling so that modifiers now add to damage.

  0.6.3 - 11/5/2020

- Hot toggle between "full" and "combat" character sheets
- template.json changes. You must delete all Actors created prior to v0.6.3
- imported Hit Location information
- tooltips for Hit Location equipment
- GM Mod push!

  0.6.2 - 11/4/2020

- Support for stackable modifiers (clicking [-1 for range] multiple times)
- Fixed display of desktop Modifier Bucket
- Added Modifier tooltip
- Added critical success/failure calculations
- Added SJG notifications, as per the SJG Online Policy

  0.6.1 - 11/3/2020

- Started User Guide and added README popup
- Imported skill points

  0.6.0 - 11/2/2020

- Imported Notes & Equipment
- Incorporated new "combat-focused" character sheet.
- Fixed import of GCA exports (using Fantasy Ground format).
- Made current FP and HP editable.
- Continuing work on editable entries.
- Reworked template.json to remove arrays (All characters prior to 0.6.0 must be deleted and reimported!)

  0.5.1 - 10/31/2020

- Due to overwhelming pressure (3 people), I did my best to fix the "jumpy" buttons that cause the page to constantly shift.

  0.5.0 - 10/30/2020

- Atropos fixed my persistance issue. Youtube demo made.

  0.4.0 - 10/28/2020

- Rollables and PDF (pagerefs) work

  0.3.0 - 10/27/2020

- Introduction of GCS character sheet

  0.2.0 - 10/25/2020

- Renamed system

  0.1.0 - 10/21/2020

- Started GCS Import

The material presented here is my original creation, intended for use with the [GURPS](http://www.sjgames.com/gurps) system from [Steve Jackson Games](ttp://www.sjgames.com). This material is not official and is not endorsed by Steve Jackson Games.

[GURPS](http://www.sjgames.com/gurps) is a trademark of Steve Jackson Games, and its rules and art are copyrighted by Steve Jackson Games. All rights are reserved by Steve Jackson Games. This game aid is the original creation of Chris Normand/Nose66 and is released for free distribution, and not for resale, under the permissions granted in the [Steve Jackson Games Online Policy](http://www.sjgames.com/general/online_policy.html)

This game system DOES NOT provide information contained in paid publications. It is only intended to allow people to play GURPS online using their GURPS books/PDFs.

Status icons for actors provided by [R.K. Media](https://marketplace.roll20.net/browse/publisher/507/rk-media) - check them out!
