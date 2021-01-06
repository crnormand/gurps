'use strict'

export const SYSTEM_NAME = 'gurps'
export const SETTING_DEFAULT_LOCATION = 'default-hitlocation'
export const SETTING_SIMPLE_DAMAGE = 'combat-simple-damage'
export const SETTING_APPLY_DIVISOR = 'combat-apply-divisor'
export const SETTING_BLUNT_TRAUMA = 'combat-blunt-trauma'
export const SETTING_LOCATION_MODIFIERS = 'combat-location-modifiers'
export const SETTING_WHISPER_STATUS_EFFECTS = 'whisper-status-effectss'
export const SETTING_CHANGELOG_VERSION = 'changelogVersion'
export const SETTING_SHOW_CHANGELOG = 'showChangelog'
export const SETTING_BASICSET_PDF = 'basicsetpdf'
export const SETTING_RANGE_TO_BUCKET = 'range-to-bucket'
export const SETTING_MODIFIER_TOOLTIP = 'modifier_tooltip'
export const SETTING_IGNORE_IMPORT_NAME = 'ignore_import_name'

export function initializeSettings() {
  Hooks.once('init', async function () {
    // Register the setting.
    game.settings.register(SYSTEM_NAME, SETTING_DEFAULT_LOCATION, {
      name: 'Default hit location:',
      hint: 'Set the default hit location used to apply damage.',
      scope: 'world',
      config: true,
      type: String,
      choices: {
        'Torso': 'Torso',
        'Random': 'Random'
      },
      default: 'Torso',
      onChange: value => console.log(`Default hit location: ${value}`)
    })

    game.settings.register(SYSTEM_NAME, SETTING_SIMPLE_DAMAGE, {
      name: 'Use simple Apply Damage dialog:',
      hint: 'If true, only display the "Directly Apply" option in the Apply Damage dialog',
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
      onChange: value => console.log(`Use simply Apply Damage dialog : ${value}`)
    })

    game.settings.register(SYSTEM_NAME, SETTING_APPLY_DIVISOR, {
      name: 'Apply armor divisor to damage:',
      hint: 'If true, adjust the target\'s DR by the armor divisor on the attack.',
      scope: 'world',
      config: true,
      type: Boolean,
      default: true,
      onChange: value => console.log(`Apply Armor Divisor : ${value}`)
    })

    game.settings.register(SYSTEM_NAME, SETTING_BLUNT_TRAUMA, {
      name: 'Apply Blunt Trauma damage:',
      hint: 'If true, use Blunt Trauma rules for calculating damage on flexible armor.',
      scope: 'world',
      config: true,
      type: Boolean,
      default: true,
      onChange: value => console.log(`Apply Blunt Trauma : ${value}`)
    })

    game.settings.register(SYSTEM_NAME, SETTING_LOCATION_MODIFIERS, {
      name: 'Use Hit Location Wounding Modifiers:',
      hint: 'If true, modify Wounding Modifiers based on Hit Location.',
      scope: 'world',
      config: true,
      type: Boolean,
      default: true,
      onChange: value => console.log(`Apply Location Modifiers : ${value}`)
    })
    
    game.settings.register(SYSTEM_NAME, SETTING_WHISPER_STATUS_EFFECTS, {
      name: "Whisper Status Effects",
      hint: "When selected, Status Effects Messages (Shock, Major Wound, etc.) will be sent to the target's owner as a Whisper.   Otherwise they will be sent as a Out of Character (OOC) message to everyone",
      scope: "world",
      config: true,
      type: Boolean,
      default: false,
      onChange: value => console.log(`Whisper Status Effects : ${value}`)
    });

		// Keep track of the last version number
		game.settings.register(SYSTEM_NAME, SETTING_CHANGELOG_VERSION, {
			name: "Changelog Version",
			scope: "client",
			config: false,
			type: String,
			default: "0.0.0",
      onChange: value => console.log(`Change Log version : ${value}`)
		});
	
		// In case the user wants to see what changed between versions
		game.settings.register(SYSTEM_NAME, SETTING_SHOW_CHANGELOG, {
			name: "Show 'Read Me' on version change",
			hint: "Open the Read Me file once, if a version change is detected.",
			scope: "world",
			config: true,
			type: Boolean,
			default: true,
      onChange: value => console.log(`Show Change Log : ${value}`)
		});
	
		// Support for combined or separate Basic Set PDFs
		game.settings.register(SYSTEM_NAME, "basicsetpdf", {
			name: 'Basic Set PDF(s)',
			hint: 'Select "Combined" or "Separate" and use the associated PDF codes when configuring PDFoundry.  ' +
				'Note: If you select "Separate", the Basic Set Campaigns PDF should open up to page 340 during the PDFoundry test.',
			scope: 'world',
			config: true,
			type: String,
			choices: {
				'Combined': 'Combined Basic Set, code "B"',
				'Separate': 'Separate Basic Set Characters, code "B".  Basic Set Campaigns, code "BX"'
			},
			default: 'Combined',
      onChange: value => console.log(`Basic Set PDFs : ${value}`)
		});
		
		game.settings.register(SYSTEM_NAME, SETTING_RANGE_TO_BUCKET, {
			name: "Add Range Ruler modifier to Modifier Bucket",
			hint: "Automatically adds the last measured Range modifier to the Modifier Bucket",
			scope: "client",
			config: true,
			type: Boolean,
			default: true,
      onChange: value => console.log(`Automatically add range ruler mod to bucket : ${value}`)
		});

		game.settings.register(SYSTEM_NAME, SETTING_MODIFIER_TOOLTIP, {
			name: "Show Modifier Tooltip",
			hint: "Bring up the Modifier Tooltip when the mouse hovers over the Modifier Bucket.   If this is turned off, you can still bring up the Tooltip by Left Clicking on the Modifier Bucket.  You must restart Foundry for this setting to take effect.",
			scope: "client",
			config: true,
			type: Boolean,
			default: true,
      onChange: value => console.log(`Modifier Tooltip on hover : ${value}`)
		});

		game.settings.register(SYSTEM_NAME, SETTING_IGNORE_IMPORT_NAME, {
			name: "Ignore 'name' attribute from import",
			hint: "Do not set the 'name' attribute of the Actor from the import data.   This is useful if the name that you use in Foundry differs from GCA/GCS and you don't want it overwritten on every import.",
			scope: "world",
			config: true,
			type: Boolean,
			default: false,
      onChange: value => console.log(`Ignore import name : ${value}`)
		});

  })
}