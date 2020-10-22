# FoundryVTT-GURPS4e
Implmenting the GURPS 4e rules for Foundry VTT

TODO

- [ ] Complete import of GCS FG XML PC format.
Herein lies one of the big differences between the GURPS game systems.   This system only uses Items for physical items, and creates it own classes for things like skills, advantages, etc.

- [ ] Figure out how to implement different actor htmls.   Given that we have a GCS html output, I bet Rich would allow us to canibalize it for here.   The user could then select different HTMLs to use at different times.   A more compact version when trying to see the rest of the screen, or a larger version when inspecting their sheet.   Also, we could implement a version that looks like the book http://www.cox-thurmond.net/jim/jcsp, if people like that look.

- [ ] And of course, figure out the best way to implement rolling, etc.
	
- [ ] Enhance roll system to present human readable chat cards (ex: "Attempting {{Skill}}", with "pass/fail" 
Need the ability to pass in a target value so that it can determine if the roll passed or failed.   
NOTE:  This code may be duplicating Exxor's roll library from the gurps4e project.   However, since his code is obfucated, we may need to implement it ourselves

- [ ] Build "modifier bucket" system.   A user clicks or drags various modifiers to a bucket to create a final add/subtract from a roll, and then rolls the appropriate skill/attribute/etc.   The bucket should be able to display all of the individual modifiers that have been added, and allow for deletion.   

- [ ] It would be nice if the GM had access to all of the player's buckets (maybe in some kind of expandable view) so that they can pre-load the bucket with a modifier.
More later.

- [ ] Steal the range calculation code from the other system, and automatically add the modifier to the modifier bucket.   Maybe we can make it dependent on the roll.   I know we can detect ranged attacks, but we might not know if a particular skill is affected by range.   At least if we add it automatically, the user (or GM, if we can build that feature) can delete it from the bucket if it isn't necessary.

- [ ] Implement textual "on the fly" rolls.   GURPS is just too configurable to program everything.   Implement a system that scans various text outputs (like skill/spell/add/disad names, or notes, etc.) looking for a "roll syntax".   My FG implementation supports attribute rolls (ex: [ST], [PER-2], [ST26-1]), Self control rolls (ex: [CR:12]), Damage rolls (ex: [2d cut], [3d-1 pi-]) and Skill rolls (ex: [Stealth], [First Aid+2]).   And given that we have built the modifier bucket system, we could also add modifiers to the bucket (ex: [-2 in cover], [+4 Telepathic attack]).
   GCS export will automatically create self control roll text ([CR:15]), which fits into this nicely.    Very useful for “magic as powers” systems, where advantages are spells, but can be used anywhere.   A first aid skill can roll for healing (based on tech level), so it could include [1d6-3] in its name, or note.
