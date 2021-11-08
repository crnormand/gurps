////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Added to color the rollable parts of the character sheet. Stevil...
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
import SYSTEM_NAME from '../lib/miscellaneous-settings.js'
import {
    SETTING_COLOR_ATTRIBUTES,
    SETTING_COLOR_DODGE,
    SETTING_COLOR_DAMAGE,
    SETTING_COLOR_BLOCK,
    SETTING_COLOR_PARRY,
    SETTING_COLOR_WEAPONS,
    SETTING_COLOR_SKILLS,
    SETTING_COLOR_SPELLS,
    SETTING_COLOR_GURPSLINK,
  } from '../lib/miscellaneous-settings.js'

  export function addColorWheelsToSettings() {
    let rollableSheetColorsArray = [];
    let Zindex = 99999;
    let oldTrackZindex = 10;
    let oldColorZindex = 11;
    let newTrackZindex = oldTrackZindex + Zindex;
    let newColorZindex = oldColorZindex + Zindex;
  
    let colorPickerData = `
    <div id="colorPicker">
    <a class="color"><div class="colorInner"></div></a>
    <div class="track"></div>
    <ul class="dropdown"><li></li></ul>
    <input type="hidden" class="colorInput"/>
    </div>
  `;
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    rollableSheetColorsArray.push(SETTING_COLOR_ATTRIBUTES[0]);
    rollableSheetColorsArray.push(SETTING_COLOR_ATTRIBUTES[1]);
    rollableSheetColorsArray.push(SETTING_COLOR_DODGE[0]);
    rollableSheetColorsArray.push(SETTING_COLOR_DODGE[1]);
    rollableSheetColorsArray.push(SETTING_COLOR_DAMAGE[0]);
    rollableSheetColorsArray.push(SETTING_COLOR_DAMAGE[1]);
    rollableSheetColorsArray.push(SETTING_COLOR_BLOCK[0]);
    rollableSheetColorsArray.push(SETTING_COLOR_BLOCK[1]);
    rollableSheetColorsArray.push(SETTING_COLOR_PARRY[0]);
    rollableSheetColorsArray.push(SETTING_COLOR_PARRY[1]);
    rollableSheetColorsArray.push(SETTING_COLOR_WEAPONS[0]);
    rollableSheetColorsArray.push(SETTING_COLOR_WEAPONS[1]);
    rollableSheetColorsArray.push(SETTING_COLOR_SKILLS[0]);
    rollableSheetColorsArray.push(SETTING_COLOR_SKILLS[1]);
    rollableSheetColorsArray.push(SETTING_COLOR_SPELLS[0]);
    rollableSheetColorsArray.push(SETTING_COLOR_SPELLS[1]);
    rollableSheetColorsArray.push(SETTING_COLOR_GURPSLINK[0]);
    rollableSheetColorsArray.push(SETTING_COLOR_GURPSLINK[1]);

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    rollableSheetColorsArray.forEach(function(rollableSheetColors) {
      $(`input[name="${SYSTEM_NAME}.${rollableSheetColors}"]`).before(`<div class="${rollableSheetColors}">` + colorPickerData + "</div>");
  
      $(`.${rollableSheetColors} #colorPicker`).tinycolorpicker();
    
      $(`.${rollableSheetColors} .colorInner`).on("click", function () {
        $('#colorPicker .track').hide();
        $(`.${rollableSheetColors} #colorPicker .track`).show();
        $("#colorPicker .color").css("z-index", oldColorZindex);
        $("#colorPicker .track").css("z-index", oldTrackZindex);
        $(`.${rollableSheetColors} .color`).css("z-index", newColorZindex);
        $(`.${rollableSheetColors} .track`).css("z-index", newTrackZindex);
      })
    
      $(`.${rollableSheetColors} canvas`).on("click", function () {
        $(`input[name="${SYSTEM_NAME}.${rollableSheetColors}"]`).val($(`.${rollableSheetColors} .colorInput`).val());
      })
    
      $(`.${rollableSheetColors} .color`).css("background-color", $(`input[name="${SYSTEM_NAME}.${rollableSheetColors}"]`).val());
      $(`input[name="${SYSTEM_NAME}.${rollableSheetColors}"]`).hide();
    })
  
    $('button[name="reset"]').on("click", function () {
      if ($('#client-settings a').eq(2).hasClass('active')) {
        rollableSheetColorsArray.forEach(function(rollableSheetColors) {
          $(`.${rollableSheetColors} .colorInner`).css("background-color", $(`input[name="${SYSTEM_NAME}.${rollableSheetColors}"]`).val());
        });
      }
    })
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  }

  export function colorGurpsActorSheet() {
    var textColor = "";
  /*
    let textAttributesColor = "";
    let textDodgeColor = "";
    let textDamageColor = "";
    let textBlockColor = "";
    let textParryColor = "";
    let textWeaponsColor = "";
    let textSkillsColor = "";
    let textSpellsColor = "";
    let textGurpsLinksColor = "";
  */

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Atributes
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    if (game.settings.get(SYSTEM_NAME, SETTING_COLOR_ATTRIBUTES[2])) {
      textColor = "#000000 !important"
    } else {
      textColor = "#ffffff !important"
    }
    $("#attributes").on("mouseenter", ".rollable", function() {
      $(this).attr("style", "background-color: " + game.settings.get(SYSTEM_NAME, SETTING_COLOR_ATTRIBUTES[1]) + " !important; color:" + textColor)
    }).on("mouseleave", ".rollable", function() {
      $(this).attr("style", "background-color: " + game.settings.get(SYSTEM_NAME, SETTING_COLOR_ATTRIBUTES[0]) + " !important; color:" + textColor)
    })
    $("#attributes .rollable").attr("style", "background-color: " + game.settings.get(SYSTEM_NAME, SETTING_COLOR_ATTRIBUTES[0]) + " !important; color:" + textColor)
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Dodge
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    if (game.settings.get(SYSTEM_NAME, SETTING_COLOR_DODGE[2])) {
      textColor = "#000000 !important"
    } else {
      textColor = "#ffffff !important"
    }
    $("#encumbrance").on("mouseenter", ".rollable", function() {
      $(this).attr("style", "background-color: " + game.settings.get(SYSTEM_NAME, SETTING_COLOR_DODGE[1]) + " !important; color:" + textColor)
    }).on("mouseleave", ".rollable", function() {
      $(this).attr("style", "background-color: " + game.settings.get(SYSTEM_NAME, SETTING_COLOR_DODGE[0]) + " !important; color:" + textColor)
    })
    $(".dodge.rollable").attr("style", "background-color: " + game.settings.get(SYSTEM_NAME, SETTING_COLOR_DODGE[0]) + " !important; color:" + textColor)
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Damage
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    if (game.settings.get(SYSTEM_NAME, SETTING_COLOR_DAMAGE[2])) {
      textColor = "#000000 !important"
    } else {
      textColor = "#ffffff !important"
    }
    $("#melee, #ranged").on("mouseenter", ".damage.rollable", function() {
      $(this).attr("style", "background-color: " + game.settings.get(SYSTEM_NAME, SETTING_COLOR_DAMAGE[1]) + " !important; color:" + textColor)
    }).on("mouseleave", ".damage.rollable", function() {
      $(this).attr("style", "background-color: " + game.settings.get(SYSTEM_NAME, SETTING_COLOR_DAMAGE[0]) + " !important; color:" + textColor)
    })
    $(".damage.rollable").attr("style", "background-color: " + game.settings.get(SYSTEM_NAME, SETTING_COLOR_DAMAGE[0]) + " !important; color:" + textColor)
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Block
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    if (game.settings.get(SYSTEM_NAME, SETTING_COLOR_BLOCK[2])) {
      textColor = "#000000 !important"
    } else {
      textColor = "#ffffff !important"
    }
    $("#melee, #ranged").on("mouseenter", ".block.rollable", function() {
      $(this).attr("style", "background-color: " + game.settings.get(SYSTEM_NAME, SETTING_COLOR_BLOCK[1]) + " !important; color:" + textColor)
    }).on("mouseleave", ".block.rollable", function() {
      $(this).attr("style", "background-color: " + game.settings.get(SYSTEM_NAME, SETTING_COLOR_BLOCK[0]) + " !important; color:" + textColor)
    })
    $(".block.rollable").attr("style", "background-color: " + game.settings.get(SYSTEM_NAME, SETTING_COLOR_BLOCK[0]) + " !important; color:" + textColor)
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Parry
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    if (game.settings.get(SYSTEM_NAME, SETTING_COLOR_PARRY[2])) {
      textColor = "#000000 !important"
    } else {
      textColor = "#ffffff !important"
    }
    $("#melee, #ranged").on("mouseenter", ".parry.rollable", function() {
      $(this).attr("style", "background-color: " + game.settings.get(SYSTEM_NAME, SETTING_COLOR_PARRY[1]) + " !important; color:" + textColor)
    }).on("mouseleave", ".parry.rollable", function() {
      $(this).attr("style", "background-color: " + game.settings.get(SYSTEM_NAME, SETTING_COLOR_PARRY[0]) + " !important; color:" + textColor)
    })
    $(".parry.rollable").attr("style", "background-color: " + game.settings.get(SYSTEM_NAME, SETTING_COLOR_PARRY[0]) + " !important; color:" + textColor)
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Melee / Ranged
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    if (game.settings.get(SYSTEM_NAME, SETTING_COLOR_WEAPONS[2])) {
      textColor = "#000000 !important"
    } else {
      textColor = "#ffffff !important"
    }
    $("#melee, #ranged").on("mouseenter", ".usage.rollable, .level.rollable", function() {
      $(this).attr("style", "background-color: " + game.settings.get(SYSTEM_NAME, SETTING_COLOR_WEAPONS[1]) + " !important; color:" + textColor)
    }).on("mouseleave", ".usage.rollable, .level.rollable", function() {
      $(this).attr("style", "background-color: " + game.settings.get(SYSTEM_NAME, SETTING_COLOR_WEAPONS[0]) + " !important; color:" + textColor)
    })
    $("#melee .usage.rollable, #melee .level.rollable, #ranged .usage.rollable, #ranged .level.rollable").attr("style", "background-color: " + game.settings.get(SYSTEM_NAME, SETTING_COLOR_WEAPONS[0]) + " !important; color:" + textColor)
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Skills
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    if (game.settings.get(SYSTEM_NAME, SETTING_COLOR_SKILLS[2])) {
      textColor = "#000000 !important"
    } else {
      textColor = "#ffffff !important"
    }
    $("#skills").on("mouseenter", ".parry.rollable", function() {
      $(this).attr("style", "background-color: " + game.settings.get(SYSTEM_NAME, SETTING_COLOR_SKILLS[1]) + " !important; color:" + textColor)
    }).on("mouseleave", ".parry.rollable", function() {
      $(this).attr("style", "background-color: " + game.settings.get(SYSTEM_NAME, SETTING_COLOR_SKILLS[0]) + " !important; color:" + textColor)
    })
    $("#skills .sl.rollable").attr("style", "background-color: " + game.settings.get(SYSTEM_NAME, SETTING_COLOR_SKILLS[0]) + " !important; color:" + textColor)
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Spells
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    if (game.settings.get(SYSTEM_NAME, SETTING_COLOR_SPELLS[2])) {
      textColor = "#000000 !important"
    } else {
      textColor = "#ffffff !important"
    }
    $("#spells").on("mouseenter", ".sl.rollable", function() {
      $(this).attr("style", "background-color: " + game.settings.get(SYSTEM_NAME, SETTING_COLOR_SPELLS[1]) + " !important; color:" + textColor)
    }).on("mouseleave", ".sl.rollable", function() {
      $(this).attr("style", "background-color: " + game.settings.get(SYSTEM_NAME, SETTING_COLOR_SPELLS[0]) + " !important; color:" + textColor)
    })
    $("#spells .sl.rollable").attr("style", "background-color: " + game.settings.get(SYSTEM_NAME, SETTING_COLOR_SPELLS[0]) + " !important; color:" + textColor)
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Ads / Disads
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    if (game.settings.get(SYSTEM_NAME, SETTING_COLOR_GURPSLINK[2])) {
      textColor = "#000000 !important"
    } else {
      textColor = "#ffffff !important"
    }
    $("#advantages").on("mouseenter", ".gurpslink", function() {
      $(this).attr("style", "background-color: " + game.settings.get(SYSTEM_NAME, SETTING_COLOR_GURPSLINK[1]) + " !important; color:" + textColor)
    }).on("mouseleave", ".gurpslink", function() {
      $(this).attr("style", "background-color: " + game.settings.get(SYSTEM_NAME, SETTING_COLOR_GURPSLINK[0]) + " !important; color:" + textColor)
    })
    $("#advantages .gurpslink").attr("style", "background-color: " + game.settings.get(SYSTEM_NAME, SETTING_COLOR_GURPSLINK[0]) + " !important; color:" + textColor)
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  }
