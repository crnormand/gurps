////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Added to color the rollable parts of the character sheet. Stevil...
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
import * as settings from '../../lib/miscellaneous-settings.js'
import { i18n, arrayToObject, objectToArray } from '../../lib/utilities.js'
import { addColorWheelsToSettings, colorGurpsActorSheet } from './color-character-sheet.js'

export default class ColorCharacterSheetSettings extends FormApplication {
  static getSheetColors() {
    let colorData = game.settings.get(settings.SYSTEM_NAME, settings.SETTING_COLOR_CHARACTER_SHEET_DATA)
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
      height: 'auto',
      title: 'Color Character Sheet',
      closeOnSubmit: true,
    })
  }

  /**
   * @override
   */
  getData(options) {
    const data = super.getData(options)
    data.colorData = ColorCharacterSheetSettings.getSheetColors()
    data.allColors = this._htmlColorCharacterSheet
    addColorWheelsToSettings();
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
   *   rollable: String,
   *   background_color: String,
   *   hover_color: String,
   *   text_color: String
   * }
   */
  get _htmlColorCharacterSheet() {
    // let allColors = Array.from(game.journal)

    let colorData = game.settings.get(settings.SYSTEM_NAME, settings.SETTING_COLOR_CHARACTER_SHEET_DATA)
    let htmlColorCharacterSheet = objectToArray(colorData.colors)

    let results = htmlColorCharacterSheet.map(it => {
      return { color_override: it.color_override, area: it.area, rollable_css: it.rollable_css, background_color: it.background_color, hover_color: it.hover_color, text: it.text_color, default_background: settings.SETTING_DEFAULT_COLOR_BACKGROUND, default_hover: settings.SETTING_DEFAULT_COLOR_BACKGROUND_HOVER, default_text: settings.SETTING_DEFAULT_COLOR_TEXT }
    })
    return results
  }

  /**
   * @override
   */
  _updateObject(event, formData) {
    let html = $(event.currentTarget)
    let data = {
      'colors':[
        {
          color_override: html.find('#entry-list').find(`.${settings.SETTING_COLOR_ROLLABLE[0]}`).checked,
          area: 'Attributes',
          rollable: settings.SETTING_COLOR_ROLLABLE[0],
          background_color: html.find('#entry-list').find(`.${settings.SETTING_COLOR_ROLLABLE[0]} .colorInput`).val(),
          hover_color: html.find('#entry-list').find(`.${settings.SETTING_COLOR_ROLLABLE[0]}-hover .colorInput`).val(),
          text_color: html.find('#entry-list').find(`.${settings.SETTING_COLOR_ROLLABLE[0]}-text .colorInput`).val()
        },
        {
          color_override: html.find('#entry-list').find(`.${settings.SETTING_COLOR_ROLLABLE[1]}`).checked,
          area: 'Dodge',
          rollable: settings.SETTING_COLOR_ROLLABLE[1],
          background_color: html.find('#entry-list').find(`.${settings.SETTING_COLOR_ROLLABLE[1]} .colorInput`).val(),
          hover_color: html.find('#entry-list').find(`.${settings.SETTING_COLOR_ROLLABLE[1]}-hover .colorInput`).val(),
          text_color: html.find('#entry-list').find(`.${settings.SETTING_COLOR_ROLLABLE[1]}-text .colorInput`).val()
        },
        {
          color_override: html.find('#entry-list').find(`.${settings.SETTING_COLOR_ROLLABLE[2]}`).checked,
          area: 'Damage',
          rollable: settings.SETTING_COLOR_ROLLABLE[2],
          background_color: html.find('#entry-list').find(`.${settings.SETTING_COLOR_ROLLABLE[2]} .colorInput`).val(),
          hover_color: html.find('#entry-list').find(`.${settings.SETTING_COLOR_ROLLABLE[2]}-hover .colorInput`).val(),
          text_color: html.find('#entry-list').find(`.${settings.SETTING_COLOR_ROLLABLE[2]}-text .colorInput`).val()
        },
        {
          color_override: html.find('#entry-list').find(`.${settings.SETTING_COLOR_ROLLABLE[3]}`).checked,
          area: 'Block',
          rollable: settings.SETTING_COLOR_ROLLABLE[3],
          background_color: html.find('#entry-list').find(`.${settings.SETTING_COLOR_ROLLABLE[3]} .colorInput`).val(),
          hover_color: html.find('#entry-list').find(`.${settings.SETTING_COLOR_ROLLABLE[3]}-hover .colorInput`).val(),
          text_color: html.find('#entry-list').find(`.${settings.SETTING_COLOR_ROLLABLE[3]}-text .colorInput`).val()
        },
        {
          color_override: html.find('#entry-list').find(`.${settings.SETTING_COLOR_ROLLABLE[4]}`).checked,
          area: 'Parry',
          rollable: settings.SETTING_COLOR_ROLLABLE[4],
          background_color: html.find('#entry-list').find(`.${settings.SETTING_COLOR_ROLLABLE[4]} .colorInput`).val(),
          hover_color: html.find('#entry-list').find(`.${settings.SETTING_COLOR_ROLLABLE[4]}-hover .colorInput`).val(),
          text_color: html.find('#entry-list').find(`.${settings.SETTING_COLOR_ROLLABLE[4]}-text .colorInput`).val()
        },
        {
          color_override: html.find('#entry-list').find(`.${settings.SETTING_COLOR_ROLLABLE[5]}`).checked,
          area: 'Weapons',
          rollable: settings.SETTING_COLOR_ROLLABLE[5],
          background_color: html.find('#entry-list').find(`.${settings.SETTING_COLOR_ROLLABLE[5]} .colorInput`).val(),
          hover_color: html.find('#entry-list').find(`.${settings.SETTING_COLOR_ROLLABLE[5]}-hover .colorInput`).val(),
          text_color: html.find('#entry-list').find(`.${settings.SETTING_COLOR_ROLLABLE[5]}-text .colorInput`).val()
        },
        {
          color_override: html.find('#entry-list').find(`.${settings.SETTING_COLOR_ROLLABLE[6]}`).checked,
          area: 'Skills',
          rollable: settings.SETTING_COLOR_ROLLABLE[6],
          background_color: html.find('#entry-list').find(`.${settings.SETTING_COLOR_ROLLABLE[6]} .colorInput`).val(),
          hover_color: html.find('#entry-list').find(`.${settings.SETTING_COLOR_ROLLABLE[6]}-hover .colorInput`).val(),
          text_color: html.find('#entry-list').find(`.${settings.SETTING_COLOR_ROLLABLE[6]}-text .colorInput`).val()
        },
        {
          color_override: html.find('#entry-list').find(`.${settings.SETTING_COLOR_ROLLABLE[7]}`).checked,
          area: 'Spells',
          rollable: settings.SETTING_COLOR_ROLLABLE[7],
          background_color: html.find('#entry-list').find(`.${settings.SETTING_COLOR_ROLLABLE[7]} .colorInput`).val(),
          hover_color: html.find('#entry-list').find(`.${settings.SETTING_COLOR_ROLLABLE[7]}-hover .colorInput`).val(),
          text_color: html.find('#entry-list').find(`.${settings.SETTING_COLOR_ROLLABLE[7]}-text .colorInput`).val()
        },
        {
          color_override: html.find('#entry-list').find(`.${settings.SETTING_COLOR_ROLLABLE[8]}`).checked,
          area: 'Ads/Disads',
          rollable: settings.SETTING_COLOR_ROLLABLE[8],
          background_color: html.find('#entry-list').find(`.${settings.SETTING_COLOR_ROLLABLE[8]} .colorInput`).val(),
          hover_color: html.find('#entry-list').find(`.${settings.SETTING_COLOR_ROLLABLE[8]}-hover .colorInput`).val(),
          text_color: html.find('#entry-list').find(`.${settings.SETTING_COLOR_ROLLABLE[8]}-text .colorInput`).val()
        },
        {
          color_override: html.find('#entry-list').find(`.${settings.SETTING_COLOR_ROLLABLE[9]}`).checked,
          area: 'OtF Notes',
          rollable: settings.SETTING_COLOR_ROLLABLE[9],
          background_color: html.find('#entry-list').find(`.${settings.SETTING_COLOR_ROLLABLE[9]} .colorInput`).val(),
          hover_color: html.find('#entry-list').find(`.${settings.SETTING_COLOR_ROLLABLE[9]}-hover .colorInput`).val(),
          text_color: html.find('#entry-list').find(`.${settings.SETTING_COLOR_ROLLABLE[9]}-text .colorInput`).val()
        }
      ]
    }
    game.settings.set(settings.SYSTEM_NAME, settings.SETTING_COLOR_CHARACTER_SHEET_DATA, data)
  }
}
