### [Users Guide](https://bit.ly/2JaSlQd) for GURPS 4e Game Aid for Foundry VTT

If you can't access the Google doc, here is a [PDF](https://github.com/crnormand/gurps/raw/main/docs/Guide%20for%20GURPS%204e%20on%20Foundry%20VTT.pdf) of the latest version.

Release 0.11.4 - 7/01/2021

- Fixed Fright Check /fc table roll
- Added "move" to centered animations, scale affect targeted Y, c:xp,yp set offset
- System setting to automatically save QTY/count on equipment
- Fixed "Level" column in melee/ranged weapons goes blank or NaN after using resource tracker
- Support for JB2A "Raishan" release (which includes new bullet and snipe animations)
- Fixed speaker token for dice rolls, so that modules that are expecting a token can use it, i.e. Cautious Gamemaster's Pack
- Integrated LegendSmith's NPC CI sheet and Survivable guns Special (4) Armor Divisor

Release 0.11.3 - 6/25/2021

- Added "trigger" input fields for features (melee, ranged, etc.) in Item editor
- Reworked targeted animation math

Release 0.11.2 - 6/25/2021

- Fixed error when /light animation type is provided "/li 6 2 torch"

Release 0.11.1 - 6/25/2021

- Fixed error that could occur during import "TypeError: rng.match is not a function"

Release 0.11.0 - 6/25/2021

- Merged in Rinickolous/neck's GCS Equipment importer!
- Fixed ST based ranged calc so it will also apply to Items
- Fixed order dependency when applying Item bonuses
- Kirlian Silvestre/3darkman, fixed Item icon hover picture
- Added /anim command
- Fixed NaN skill levels for containers
- Promoted tabbed view
- Added /w @ to whisper to selected character(s)
- Fixed "user does not have permission to update" when tired/reeling status changes
- Added combat maneuver icons to all tokens in a combat. Two new settings control the appearance of the maneuver icons.
- reinstate /rolltable command
- Added support Advanced Macros module argument passing
- Added support for drag and drop Journal entries, Actors, Items and Rolltables as OtFs
- Added support to drag and drop Items from compendiums and Item sheet
- Support opening and closing the navigation bar (Full Sheet) without going to the system settings.
- Provide UI feedback when doing navigation via the navigation bar.
- Fixed wounding modifiers for imp and pi types on Injury Tolerance: Unliving.

Release 0.10.5 - 6/12/2021

- Remove superfluous "add" menu options for equipment (and just rely on "+")
- Added Sort Contents menu option for equipment
- Fixed range column multiplication by ST
- Added system setting to control if range column automatically multiplied by ST
- Fixed Foundry Item count update (count now saved during update/import)
- Item DR bonus calculation fixed.
- Data protect 0.10.3 migration against bad tokens

Release 0.10.4 - 6/11/2021

- Built 0.10.4 migration (for status icon name changes)
- Fixed changelog parsing (again!)

Release 0.10.3 - 6/11/2021

- Fixed Apply Injury dropdown on ADD window.
- Added Min and Max enforcement option on Resource Trackers
- Added system setting to hide QTY equipment icon
- Added system setting to restrict imports to Trusted or above
- Drag and drop on to 3d6 or Modifier Bucket for Blind roll
- /show skillnames or attributes - show best for all actors in a scene
- [!/chat command] will now disable private report back messages
- Added Tabbed charactersheet
- Fixed GCA export to correctly handle children weights
- Items (and Item features) will hover display the Item icon (very basic... would love CSS help!)
- Fixed GM "Send to" area to provide more room to see buttons
- Fixed bug in Item creation. Equipment can no longer contain other hidden equipment
- Added OtF buttons for margin of success (Rolltable formula "3d6 + @gmodc")
- Enhance /light to include intensity

Release 0.10.2 - 6/5/2021

- Fixed parse bug in bucket

Release 0.10.1 - 6/4/2021

- Fix for dragging Items on to unlinked tokens

Release 0.10.0 - 6/4/2021

- Foundry 0.8.x compatible!
- Updated /light &lt;dim dist&gt; &lt;bright dist&gt; &lt;angle&gt; &lt;anim&gt;|off where anim can be: torch, pulse, chroma, wave, fog, sunburst, dome, emanation, hexa, ghost, energy, roiling, hole
- Added \*Costs X trN and \*Costs X tr(_name_)
- Added support for translated attributes in OtF formulas (Will == Vonte in Portuguese)
- Added Ignore QTY/Count/Uses from import
- Remember carried, parent and equipped status from previous import

Release 0.9.15 - 5/30/2021

- Fixed dodge values when encumbrance greater than 'none'

Release 0.9.14 - 5/28/2021

- Fixed element editors (melee, ranged, skills, spells) for level
- Restrict Foundry items from containing other items
- Fixed Actor startup on encumbrance

Release 0.9.13 - 5/24/2021

- Fixed the data model (template.json) for items

Release 0.9.12 - 5/23/2021

- Equipment name searches for /qty and /use now start at the front of the name for matching
- Fixed /uses /qty when equipment name is being used
- Only show max the last 5 changes (for new users on browsers)
- Add GM command /reimport to ask all player characters to import
- Items bonuses only applied when Item-equipment is equipped (like GCS)
- Refactor weight calculation
- Protect against dragging Items from unlinked actors
- Add scroll bars to the "Send Modifiers to Players" part of the modifier bucket window.
- Show combat maneuver drop-down on character sheet.

Release 0.9.11 - 5/22/2021

- Allow user additions to names or notes survive an import (if changes occur at END of imported data)!
- Added /uses can now automatically detect if it is being run on equipment (like /qty)

Release 0.9.10 - 5/22/2021

- Ensure that empty Actors are initialized correctly
- Added Rcl/RoF information to [A:..] and [R:...] OTF rolls
- More i18n work, we are getting there!
- /tr (/rt) now returns false if the value is less than 0. So it can be used as an ammo tracker /if [/tr(ammo) -1] do some attack]

Release 0.9.9 - 5/21/2021

- Adding @neck/rinickolous's inventory sheet
- Replaced /light dialog with parameters torch = /light 6 2 torch (or candle = /light 1 0 t)
- Fixed changelog viewer to actually STOP after current version
- Fixed calculations of Item skill levels when there is a +/-
- Fixed the /qty command so that if defined in one piece of equipment, it can name another piece of equipment and modify that.
- Added /forcemigrate command for players who's actors didn't quite make it.

Release 0.9.8 - 5/20/2021

- Adding DODGE to Item bonus parsing
- Fixed spelling of dis-bled status (to disabled)
- /uses command can now be used with /if
- fixed error during startup if Show Read me is true

Release 0.9.7 - 5/20/2021

- More lenient handling of OtF formulas on items (may have [ ] or not)
- Added DR+X {hitlocations} bonus to Items
- Required migration to allow DR changes

Release 0.9.6 - 5/20/2021

- Update migration code to remove possible infinite loop issue
- Make Skill/Spell/Attack (Melee/Ranged/Damage) OtF formulas case insensitive

Release 0.9.5 - 5/19/2021

- Fixed /status command when token.actor == null
- Refactor regex pattern matching to utilities.js
- Added "apply condition" buttons to slam results chat messages. These buttons will select the affected combatant and either roll DX and apply the Prone condition if failed, or directly apply Prone if appropriate.
- Updated German language file (thanks to GitHub member @LordOHelmet)
- Added token ID to /select (e.g., `/sel PrPRGwFEiNKewWym`) -- this is mainly done for internal programming, but could be useful in a macro.
- Various tweaks to fix modifier bucket size/position issues.
- Updated /if [Test] { } { } to allow embedded backslashes (to execute multiple commands inside {})
- Fixed Send Modifier bucket buttons on tooltip
- Fixed display of FP tracker when using Conditional Injury.
- Can drag and drop Modifier Bucket onto macro bar
- Fixed bug when trying to execute chat commands using GURPS.executeOTF()
- Prototype of Foundry Item framework, can drop on player chars
- Added "apply condition" buttons to damage effects chat messages.
- Fixed mook generation to include resource trackers.
- Fixed layout problems with Equipment and Other Equipment in the editor sheet.
- Fixed \\ in OtF macros
- Otf Macros now use their override text as the macro name
- Added [M:attack] for only melee and [R:attack] for only ranged
- Fixed bug where Sum Weights on Equipment and Other Equipment displayed as 'NaN'.
- Fixed bug(s) where pasted text may contain unicode single and double quotes (OtF and Mook generator)
- Foundry Item bonuses can affect Attributes, Skills and Attacks. DX changes also affect melee (w/ parry/block) and ranged skills
- Fix for DragRuler users... range mod is NOT added when token is moved
- Fix GCA export to check 'hide' flag on ads/disads/quirks/perks
- Item editor UI ver 1 is complete.
- Added chat command /light (thanks Boifubá!)
- Fixed import on bad actor (used to have to delete actor and then reimport)
- Less "flashing" during imports/updates
- Added support for /if [/qty -?] /hp +1d]
- Added support for /qty detecting the current equipment
- Added support for parameters and return values from script macros (GURPS.chatargs & GURPS.chatreturn)

Release 0.9.4 - 5/06/2021

- Fixed /status command to accept either 't' or 'toggle'
- Added new syntax to /if command to allow nested /ifs {}
- Fixed synchronization of /if "then" and "else" clauses
- Forgot to add Foundry selection for /select @self
- Fixed 'reeling' and 'tired' statuses (tired was actually reeling, and you couldn't manually set tired)
- Fixed /status command with @self -- now it will toggle a status on a token owned by the user (if there is only one)
- Added "named token/actor" to /status command (format: `/st + sleep* :Name`). ':Name' may contain a wildcard and will match either a token name or an actor name (first it tries tokens, then actors). The token must be in the active scene.
- Fixed older actors not having currentmove/dodge or flight values
- Add warning if trying to Edit an empty actor

Release 0.9.3 - 5/04/2021

- Changed the 'persistent' equipment and notes (those that survive a GCS/GCA import) icon to a blue bookmark and right-justified the icon for equipment.
- Fixed modifier bucket to respect permissions on journal entries selected for viewing.
- Fixed OtF buttons in a journal entry being viewed in the Modifier Bucket from being truncated at the first HTML escaped character (such as '\&uuml;').
- /select now also changes Foundry's selection. /sel Bog \\\\ /status on prone
- /sendMB (and MB send) now works for Assistants

Release 0.9.2 - 4/29/2021

- CTRL-roll was broken for certain keyboard events, causing chat commands to fail (ex: /ra)

Release 0.9.1 - 4/28/2021

- Modifier bucket is now scalable in the system settings. Its a client setting so every user can have a different scale factor. At its smallest size (80%) it fits on a 1024x640 monitor. Tiny laptop users, rejoice!!
- The "Common Modifiers" pane of the Modifier Bucket is now a tabbed interface and the user can set any number of journal entries to display in that pane. Use journals to customize your MB!!! Which journal entries to use is a client setting. See this GitHub issue for more info: [#434](https://github.com/crnormand/gurps/issues/434#issuecomment-825715096)
- Fixed a bug so that the ADD will use "effective damage" instead of "basic damage" to calculate knockback. This fixes the problems with explosions and knockback.
- Add a fallback background color to the modifier bucket to fix the transparent MB bug.
- System setting to check for equipped status when determining weight (players can use equipped flag to indicate a 'dropped' item)
- OtF now supports [Sk:Skillname] or [Sp:Spellname]
- Added support for the Drag Ruler module to display move, sprint and fly distances. (but you also need to load the Hex Token Size Support module, due to an error with Drag Ruler)
- changed parameter order of /rem [otf] optionalusernames to match /sendmb
- Holding down CTRL (CMD on Macs) will make a roll BLIND
- System setting "SHIFT Click does a Blind roll for players, and a Self roll for GMs"
- Fixed broken "Apply All Damage To <Targeted Actor>" functionality
- Fixed Slam Calculator's always printing that the Target was knocked down, even if it was the Attacker who was knocked down.
- Added System setting to show 'saved' icon next to user created equipment and notes.

Release 0.9.0 - 4/22/2021

- rewrite of Modifier Bucket communication system, now commands are guaranteed to be sequential
- refactor Chat command parsing
- Added /if chat command ["Acrobatic Dodge"/if [S:Acrobatics] /r [+2 Acrobatics] /else [-2 Failed Acrobatics]\\/r [Dodge]]
- Added OtF [D:AttackName]. Roll the Damage for attack (similiar to [A:AttackName], which rolls the skill)
- Fixed GM Send now also transfers the OtF label (ex: "Acrobatic Dodge" from above)
- Fixed Initiative formula propagating to client VMs
- /tracker (/tr) now resets "damage trackers" to zero, instead of max
- Continued i18n work on chat processors
- /remote GM only command. Execute OtF on the remote client
- Press SHIFT key to make OtF rolls private
- Show Move/Flight Move checkbox in Editor

Release 0.8.23 - 4/13/2021

- Fixed Equipment editing when using The Furnace, because I guess they never thought people might use {{count}} in their own dialogs.
- Merged @Exxar's Damage Reduction: Injury Tolerance code into ADD
- Adjust ADD results to show +3 bonus to HT checks when damage is Ranged, 1/2D.
- Fixed drag and drop macros to be compatible with The Furnace
- Initial implementation of a Slam calculator. Access via the chat message '/slam'. There must be a selected character, and it will fill in the HP and Velocity fields based on that character's HP and Basic Speed fields. If the user has a targeted token, that character's HP will be automatically entered.
- Added i18n tags to most of modifier bucket popup. Just need folks to submit translations!
- Re-skinned the modifier bucket UI.
- Fixed the problem of some browsers causing the Modifier Bucket tooltip to close when selecting something from a dropdown menu.
- Allow any damage type to be applied to a resource tracker. (Resource must be named, have a unique alias, and "Use as Damage Tracker" is checked.)
- Disabled the Min/Max/Current fields from a Resource Tracker editor if opened from the Tracker Manager.
- New/Updated Resource Tracker templates no longer need a Foundry restart to take effect.
- /ev now affects player owned tokens on current scene (and not all Player Characters)
- Made mapped attributes (ex: 'will', 'per', 'vision', etc.) case insensitive
- Allow multi-line entries in QuickNotes
- Added Initiative system setting
- Added GURPS.findAdDisad(), and updated GURPS.findSkillSpell() and GURPS.findAttack() for script macros
- Fixed Explosion damage calculation.
- Added ability to override the text of the OtF buttons ["New Text" Dodge]
- Auto import when in Foundry Data (GCS export includes Portrait)

Release 0.8.22 - 3/31/2021

- Updated German/Deutsch translation
- Add dialog to resource tracker editors on actor's sheets to apply a template, edit the tracker, or remove the tracker.
- Bugfix for pi-, pi+, and pi++ damage types.
- Implemented drag-and-drop for OtFs on character sheets onto the macro bar.
- Drag and drop now works for any OTF on character sheet
- Added sanity check on Resource Tracker alias input.
- Added initial Russian/ÑÑÑÑÐºÐ¸Ð¹ translation (thanks to Discord user @Weirdy)!
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
- Fixed [A:Attack] where skill level includes "\*Costs 1FP"
- Added Drag and drop OtF from chat

Release 0.8.21 - 3/22/2021

- Fixed parse bug where roll has no damage type or comment [3d]
- Added German/Deutsch translation

Release 0.8.20 - 3/22/2021

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

Release 0.8.19 - 3/17/2021

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

Release 0.8.18 - 3/14/2021

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

Release 0.8.17 - 3/8/2021

- Bug fix for names/names containing '%'
- Bug fix for resource tracker mis-alignment (due to arrow)
- Bug fix for missing hitlocation internationalization
- Bug fixes for Navigation buttons
- Bug fix for ADD Shotgun DR
- Bug fix for GCS import individual melee and ranged notes
- /hp /fp now support dice roll /hp +1d

Release 0.8.16 - 3/6/2021

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

Release 0.8.15 - 2/17/2021

- Bug fix for 3D6 roll icon (at bottom of screen)
- Bug fix for costs, counts, weights that contain commas ","
- Bug fix for 17&18 always being a failure (even with very high skill)
- Updated GCA export to handle '&' in ad/disad/quirk/perk name
- Bug fix for drag and drop reordering in lists
- For GMs, display LastActor name above Modifier Bucket
- Allow full damage types, e.g. 'crush', 'cutting', etc.
- Bug fix for NPC bodyplan changes

Release 0.8.14 - 2/11/2021

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

Release 0.8.13 - 2/6/2021

- @Tratz engaged [R.K. Media](https://marketplace.roll20.net/browse/publisher/507/rk-media) to upgrade our icons.
- Allow mook parry to show up in tooltip alt
- Fixed Parry/Blook OtF for mooks
- Fixed more /chat handler bugs

Release 0.8.12 - 2/5/2021

- Bug fix for chat commands, e.g. "/r 3d6", etc.

Release 0.8.11 - 2/4/2021

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

Release 0.8.10 - 1/30/2021

- @Tratz equipment bug fix, portrait fix and logo fix!
- Bug fix for OtF formulas in Skills/Spells in containers

Release 0.8.9 - 1/29/2021

- Added individual die results to Roll Chat messages (e.g., "Rolled (3, 6, 1) = 10").
- Fixed GCA export to correctly export ranged innate attacks.
- Added Equipment hierarchy to GCA export
- Support GCS v4.27, export hierarchy for Ads/Disads, Skills, Spells and Notes
- Added Page Refs for Notes
- Added collapsible carets for Ads/Disads, Skills, Spells, Notes & Equipment
- Added drag and drop menu 'before' and 'in' for all lists so you can create containers
- Allow user created notes & equipment to survive import

Release 0.8.8 - 1/24/2021

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

Release 0.8.7 - 1/20/2021

- Bug fix for multiple PDF links (and GCA import failure)

Release 0.8.6 - 1/20/2021

- Yet more updates to Mook Generator stat block importer
- Support for OtF [Dodge+/-mod text] and [<mapped>+/-mod text] (Vision, Hearing, Fright Check, etc.)
- Fixed weight/cost sum import for GCA
- @Exxar's fix to CI
- Fixed "lost" Automatic Encumbrance system setting
- Support opening multiple PDF links "B101, MA105"

Release 0.8.5 - 1/17/2021

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

Release 0.8.4 - 1/5/2021

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

Release 0.8.3 - 12/22/2020

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

Release 0.8.2 - 12/14/2020

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

Release 0.8.1 - 12/6/2020

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

Release 0.8.0 - 11/27/2020

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

Release 0.7.0 - 11/18/2020

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

Release 0.6.5 - 11/9/2020

- Removed "+0" range modifiers
- Enabled Full/Combat view for Players
- Fixed font color to be more readable
- Major overhaul of the Modifier Bucket "tool tip"!!

Release 0.6.4 - 11/6/2020

- HP & FP editable, and Conditions change color.
- ACC and Bulk ranged modifiers work.
- Measuring Ruler automatically creates Range Modifier.
- Started work for Monster Hunters 2 range modifiers.
- Refactored dice rolling so that modifiers now add to damage.

Release 0.6.3 - 11/5/2020

- Hot toggle between "full" and "combat" character sheets
- template.json changes. You must delete all Actors created prior to v0.6.3
- imported Hit Location information
- tooltips for Hit Location equipment
- GM Mod push!

Release 0.6.2 - 11/4/2020

- Support for stackable modifiers (clicking [-1 for range] multiple times)
- Fixed display of desktop Modifier Bucket
- Added Modifier tooltip
- Added critical success/failure calculations
- Added SJG notifications, as per the SJG Online Policy

Release 0.6.1 - 11/3/2020

- Started User Guide and added README popup
- Imported skill points

Release 0.6.0 - 11/2/2020

- Imported Notes & Equipment
- Incorporated new "combat-focused" character sheet.
- Fixed import of GCA exports (using Fantasy Ground format).
- Made current FP and HP editable.
- Continuing work on editable entries.
- Reworked template.json to remove arrays (All characters prior to 0.6.0 must be deleted and reimported!)

Release 0.5.1 - 10/31/2020

- Due to overwhelming pressure (3 people), I did my best to fix the "jumpy" buttons that cause the page to constantly shift.

Release 0.5.0 - 10/30/2020

- Atropos fixed my persistance issue. Youtube demo made.

Release 0.4.0 - 10/28/2020

- Rollables and PDF (pagerefs) work

Release 0.3.0 - 10/27/2020

- Introduction of GCS character sheet

Release 0.2.0 - 10/25/2020

- Renamed system

Release 0.1.0 - 10/21/2020

- Started GCS Import

The material presented here is my original creation, intended for use with the [GURPS](http://www.sjgames.com/gurps) system from [Steve Jackson Games](ttp://www.sjgames.com). This material is not official and is not endorsed by Steve Jackson Games.

[GURPS](http://www.sjgames.com/gurps) is a trademark of Steve Jackson Games, and its rules and art are copyrighted by Steve Jackson Games. All rights are reserved by Steve Jackson Games. This game aid is the original creation of Chris Normand/Nose66 and is released for free distribution, and not for resale, under the permissions granted in the [Steve Jackson Games Online Policy](http://www.sjgames.com/general/online_policy.html)

This game system DOES NOT provide information contained in paid publications. It is only intended to allow people to play GURPS online using their GURPS books/PDFs.

Status icons for actors provided by [R.K. Media](https://marketplace.roll20.net/browse/publisher/507/rk-media) - check them out!
