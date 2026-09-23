# If Chat Command

Use this command to select different outcomes based on the success, or degree of success, of an OTF.

## Description

There are two variants of the `/if` chat command: Simple and Outcome. Both resolve to a single **Block** based on success/failure (Simple) or degree of success/failure (Outcome). Use the block to specify the action you want the system (GGA) to take for the appropriate outcome.

A **Block** contains either:

- An OTF (`[otf]`) to execute
- A Chat command (`/command arguments...`) to execute, including other `/if` commands
- Narrative text to display in the chat

### Simple IF statement

#### Format

- "/if"
- Optional negation ("!") -- Reverses the "truthiness" of the condition
- Condition - an OTF (`[OTF]`) that evaluates to truthy or falsy
- Then `Block`
- Optional "/else"
- Else `Block`

##### Examples

`/if [truthy-OTF] <then-Block> /else ?<else-Block>`
`/if [truthy-OTF] <then-Block> ?<else-Block>`
`/if [truthy-OTF] {<then-Block>} {<else-Block>}`
`/if ! [truthy-OTF] <then-Block> /else ?<else-Block>`
`/if ! [truthy-OTF] <then-Block> ?<else-Block>`
`/if ! [truthy-OTF] {<then-Block>} {<else-Block>}`

A "truthy-OTF" must be an OTF that returns success or failure of some kind such as an "Existance Check" (e.g., `[?Ad:Fearlessness]`) or an Attribute, Skill, Spell, Attack, or self-control roll.

If a "!" appears before a truthy-OTF, it reverses the result: success becomes failure, failure becomes success.

### Outcome IF statement

#### Format

- "/if"
- (negation is not allowed)
- Condition - an OTF (`[OTF]`) that is resolved via a GURPS success roll (3d6 with appropriate Critical Success and Critical Failure thresholds).
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

`/if [roll-OTF] cs:{<crit-success-Block>} s:{<success-Block>} f:{<fail-Block>} cf:{<crit-fail-Block>}`
`/if [roll-OTF] cs:{<crit-success-Block>} {<success-Block>} {<fail-Block>} cf:{<crit-fail-Block>}`

A "roll-OTF" must be an OTF that requires a GURPS success roll to be made, such as an Attribute, Skill, Spell, Attack, or self-control roll.

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

## Grammar

The following describes the valid EBNF grammar of the `/if` chat command in GGA.

```
if-statement = simple-if-statement | outcome-if-statement ;

simple-if-statement = "/if", white-space, [ negation ], condition, white-space, then-action,
             [ white-space, [ "/else", white-space ], else-action ] ;

negation = "!" ;

condition = "[", opaque-text, "]" ;
(* opaque-text is never interpreted further -- any character excluding
    the closing delimiter *)

then-action = action ;
else-action = action ;

action = if-statement
       | "[", opaque-text, "]"
       | "{", ( if-statement | opaque-text ), "}"
       | opaque-text ;
(* a then/else action is either a nested /if, or opaque text -- whether
    that text came bracketed, braced, or bare makes no structural
    difference once parsed *)

(* ==================== Outcome IF statement ==================== *)

outcome-if-statement = "/if", white-space, condition, white-space,
    [ "cs:", outcome-clause ],
    [ white-space, "s:", outcome-clause ],
    [ white-space, "f:", outcome-clause ],
    [ white-space, "cf:", outcome-clause ] ;
(* at least one clause must be present (this is what disambiguates an
    outcome-if-statement from a simple-if-statement to begin with); when
    present, clauses must appear in this fixed order. After the first labeled
    clause, the success/failure clauses may omit the "s:"/"f:" label. *)

outcome-clause = "{", ( if-statement | opaque-text ), "}" ;
```
