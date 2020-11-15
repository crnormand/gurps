### [Guide on how to use GURPS 4e for Foundry VTT](https://docs.google.com/document/d/1NMBPt9KhA9aGG1_kZxyk8ncuOKhz9Z6o7vPS8JcjdWc/edit?usp=sharing)


## Current Release Version 0.6.5

This is what we are currently working on:
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
    - 3d6 on desktop
    - Started work on drag and drop damage!

**NOTE:   YOU MUST delete all of your actors, and Restart Foundry for the changes to take effect**

### History
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