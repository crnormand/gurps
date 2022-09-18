# GURPS Character Sheet Game Aid for FoundryVTT

This system aims to aid GMs and players in playing on FoundryVTT using the GURPS system.
The system is closely tied with the [GURPS Character Sheet by Richard Wilkes].

## Installation

The system is currently under early development and its installation and use in play is not recommended.

## Development

To Do...

### Prerequisites

In order to build this system, recent versions of `node` and `npm` are
required. Most likely, using `yarn` also works, but only `npm` is officially
supported. We recommend using the latest lts version of `node`. If you use `nvm`
to manage your `node` versions, you can simply run

```
nvm install
```

in the project's root directory.

You also need to install the project's dependencies. To do so, run

```
npm install
```

### Building

You can build the project by running

```
npm run build
```

Alternatively, you can run

```
npm run build:watch
```

to watch for changes and automatically build as necessary.

### Linking the built project to Foundry VTT

In order to provide a fluent development experience, it is recommended to link
the built system to your local Foundry VTT installation's data folder. In
order to do so, first add a file called `foundryconfig.json` to the project root
with the following content:

```
{
  "dataPath": "/absolute/path/to/your/FoundryVTT"
}
```

(if you are using Windows, make sure to use `\` as a path separator instead of
`/`)

Then run

```
npm run link-project
```

On Windows, creating symlinks requires administrator privileges, so unfortunately
you need to run the above command in an administrator terminal for it to work.

### Running the tests

You can run the tests with the following command:

```
npm test
```

### Creating a release

The workflow works basically the same as the workflow of the [League Basic JS Module Template], please follow the
instructions given there.

## Licensing

This project is being developed under the terms of the
[LIMITED LICENSE AGREEMENT FOR MODULE DEVELOPMENT] for Foundry Virtual Tabletop.

GURPS is a trademark of Steve Jackson Games, and its rules and art are copyrighted by Steve Jackson Games. All rights are reserved by Steve Jackson Games. This game aid is the original creation of Mikolaj Tomczynski and is released for free distribution, and not for resale, under the permissions granted in the [Steve Jackson Games Online Policy].

This project is under an [MIT License].

[GURPS Character Sheet by Richard Wilkes]: https://gurpscharactersheet.com/
[League Basic JS Module Template]: https://github.com/League-of-Foundry-Developers/FoundryVTT-Module-Template
[LIMITED LICENSE AGREEMENT FOR MODULE DEVELOPMENT]: https://foundryvtt.com/article/license/
[Steve Jackson Games Online Policy]: http://www.sjgames.com/general/online_policy.html
[MIT License]: https://github.com/crnormand/gurps/blob/master/LICENSE.md
