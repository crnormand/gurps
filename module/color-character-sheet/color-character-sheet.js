/**
 * Added to color the rollable parts of the character sheet.
 * Rewrote and made file eslint compatible...
 * ~Stevil
 */

import { objectToArray } from '../../lib/utilities.js'
import { SYSTEM_NAME } from '../../lib/miscellaneous-settings.js'
import {
  SETTING_COLOR_CHARACTER_SHEET_DATA,
  SETTING_DEFAULT_COLOR_BACKGROUND,
  SETTING_DEFAULT_COLOR_TEXT,
  SETTING_DEFAULT_COLOR_BACKGROUND_HOVER,
  SETTING_DEFAULT_COLOR_TEXT_HOVER,
  SETTING_COLOR_ROLLABLE,
} from './color-character-sheet-settings.js'

export function addColorWheelsToSettings() {
  $('#color-sheets input[type="checkbox"]').on('click', function () {
    const overrideColor = $(this).attr('id')
    if ($(this).prop('checked')) {
      $(this).attr('checked', 'checked')
    } else {
      $(`.${overrideColor} .colorInput`).val($(`.default-${overrideColor}`).val())
      $(`.${overrideColor}-text .colorInput`).val($(`.default-${overrideColor}-text `).val())
      $(`.${overrideColor}-hover .colorInput`).val($(`.default-${overrideColor}-hover`).val())
      $(`.${overrideColor}-hover-text .colorInput`).val($(`.default-${overrideColor}-hover-text`).val())

      $(`.${overrideColor} .color`).css('background-color', $(`.default-${overrideColor}`).val())
      $(`.${overrideColor}-text .color`).css('background-color', $(`.default-${overrideColor}-text`).val())
      $(`.${overrideColor}-hover .color`).css('background-color', $(`.default-${overrideColor}-hover`).val())
      $(`.${overrideColor}-hover-text .color`).css('background-color', $(`.default-${overrideColor}-hover-text`).val())
      $(this).removeAttr('checked')
    }
    saveColorWheelsToSettings()
  })

  const Zindex = 99999
  const oldTrackZindex = 10000
  const oldColorZindex = 10001
  const newTrackZindex = oldTrackZindex + Zindex
  const newColorZindex = oldColorZindex + Zindex

  SETTING_COLOR_ROLLABLE.forEach(function (rollableSheetColors) {
    $(`.${rollableSheetColors} #colorPicker`).tinycolorpicker()
    $(`.${rollableSheetColors}-text #colorPicker`).tinycolorpicker()
    $(`.${rollableSheetColors}-hover #colorPicker`).tinycolorpicker()
    $(`.${rollableSheetColors}-hover-text #colorPicker`).tinycolorpicker()

    $(`.${rollableSheetColors} .colorInner`).on('click', function () {
      $('#colorPicker .track').hide()
      $(`.${rollableSheetColors} #colorPicker .track`).show()
      $('#colorPicker .color').css('z-index', oldColorZindex)
      $('#colorPicker .track').css('z-index', oldTrackZindex)
      $(`.${rollableSheetColors} .color`).css('z-index', newColorZindex)
      $(`.${rollableSheetColors} .track`).css('z-index', newTrackZindex)
    })

    $(`.${rollableSheetColors}-text .colorInner`).on('click', function () {
      $('#colorPicker .track').hide()
      $(`.${rollableSheetColors}-text #colorPicker .track`).show()
      $('#colorPicker .color').css('z-index', oldColorZindex)
      $('#colorPicker .track').css('z-index', oldTrackZindex)
      $(`.${rollableSheetColors}-text .color`).css('z-index', newColorZindex)
      $(`.${rollableSheetColors}-text .track`).css('z-index', newTrackZindex)
    })

    $(`.${rollableSheetColors}-hover .colorInner`).on('click', function () {
      $('#colorPicker .track').hide()
      $(`.${rollableSheetColors}-hover #colorPicker .track`).show()
      $('#colorPicker .color').css('z-index', oldColorZindex)
      $('#colorPicker .track').css('z-index', oldTrackZindex)
      $(`.${rollableSheetColors}-hover .color`).css('z-index', newColorZindex)
      $(`.${rollableSheetColors}-hover .track`).css('z-index', newTrackZindex)
    })

    $(`.${rollableSheetColors}-hover-text .colorInner`).on('click', function () {
      $('#colorPicker .track').hide()
      $(`.${rollableSheetColors}-hover-text #colorPicker .track`).show()
      $('#colorPicker .color').css('z-index', oldColorZindex)
      $('#colorPicker .track').css('z-index', oldTrackZindex)
      $(`.${rollableSheetColors}-hover-text .color`).css('z-index', newColorZindex)
      $(`.${rollableSheetColors}-hover-text .track`).css('z-index', newTrackZindex)
    })

    $(`.${rollableSheetColors} #colorPicker .track`).on('click', function () {
      $(`#${rollableSheetColors}`).attr('checked', 'checked')
      saveColorWheelsToSettings()
    })
    $(`.${rollableSheetColors}-text #colorPicker .track`).on('click', function () {
      $(`#${rollableSheetColors}`).attr('checked', 'checked')
      saveColorWheelsToSettings()
    })
    $(`.${rollableSheetColors}-hover #colorPicker .track`).on('click', function () {
      $(`#${rollableSheetColors}`).attr('checked', 'checked')
      saveColorWheelsToSettings()
    })
    $(`.${rollableSheetColors}-hover-text #colorPicker .track`).on('click', function () {
      $(`#${rollableSheetColors}`).attr('checked', 'checked')
      saveColorWheelsToSettings()
    })

    if ($(`#${rollableSheetColors}`).prop('checked')) {
      $(`.${rollableSheetColors} .color`).css('background-color', $(`.${rollableSheetColors} .colorInput`).val())
      $(`.${rollableSheetColors}-text .color`).css(
        'background-color',
        $(`.${rollableSheetColors}-text .colorInput`).val()
      )
      $(`.${rollableSheetColors}-hover .color`).css(
        'background-color',
        $(`.${rollableSheetColors}-hover .colorInput`).val()
      )
      $(`.${rollableSheetColors}-hover-text .color`).css(
        'background-color',
        $(`.${rollableSheetColors}-hover-text .colorInput`).val()
      )
    } else {
      $(`.${rollableSheetColors} .color`).css('background-color', SETTING_DEFAULT_COLOR_BACKGROUND)
      $(`.${rollableSheetColors}-text .color`).css('background-color', SETTING_DEFAULT_COLOR_TEXT)
      $(`.${rollableSheetColors}-hover .color`).css('background-color', SETTING_DEFAULT_COLOR_BACKGROUND_HOVER)
      $(`.${rollableSheetColors}-hover-text .color`).css('background-color', SETTING_DEFAULT_COLOR_TEXT_HOVER)
    }
  })
}

export function colorGurpsActorSheet() {
  // eslint-disable-next-line no-undef
  const colorData = game.settings.get(SYSTEM_NAME, SETTING_COLOR_CHARACTER_SHEET_DATA)
  // console.log(`Read Character Sheet Colors: ${JSON.stringify(colorData)}`)

  const theColorData = objectToArray(colorData.colors)

  /**
   * Atributes
   */
  $('#attributes')
    .on('mouseenter', '.rollable', function () {
      $(this).attr(
        'style',
        'background-color: ' + theColorData[0].color_hover + ' !important; color:' + theColorData[0].color_hover_text
      )
    })
    .on('mouseleave', '.rollable', function () {
      $(this).attr(
        'style',
        'background-color: ' + theColorData[0].color_background + ' !important; color:' + theColorData[0].color_text
      )
    })
  $('#attributes .rollable').attr(
    'style',
    'background-color: ' + theColorData[0].color_background + ' !important; color:' + theColorData[0].color_text
  )

  /**
   * Dodge
   */
  $('#encumbrance')
    .on('mouseenter', '.rollable', function () {
      $(this).attr(
        'style',
        'background-color: ' + theColorData[1].color_hover + ' !important; color:' + theColorData[1].color_hover_text
      )
    })
    .on('mouseleave', '.rollable', function () {
      $(this).attr(
        'style',
        'background-color: ' + theColorData[1].color_background + ' !important; color:' + theColorData[1].color_text
      )
    })
  $('.dodge.rollable').attr(
    'style',
    'background-color: ' + theColorData[1].color_background + ' !important; color:' + theColorData[1].color_text
  )

  /**
   * Damage
   */
  $('#melee, #ranged')
    .on('mouseenter', '.damage.rollable', function () {
      $(this).attr(
        'style',
        'background-color: ' + theColorData[2].color_hover + ' !important; color:' + theColorData[2].color_hover_text
      )
    })
    .on('mouseleave', '.damage.rollable', function () {
      $(this).attr(
        'style',
        'background-color: ' + theColorData[2].color_background + ' !important; color:' + theColorData[2].color_text
      )
    })
  $('.damage.rollable').attr(
    'style',
    'background-color: ' + theColorData[2].color_background + ' !important; color:' + theColorData[2].color_text
  )

  /**
   * Block
   */
  $('#melee, #ranged')
    .on('mouseenter', '.block.rollable', function () {
      $(this).attr(
        'style',
        'background-color: ' + theColorData[3].color_hover + ' !important; color:' + theColorData[3].color_hover_text
      )
    })
    .on('mouseleave', '.block.rollable', function () {
      $(this).attr(
        'style',
        'background-color: ' + theColorData[3].color_background + ' !important; color:' + theColorData[3].color_text
      )
    })
  $('.block.rollable').attr(
    'style',
    'background-color: ' + theColorData[3].color_background + ' !important; color:' + theColorData[3].color_text
  )

  /**
   * Parry
   */
  $('#melee, #ranged')
    .on('mouseenter', '.parry.rollable', function () {
      $(this).attr(
        'style',
        'background-color: ' + theColorData[4].color_hover + ' !important; color:' + theColorData[4].color_hover_text
      )
    })
    .on('mouseleave', '.parry.rollable', function () {
      $(this).attr(
        'style',
        'background-color: ' + theColorData[4].color_background + ' !important; color:' + theColorData[4].color_text
      )
    })
  $('.parry.rollable').attr(
    'style',
    'background-color: ' + theColorData[4].color_background + ' !important; color:' + theColorData[4].color_text
  )

  /**
   * Melee / Ranged
   */
  $('#melee, #ranged')
    .on('mouseenter', '.usage.rollable, .level.rollable', function () {
      $(this).attr(
        'style',
        'background-color: ' + theColorData[5].color_hover + ' !important; color:' + theColorData[5].color_hover_text
      )
    })
    .on('mouseleave', '.usage.rollable, .level.rollable', function () {
      $(this).attr(
        'style',
        'background-color: ' + theColorData[5].color_background + ' !important; color:' + theColorData[5].color_text
      )
    })
  $('#melee .usage.rollable, #melee .level.rollable, #ranged .usage.rollable, #ranged .level.rollable').attr(
    'style',
    'background-color: ' + theColorData[5].color_background + ' !important; color:' + theColorData[5].color_text
  )

  /**
   * Skills
   */
  $('#skills')
    .on('mouseenter', '.sl.rollable, .rsl.rollable', function () {
      $(this).attr(
        'style',
        'background-color: ' + theColorData[6].color_hover + ' !important; color:' + theColorData[6].color_hover_text
      )
    })
    .on('mouseleave', '.sl.rollable, .rsl.rollable', function () {
      $(this).attr(
        'style',
        'background-color: ' + theColorData[6].color_background + ' !important; color:' + theColorData[6].color_text
      )
    })
  $('#skills .sl.rollable, #skills .rsl.rollable').attr(
    'style',
    'background-color: ' + theColorData[6].color_background + ' !important; color:' + theColorData[6].color_text
  )

  /**
   * Spells
   */
  $('#spells')
    .on('mouseenter', '.sl.rollable, .rsl.rollable', function () {
      $(this).attr(
        'style',
        'background-color: ' + theColorData[7].color_hover + ' !important; color:' + theColorData[7].color_hover_text
      )
    })
    .on('mouseleave', '.sl.rollable, .rsl.rollable', function () {
      $(this).attr(
        'style',
        'background-color: ' + theColorData[7].color_background + ' !important; color:' + theColorData[7].color_text
      )
    })
  $('#spells .sl.rollable, #spells .rsl.rollable').attr(
    'style',
    'background-color: ' + theColorData[7].color_background + ' !important; color:' + theColorData[7].color_text
  )

  /**
   * OtF in Qick Notes
   */
  $('#qnotes')
    .on('mouseenter', '.gurpslink', function () {
      $(this).attr(
        'style',
        'background-color: ' + theColorData[8].color_hover + ' !important; color:' + theColorData[8].color_hover_text
      )
    })
    .on('mouseleave', '.gurpslink', function () {
      $(this).attr(
        'style',
        'background-color: ' + theColorData[8].color_background + ' !important; color:' + theColorData[8].color_text
      )
    })
  $('#qnotes .gurpslink').attr(
    'style',
    'background-color: ' + theColorData[8].color_background + ' !important; color:' + theColorData[8].color_text
  )

  /**
   * Ads / Disads
   */
  $('#advantages')
    .on('mouseenter', '.gurpslink', function () {
      $(this).attr(
        'style',
        'background-color: ' + theColorData[9].color_hover + ' !important; color:' + theColorData[9].color_hover_text
      )
    })
    .on('mouseleave', '.gurpslink', function () {
      $(this).attr(
        'style',
        'background-color: ' + theColorData[9].color_background + ' !important; color:' + theColorData[9].color_text
      )
    })
  $('#advantages .gurpslink').attr(
    'style',
    'background-color: ' + theColorData[9].color_background + ' !important; color:' + theColorData[9].color_text
  )
}

export function saveColorWheelsToSettings() {
  const html = jQuery($('#color-sheets').html())
  const colorOverride = []
  const colorBackground = []
  const colorText = []
  const colorHover = []
  const colorHoverText = []

  SETTING_COLOR_ROLLABLE.forEach(function (rollableSheetColors) {
    if (html.find('.gurps-sheet-colors').find(`#${rollableSheetColors}`).prop('checked')) {
      colorOverride.push(true)
    } else {
      colorOverride.push(false)
    }

    if (html.find('.gurps-sheet-colors').find(`.${rollableSheetColors} .colorInput`).val() === undefined) {
      colorBackground.push(`${SETTING_DEFAULT_COLOR_BACKGROUND}`)
    } else {
      colorBackground.push(html.find('.gurps-sheet-colors').find(`.${rollableSheetColors} .colorInput`).val())
    }

    if (html.find('.gurps-sheet-colors').find(`.${rollableSheetColors}-text .colorInput`).val() === undefined) {
      colorText.push(`${SETTING_DEFAULT_COLOR_TEXT}`)
    } else {
      colorText.push(html.find('.gurps-sheet-colors').find(`.${rollableSheetColors}-text .colorInput`).val())
    }

    if (html.find('.gurps-sheet-colors').find(`.${rollableSheetColors}-hover .colorInput`).val() === undefined) {
      colorHover.push(`${SETTING_DEFAULT_COLOR_BACKGROUND_HOVER}`)
    } else {
      colorHover.push(html.find('.gurps-sheet-colors').find(`.${rollableSheetColors}-hover .colorInput`).val())
    }

    if (html.find('.gurps-sheet-colors').find(`.${rollableSheetColors}-hover-text .colorInput`).val() === undefined) {
      colorHoverText.push(`${SETTING_DEFAULT_COLOR_TEXT_HOVER}`)
    } else {
      colorHoverText.push(html.find('.gurps-sheet-colors').find(`.${rollableSheetColors}-hover-text .colorInput`).val())
    }
  })

  const data = {
    colors: [
      {
        color_override: colorOverride[0],
        area: 'Attributes',
        rollable_css: `${SETTING_COLOR_ROLLABLE[0]}`,
        color_background: `${colorBackground[0]}`,
        color_text: `${colorText[0]}`,
        color_hover: `${colorHover[0]}`,
        color_hover_text: `${colorHoverText[0]}`,
      },
      {
        color_override: colorOverride[1],
        area: 'Dodge',
        rollable_css: `${SETTING_COLOR_ROLLABLE[1]}`,
        color_background: `${colorBackground[1]}`,
        color_text: `${colorText[1]}`,
        color_hover: `${colorHover[1]}`,
        color_hover_text: `${colorHoverText[1]}`,
      },
      {
        color_override: colorOverride[2],
        area: 'Damage',
        rollable_css: `${SETTING_COLOR_ROLLABLE[2]}`,
        color_background: `${colorBackground[2]}`,
        color_text: `${colorText[2]}`,
        color_hover: `${colorHover[2]}`,
        color_hover_text: `${colorHoverText[2]}`,
      },
      {
        color_override: colorOverride[3],
        area: 'Block',
        rollable_css: `${SETTING_COLOR_ROLLABLE[3]}`,
        color_background: `${colorBackground[3]}`,
        color_text: `${colorText[3]}`,
        color_hover: `${colorHover[3]}`,
        color_hover_text: `${colorHoverText[3]}`,
      },
      {
        color_override: colorOverride[4],
        area: 'Parry',
        rollable_css: `${SETTING_COLOR_ROLLABLE[4]}`,
        color_background: `${colorBackground[4]}`,
        color_text: `${colorText[4]}`,
        color_hover: `${colorHover[4]}`,
        color_hover_text: `${colorHoverText[4]}`,
      },
      {
        color_override: colorOverride[5],
        area: 'Weapons',
        rollable_css: `${SETTING_COLOR_ROLLABLE[5]}`,
        color_background: `${colorBackground[5]}`,
        color_text: `${colorText[5]}`,
        color_hover: `${colorHover[5]}`,
        color_hover_text: `${colorHoverText[5]}`,
      },
      {
        color_override: colorOverride[6],
        area: 'Skills',
        rollable_css: `${SETTING_COLOR_ROLLABLE[6]}`,
        color_background: `${colorBackground[6]}`,
        color_text: `${colorText[6]}`,
        color_hover: `${colorHover[6]}`,
        color_hover_text: `${colorHoverText[6]}`,
      },
      {
        color_override: colorOverride[7],
        area: 'Spells',
        rollable_css: `${SETTING_COLOR_ROLLABLE[7]}`,
        color_background: `${colorBackground[7]}`,
        color_text: `${colorText[7]}`,
        color_hover: `${colorHover[7]}`,
        color_hover_text: `${colorHoverText[7]}`,
      },
      {
        color_override: colorOverride[8],
        area: 'OtF-Notes',
        rollable_css: `${SETTING_COLOR_ROLLABLE[8]}`,
        color_background: `${colorBackground[8]}`,
        color_text: `${colorText[8]}`,
        color_hover: `${colorHover[8]}`,
        color_hover_text: `${colorHoverText[8]}`,
      },
      {
        color_override: colorOverride[9],
        area: 'Ads/Disads',
        rollable_css: `${SETTING_COLOR_ROLLABLE[9]}`,
        color_background: `${colorBackground[9]}`,
        color_text: `${colorText[9]}`,
        color_hover: `${colorHover[9]}`,
        color_hover_text: `${colorHoverText[9]}`,
      },
    ],
  }
  // eslint-disable-next-line no-undef
  game.settings.set(SYSTEM_NAME, SETTING_COLOR_CHARACTER_SHEET_DATA, data)
  // console.log(`Saved Character Sheet Colors: ${JSON.stringify(data)}`)
}
