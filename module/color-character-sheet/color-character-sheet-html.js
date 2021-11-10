////////////////////////////////////////
// Added to color the rollable parts of the character sheet. Stevil...
////////////////////////////////////////

import { i18n, arrayToObject, objectToArray } from '../../lib/utilities.js'
import { addColorWheelsToSettings, colorGurpsActorSheet } from './color-character-sheet.js'
import {
  SYSTEM_NAME,
  SETTING_COLOR_CHARACTER_SHEET_DATA,
  SETTING_DEFAULT_COLOR_BACKGROUND,
  SETTING_DEFAULT_COLOR_BACKGROUND_HOVER,
  SETTING_DEFAULT_COLOR_TEXT,
  SETTING_COLOR_ROLLABLE
 } from '../../lib/miscellaneous-settings.js'

export let updateSheets = function() {
  for (const actor of game.actors.contents) 
    if (actor.permission >= CONST.ENTITY_PERMISSIONS.OBSERVER) // Return true if the current game user has observer or owner rights to an actor
      actor.render()     
}

export default class ColorCharacterSheetSettings extends FormApplication {
  static getSheetColors() {
    let colorData = game.settings.get(SYSTEM_NAME, SETTING_COLOR_CHARACTER_SHEET_DATA)
    let results = objectToArray(colorData.colors)
    return results
  }

  constructor(options = {}) {
    super(options)
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: 'color-sheets',
      template: 'systems/gurps/templates/color-character-sheet/color-character-sheet.html',
      resizeable: true,
      minimizable: false,
      width: 550,
      height: 550,
      title: 'Color Character Sheet',
      closeOnSubmit: true,
      onLoad: addColorWheelsToSettings(),
      onChange: value => updateSheets()
    })
  }

  /**
   * @override
   */
  getData(options) {
    const data = super.getData(options)
    data.colorData = ColorCharacterSheetSettings.getSheetColors()
    data.allColors = this._htmlColorCharacterSheet
    return data
  }

  /**
   * @returns {Array} an array of all colors settings.
   * Each entry contains the character sheet's Area Name, Rollable ID, Background Color, Hover Color, & Text Color.
   *
   * Entry:
   * {
   *   color_override: Boolean,
   *   area: String,
   *   rollable_css: String,
   *   background_color: String,
   *   hover_color: String,
   *   text_color: String
   * }
   */
  get _htmlColorCharacterSheet() {
    // let allColors = Array.from(game.journal)

    let colorData = game.settings.get(SYSTEM_NAME, SETTING_COLOR_CHARACTER_SHEET_DATA)
    let htmlColorCharacterSheet = objectToArray(colorData.colors)

    let results = htmlColorCharacterSheet.map(it => {
      return { color_override: it.color_override, area: it.area, rollable_css: it.rollable_css, background_color: it.background_color, hover_color: it.hover_color, text_color: it.text_color, default_background: SETTING_DEFAULT_COLOR_BACKGROUND, default_hover: SETTING_DEFAULT_COLOR_BACKGROUND_HOVER, default_text: SETTING_DEFAULT_COLOR_TEXT }
    })
    return results
  }

  /**
  * @override
  */
  _updateObject(event, formData) {
  }
}

export function saveColorWheelsToSettings() {
  let html = jQuery($('#color-sheets').html())

  if (html.find('.gurps-sheet-colors').find(`#${SETTING_COLOR_ROLLABLE[0]}`).prop('checked')) {
    var colorOverrideAttributes = true
  } else {
    var colorOverrideAttributes = false
  }
  if (html.find('.gurps-sheet-colors').find(`#${SETTING_COLOR_ROLLABLE[1]}`).prop('checked')) {
    var colorOverrideDodge = true
  } else {
    var colorOverrideDodge = false
  }
  if (html.find('.gurps-sheet-colors').find(`#${SETTING_COLOR_ROLLABLE[2]}`).prop('checked')) {
    var colorOverrideDamage = true
  } else {
    var colorOverrideDamage = false
  }
  if (html.find('.gurps-sheet-colors').find(`#${SETTING_COLOR_ROLLABLE[3]}`).prop('checked')) {
    var colorOverrideBlock = true
  } else {
    var colorOverrideBlock = false
  }
  if (html.find('.gurps-sheet-colors').find(`#${SETTING_COLOR_ROLLABLE[4]}`).prop('checked')) {
    var colorOverrideParry = true
  } else {
    var colorOverrideParry = false
  }
  if (html.find('.gurps-sheet-colors').find(`#${SETTING_COLOR_ROLLABLE[5]}`).prop('checked')) {
    var colorOverrideWeapons = true
  } else {
    var colorOverrideWeapons = false
  }
  if (html.find('.gurps-sheet-colors').find(`#${SETTING_COLOR_ROLLABLE[6]}`).prop('checked')) {
    var colorOverrideSkills = true
  } else {
    var colorOverrideSkills = false
  }
  if (html.find('.gurps-sheet-colors').find(`#${SETTING_COLOR_ROLLABLE[7]}`).prop('checked')) {
    var colorOverrideSpells = true
  } else {
    var colorOverrideSpells = false
  }
  if (html.find('.gurps-sheet-colors').find(`#${SETTING_COLOR_ROLLABLE[8]}`).prop('checked')) {
    var colorOverrideAdsDisads = true
  } else {
    var colorOverrideAdsDisads = false
  }
  if (html.find('.gurps-sheet-colors').find(`#${SETTING_COLOR_ROLLABLE[9]}`).prop('checked')) {
    var colorOverrideOtF = true
  } else {
    var colorOverrideOtF = false
  }

  let data = {
    'colors':[
      {
        color_override: colorOverrideAttributes,
        area: 'Attributes',
        rollable_css: `${SETTING_COLOR_ROLLABLE[0]}`,
        background_color: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[0]} .colorInput`).val(),
        hover_color: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[0]}-hover .colorInput`).val(),
        text_color: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[0]}-text .colorInput`).val()
      },
      {
        color_override: colorOverrideDodge,
        area: 'Dodge',
        rollable_css: `${SETTING_COLOR_ROLLABLE[1]}`,
        background_color: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[1]} .colorInput`).val(),
        hover_color: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[1]}-hover .colorInput`).val(),
        text_color: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[1]}-text .colorInput`).val()
      },
      {
        color_override: colorOverrideDamage,
        area: 'Damage',
        rollable_css: `${SETTING_COLOR_ROLLABLE[2]}`,
        background_color: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[2]} .colorInput`).val(),
        hover_color: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[2]}-hover .colorInput`).val(),
        text_color: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[2]}-text .colorInput`).val()
      },
      {
        color_override: colorOverrideBlock,
        area: 'Block',
        rollable_css: `${SETTING_COLOR_ROLLABLE[3]}`,
        background_color: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[3]} .colorInput`).val(),
        hover_color: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[3]}-hover .colorInput`).val(),
        text_color: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[3]}-text .colorInput`).val()
      },
      {
        color_override: colorOverrideParry,
        area: 'Parry',
        rollable_css: `${SETTING_COLOR_ROLLABLE[4]}`,
        background_color: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[4]} .colorInput`).val(),
        hover_color: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[4]}-hover .colorInput`).val(),
        text_color: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[4]}-text .colorInput`).val()
      },
      {
        color_override: colorOverrideWeapons,
        area: 'Weapons',
        rollable_css: `${SETTING_COLOR_ROLLABLE[5]}`,
        background_color: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[5]} .colorInput`).val(),
        hover_color: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[5]}-hover .colorInput`).val(),
        text_color: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[5]}-text .colorInput`).val()
      },
      {
        color_override: colorOverrideSkills,
        area: 'Skills',
        rollable_css: `${SETTING_COLOR_ROLLABLE[6]}`,
        background_color: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[6]} .colorInput`).val(),
        hover_color: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[6]}-hover .colorInput`).val(),
        text_color: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[6]}-text .colorInput`).val()
      },
      {
        color_override: colorOverrideSpells,
        area: 'Spells',
        rollable_css: `${SETTING_COLOR_ROLLABLE[7]}`,
        background_color: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[7]} .colorInput`).val(),
        hover_color: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[7]}-hover .colorInput`).val(),
        text_color: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[7]}-text .colorInput`).val()
      },
      {
        color_override: colorOverrideAdsDisads,
        area: 'Ads/Disads',
        rollable_css: `${SETTING_COLOR_ROLLABLE[8]}`,
        background_color: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[8]} .colorInput`).val(),
        hover_color: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[8]}-hover .colorInput`).val(),
        text_color: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[8]}-text .colorInput`).val()
      },
      {
        color_override: colorOverrideOtF,
        area: 'OtF Notes',
        rollable_css: `${SETTING_COLOR_ROLLABLE[9]}`,
        background_color: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[9]} .colorInput`).val(),
        hover_color: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[9]}-hover .colorInput`).val(),
        text_color: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[9]}-text .colorInput`).val()
      }
    ]
  }
  game.settings.set(SYSTEM_NAME, SETTING_COLOR_CHARACTER_SHEET_DATA, data)
}
