### Users Guide for [GURPS 4e game aid for Foundry VTT](https://bit.ly/2JaSlQd)

# Current Release Version 0.8.2
[If you like our work...](https://ko-fi.com/crnormand)

To install the latest release, use this manifest URL:   
[https://raw.githubusercontent.com/crnormand/gurps/release/system.json](https://raw.githubusercontent.com/crnormand/gurps/release/system.json)

[Getting started video](https://youtu.be/FUqtOkdyBCo)

## The 'main' branch is being actively developed... and it may break things.   
### If you are looking for the last stable release, use the manifest URL above.

This is what we are currently working on:
- 0.8.3
    - Direct roll of On-the-Fly formulas.  e.g. /r [Per] or /roll [3d-2 cr]
    - Parry & Block On-the-Fly formulas

### History
- 0.8.2
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

- 0.8.1
    - Basic Speed no longer truncates
    - Major upgrade to Apply Damage Dialog!
    - Allow "defense" to be rollable in Simple sheet
    - Simple sheet "Heart" now shows color based on HP condition
    - Add [Dodge] to On-the-Fly formulas
    - Users Guide link in Foundry.   Type "/help" or "!help" in chat
    - Current Encumbrance can be set on main/combat sheet.   Only current Dodge can be rolled.
    - Fixed Full/Combat sheet toggle
    - Warn on FG import
    - On-the-Fly can now parse "4d+1x2(0.5)" damage rolls
    - On-the-Fly can now create "blind" rolls.   Useful for GM to ask everyone to roll PER
    - Support for generic damage type "dmg"
    - Added calculation of additional hits for RoF/Rcl.
    - Mook Generator / NPC Sheet
    - Shift/Ctrl click Full View/Combat View opens Simplified and NPC/Mini sheets
    - Support [Fright Check], [Vision], [Hearing], [Touch], [Taste], [Smell] On-the-Fly rolls.
    - Right Click on Attack/Skill/Spell level & On-the-Fly formula to whisper to owner.
		
**NOTE: If you upgrade to v0.8.0, you MUST delete all of your actors and restart Foundry**
- 0.8.0
    - Enhanced Drag and Drop Damage Dialog.
    - Simplified (convention one-shot) character sheet
    - Enhanced On-the-Fly parsing for Skills, Spells and Attacks (melee & ranged)
    - Apply On-the-Fly parsing to the chat.   Now roll tables can include OtF formulas.
    - More explicit warning if a user tries to import a GCS file directly.
    - Import error notification (mainly "&")
    - Added support for Combined or Separate Basic Set PDFs.
    - Drag and drop to move equipment between lists or in containers
    - Foundry specific GCA export script.    
    - NOTE:   The Fantasy Grounds export is no longer supported.   
    - - Either use the "Foundy VTT" output template for GCS, or
    - - The "export to Foundry VTT.gce" script for GCA	
    
**NOTE: If you upgrade to v0.7.0, YOU MUST delete all of your actors, and Restart Foundry**

- 0.7.0
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
    
- 0.6.5
    - Removed "+0" range modifiers
    - Enabled Full/Combat view for Players
    - Fixed font color to be more readable
    - Major overhaul of the Modifier Bucket "tool tip"!!
- 0.6.4
    - HP & FP editable, and Conditions change color.
    - ACC and Bulk ranged modifiers work.
    - Measuring Ruler automatically creates Range Modifier.
    - Started work for Monster Hunters 2 range modifiers.
    - Refactored dice rolling so that modifiers now add to damage.
- 0.6.3
    - Hot toggle between "full" and "combat" character sheets
    - template.json changes.   You must delete all Actors created prior to v0.6.3
    - imported Hit Location information
    - tooltips for Hit Location equipment
    - GM Mod push!
- 0.6.2
    - Support for stackable modifiers (clicking [-1 for range] multiple times)
    - Fixed display of desktop Modifier Bucket
    - Added Modifier tooltip
    - Added critical success/failure calculations
    - Added SJG notifications, as per the SJG Online Policy
- 0.6.1
    - Started User Guide and added README popup
    - Imported skill points
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

The material presented here is my original creation, intended for use with the [GURPS](http://www.sjgames.com/gurps) system from [Steve Jackson Games](ttp://www.sjgames.com). This material is not official and is not endorsed by Steve Jackson Games.

[GURPS](http://www.sjgames.com/gurps) is a trademark of Steve Jackson Games, and its rules and art are copyrighted by Steve Jackson Games. All rights are reserved by Steve Jackson Games. This game aid is the original creation of Chris Normand/Nose66 and is released for free distribution, and not for resale, under the permissions granted in the [Steve Jackson Games Online Policy](http://www.sjgames.com/general/online_policy.html)

This game system DOES NOT provide information contained in paid publications.   It is only intended to allow people to play GURPS online using their GURPS books/PDFs.
