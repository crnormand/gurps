# EBNF Syntax for On-The_Fly Formulas

## Skill-Spell

```
input         := phrase ("|" phrase)\*

phrase        := type ":" name modifier? based? costs? description?

type          := "S" | "Sk" | "Sp" (case-insensitive)

name          := quoted | word

quoted        := '"' (escaped | ~'"')_ '"'
               | "'" (escaped | ~"'")_ "'"

word          := [^\s+|\-*()]+

modifier      := ("+" | "-") (number | "@margin")

based         := "(" "Based:" value ")"

costs         := "\*" ws? ("per" | "costs") ws number text

description   := text (no '|')

remainder     := "|" phrase...
```
