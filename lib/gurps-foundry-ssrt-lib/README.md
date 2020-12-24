# GURPS Foundry SSRT Library

A library for use in Foundry VTT modules and systems providing SSRT lookup functionality.

## How to use
The class representing SSRT within this library is exposed as an ES6 module. You will need to import it as such in your code.

### I use npm and Webpack or other similar tools
Just install the library with npm:
```
npm install git+https://gitlab.com/gurps-foundry/ssrt-lib.git#1.0.0
```
and you're good to go (don't forget to exchange 1.0.0 for whichever version of the library you wish to use)! You can import it in your code with for example:
```
import SSRT from "gurps-foundry-ssrt-lib/src/js/SSRT";
```

### I copy third-party libraries I need into my source tree
Just copy the contents of the `src/js` folder somewhere in your source tree and use relative path imports. For example, if your source tree looks like this:
```
libraries
    some_lib
    some_other_lib
main.js
module.json
```
You could copy the contents of `src/js` like this:
```
libraries
    some_lib
    some_other_lib
    gurps_foundry_ssrt_lib
        SSRT.js
        ...
main.js
module.json
```
In order to use the SSRT class in your `main.js` file, you'd need to import it like this:
```
import SSRT from "./libraries/gurps_foundry_roll_lib/SSRT";
```