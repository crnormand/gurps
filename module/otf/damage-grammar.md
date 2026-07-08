# Damage Grammar

The following describes the grammar of a damage term in GURPS and GGA.

```
damage = dieroll, [ [ space ] divisor ], space, type, [ space, extended-type ] [ [ space ], cost-phrase ] ;

dieRoll = number, “0”, [ modifier ], [ multiplier ] ;

divisor = "(", decimal, ")" ;

type = “aff” | “burn” | “cor” | “cr” | “cut” | “fat” | “imp” | “kb” | “pi-“ | “pi” | “pi+” | “pi++” | “spec.” | “tox” ;

extended-type = “ex” ;

cost-phrase = cost-flag, space, [ positive-integer ], [ space ],  pool ;

cost-flag = “/“ | “*per” | “*cost” | “\*costs” ;

pool = { character excluding space } ;

modifier = sign, number ;

multiplier = times, number ;

times = "\*" | “x” | “×” ;

sign = "+" | “-“ | “-“ | “–“ ;

decimal = zero | positive-integer, [ ".", { digit } ] ;

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
```

## Grammar Conformance

This table is a quick checklist to keep grammar, parser behavior, and tests in sync.

| Grammar Rule                                    | Implemented In Parser                | Covered By Tests                                          | Notes                                                                                              |
| ----------------------------------------------- | ------------------------------------ | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| dieRoll with optional modifier and multiplier   | Yes ([parser](damage-parser.ts#L44)) | Yes ([tests](../../test/damage-parser.test.ts#L5))        | Supports Nd and NdS forms, such as 2d and 3d6.                                                     |
| divisor with decimal inside parentheses         | Yes ([parser](damage-parser.ts#L42)) | Yes ([tests](../../test/damage-parser.test.ts#L21))       | Divisor is parsed only in the expected position before damage type.                                |
| type alternatives                               | Yes ([parser](damage-parser.ts#L43)) | Yes ([tests](../../test/damage-parser.test.ts#L89))       | Supported types include aff, burn, cor, cr, cut, fat, imp, kb, pi-, pi, pi+, pi++, spec., and tox. |
| extended-type ex                                | Yes ([parser](damage-parser.ts#L50)) | Yes ([tests](../../test/damage-parser.test.ts#L21))       | Optional and limited to ex.                                                                        |
| cost-phrase with required space after cost-flag | Yes ([parser](damage-parser.ts#L71)) | Yes ([tests](../../test/damage-parser.test.ts#L106))      | Matches the updated grammar rule requiring a space after the flag.                                 |
| cost-flag alternatives                          | Yes ([parser](damage-parser.ts#L62)) | Yes ([tests](../../test/damage-parser.test.ts#L52))       | Supports slash, star-per, star-cost, and star-costs forms.                                         |
| pool as non-space token                         | Yes ([parser](damage-parser.ts#L72)) | Yes ([tests](../../test/damage-parser.test.ts#L43))       | Pool is parsed as a token with no spaces.                                                          |
| modifier sign plus or minus variants            | Yes ([parser](damage-parser.ts#L53)) | Yes ([tests](../../test/damage-parser.test.ts#L35))       | Supports plus, hyphen-minus, en dash, and unicode minus.                                           |
| multiplier operator alternatives                | Yes ([parser](damage-parser.ts#L48)) | Yes ([tests](../../test/damage-parser.test.ts#L21))       | Supports star, x, and multiplication sign.                                                         |
| decimal in divisor                              | Yes ([parser](damage-parser.ts#L42)) | Partially ([tests](../../test/damage-parser.test.ts#L98)) | Accepts zero and positive decimal forms used by divisor parsing.                                   |

### Conformance Scope

This section documents behavior of the dedicated damage parser and its unit tests. It does not automatically describe all legacy parsing behavior in older OTF parsing paths.
