# If Chat Command Grammar

The following describes the valid EBNF grammar of the `/if` chat command in GGA.

A `Block` contains either:

- An OTF (`[otf]`) to execute
- A Chat command (`/command arguments...`) to execute, including other `/if` commands
- Narrative text to display in the chat

Blocks are optionally surrounded by curly braces (`{[OTF]}`, `{/chat command}`, `{some text to display}`).

There are two variants of the `/if` chat command:

## Simple IF statement

- Optional negation ("!") -- Reverses the "truthiness" of the condition
- Condition - an OTF (`[OTF]`) that evaluates to truthy or falsy
- Then `Block`
- Optional "/else"
- Else `Block`

## Outcome IF statement

- Condition (negation is not allowed)
- Branches: Each branch is a `Block` surrounded by braces ("{}") and optionally prefixed. Only certain combinations of Blocks with and without prefixes are valid. Branches should always appear in order of [`crit-success`, `success`, `failure`, `crit-failure`]. The first branch must be prefixed.
  - Crit Success - Must be prefixed with `cs:`
  - Success:
    - Must be prefixed with `s:` OR
    - Must have no prefix AND be the first non-prefixed branch
  - Failure:
    - Must be prefixed with `f:` OR
    - Must be the second non-prefixed branch OR
    - Must have no prefix AND there is a prefixed success-clause.
  - Crit Failure - Must be prefixed with `cf:`
- Valid Examples:
  - /if [condition] cs:{crit-success}
  - /if [condition] cs:{crit-success} {success}
  - /if [condition] cs:{crit-success} s:{success}
  - /if [condition] cs:{crit-success} {success} {failure}
  - /if [condition] cs:{crit-success} s:{success} f:{failure}
  - /if [condition] cs:{crit-success} {success} f:{failure}
  - /if [condition] cs:{crit-success} s:{success} {failure}
  - /if [condition] cs:{crit-success} f:{failure}
  - /if [condition] cs:{crit-success} {success} cf:{crit-failure}
  - /if [condition] cs:{crit-success} s:{success} cf:{crit-failure}
  - /if [condition] cs:{crit-success} {success} {failure} cf:{crit-failure}
  - /if [condition] cs:{crit-success} s:{success} f:{failure} cf:{crit-failure}
  - /if [condition] cs:{crit-success} {success} f:{failure} cf:{crit-failure}
  - /if [condition] cs:{crit-success} s:{success} {failure} cf:{crit-failure}
  - /if [condition] cs:{crit-success} f:{failure} cf:{crit-failure}
  - /if [condition] cs:{crit-success} cf:{crit-failure}
  - /if [condition] s:{success}
  - /if [condition] s:{success} {failure}
  - /if [condition] s:{success} f:{failure}
  - /if [condition] s:{success} {failure} cf:{crit-failure}
  - /if [condition] s:{success} f:{failure} cf:{crit-failure}
  - /if [condition] f:{failure}
  - /if [condition] f:{failure} cf:{crit-failure}
  - /if [condition] cf:{crit-failure}
- Invalid:
  - /if [condition] {success} f:{failure} \*\* First block must have a prefix
  - /if [condition] cf:{crit-failure} {success} f:{failure} \*\* Wrong ordering
  - /if [condition] {success} cf:{crit-failure} f:{failure} \*\* Wrong ordering
  - /if [condition] {success} f:{failure} \*\* First block must have a prefix

```
if-statement = simple-if-statement | outcome-if-statement ;

simple-if-statement = "/if", white-space, [ negation ], condition, white-space, then-action,
             [ white-space, [ "/else", white-space ], else-action ] ;

negation = "!", [ white-space ]
(* negation inverts the boolean result of the condition: true becomes
    false, false becomes true. Only valid in simple-if-statement *)

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
    else-action is the result *)

action = otf-bracket | block | chat-text ;
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

(* ==================== Outcome IF statement ==================== *)

outcome-if-statement = "/if", white-space, condition, white-space, outcome-branches ;
(* selects at most one branch to execute, based on the condition's
    boolean result and the crit flags it may have set:
      condition true  & isCritSuccess = true  -> cs: (falls back to success (s:) if cs: absent)
      condition true  & isCritSuccess = false -> s:
      condition false & isCritFailure = true  -> cf: (falls back to failure (f:) if cf: absent)
      condition false & isCritFailure = false -> f:
    negation is not permitted in this form *)

outcome-branches = cs-led-branches | non-cs-branches ;

(* ---- branches beginning with an explicit crit-success clause ---- *)
cs-led-branches = cs-clause,
                   [ white-space, cs-middle ],
                   [ white-space, crit-failure-clause ] ;

cs-middle = success-and-optional-failure
          | explicit-failure-part ;
(* after cs:, a bare block is unambiguous: it must be the success
    block, since it's the first unprefixed block seen. A second bare
    block, if present, must be the failure block. f: may also stand
    alone here with no success block at all. *)

(* ---- branches that do NOT begin with cs: ---- *)
non-cs-branches = explicit-success-branches
                 | explicit-failure-part, [ white-space, crit-failure-clause ]
                 | crit-failure-clause ;
(* the leading branch overall must always be explicitly prefixed, so
    a bare block can never be the first branch of the statement *)

explicit-success-branches = explicit-success-clause,
                   [ white-space, failure-part ],
                   [ white-space, crit-failure-clause ] ;
(* failure-part here may still be bare: an explicit s: immediately
    before it is enough to disambiguate an unprefixed block as
    failure *)

success-and-optional-failure = success-part, [ white-space, failure-part ] ;

success-part = outcome-block | explicit-success-clause ;
failure-part = outcome-block | explicit-failure-part ;

cs-clause = "cs:", outcome-block ;
explicit-success-clause = "s:", outcome-block ;
explicit-failure-part = "f:", outcome-block ;
crit-failure-clause = "cf:", outcome-block ;
(* cs: and cf: are always explicit; s: and f: may be written with or
    without their label, since their position between cs: and cf:
    already disambiguates them *)

outcome-block = "{", outcome-block-body, "}" ;

outcome-block-body = block-body | chat-text ;
(* every branch block (cs:, s:, f:, cf:, and any bare success/failure
    block), unlike then/else blocks, may also contain plain narrative
    text with no OtF button or nested /if at all, e.g.
    {A solid hit lands home!} *)

white-space = space, { space } ;
```
