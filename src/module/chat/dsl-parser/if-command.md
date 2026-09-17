# If Chat Command Grammar

The following describes the valid EBNF grammar of the `/if` chat command in GGA.

```
if-statement = simple-if-statement | outcome-if-statement ;

simple-if-statement = "/if", white-space, [ negation ], condition, white-space,
            then-action, [ white-space, [ "/else", white-space ], else-action ] ;
(* simple-if-statement results in then-action if condition is true,
    else-action if condition is false
    negation, if present, inverts the condition's true/false result before
    selection is made *)

outcome-if-statement = "/if", white-space, [ negation ], condition, white-space,
             crit-success-clause, white-space,
             success-clause, white-space,
             failure-clause, white-space,
             crit-failure-clause ;
(* selects exactly one of the four clauses based on the condition's
    boolean result and the crit flags it may have set:
      condition true  & GURPS.lastTargetedRoll.isCritSuccess = true  -> cs:
      condition true  & GURPS.lastTargetedRoll.isCritSuccess = false -> s:
      condition false & GURPS.lastTargetedRoll.isCritFailure = true  -> cf:
      condition false & GURPS.lastTargetedRoll.isCritFailure = false -> f:
    negation, if present, inverts the condition's true/false result
    before this selection is made, same as in simple-if-statement *)

crit-success-clause = "cs:", block ;
success-clause = [ "s:" ], block ;
failure-clause = [ "f:" ], block ;
crit-failure-clause = "cf:", block ;
(* cs: and cf: are always explicit; s: and f: may be written with or
    without their label, since their position between cs: and cf:
    already disambiguates them *)

negation = "!", [ white-space ]
(* negation inverts the boolean result of the condition: true becomes
    false, false becomes true *)

condition = existence-check | otf-bracket ;
(* when the condition is executed it must return true or false and may
    optionally set GURPS.lastTargetedRoll.isCritSuccess or
    GURPS.lastTargetedRoll.isCritFailure to true *)

existence-check = "[", "?", list-code, ":", target-name, "]" ;

list-code = "A" | "AD" | "AT" | "M" | "R" | "S" | "SK" | "SP" ;
(* case-insensitive.
   A  = Advantages and Attacks (Melee + Ranged)
   AD = Advantages
   AT = Attacks (Melee + Ranged)
   M  = Melee
   R  = Ranged
   S  = Skills and Spells
   SK = Skills
   SP = Spells
   Longest match first: "AD"/"AT"/"SK"/"SP" before "A"/"S". *)

target-name = character excluding "]", { character excluding "]" } ;
(* prefix-matched against the item's name in the indicated list(s) *)

then-action = action ;
(* if the condition (possibly inverted by the negation) is true,
    then-action is the result *)

else-action = action ;
(* if the condition (possibly inverted by the negation) is false,
    then-action is the result *)

action = otf-bracket | block | chat-command | chat-text ;
(* the result of executing an /if command (if-statement) should always
    be an action: either an OTF command, chat command, or chat text *)

block = "{", block-body, "}" ;

block-body = if-command
           | otf-bracket, { { space }, otf-bracket } ;
(* a block is either a single nested /if, or one-or-more OtF buttons
   run in sequence *)

otf-bracket = "[", [ label, white-space ], otf-body, "]" ;
(* otf-body is any valid On-the-Fly formula body — an attribute,
   skill/spell/attack, dodge/parry/block, damage-roll, or modifier
   formula as defined in the broader On-the-Fly grammar — and may
   itself be an if-command *)

chat-command = "/", non-whitepace-character, {non-whitespace-character}, non-else-string

non-whitepace-character = { character - white-space }
(* any characters that does not include whitepace *)

non-else-string = { character - "/else" }
(* any sequence of characters that does not include "/else" *)

white-space = space, { space } ;
```
