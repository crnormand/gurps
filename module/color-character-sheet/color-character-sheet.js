////////////////////////////////////////
// Added to color the rollable parts of the character sheet. Stevil...
////////////////////////////////////////
import { i18n, objectToArray } from '../../lib/utilities.js'
import {
  SYSTEM_NAME,
  SETTING_COLOR_CHARACTER_SHEET_DATA,
  SETTING_COLOR_ROLLABLE
} from '../../lib/miscellaneous-settings.js'

export function addColorWheelsToSettings() {
  $('#color-sheets #update').on("click", function () {
    saveColorWheelsToSettings()
    colorGurpsActorSheet()
  })

  $('#color-sheets input[type="checkbox"]').on("click", function () {
    let overrideColor = $(this).attr('id')
    if ($(this).prop('checked')){
      $(this).attr('checked', 'checked')
    }else{
      $(this).removeAttr('checked')
      $(`.${overrideColor} .colorInput`).val($(`.default-${overrideColor}`).val())
      $(`.${overrideColor}-text .colorInput`).val($(`.default-${overrideColor}-text `).val())
      $(`.${overrideColor}-hover .colorInput`).val($(`.default-${overrideColor}-hover`).val())
      $(`.${overrideColor}-hover-text .colorInput`).val($(`.default-${overrideColor}-hover-text`).val())

      $(`.${overrideColor} .color`).css("background-color", $(`.default-${overrideColor}`).val())
      $(`.${overrideColor}-text .color`).css("background-color", $(`.default-${overrideColor}-text`).val())
      $(`.${overrideColor}-hover .color`).css("background-color", $(`.default-${overrideColor}-hover`).val())
      $(`.${overrideColor}-hover-text .color`).css("background-color", $(`.default-${overrideColor}-hover-text`).val())
    }
  })

  let Zindex = 99999
  let oldTrackZindex = 10000
  let oldColorZindex = 10001
  let newTrackZindex = oldTrackZindex + Zindex
  let newColorZindex = oldColorZindex + Zindex

  SETTING_COLOR_ROLLABLE.forEach(function(rollableSheetColors) {
    $(`.${rollableSheetColors} #colorPicker`).tinycolorpicker()
    $(`.${rollableSheetColors}-text #colorPicker`).tinycolorpicker()
    $(`.${rollableSheetColors}-hover #colorPicker`).tinycolorpicker()
    $(`.${rollableSheetColors}-hover-text #colorPicker`).tinycolorpicker()

    $(`.${rollableSheetColors} .colorInner`).on("click", function () {
      $('#colorPicker .track').hide()
      $(`.${rollableSheetColors} #colorPicker .track`).show()
      $("#colorPicker .color").css("z-index", oldColorZindex)
      $("#colorPicker .track").css("z-index", oldTrackZindex)
      $(`.${rollableSheetColors} .color`).css("z-index", newColorZindex)
      $(`.${rollableSheetColors} .track`).css("z-index", newTrackZindex)
    })

    $(`.${rollableSheetColors}-text .colorInner`).on("click", function () {
      $('#colorPicker .track').hide()
      $(`.${rollableSheetColors}-text #colorPicker .track`).show()
      $("#colorPicker .color").css("z-index", oldColorZindex)
      $("#colorPicker .track").css("z-index", oldTrackZindex)
      $(`.${rollableSheetColors}-text .color`).css("z-index", newColorZindex)
      $(`.${rollableSheetColors}-text .track`).css("z-index", newTrackZindex)
    })

    $(`.${rollableSheetColors}-hover .colorInner`).on("click", function () {
      $('#colorPicker .track').hide()
      $(`.${rollableSheetColors}-hover #colorPicker .track`).show()
      $("#colorPicker .color").css("z-index", oldColorZindex)
      $("#colorPicker .track").css("z-index", oldTrackZindex)
      $(`.${rollableSheetColors}-hover .color`).css("z-index", newColorZindex)
      $(`.${rollableSheetColors}-hover .track`).css("z-index", newTrackZindex)
    })
      
    $(`.${rollableSheetColors}-hover-text .colorInner`).on("click", function () {
      $('#colorPicker .track').hide()
      $(`.${rollableSheetColors}-hover-text #colorPicker .track`).show()
      $("#colorPicker .color").css("z-index", oldColorZindex)
      $("#colorPicker .track").css("z-index", oldTrackZindex)
      $(`.${rollableSheetColors}-hover-text .color`).css("z-index", newColorZindex)
      $(`.${rollableSheetColors}-hover-text .track`).css("z-index", newTrackZindex)
    })

    $(`.${rollableSheetColors} .color`).css("background-color", $(`.${rollableSheetColors} .colorInput`).val())
    $(`.${rollableSheetColors}-text .color`).css("background-color", $(`.${rollableSheetColors}-text .colorInput`).val())
    $(`.${rollableSheetColors}-hover .color`).css("background-color", $(`.${rollableSheetColors}-hover .colorInput`).val())
    $(`.${rollableSheetColors}-hover-text .color`).css("background-color", $(`.${rollableSheetColors}-hover-text .colorInput`).val())
  })
}

export function colorGurpsActorSheet() {
  let colorData = game.settings.get(SYSTEM_NAME, SETTING_COLOR_CHARACTER_SHEET_DATA)
  let theColorData = objectToArray(colorData.colors)
  ////////////////////////////////////////
  // Atributes
  ////////////////////////////////////////
  $("#attributes").on("mouseenter", ".rollable", function() {
    $(this).attr("style", "background-color: " + theColorData[0].color_hover + " !important; color:" + theColorData[0].color_hover_text)
  }).on("mouseleave", ".rollable", function() {
    $(this).attr("style", "background-color: " + theColorData[0].color_background + " !important; color:" + theColorData[0].color_text)
  })
  $("#attributes .rollable").attr("style", "background-color: " + theColorData[0].color_background + " !important; color:" + theColorData[0].color_text)
  ////////////////////////////////////////
  // Dodge
  ////////////////////////////////////////
  $("#encumbrance").on("mouseenter", ".rollable", function() {
    $(this).attr("style", "background-color: " + theColorData[1].color_hover + " !important; color:" + theColorData[1].color_hover_text)
  }).on("mouseleave", ".rollable", function() {
    $(this).attr("style", "background-color: " + theColorData[1].color_background + " !important; color:" + theColorData[1].color_text)
  })
  $(".dodge.rollable").attr("style", "background-color: " + theColorData[1].color_background + " !important; color:" + theColorData[1].color_text)
  ////////////////////////////////////////
  // Damage
  ////////////////////////////////////////
  $("#melee, #ranged").on("mouseenter", ".damage.rollable", function() {
    $(this).attr("style", "background-color: " + theColorData[2].color_hover + " !important; color:" + theColorData[2].color_hover_text)
  }).on("mouseleave", ".damage.rollable", function() {
    $(this).attr("style", "background-color: " + theColorData[2].color_background + " !important; color:" + theColorData[2].color_text)
  })
  $(".damage.rollable").attr("style", "background-color: " + theColorData[2].color_background + " !important; color:" + theColorData[2].color_text)
  ////////////////////////////////////////
  // Block
  ////////////////////////////////////////
  $("#melee, #ranged").on("mouseenter", ".block.rollable", function() {
    $(this).attr("style", "background-color: " + theColorData[3].color_hover + " !important; color:" + theColorData[3].color_hover_text)
  }).on("mouseleave", ".block.rollable", function() {
    $(this).attr("style", "background-color: " + theColorData[3].color_background + " !important; color:" + theColorData[3].color_text)
  })
  $(".block.rollable").attr("style", "background-color: " + theColorData[3].color_background + " !important; color:" + theColorData[3].color_text)
  ////////////////////////////////////////
  // Parry
  ////////////////////////////////////////
  $("#melee, #ranged").on("mouseenter", ".parry.rollable", function() {
    $(this).attr("style", "background-color: " + theColorData[4].color_hover + " !important; color:" + theColorData[4].color_hover_text)
  }).on("mouseleave", ".parry.rollable", function() {
    $(this).attr("style", "background-color: " + theColorData[4].color_background + " !important; color:" + theColorData[4].color_text)
  })
  $(".parry.rollable").attr("style", "background-color: " + theColorData[4].color_background + " !important; color:" + theColorData[4].color_text)
  ////////////////////////////////////////
  // Melee / Ranged
  ////////////////////////////////////////
  $("#melee, #ranged").on("mouseenter", ".usage.rollable, .level.rollable", function() {
    $(this).attr("style", "background-color: " + theColorData[5].color_hover + " !important; color:" + theColorData[5].color_hover_text)
  }).on("mouseleave", ".usage.rollable, .level.rollable", function() {
    $(this).attr("style", "background-color: " + theColorData[5].color_background + " !important; color:" + theColorData[5].color_text)
  })
  $("#melee .usage.rollable, #melee .level.rollable, #ranged .usage.rollable, #ranged .level.rollable").attr("style", "background-color: " + theColorData[5].color_background + " !important; color:" + theColorData[5].color_text)
  ////////////////////////////////////////
  // Skills
  ////////////////////////////////////////
  $("#skills").on("mouseenter", ".sl.rollable, .rsl.rollable", function() {
    $(this).attr("style", "background-color: " + theColorData[6].color_hover + " !important; color:" + theColorData[6].color_hover_text)
  }).on("mouseleave", ".sl.rollable, .rsl.rollable", function() {
    $(this).attr("style", "background-color: " + theColorData[6].color_background + " !important; color:" + theColorData[6].color_text)
  })
  $("#skills .sl.rollable, #skills .rsl.rollable").attr("style", "background-color: " + theColorData[6].color_background + " !important; color:" + theColorData[6].color_text)
  ////////////////////////////////////////
  // Spells
  ////////////////////////////////////////
  $("#spells").on("mouseenter", ".sl.rollable, .rsl.rollable", function() {
    $(this).attr("style", "background-color: " + theColorData[7].color_hover + " !important; color:" + theColorData[7].color_hover_text)
  }).on("mouseleave", ".sl.rollable, .rsl.rollable", function() {
    $(this).attr("style", "background-color: " + theColorData[7].color_background + " !important; color:" + theColorData[7].color_text)
  })
  $("#spells .sl.rollable, #spells .rsl.rollable").attr("style", "background-color: " + theColorData[7].color_background + " !important; color:" + theColorData[7].color_text)
  ////////////////////////////////////////
  // OtF in Qick Notes
  ////////////////////////////////////////
  $("#qnotes").on("mouseenter", ".gurpslink", function() {
    $(this).attr("style", "background-color: " + theColorData[8].color_hover + " !important; color:" + theColorData[8].color_hover_text)
  }).on("mouseleave", ".gurpslink", function() {
    $(this).attr("style", "background-color: " + theColorData[8].color_background + " !important; color:" + theColorData[8].color_text)
  })
  $("#qnotes .gurpslink").attr("style", "background-color: " + theColorData[8].color_background + " !important; color:" + theColorData[8].color_text)
  ////////////////////////////////////////
  // Ads / Disads
  ////////////////////////////////////////
  $("#advantages").on("mouseenter", ".gurpslink", function() {
    $(this).attr("style", "background-color: " + theColorData[9].color_hover + " !important; color:" + theColorData[9].color_hover_text)
  }).on("mouseleave", ".gurpslink", function() {
    $(this).attr("style", "background-color: " + theColorData[9].color_background + " !important; color:" + theColorData[9].color_text)
  })
  $("#advantages .gurpslink").attr("style", "background-color: " + theColorData[9].color_background + " !important; color:" + theColorData[9].color_text)
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
    var colorOverrideOtF = true
  } else {
    var colorOverrideOtF = false
  }
  if (html.find('.gurps-sheet-colors').find(`#${SETTING_COLOR_ROLLABLE[9]}`).prop('checked')) {
    var colorOverrideAdsDisads = true
  } else {
    var colorOverrideAdsDisads = false
  }

  let data = {
    'colors':[
      {
        color_override: colorOverrideAttributes,
        area: 'Attributes',
        rollable_css: `${SETTING_COLOR_ROLLABLE[0]}`,
        color_background: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[0]} .colorInput`).val(),
        color_text: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[0]}-text .colorInput`).val(),
        color_hover: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[0]}-hover .colorInput`).val(),
        color_hover_text: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[0]}-hover-text .colorInput`).val()
      },
      {
        color_override: colorOverrideDodge,
        area: 'Dodge',
        rollable_css: `${SETTING_COLOR_ROLLABLE[1]}`,
        color_background: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[1]} .colorInput`).val(),
        color_text: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[1]}-text .colorInput`).val(),
        color_hover: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[1]}-hover .colorInput`).val(),
        color_hover_text: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[1]}-hover-text .colorInput`).val()
      },
      {
        color_override: colorOverrideDamage,
        area: 'Damage',
        rollable_css: `${SETTING_COLOR_ROLLABLE[2]}`,
        color_background: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[2]} .colorInput`).val(),
        color_text: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[2]}-text .colorInput`).val(),
        color_hover: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[2]}-hover .colorInput`).val(),
        color_hover_text: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[2]}-hover-text .colorInput`).val()
      },
      {
        color_override: colorOverrideBlock,
        area: 'Block',
        rollable_css: `${SETTING_COLOR_ROLLABLE[3]}`,
        color_background: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[3]} .colorInput`).val(),
        color_text: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[3]}-text .colorInput`).val(),
        color_hover: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[3]}-hover .colorInput`).val(),
        color_hover_text: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[3]}-hover-text .colorInput`).val()
      },
      {
        color_override: colorOverrideParry,
        area: 'Parry',
        rollable_css: `${SETTING_COLOR_ROLLABLE[4]}`,
        color_background: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[4]} .colorInput`).val(),
        color_text: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[4]}-text .colorInput`).val(),
        color_hover: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[4]}-hover .colorInput`).val(),
        color_hover_text: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[4]}-hover-text .colorInput`).val()
      },
      {
        color_override: colorOverrideWeapons,
        area: 'Weapons',
        rollable_css: `${SETTING_COLOR_ROLLABLE[5]}`,
        color_background: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[5]} .colorInput`).val(),
        color_text: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[5]}-text .colorInput`).val(),
        color_hover: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[5]}-hover .colorInput`).val(),
        color_hover_text: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[5]}-hover-text .colorInput`).val()
      },
      {
        color_override: colorOverrideSkills,
        area: 'Skills',
        rollable_css: `${SETTING_COLOR_ROLLABLE[6]}`,
        color_background: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[6]} .colorInput`).val(),
        color_text: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[6]}-text .colorInput`).val(),
        color_hover: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[6]}-hover .colorInput`).val(),
        color_hover_text: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[6]}-hover-text .colorInput`).val()
      },
      {
        color_override: colorOverrideSpells,
        area: 'Spells',
        rollable_css: `${SETTING_COLOR_ROLLABLE[7]}`,
        color_background: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[7]} .colorInput`).val(),
        color_text: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[7]}-text .colorInput`).val(),
        color_hover: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[7]}-hover .colorInput`).val(),
        color_hover_text: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[7]}-hover-text .colorInput`).val()
      },
      {
        color_override: colorOverrideOtF,
        area: 'OtF-Notes',
        rollable_css: `${SETTING_COLOR_ROLLABLE[8]}`,
        color_background: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[8]} .colorInput`).val(),
        color_text: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[8]}-text .colorInput`).val(),
        color_hover: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[8]}-hover .colorInput`).val(),
        color_hover_text: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[8]}-hover-text .colorInput`).val()
      },
      {
        color_override: colorOverrideAdsDisads,
        area: 'Ads/Disads',
        rollable_css: `${SETTING_COLOR_ROLLABLE[9]}`,
        color_background: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[9]} .colorInput`).val(),
        color_text: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[9]}-text .colorInput`).val(),
        color_hover: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[9]}-hover .colorInput`).val(),
        color_hover_text: html.find('.gurps-sheet-colors').find(`.${SETTING_COLOR_ROLLABLE[9]}-hover-text .colorInput`).val()
      }
    ]
  }
  game.settings.set(SYSTEM_NAME, SETTING_COLOR_CHARACTER_SHEET_DATA, data)
}
