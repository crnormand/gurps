////////////////////////////////////////
// Added to color the rollable parts of the character sheet.
// Moves settings for Color Picker to own file. Stevil...
////////////////////////////////////////
import { SYSTEM_NAME } from '../../lib/miscellaneous-settings.js'
import { i18n } from '../../lib/utilities.js'
import ColorCharacterSheetSettings from './color-character-sheet-html.js'
import { readCSSfile } from '../../lib/parse-css-file/parse-css-file.js'

export let url = '/systems/gurps/styles/simple.css'
export let cssSettings = {
  'findCSS':[
    {
      selector: '.rollable',
      rule: 'background-color'
    },
    {
      selector: '.rollable',
      rule: 'color'
    },
    {
      selector: '.rollable:hover',
      rule: 'background-color'
    },
    {
      selector: '.rollable:hover',
      rule: 'color'
    }
  ]
}
export let cssColors = []

readCSSfile(url, cssSettings)

export const SETTING_COLOR_CHARACTER_SHEET_MENU = 'color-character-sheet-menu'
export const SETTING_COLOR_CHARACTER_SHEET_DATA = 'color-character-sheet-data'
export const SETTING_DEFAULT_COLOR_BACKGROUND = cssColors[0] // Was '#ffffbe'
export const SETTING_DEFAULT_COLOR_TEXT = cssColors[1] // Was '#000000'
export const SETTING_DEFAULT_COLOR_BACKGROUND_HOVER = cssColors[2] // Was '#cccc00'
export const SETTING_DEFAULT_COLOR_TEXT_HOVER = cssColors[3] // Was '#000000'
export const SETTING_COLOR_ROLLABLE = [
  'color-attributes-rollable',
  'color-dodge-rollable',
  'color-damage-rollable',
  'color-block-rollable',
  'color-parry-rollable',
  'color-weapons-rollable',
  'color-skills-rollable',
  'color-spells-rollable',
  'color-otf-notes-rollable',
  'color-gurpslink-rollable',
  ]

export const registerColorPickerSettings = function() {
  game.settings.registerMenu(SYSTEM_NAME, SETTING_COLOR_CHARACTER_SHEET_MENU, {
    name: i18n('GURPS.settingColorSheetMenuTitle'),
    hint: i18n('GURPS.settingColorSheetMenuHint'),
    label: i18n('GURPS.settingColorSheetMenuTitle'),
    type: ColorCharacterSheetSettings,
    restricted: false,
  })
  game.settings.register(SYSTEM_NAME, SETTING_COLOR_CHARACTER_SHEET_DATA, {
  name: 'Color Character Sheet - Data',
  scope: 'world',
  config: false,
  type: Object,
  default: {'colors':[
    {
    color_override: false,
    area: 'Attributes',
    rollable_css: `${SETTING_COLOR_ROLLABLE[0]}`,
    color_background: `${SETTING_DEFAULT_COLOR_BACKGROUND}`,
    color_text: `${SETTING_DEFAULT_COLOR_TEXT}`,
    color_hover: `${SETTING_DEFAULT_COLOR_BACKGROUND_HOVER}`,
    color_hover_text: `${SETTING_DEFAULT_COLOR_TEXT_HOVER}`
    },
    {
    color_override: false,
    area: 'Dodge',
    rollable_css: `${SETTING_COLOR_ROLLABLE[1]}`,
    color_background: `${SETTING_DEFAULT_COLOR_BACKGROUND}`,
    color_text: `${SETTING_DEFAULT_COLOR_TEXT}`,
    color_hover: `${SETTING_DEFAULT_COLOR_BACKGROUND_HOVER}`,
    color_hover_text: `${SETTING_DEFAULT_COLOR_TEXT_HOVER}`
    },
    {
    color_override: false,
    area: 'Damage',
    rollable_css: `${SETTING_COLOR_ROLLABLE[2]}`,
    color_background: `${SETTING_DEFAULT_COLOR_BACKGROUND}`,
    color_text: `${SETTING_DEFAULT_COLOR_TEXT}`,
    color_hover: `${SETTING_DEFAULT_COLOR_BACKGROUND_HOVER}`,
    color_hover_text: `${SETTING_DEFAULT_COLOR_TEXT_HOVER}`
    },
    {
    color_override: false,
    area: 'Block',
    rollable_css: `${SETTING_COLOR_ROLLABLE[3]}`,
    color_background: `${SETTING_DEFAULT_COLOR_BACKGROUND}`,
    color_text: `${SETTING_DEFAULT_COLOR_TEXT}`,
    color_hover: `${SETTING_DEFAULT_COLOR_BACKGROUND_HOVER}`,
    color_hover_text: `${SETTING_DEFAULT_COLOR_TEXT_HOVER}`
    },
    {
    color_override: false,
    area: 'Parry',
    rollable_css: `${SETTING_COLOR_ROLLABLE[4]}`,
    color_background: `${SETTING_DEFAULT_COLOR_BACKGROUND}`,
    color_text: `${SETTING_DEFAULT_COLOR_TEXT}`,
    color_hover: `${SETTING_DEFAULT_COLOR_BACKGROUND_HOVER}`,
    color_hover_text: `${SETTING_DEFAULT_COLOR_TEXT_HOVER}`
    },
    {
    color_override: false,
    area: 'Weapons',
    rollable_css: `${SETTING_COLOR_ROLLABLE[5]}`,
    color_background: `${SETTING_DEFAULT_COLOR_BACKGROUND}`,
    color_text: `${SETTING_DEFAULT_COLOR_TEXT}`,
    color_hover: `${SETTING_DEFAULT_COLOR_BACKGROUND_HOVER}`,
    color_hover_text: `${SETTING_DEFAULT_COLOR_TEXT_HOVER}`
    },
    {
    color_override: false,
    area: 'Skills',
    rollable_css: `${SETTING_COLOR_ROLLABLE[6]}`,
    color_background: `${SETTING_DEFAULT_COLOR_BACKGROUND}`,
    color_text: `${SETTING_DEFAULT_COLOR_TEXT}`,
    color_hover: `${SETTING_DEFAULT_COLOR_BACKGROUND_HOVER}`,
    color_hover_text: `${SETTING_DEFAULT_COLOR_TEXT_HOVER}`
    },
    {
    color_override: false,
    area: 'Spells',
    rollable_css: `${SETTING_COLOR_ROLLABLE[7]}`,
    color_background: `${SETTING_DEFAULT_COLOR_BACKGROUND}`,
    color_text: `${SETTING_DEFAULT_COLOR_TEXT}`,
    color_hover: `${SETTING_DEFAULT_COLOR_BACKGROUND_HOVER}`,
    color_hover_text: `${SETTING_DEFAULT_COLOR_TEXT_HOVER}`
    },
    {
    color_override: false,
    area: 'OtF-Notes',
    rollable_css: `${SETTING_COLOR_ROLLABLE[8]}`,
    color_background: `${SETTING_DEFAULT_COLOR_BACKGROUND}`,
    color_text: `${SETTING_DEFAULT_COLOR_TEXT}`,
    color_hover: `${SETTING_DEFAULT_COLOR_BACKGROUND_HOVER}`,
    color_hover_text: `${SETTING_DEFAULT_COLOR_TEXT_HOVER}`
    },
    {
    color_override: false,
    area: 'Ads/Disads',
    rollable_css: `${SETTING_COLOR_ROLLABLE[9]}`,
    color_background: `${SETTING_DEFAULT_COLOR_BACKGROUND}`,
    color_text: `${SETTING_DEFAULT_COLOR_TEXT}`,
    color_hover: `${SETTING_DEFAULT_COLOR_BACKGROUND_HOVER}`,
    color_hover_text: `${SETTING_DEFAULT_COLOR_TEXT_HOVER}`
    }
  ]},
  //onChange: value => console.log(`Updated Character Sheet Colors: ${JSON.stringify(value)}`),
  })
}
