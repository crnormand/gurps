# GURPS 4e game system for Foundry VTT
Implementing the Generic Universal Roleplaying System 4e rules for Foundry VTT

Version 0.5.0

Design philosophy: Use GCS (or GCA) to create and modify the characters, and use FVTT for rolling.  Some (but not a lot) of editing might be possible.

Some of the cool/interesting features I would like to implement/prototype (in no particular order, trust me ;-) ) are below.   There is a whole lot of stuff here... and we certainly don't have to implement all (or even a lot) of it.   

A robust domain model.   I am starting with the GCS domain model for characters (and npcs).   As such, I am implementing one type of import (from the GCS FG XML export).  But there may be other models (or simplified models).

The ability to edit/add to a character. While a GCS/GCA import can provide most of the data, it might not provide all (especially if the GM has homebrewed anything).   If so, we need to have the ability to add/edit skills/spells/ads/disads/attacks/etc.   It doesn't have to be flashy, since I am currently assuming the bulk of the data will come from an outside source (GCS/GCA).   The "On the Fly" rolling system can help here.

We probably need to include some kinf of CSS parser like 'less', because the CSS is just getting nasty.

I would like to add the ability for the GM to see each player's Modifier bucket/stack and be able to add/delete from it.   This way a GM could pre-load a player's bucket and the player would just have to make the roll.  I see this as VERY useful for new players.   

I would like to be able to automatically apply various modifiers based on the type of roll being made.    For example, if a character takes damage this round (and does not have the "High Pain Threshold" advantage), they should get the "Shock" status, and they are at a minus for any IQ/DX rolls that they make next round.

Which implies that characters (and maybe items or even locations) should be able to have a Status applied to them.   The Status would have a description, a duration (e.g. X number of rounds, infinite, until some event, etc.), a game effect (e.g. -2 to all DX skills, +2 to Hit with a melee weapon, etc.) and possibly a visible effect (using Foundry's burgeoning visual effects library).   

Create an easy way for the GM (or some kind of automation) to apply Statuses to characters/items/locations.   Using the example above, if a player's character takes damage and suffers "Shock", the "Shock" affect is automatically applied to that character and will automatically effect that character's IQ/DX rolls for the next round.
NOTE:  We are skirting the edge of SJG's rules.   They have a history of not wanting the game to be "too" automated.  If this is too much automation, we could pop up a dialog for the GM with the various Statuses to be applied.   The GM can then decide if they want to apply them or not.

Allow rolls to define a follow-on event (where the event could be a Status or a Modifier or another roll).  For example, the player attempts an "Acrobatic Dodge", and the success or failure of that roll add a +/-2 Modifier to the player's Modifier bucket/stack to be applied to the next Dodge roll.   This is a generalization of the previous example (of automatically applying Statuses based on the result of a roll). 

Create multiple "character sheets".   The player may want to use a compact "combat" sheet while in combat, and a more open "role playing" sheet (e.g. GCS.html) at other times.   Also, the player may prefer the look of different character sheets.  Some may prefer the old-school GURPS handbook layout, some may prefer the current GCS layout, and others may prefer something else.   I would like it if they could quickly switch between any of them.

Being able to apply various modifiers based on the scene location or effect.   For example, if a scene contains an "oil spill", the GM could define a "-2 DX skill" while the player's token is in the spill, or if the player's token is in the visual effect of the poison gas cloud, it would apply a "Poisoned" status to their character.

Allow Modifiers to have multiple triggers.   A "Retreat" maneuver gives "+3 Dodge/+1 Block/+1 Parry (+3 Parry w/Boxing, Judo, Karate or Fencing weapon) vs 1 Melee attack/round".  This modifier would occur if any of those rolls were attempted, and then go away.  Of course this would require that Modifiers and Rolls have some way to "match up", like a category, for example.    This sounds really nice... but upon more thought, could get very very messy.   I don't know if I want to touch it yet.

Enhance modifiers to have follow-on actions.   For example, a player wants to add the extra effort "Mighty Blow" to his attack.  If damage is rolled, the modifier is applied to the damage AND the 1 FP cost is subtracted from the character.   Note, the modifier would only affect damage rolls... if the player applied the "Mightly Blow" modifier and then rolled to hit, the modifier could exempt itself from the roll and only apply itself if a damage is rolled.   It would also have a 1 combat round duration.   If the user applied "Mightly Blow", but then decided to do something else and their turn ended, the modifier should remove itself (so as to not mess up the next round).   Again, this would require a way to match up a Roll with a Modifier.   We might be able to do it for some things (like combat rolls or skills rolls... again, more thought required).

The follow-on actions could affect other actors.   If the player chooses to make a "Deceptive Attack", we could apply a Status of "-X to active defense roll" to the opponent.  Which would automatically be applied when the owner of that opponent makes the active defense roll.  Note: Officially, the opponent is only "-X to defenses" when being attacked by that particular character.  We would require "targeting" to make that work.

Currently, selecting the target is not a requirement for any of the other features of this system to work.   The GM knows who is attacking whom, etc.   However, making the player "target" their attacks does offer the ability to do additional things, like applying Statuses or visual effects (like fireball flame) directly to the opponent.    Fortunately, Foundry makes this pretty easy to do.  The player just needs to select their own token (which should already be selected), right click on the target icon, and then left click on the "target" symbol that appears on the bottom left.   That token will then get a "targeted" halo effect so everyone can see which token is being targeted.   And we could draw a line from the attacker to the target with the GURPS range modifier displayed.   This could also automatically add a Modifier for ranged attacks to the Modifier stack.

The "Charge Attack" maneuver include a new kind of Modifier.   It would apply the -4 to hit, but then apply a MAX:9 constraint as well.

Posture could be applied as a kind of Status to a character, which could automatically apply modifiers to attack and defense rolls.  These kind of modifiers may have a permanent duration, until the Status is changed/lifted.   

Give the player/GM the ability to override any modifier in their (or everyone's) stack.   For example, a character is assigned a Status of "Unstable" because they are standing on ice.   The GM decides that for "reasons", this particular attack is not affected by that Status.   The GM (or the player) could go to their Modifier stack and delete (or disable) that modifier for the next roll.   I think this functionality is necessary as we add more and more automated modifiers.  The GM might decide (for whatever reason), that they don't want to follow the RAW, which is certainly in their prerogative.

Provide GURPS automation options.   For anything we do that automates some kind of step... we should offer the ability to turn it off (if the GM doesn't want to use it).   A new GM may not want to play with "Shock", so we should offer the ability to turn off the automatic application of the "Shock" status to opponents.

Create a "Wait" status.   If a player decides to perform the "Wait" maneuver, they could apply the "Wait" status to their character.   This will open a dialog on the GM's screen showing that a player is "waiting".   If the GM decides that the player's "trigger" occurred, they could press the "Execute" button for that player.   This would interrupt the current token on the combat tracker, and set the waiting token to be active, and when the "Wait" maneuver is finished (by the player or GM clicking the "Next Turn" button), then the interrupted token would become active again.

Build a combat maneuvers action view/dialog.  I am not certain how useful this might be.  We certainly can't automate everything, but it could offer a quick and centralized location for users to select/drag-drop/click on various Modifiers or Statuses or Maneuvers.   We could show certain maneuvers that have follow-on consequences, like "Retreat" or "Acrobatic Dodge", or certain Extra Efforts (e.g. "Mighty Blow", "Feverish Defense") which add a Modifier at the cost of 1 FP.   For the GM, we could build in some of the combat formulas (e.g. "Knockback", "Slam attack and damage").

When damage is applied to a token in the combat tracker (by the GM), we could bring up a dialog that shows various attack/defense options to calculate damage.   For example, the player rolls 10 points of cutting damage, and the GM grabs the roll from the chat window and drags it to the Goblin in the combat tracker.   The dialog could pop up and allow the GM to pick the hit location (or default to Torso) and then apply the damage modifiers based on the hit location and damage type.   It could calculate Knockback and report it.   It could apply various Statuses ("Shock", "Stunned") and even informational Statuses like "Lost use of left arm due to major wound" (this wouldn't have any direct effects to rolls, but it would remind the player and the GM that the arm was gone ;-).

Support of the various types of hit location charts.   For example, the "Grand Unified Hit Locations Table v2.4" https://goo.gl/UBWilo , taken from GURPS Basic Set: Campaigns, GURPS Bio-Tech , GURPS Horror, GURPS Low-Tech, GURPS Low-Tech Instant Armor, GURPS Loadouts: Low-Tech Armor, GURPS Martial Arts, and GURPS Dungeon Fantasy Treasure Tables 1.  The owner of the other gurps project uses this table for all of their damage (and has even talked to Rich about trying to include it in GCS).


##Versions
0.3.0 - Introduction of GCS character sheet
0.4.0 - Rollables and PDF (pagerefs) work
0.5.0 - Atropos fixed my persistance issue.   Youtube demo made.
