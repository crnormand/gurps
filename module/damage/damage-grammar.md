# Damage Grammar

The following describes the grammar of a damage term in GURPS and GGA.

```
damage-term = damage-roll, white-space, type, [ white-space, extended-type ], [ { space }, cost-phrase ], [ {space}, margin ], [ { space }, hitlocation ] ;

damage-roll = [ "+" ], dieroll, [ { space }, divisor ] ;

dieRoll = damage-roll, [ { space }, modifier ], [ { space }, multiplier ], [ "!" ]
          | positive-integer, [ multiplier ]
          ;

damage-roll = direct-roll | derived-roll ;

direct-roll = positive-integer, “d”, [ positive-integer ] ;

derived-roll = "sw" | "swing" | "SW" | "SWING" | "thr" | "THR" | "thrust" | "TRUST" ;

divisor = "(", decimal, ")" ;

type = identifier ;

extended-type = identifier ;

cost-phrase = cost-flag, { space }, [ positive-integer ], { space },  pool ;

margin = "+@margin"

hitlocation = "@", character excluding space, { character excluding space } ;

cost-flag = “/“ | “*per” | “*cost” | “*costs” ;

pool = { character excluding space } ;

modifier = sign, positive-integer ;

multiplier = times, decimal ;

times = "\*" | “x” | “×” ;

sign = "+" | “-“ | “-“ | “–“ ;

white-space = space, { space } ;

decimal = positive-integer, [ ".", digit, { digit } ]
          | zero, ".", digit, { digit }
          ;

zero = "0" ;

positive-integer = digit excluding zero, { digit } ;

digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" ;

letter = "A" | "B" | "C" | "D" | "E" | "F" | "G"
| "H" | "I" | "J" | "K" | "L" | "M" | "N"
| "O" | "P" | "Q" | "R" | "S" | "T" | "U"
| "V" | "W" | "X" | "Y" | "Z" | "a" | "b"
| "c" | "d" | "e" | "f" | "g" | "h" | "i"
| "j" | "k" | "l" | "m" | "n" | "o" | "p"
| "q" | "r" | "s" | "t" | "u" | "v" | "w"
| "x" | "y" | "z" ;

space = " “, { “ “ }

symbol = "[" | "]" | "{" | "}" | "(" | ")" | "<" | ">"
| "'" | '"' | "=" | "|" | "." | "," | ";" | "-"
| "+" | "\*" | "?" | "\n" | "\t" | "\r" | "\f" | "\b" ;

character = letter | digit | symbol | "\_" | " " ;

identifier-character = letter | digit | "\_" | "-"

identifier = letter, { identifier-character }
```

## Grammar Conformance

This table is a quick checklist to keep grammar, parser behavior, and tests in sync.

| Grammar Rule                                    | Implemented In Parser | Covered By Tests | Notes                                                                                                                                            |
| ----------------------------------------------- | --------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| dieRoll with optional modifier, multiplier, !   | Yes                   | Yes              | Supports +direct or +derived damage-roll forms with optional trailing !, plus scalar positive-integer with optional multiplier/divisor.          |
| damage-roll direct and derived terms            | Yes                   | Yes              | Supports direct Nd with optional sides (NdS), where d6 normalizes to sides=null, and derived sw/swing/thr/thrust aliases (normalized to sw/thr). |
| divisor with decimal inside parentheses         | Yes                   | Yes              | Divisor is parsed in the expected position before damage type, with optional preceding space.                                                    |
| type identifier                                 | Yes                   | Yes              | Type is parsed as an identifier token and canonicalized to lowercase.                                                                            |
| extended-type identifier                        | Yes                   | Yes              | Extended type is optional and parsed as an identifier token.                                                                                     |
| cost-phrase spacing around cost-flag and amount | Yes                   | Yes              | Supports zero or more spaces after the flag and before pool (for example /2FP, / 2FP, *costs3HP, *costs 3 HP).                                   |
| cost-flag alternatives                          | Yes                   | Yes              | Supports slash, star-per, star-cost, and star-costs forms.                                                                                       |
| pool as non-space token                         | Yes                   | Yes              | Pool is parsed as a token with no spaces.                                                                                                        |
| margin token `+@margin`                         | Yes                   | Yes              | When present, parser output sets `addMargin=true`; otherwise `addMargin=false`.                                                                  |
| modifier sign plus or minus variants            | Yes                   | Yes              | Supports plus, hyphen-minus, en dash, and unicode minus.                                                                                         |
| multiplier operator alternatives                | Yes                   | Yes              | Supports star, x, and multiplication sign with decimal multiplier values.                                                                        |
| decimal in divisor                              | Yes                   | Yes              | Accepts positive decimals and zero-prefixed decimals (for example 0.5), but not plain 0.                                                         |

### Conformance Scope

This section documents behavior of the dedicated damage parser and its unit tests. It does not automatically describe all legacy parsing behavior in older OTF parsing paths.
