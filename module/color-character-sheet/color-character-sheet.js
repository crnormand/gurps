////////////////////////////////////////
// Added to color the rollable parts of the character sheet. Stevil...
////////////////////////////////////////
import { i18n, arrayToObject, objectToArray } from '../../lib/utilities.js'
import { saveColorWheelsToSettings } from './color-character-sheet-html.js'
import {
  SYSTEM_NAME,
  SETTING_COLOR_CHARACTER_SHEET_DATA,
  SETTING_DEFAULT_COLOR_BACKGROUND,
  SETTING_DEFAULT_COLOR_BACKGROUND_HOVER,
  SETTING_DEFAULT_COLOR_TEXT,
  SETTING_COLOR_ROLLABLE,
} from '../../lib/miscellaneous-settings.js'

export function addColorWheelsToSettings() {
  $('#color-sheets #update').on('click', function () {
    saveColorWheelsToSettings()
    colorGurpsActorSheet()
  })

  $('#color-sheets input[type="checkbox"]').on('click', function () {
    let overrideColor = $(this).attr('id')
    if ($(this).prop('checked')) {
      $(this).attr('checked', 'checked')
    } else {
      $(this).removeAttr('checked')
      $(`.${overrideColor} .colorInput`).val($(`.default-${overrideColor}`).val())
      $(`.${overrideColor}-hover .colorInput`).val($(`.default-${overrideColor}-hover`).val())
      $(`.${overrideColor}-text .colorInput`).val($(`.default-${overrideColor}-text `).val())

      $(`.${overrideColor} .color`).css('background-color', $(`.default-${overrideColor}`).val())
      $(`.${overrideColor}-hover .color`).css('background-color', $(`.default-${overrideColor}-hover`).val())
      $(`.${overrideColor}-text .color`).css('background-color', $(`.default-${overrideColor}-text`).val())
    }
    colorGurpsActorSheet()
  })

  let Zindex = 99999
  let oldTrackZindex = 10000
  let oldColorZindex = 10001
  let newTrackZindex = oldTrackZindex + Zindex
  let newColorZindex = oldColorZindex + Zindex

  SETTING_COLOR_ROLLABLE.forEach(function (rollableSheetColors) {
    $(`.${rollableSheetColors} #colorPicker`).tinycolorpicker()
    $(`.${rollableSheetColors}-hover #colorPicker`).tinycolorpicker()
    $(`.${rollableSheetColors}-text #colorPicker`).tinycolorpicker()

    $(`.${rollableSheetColors} .colorInner`).on('click', function () {
      $('#colorPicker .track').hide()
      $(`.${rollableSheetColors} #colorPicker .track`).show()
      $('#colorPicker .color').css('z-index', oldColorZindex)
      $('#colorPicker .track').css('z-index', oldTrackZindex)
      $(`.${rollableSheetColors} .color`).css('z-index', newColorZindex)
      $(`.${rollableSheetColors} .track`).css('z-index', newTrackZindex)
    })

    $(`.${rollableSheetColors}-hover .colorInner`).on('click', function () {
      $('#colorPicker .track').hide()
      $(`.${rollableSheetColors}-hover #colorPicker .track`).show()
      $('#colorPicker .color').css('z-index', oldColorZindex)
      $('#colorPicker .track').css('z-index', oldTrackZindex)
      $(`.${rollableSheetColors}-hover .color`).css('z-index', newColorZindex)
      $(`.${rollableSheetColors}-hover .track`).css('z-index', newTrackZindex)
    })

    $(`.${rollableSheetColors}-text .colorInner`).on('click', function () {
      $('#colorPicker .track').hide()
      $(`.${rollableSheetColors}-text #colorPicker .track`).show()
      $('#colorPicker .color').css('z-index', oldColorZindex)
      $('#colorPicker .track').css('z-index', oldTrackZindex)
      $(`.${rollableSheetColors}-text .color`).css('z-index', newColorZindex)
      $(`.${rollableSheetColors}-text .track`).css('z-index', newTrackZindex)
    })

    $(`.${rollableSheetColors} .color`).css('background-color', $(`.${rollableSheetColors} .colorInput`).val())
    $(`.${rollableSheetColors}-hover .color`).css(
      'background-color',
      $(`.${rollableSheetColors}-hover .colorInput`).val()
    )
    $(`.${rollableSheetColors}-text .color`).css(
      'background-color',
      $(`.${rollableSheetColors}-text .colorInput`).val()
    )
  })
}

export function colorGurpsActorSheet() {
  let colorData = game.settings.get(SYSTEM_NAME, SETTING_COLOR_CHARACTER_SHEET_DATA)
  let theColorData = objectToArray(colorData.colors)

  ////////////////////////////////////////
  // Atributes
  ////////////////////////////////////////
  $('#attributes')
    .on('mouseenter', '.rollable', function () {
      $(this).attr(
        'style',
        'background-color: ' + theColorData[0].hover_color + ' !important; color:' + theColorData[0].text_color
      )
    })
    .on('mouseleave', '.rollable', function () {
      $(this).attr(
        'style',
        'background-color: ' + theColorData[0].background_color + ' !important; color:' + theColorData[0].text_color
      )
    })
  $('#attributes .rollable').attr(
    'style',
    'background-color: ' + theColorData[0].background_color + ' !important; color:' + theColorData[0].text_color
  )
  ////////////////////////////////////////
  // Dodge
  ////////////////////////////////////////
  $('#encumbrance')
    .on('mouseenter', '.rollable', function () {
      $(this).attr(
        'style',
        'background-color: ' + theColorData[1].hover_color + ' !important; color:' + theColorData[1].text_color
      )
    })
    .on('mouseleave', '.rollable', function () {
      $(this).attr(
        'style',
        'background-color: ' + theColorData[1].background_color + ' !important; color:' + theColorData[1].text_color
      )
    })
  $('.dodge.rollable').attr(
    'style',
    'background-color: ' + theColorData[1].background_color + ' !important; color:' + theColorData[1].text_color
  )
  ////////////////////////////////////////
  // Damage
  ////////////////////////////////////////
  $('#melee, #ranged')
    .on('mouseenter', '.damage.rollable', function () {
      $(this).attr(
        'style',
        'background-color: ' + theColorData[2].hover_color + ' !important; color:' + theColorData[2].text_color
      )
    })
    .on('mouseleave', '.damage.rollable', function () {
      $(this).attr(
        'style',
        'background-color: ' + theColorData[2].background_color + ' !important; color:' + theColorData[2].text_color
      )
    })
  $('.damage.rollable').attr(
    'style',
    'background-color: ' + theColorData[2].background_color + ' !important; color:' + theColorData[2].text_color
  )
  ////////////////////////////////////////
  // Block
  ////////////////////////////////////////
  $('#melee, #ranged')
    .on('mouseenter', '.block.rollable', function () {
      $(this).attr(
        'style',
        'background-color: ' + theColorData[3].hover_color + ' !important; color:' + theColorData[3].text_color
      )
    })
    .on('mouseleave', '.block.rollable', function () {
      $(this).attr(
        'style',
        'background-color: ' + theColorData[3].background_color + ' !important; color:' + theColorData[3].text_color
      )
    })
  $('.block.rollable').attr(
    'style',
    'background-color: ' + theColorData[3].background_color + ' !important; color:' + theColorData[3].text_color
  )
  ////////////////////////////////////////
  // Parry
  ////////////////////////////////////////
  $('#melee, #ranged')
    .on('mouseenter', '.parry.rollable', function () {
      $(this).attr(
        'style',
        'background-color: ' + theColorData[4].hover_color + ' !important; color:' + theColorData[4].text_color
      )
    })
    .on('mouseleave', '.parry.rollable', function () {
      $(this).attr(
        'style',
        'background-color: ' + theColorData[4].background_color + ' !important; color:' + theColorData[4].text_color
      )
    })
  $('.parry.rollable').attr(
    'style',
    'background-color: ' + theColorData[4].background_color + ' !important; color:' + theColorData[4].text_color
  )
  ////////////////////////////////////////
  // Melee / Ranged
  ////////////////////////////////////////
  $('#melee, #ranged')
    .on('mouseenter', '.usage.rollable, .level.rollable', function () {
      $(this).attr(
        'style',
        'background-color: ' + theColorData[5].hover_color + ' !important; color:' + theColorData[5].text_color
      )
    })
    .on('mouseleave', '.usage.rollable, .level.rollable', function () {
      $(this).attr(
        'style',
        'background-color: ' + theColorData[5].background_color + ' !important; color:' + theColorData[5].text_color
      )
    })
  $('#melee .usage.rollable, #melee .level.rollable, #ranged .usage.rollable, #ranged .level.rollable').attr(
    'style',
    'background-color: ' + theColorData[5].background_color + ' !important; color:' + theColorData[5].text_color
  )
  ////////////////////////////////////////
  // Skills
  ////////////////////////////////////////
  $('#skills')
    .on('mouseenter', '.sl.rollable', function () {
      $(this).attr(
        'style',
        'background-color: ' + theColorData[6].hover_color + ' !important; color:' + theColorData[6].text_color
      )
    })
    .on('mouseleave', '.sl.rollable', function () {
      $(this).attr(
        'style',
        'background-color: ' + theColorData[6].background_color + ' !important; color:' + theColorData[6].text_color
      )
    })
  $('#skills .sl.rollable').attr(
    'style',
    'background-color: ' + theColorData[6].background_color + ' !important; color:' + theColorData[6].text_color
  )
  ////////////////////////////////////////
  // Spells
  ////////////////////////////////////////
  $('#spells')
    .on('mouseenter', '.sl.rollable', function () {
      $(this).attr(
        'style',
        'background-color: ' + theColorData[7].hover_color + ' !important; color:' + theColorData[7].text_color
      )
    })
    .on('mouseleave', '.sl.rollable', function () {
      $(this).attr(
        'style',
        'background-color: ' + theColorData[7].background_color + ' !important; color:' + theColorData[7].text_color
      )
    })
  $('#spells .sl.rollable').attr(
    'style',
    'background-color: ' + theColorData[7].background_color + ' !important; color:' + theColorData[7].text_color
  )
  ////////////////////////////////////////
  // Ads / Disads
  ////////////////////////////////////////
  $('#advantages')
    .on('mouseenter', '.gurpslink', function () {
      $(this).attr(
        'style',
        'background-color: ' + theColorData[8].hover_color + ' !important; color:' + theColorData[8].text_color
      )
    })
    .on('mouseleave', '.gurpslink', function () {
      $(this).attr(
        'style',
        'background-color: ' + theColorData[8].background_color + ' !important; color:' + theColorData[8].text_color
      )
    })
  $('#advantages .gurpslink').attr(
    'style',
    'background-color: ' + theColorData[8].background_color + ' !important; color:' + theColorData[8].text_color
  )
  ////////////////////////////////////////
  // OtF
  ////////////////////////////////////////
  $('#qnotes')
    .on('mouseenter', '.gurpslink', function () {
      $(this).attr(
        'style',
        'background-color: ' + theColorData[9].hover_color + ' !important; color:' + theColorData[9].text_color
      )
    })
    .on('mouseleave', '.gurpslink', function () {
      $(this).attr(
        'style',
        'background-color: ' + theColorData[9].background_color + ' !important; color:' + theColorData[9].text_color
      )
    })
  $('#qnotes .gurpslink').attr(
    'style',
    'background-color: ' + theColorData[9].background_color + ' !important; color:' + theColorData[9].text_color
  )
}
