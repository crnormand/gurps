'use strict'

import ChatProcessor from './chat-processor.js'
import { parselink } from '../../lib/parselink.js'
import { i18n } from '../../lib/utilities.js'

export class AnimChatProcessor extends ChatProcessor {
  help() {
    return '/anim &lt;two&gt;'
  }
  matches(line) {  // Since this can get called recursively, we cannot use an instance variable to save the match status
    return line.match(/^\/if (! *)?\[([^\]]+)\] (.*)/)   
  }
  checkTarget() {
     return game.user.targets.size > 0
  }

  drawEffect(effect, fromToken, toTokensArray) {
    for (const to of toTokensArray)
      canvas.fxmaster.drawSpecialToward(effect, fromToken, to);
  }
  
  modulePath() {
    if (game.modules.get("jb2a_patreon")) return "modules/jb2a_patreon/Library"
    if (game.modules.get("JB2A_DnD5e")) return "modules/JB2A_DnD5e/Library"
    return false
  }
  
  errorExit(str) {
    ui.notifications.error(str);
    return false
  }

  async process(line) {
    if (!canvas.fxmaster) return errorExit("This macro depends on the FXMaster module. Make sure it is installed and enabled")
    let path = this.modulePath();
    if (path == false) return errorExit("This macro depends on one of the JB2A modules (free or patreon). Make sure at least one is installed and enabled")
    
    let m = line.match(/^\/if (! *)?\[([^\]]+)\] (.*)/) // Since this can get called recursively, we cannot use an instance variable to save the match status
  
    // Scaled globally for consistency across scenes. Change divisor for size of animation
    let Scale = canvas.scene.data.grid/175;
    var plusOrMinus = Math.random() < 0.5 ? -1 : 1;  // used to randomize Y scale (give different 'looks' for animation)
    
     //File path for the animated asset.
    let file = "modules/jb2a_patreon/Library/Generic/Weapon_Attacks/Melee/";
    
    castSpell({
    //Animated file
      file: `${file}GreatSword01_Fire_Regular_Red_800x600.webm`,
      anchor: {
        x: 0.4,
        y: 0.5,
      },
      speed: 0,
      angle: 0,
      scale: {
        x: Scale,
        y: (Scale * plusOrMinus),
      },
    });
    
    // Add some sound to the effects
    /*
    let soundFile = `sound path here`;
    AudioHelper.play({src: soundFile, volume: 1.0, autoplay: true, loop: false}, true);
    */
    
    // Delete comments to activate token Magic FX. Requires the Token Magic FX Modules to be installed
    /*
    let params =
    [{
        filterType: "images",
        filterId: "myMirrorImages",
        time: 0,
        nbImage: 2,
        alphaImg: 1.0,
        alphaChr: 0.0,
        autoDestroy: true,
        blend: 4,
        ampX: 0.03,
        ampY: 0.03,
        zOrder: 20,
        animated :
        {
          time: 
          { 
            active: true, 
            speed: 0.070, 
            animType: "move", 
            loopDuration: 200,
            loops: 2
          },
           anchorX:
           {
              animType: "chaoticOscillation",
              loopDuration : 100,
              val1: 0.40,
              val2: 0.60,
              loops:4
           } 
    }}];
    await sleepNow(900);
    TokenMagic.addUpdateFiltersOnTargeted(params);
    */
    }
    Cast ()

}



JB2A_FREE_LIBRARY =`1st_Level/Cure_Wounds/CureWounds_01_Blue_200x200.webm
1st_Level/Cure_Wounds/CureWounds_01_Blue_400x400.webm
1st_Level/Entangle/Entangle_01_Brown_400x400.webm
1st_Level/Entangle/Entangle_01_Green_400x400.webm
1st_Level/Entangle/Entangle_01_Yellow_400x400.webm
1st_Level/Entangle/Opacities/Entangle_01_Brown_75OPA_400x400.webm
1st_Level/Entangle/Opacities/Entangle_01_Green_75OPA_400x400.webm
1st_Level/Entangle/Opacities/Entangle_01_Yellow_75OPA_400x400.webm
1st_Level/Fog_Cloud/FogCloud_01_White_800x800.webm
1st_Level/Fog_Cloud/Nametag/FogCloud_01_White_Nametag_800x800.webm
1st_Level/Fog_Cloud/Nametag/Opacities/FogCloud_01_White_Nametag_75OPA_800x800.webm
1st_Level/Fog_Cloud/Opacities/FogCloud_01_White_75OPA_800x800.webm
1st_Level/Guiding_Bolt/GuidingBolt_01_Regular_BlueYellow_30ft_1600x400.webm
1st_Level/Guiding_Bolt/GuidingBolt_01_Regular_BlueYellow_60ft_2800x400.webm
1st_Level/Guiding_Bolt/GuidingBolt_01_Regular_BlueYellow_90ft_4000x400.webm
1st_Level/Hunters_Mark/HuntersMark_01_Regular_Green_Loop_200x200.webm
1st_Level/Hunters_Mark/HuntersMark_01_Regular_Green_Pulse_200x200.webm
1st_Level/Magic_Missile/MagicMissile_01_Regular_Purple_30ft_01_1600x400.webm
1st_Level/Magic_Missile/MagicMissile_01_Regular_Purple_30ft_02_1600x400.webm
1st_Level/Magic_Missile/MagicMissile_01_Regular_Purple_30ft_03_1600x400.webm
1st_Level/Magic_Missile/MagicMissile_01_Regular_Purple_30ft_04_1600x400.webm
1st_Level/Magic_Missile/MagicMissile_01_Regular_Purple_30ft_05_1600x400.webm
1st_Level/Magic_Missile/MagicMissile_01_Regular_Purple_30ft_06_1600x400.webm
1st_Level/Magic_Missile/MagicMissile_01_Regular_Purple_30ft_07_1600x400.webm
1st_Level/Magic_Missile/MagicMissile_01_Regular_Purple_30ft_08_1600x400.webm
1st_Level/Magic_Missile/MagicMissile_01_Regular_Purple_30ft_09_1600x400.webm
1st_Level/Magic_Missile/MagicMissile_01_Regular_Purple_60ft_01_2800x400.webm
1st_Level/Magic_Missile/MagicMissile_01_Regular_Purple_60ft_02_2800x400.webm
1st_Level/Magic_Missile/MagicMissile_01_Regular_Purple_60ft_03_2800x400.webm
1st_Level/Magic_Missile/MagicMissile_01_Regular_Purple_60ft_04_2800x400.webm
1st_Level/Magic_Missile/MagicMissile_01_Regular_Purple_60ft_05_2800x400.webm
1st_Level/Magic_Missile/MagicMissile_01_Regular_Purple_60ft_06_2800x400.webm
1st_Level/Magic_Missile/MagicMissile_01_Regular_Purple_60ft_07_2800x400.webm
1st_Level/Magic_Missile/MagicMissile_01_Regular_Purple_60ft_08_2800x400.webm
1st_Level/Magic_Missile/MagicMissile_01_Regular_Purple_60ft_09_2800x400.webm
1st_Level/Thunderwave/Thunderwave_01_Bright_Blue_BLeft_600x600.webm
1st_Level/Thunderwave/Thunderwave_01_Bright_Blue_BMid_600x600.webm
1st_Level/Thunderwave/Thunderwave_01_Bright_Blue_Center_600x600.webm
1st_Level/Witch_Bolt/WitchBolt_01_Regular_Blue_15ft_1000x400.webm
1st_Level/Witch_Bolt/WitchBolt_01_Regular_Blue_30ft_1600x400.webm
2nd_Level/Cloud_Of_Daggers/CloudOfDaggers_01_Light_Blue_400x400.webm
2nd_Level/Cloud_Of_Daggers/CloudOfDaggers_01_Light_Green_400x400.webm
2nd_Level/Cloud_Of_Daggers/CloudOfDaggers_01_Light_Orange_400x400.webm
2nd_Level/Cloud_Of_Daggers/CloudOfDaggers_01_Light_Purple_400x400.webm
2nd_Level/Cloud_Of_Daggers/CloudOfDaggers_01_Light_Red_400x400.webm
2nd_Level/Cloud_Of_Daggers/CloudOfDaggers_01_Light_Yellow_400x400.webm
2nd_Level/Darkness/Darkness_01_Black_600x600.webm
2nd_Level/Darkness/Darkness_01_Green_600x600.webm
2nd_Level/Darkness/Nametag/Darkness_01_Black_Nametag_600x600.webm
2nd_Level/Darkness/Nametag/Darkness_01_Green_Nametag_600x600.webm
2nd_Level/Darkness/Nametag/Opacities/Darkness_01_Black_Nametag_75OPA_600x600.webm
2nd_Level/Darkness/Nametag/Opacities/Darkness_01_Green_Nametag_75OPA_600x600.webm
2nd_Level/Darkness/Opacities/Darkness_01_Black_75OPA_600x600.webm
2nd_Level/Darkness/Opacities/Darkness_01_Green_75OPA_600x600.webm
2nd_Level/Flaming_Sphere/FlamingSphere_01_Blue_200x200.webm
2nd_Level/Flaming_Sphere/FlamingSphere_01_Green_200x200.webm
2nd_Level/Flaming_Sphere/FlamingSphere_01_Orange_200x200.webm
2nd_Level/Flaming_Sphere/FlamingSphere_01_Pink_200x200.webm
2nd_Level/Flaming_Sphere/FlamingSphere_01_Purple_200x200.webm
2nd_Level/Flaming_Sphere/FlamingSphere_01_Red_200x200.webm
2nd_Level/Flaming_Sphere/Multicoloured/FlamingSphere_01_GreenToBlue_200x200.webm
2nd_Level/Flaming_Sphere/Multicoloured/FlamingSphere_01_Rainbow_200x200.webm
2nd_Level/Flaming_Sphere/Multicoloured/Opacities/FlamingSphere_01_GreenToBlue_75OPA_200x200.webm
2nd_Level/Flaming_Sphere/Multicoloured/Opacities/FlamingSphere_01_Rainbow_75OPA_200x200.webm
2nd_Level/Flaming_Sphere/Opacities/FlamingSphere_01_Blue_75OPA_200x200.webm
2nd_Level/Flaming_Sphere/Opacities/FlamingSphere_01_Green_75OPA_200x200.webm
2nd_Level/Flaming_Sphere/Opacities/FlamingSphere_01_Orange_75OPA_200x200.webm
2nd_Level/Flaming_Sphere/Opacities/FlamingSphere_01_Pink_75OPA_200x200.webm
2nd_Level/Flaming_Sphere/Opacities/FlamingSphere_01_Purple_75OPA_200x200.webm
2nd_Level/Flaming_Sphere/Opacities/FlamingSphere_01_Red_75OPA_200x200.webm
2nd_Level/Gust_Of_Wind/GustOfWind_01_White_1200x200.webm
2nd_Level/Gust_Of_Wind/Nametag/GustOfWind_01_White_Nametag_1200x200.webm
2nd_Level/Misty_Step/MistyStep_01_Regular_Blue_400x400.webm
2nd_Level/Misty_Step/MistyStep_02_Regular_Blue_400x400.webm
2nd_Level/Scorching_Ray/ScorchingRay_01_Regular_Orange_30ft_1600x400.webm
2nd_Level/Scorching_Ray/ScorchingRay_01_Regular_Orange_60ft_2800x400.webm
2nd_Level/Scorching_Ray/ScorchingRay_01_Regular_Orange_90ft_4000x400.webm
2nd_Level/Shatter/Shatter_01_Blue_400x400.webm
2nd_Level/Spiritual_Weapon/Nametag/SpiritualWeapon_Mace01_01_Flaming_Yellow_Nametag_200x200.webm
2nd_Level/Spiritual_Weapon/Nametag/SpiritualWeapon_Mace01_01_Spectral_Blue_Nametag_200x200.webm
2nd_Level/Spiritual_Weapon/Nametag/SpiritualWeapon_Maul01_01_Flaming_Yellow_Nametag_200x200.webm
2nd_Level/Spiritual_Weapon/Nametag/SpiritualWeapon_Maul01_01_Spectral_Blue_Nametag_200x200.webm
2nd_Level/Spiritual_Weapon/SpiritualWeapon_Mace01_01_Flaming_Yellow_200x200.webm
2nd_Level/Spiritual_Weapon/SpiritualWeapon_Mace01_01_Spectral_Blue_200x200.webm
2nd_Level/Spiritual_Weapon/SpiritualWeapon_Maul01_01_Flaming_Yellow_200x200.webm
2nd_Level/Spiritual_Weapon/SpiritualWeapon_Maul01_01_Spectral_Blue_200x200.webm
2nd_Level/Web/Nametag/Opacities/Web_01_White_01_Nametag_75OPA_400x400.webm
2nd_Level/Web/Nametag/Opacities/Web_01_White_02_Nametag_75OPA_400x400.webm
2nd_Level/Web/Nametag/Web_01_White_01_Nametag_400x400.webm
2nd_Level/Web/Nametag/Web_01_White_02_Nametag_400x400.webm
2nd_Level/Web/Opacities/Web_01_White_01_75OPA_400x400.webm
2nd_Level/Web/Opacities/Web_01_White_02_75OPA_400x400.webm
2nd_Level/Web/Web_01_White_01_400x400.webm
2nd_Level/Web/Web_01_White_02_400x400.webm
3rd_Level/Call_Lightning/Banners/CallLightning_01_Blue_Banner_1000x100.webm
3rd_Level/Call_Lightning/CallLightning_01_BlueOrange_1000x1000.webm
3rd_Level/Call_Lightning/CallLightning_01_Blue_1000x1000.webm
3rd_Level/Call_Lightning/CallLightning_01_Green_1000x1000.webm
3rd_Level/Call_Lightning/CallLightning_01_PinkYellow_1000x1000.webm
3rd_Level/Call_Lightning/CallLightning_01_Purple_1000x1000.webm
3rd_Level/Call_Lightning/CallLightning_01_Red_1000x1000.webm
3rd_Level/Call_Lightning/CallLightning_01_Yellow_1000x1000.webm
3rd_Level/Call_Lightning/High_Res/Banners/CallLightning_01_Blue_Banner_1920x100.webm
3rd_Level/Call_Lightning/High_Res/CallLightning_01_BlueOrange_2400x2400.webm
3rd_Level/Call_Lightning/High_Res/CallLightning_01_Blue_2400x2400.webm
3rd_Level/Call_Lightning/High_Res/CallLightning_01_Purple_2400x2400.webm
3rd_Level/Call_Lightning/High_Res/CallLightning_01_Red_2400x2400.webm
3rd_Level/Call_Lightning/High_Res/CallLightning_01_Yellow_2400x2400.webm
3rd_Level/Call_Lightning/High_Res/Opacities/CallLightning_01_Blue_75OPA_2400x2400.webm
3rd_Level/Call_Lightning/High_Res/Opacities/CallLightning_01_Green_75OPA_2400x2400.webm
3rd_Level/Call_Lightning/High_Res/Opacities/CallLightning_01_Purple_75OPA_2400x2400.webm
3rd_Level/Call_Lightning/High_Res/Opacities/CallLightning_01_Red_75OPA_2400x2400.webm
3rd_Level/Call_Lightning/High_Res/Opacities/CallLightning_01_Yellow_75OPA_2400x2400.webm
3rd_Level/Call_Lightning/Opacities/CallLightning_01_BlueOrange_75OPA_1000x1000.webm
3rd_Level/Call_Lightning/Opacities/CallLightning_01_Blue_75OPA_1000x1000.webm
3rd_Level/Call_Lightning/Opacities/CallLightning_01_Green_75OPA_1000x1000.webm
3rd_Level/Call_Lightning/Opacities/CallLightning_01_PinkYellow_75OPA_1000x1000.webm
3rd_Level/Call_Lightning/Opacities/CallLightning_01_Purple_75OPA_1000x1000.webm
3rd_Level/Call_Lightning/Opacities/CallLightning_01_Red_75OPA_1000x1000.webm
3rd_Level/Call_Lightning/Opacities/CallLightning_01_Yellow_75OPA_1000x1000.webm
3rd_Level/Sleet_Storm/Opacities/SleetStorm_01_Blue_100OPA_800x800.webm
3rd_Level/Sleet_Storm/SleetStorm_01_Blue_800x800.webm
3rd_Level/Spirit_Guardians/SpiritGuardians_01_Light_BlueYellow_600x600.webm
3rd_Level/Wind_Wall/WindWall_01_100x100.webm
3rd_Level/Wind_Wall/WindWall_01_200x100.webm
3rd_Level/Wind_Wall/WindWall_01_300x100.webm
3rd_Level/Wind_Wall/WindWall_01_500x100.webm
3rd_Level/Wind_Wall/WindWall_01_75OPA_100x100.webm
3rd_Level/Wind_Wall/WindWall_01_75OPA_200x100.webm
3rd_Level/Wind_Wall/WindWall_01_75OPA_300x100.webm
3rd_Level/Wind_Wall/WindWall_01_75OPA_500x100.webm
4th_Level/Wall_Of_Fire/Opacities/WallOfFire_01_Blue_75OPA_100x100.webm
4th_Level/Wall_Of_Fire/Opacities/WallOfFire_01_Blue_75OPA_200x100.webm
4th_Level/Wall_Of_Fire/Opacities/WallOfFire_01_Blue_75OPA_300x100.webm
4th_Level/Wall_Of_Fire/Opacities/WallOfFire_01_Blue_75OPA_500x100.webm
4th_Level/Wall_Of_Fire/Opacities/WallOfFire_01_Blue_Ring_75OPA_400x400.webm
4th_Level/Wall_Of_Fire/Opacities/WallOfFire_01_Yellow_75OPA_100x100.webm
4th_Level/Wall_Of_Fire/Opacities/WallOfFire_01_Yellow_75OPA_200x100.webm
4th_Level/Wall_Of_Fire/Opacities/WallOfFire_01_Yellow_75OPA_300x100.webm
4th_Level/Wall_Of_Fire/Opacities/WallOfFire_01_Yellow_75OPA_500x100.webm
4th_Level/Wall_Of_Fire/Opacities/WallOfFire_01_Yellow_Ring_75OPA_400x400.webm
4th_Level/Wall_Of_Fire/WallOfFire_01_Blue_100x100.webm
4th_Level/Wall_Of_Fire/WallOfFire_01_Blue_200x100.webm
4th_Level/Wall_Of_Fire/WallOfFire_01_Blue_300x100.webm
4th_Level/Wall_Of_Fire/WallOfFire_01_Blue_500x100.webm
4th_Level/Wall_Of_Fire/WallOfFire_01_Blue_Ring_400x400.webm
4th_Level/Wall_Of_Fire/WallOfFire_01_Yellow_100x100.webm
4th_Level/Wall_Of_Fire/WallOfFire_01_Yellow_200x100.webm
4th_Level/Wall_Of_Fire/WallOfFire_01_Yellow_300x100.webm
4th_Level/Wall_Of_Fire/WallOfFire_01_Yellow_500x100.webm
4th_Level/Wall_Of_Fire/WallOfFire_01_Yellow_Ring_400x400.webm
5th_Level/Antilife_Shell/AntilifeShell_01_Blue_Circle_400x400.webm
5th_Level/Antilife_Shell/AntilifeShell_01_Blue_NoCircle_400x400.webm
5th_Level/Antilife_Shell/NameTag/AntilifeShell_01_Blue_Circle_Nametag_400x400.webm
5th_Level/Antilife_Shell/NameTag/AntilifeShell_01_Blue_NoCircle_Nametag_400x400.webm
5th_Level/Arcane_Hand/ArcaneHand_Human_01_Idle_Blue_400x400.webm
5th_Level/Arcane_Hand/ArcaneHand_Human_01_Idle_Green_400x400.webm
5th_Level/Arcane_Hand/ArcaneHand_Human_01_Idle_Purple_400x400.webm
5th_Level/Arcane_Hand/ArcaneHand_Human_01_Idle_Red_400x400.webm
5th_Level/Arcane_Hand/NameTag/ArcaneHand_Human_01_Idle_Blue_Nametag_400x400.webm
5th_Level/Arcane_Hand/NameTag/ArcaneHand_Human_01_Idle_Green_Nametag_400x400.webm
5th_Level/Arcane_Hand/NameTag/ArcaneHand_Human_01_Idle_Purple_Nametag_400x400.webm
5th_Level/Arcane_Hand/NameTag/ArcaneHand_Human_01_Idle_Red_Nametag_400x400.webm
5th_Level/Wall_Of_Force/WallOfForce_01_Grey_H_200x200.webm
5th_Level/Wall_Of_Force/WallOfForce_01_Grey_Sphere_400x400.webm
5th_Level/Wall_Of_Force/WallOfForce_01_Grey_V_200x25.webm
6th_Level/Disintegrate/Disintegrate_01_Regular_Green01_15ft_1000x400.webm
6th_Level/Disintegrate/Disintegrate_01_Regular_Green01_30ft_1600x400.webm
6th_Level/Disintegrate/Disintegrate_01_Regular_Green01_45ft_2200x400.webm
7th_Level/Whirlwind/Whirlwind_01_BlueGrey_01_400x400.webm
Cantrip/Dancing_Lights/DancingLights_01_BlueTeal_200x200.webm
Cantrip/Dancing_Lights/DancingLights_01_BlueYellow_200x200.webm
Cantrip/Dancing_Lights/DancingLights_01_Green_200x200.webm
Cantrip/Dancing_Lights/DancingLights_01_Pink_200x200.webm
Cantrip/Dancing_Lights/DancingLights_01_PurpleGreen_200x200.webm
Cantrip/Dancing_Lights/DancingLights_01_Red_200x200.webm
Cantrip/Dancing_Lights/DancingLights_01_Yellow_200x200.webm
Cantrip/Dancing_Lights/NameTag/DancingLights_01_BlueTeal_Nametag_200x200.webm
Cantrip/Dancing_Lights/NameTag/DancingLights_01_BlueYellow_Nametag_200x200.webm
Cantrip/Dancing_Lights/NameTag/DancingLights_01_Green_Nametag_200x200.webm
Cantrip/Dancing_Lights/NameTag/DancingLights_01_Pink_Nametag_200x200.webm
Cantrip/Dancing_Lights/NameTag/DancingLights_01_PurpleGreen_Nametag_200x200.webm
Cantrip/Dancing_Lights/NameTag/DancingLights_01_Red_Nametag_200x200.webm
Cantrip/Dancing_Lights/NameTag/DancingLights_01_Yellow_Nametag_200x200.webm
Cantrip/Eldritch_Blast/EldritchBlast_01_Regular_Purple_30ft_1600x400.webm
Cantrip/Eldritch_Blast/EldritchBlast_01_Regular_Purple_60ft_2800x400.webm
Cantrip/Eldritch_Blast/EldritchBlast_01_Regular_Purple_90ft_4000x400.webm
Cantrip/Fire_Bolt/FireBolt_01_Regular_Orange_30ft_1600x400.webm
Cantrip/Fire_Bolt/FireBolt_01_Regular_Orange_60ft_2800x400.webm
Cantrip/Fire_Bolt/FireBolt_01_Regular_Orange_90ft_4000x400.webm
Cantrip/Ray_Of_Frost/RayOfFrost_01_Regular_Blue_15ft_1000x400.webm
Cantrip/Ray_Of_Frost/RayOfFrost_01_Regular_Blue_30ft_1600x400.webm
Cantrip/Ray_Of_Frost/RayOfFrost_01_Regular_Blue_45ft_2200x400.webm
Generic/Butterflies/Butterflies_01_Regular_Orange_Few_400x400.webm
Generic/Butterflies/Butterflies_01_Regular_Orange_Many_400x400.webm
Generic/Butterflies/Butterflies_01_Regular_Orange_Single_400x400.webm
Generic/Conditions/Dizzy_Stars/DizzyStars_01_BlueOrange_200x200.webm
Generic/Conditions/Dizzy_Stars/DizzyStars_01_BlueOrange_400x400.webm
Generic/Creature/Bite_01_Regular_Red_200x200.webm
Generic/Creature/Bite_01_Regular_Red_400x400.webm
Generic/Creature/Claws_01_Regular_Red_200x200.webm
Generic/Creature/Claws_01_Regular_Red_400x400.webm
Generic/Explosion/Explosion_01_Orange_400x400.webm
Generic/Explosion/Explosion_02_Blue_400x400.webm
Generic/Explosion/Explosion_03_Regular_BlueYellow_400x400.webm
Generic/Fire/Brazier/Brazier_01_Wall_Orange_05x05ft_200x200.webm
Generic/Fire/Brazier/Brazier_01_Wall_Orange_10x05ft_400x200.webm
Generic/Fire/Brazier/Brazier_01_Wall_Orange_10x10ft_400x400.webm
Generic/Fire/Campfire/Bonfire_01_Regular_Orange_400x400.webm
Generic/Fire/Campfire/Campfire_01_Regular_Orange_200x200.webm
Generic/Fire/FireJet_01_Orange_15ft_600x200.webm
Generic/Fire/FireJet_01_Orange_30ft_1200x200.webm
Generic/Fire/FireRing_01_Circle_Red_500.webm
Generic/Fire/FireRing_01_Circle_Red_900.webm
Generic/Fire/Flame/Flames_01_Regular_Orange_200x200.webm
Generic/Fire/Flame/Flames_02_Regular_Orange_400x400.webm
Generic/Fire/ScorchedEarth_01_Black_800x800.webm
Generic/Fireflies/Fireflies_01_Green_Few01_400x400.webm
Generic/Fireflies/Fireflies_01_Green_Few02_400x400.webm
Generic/Fireflies/Fireflies_01_Green_Many01_400x400.webm
Generic/Fireflies/Fireflies_01_Green_Many02_400x400.webm
Generic/FootPrint/ShoePrint_01_Black_200x200.webm
Generic/FootPrint/ShoePrint_01_Grey_200x200.webm
Generic/Healing/HealingAbility_01_Blue_200x200.webm
Generic/Healing/HealingAbility_01_Blue_400x400.webm
Generic/Healing/HealingAbility_01_Green_200x200.webm
Generic/Healing/HealingAbility_01_Green_400x400.webm
Generic/Healing/HealingAbility_01_Purple_200x200.webm
Generic/Healing/HealingAbility_01_Purple_400x400.webm
Generic/Healing/HealingAbility_01_Yellow_200x200.webm
Generic/Healing/HealingAbility_01_Yellow_400x400.webm
Generic/Ice/IceSpikesRadialBurst_01_Regular_White_1000x1000.webm
Generic/Ice/IceSpikesRadialLoop_01_Regular_White_1000x1000.webm
Generic/Ice/IceSpikesWallBurst_01_Regular_White_600x1000.webm
Generic/Ice/IceSpikesWallLoop_01_Regular_White_600x1000.webm
Generic/Impact/Impact_01_Regular_Blue_400x400.webm
Generic/Impact/Impact_02_Regular_Blue_400x400.webm
Generic/Impact/Impact_03_Regular_Blue_400x400.webm
Generic/Impact/Impact_04_Regular_Blue_400x400.webm
Generic/Item/IounStone_01_Absorption_Purple_200x200.webm
Generic/Item/IounStone_01_Agility_Red_200x200.webm
Generic/Item/IounStone_01_Awarness_Blue_200x200.webm
Generic/Item/IounStone_01_Fortitude_Pink_200x200.webm
Generic/Item/IounStone_01_GreatAbsorption_Purple_200x200.webm
Generic/Item/IounStone_01_Insight_Blue_200x200.webm
Generic/Item/IounStone_01_Intellect_Red_200x200.webm
Generic/Item/IounStone_01_Leadership_Pink_200x200.webm
Generic/Item/IounStone_01_Mastery_Green_200x200_200x200.webm
Generic/Item/IounStone_01_Protection_Pink_200x200.webm
Generic/Item/IounStone_01_Regeneration_White_200x200.webm
Generic/Item/IounStone_01_Reserve_Purple_200x200.webm
Generic/Item/IounStone_01_Strength_Blue_200x200.webm
Generic/Item/IounStone_01_Sustenance_White_200x200.webm
Generic/Item/SphereOfAnnihilation_01_Regular_Purple_200x200.webm
Generic/Item/SphereOfAnnihilation_01_Regular_Purple_600x600.webm
Generic/Lightning/ElectricArc01_01_Regular_Blue_1600x500.webm
Generic/Lightning/ElectricArc02_01_Regular_Blue_1600x500.webm
Generic/Lightning/ElectricArc03_01_Regular_Blue_1600x500.webm
Generic/Lightning/ElectricArc04_01_Regular_Blue_1600x500.webm
Generic/Lightning/LightningStrike_01a_800x800.webm
Generic/Lightning/LightningStrike_01b_800x800.webm
Generic/Magic_Signs/Abjuration_01_Blue_Circle_800x800.webm
Generic/Magic_Signs/Conjuration_01_Yellow_Circle_800x800.webm
Generic/Magic_Signs/Divination_01_Light_Blue_Circle_800x800.webm
Generic/Magic_Signs/NameTag/Abjuration_01_Blue_Circle_Nametag_800x800.webm
Generic/Magic_Signs/NameTag/Conjuration_01_Yellow_Circle_Nametag_800x800.webm
Generic/Magic_Signs/NameTag/Divination_01_Light_Blue_Circle_Nametag_800x800.webm
Generic/Music_Notation/BassClef_01_Regular_Blue_200x200.webm
Generic/Music_Notation/BeamedQuavers_01_Regular_Blue_200x200.webm
Generic/Music_Notation/Crotchet_01_Regular_Blue_200x200.webm
Generic/Music_Notation/Flat_01_Regular_Blue_200x200.webm
Generic/Music_Notation/Quaver_01_Regular_Blue_200x200.webm
Generic/Music_Notation/Sharp_01_Regular_Blue_200x200.webm
Generic/Music_Notation/TrebleClef_01_Regular_Blue_200x200.webm
Generic/Portals/Portal_Bright_Yellow_H_400x400.webm
Generic/Portals/Portal_Bright_Yellow_V_400x250.webm
Generic/Smoke/Fumes_02_Steam_White_400x400.webm
Generic/Smoke/Opacities/Fumes_02_Steam_White_30OPA_400x400.webm
Generic/Smoke/Opacities/Fumes_02_Steam_White_50OPA_400x400.webm
Generic/Twinkling_Stars/TwinklingStars_04_100x100.webm
Generic/Twinkling_Stars/TwinklingStars_04_Orange_100x100.webm
Generic/Twinkling_Stars/TwinklingStars_05_100x100.webm
Generic/Twinkling_Stars/TwinklingStars_05_Orange_100x100.webm
Generic/Twinkling_Stars/TwinklingStars_06_100x100.webm
Generic/Twinkling_Stars/TwinklingStars_06_Orange_100x100.webm
Generic/Twinkling_Stars/TwinklingStars_07_100x100.webm
Generic/Twinkling_Stars/TwinklingStars_07_Orange_100x100.webm
Generic/Twinkling_Stars/TwinklingStars_08_100x100.webm
Generic/Twinkling_Stars/TwinklingStars_08_Orange_100x100.webm
Generic/Twinkling_Stars/TwinklingStars_09_100x100.webm
Generic/Twinkling_Stars/TwinklingStars_09_Orange_100x100.webm
Generic/UI/3Chevrons_01_Regular_Yellow_200x200.webm
Generic/UI/Critical_02_Red_200x200.webm
Generic/UI/Indicator_01_Regular_Yellow_200x200.webm
Generic/UI/Miss_02_White_200x200.webm
Generic/Unarmed_Attacks/Flurry_Of_Blows/FlurryOfBlows_01_Regular_Blue_Magical01_800x600.webm
Generic/Unarmed_Attacks/Flurry_Of_Blows/FlurryOfBlows_01_Regular_Blue_Magical02_800x600.webm
Generic/Unarmed_Attacks/Flurry_Of_Blows/FlurryOfBlows_01_Regular_Blue_Physical01_800x600.webm
Generic/Unarmed_Attacks/Unarmed_Strike/UnarmedStrike_01_Regular_Blue_Magical01_800x600.webm
Generic/Unarmed_Attacks/Unarmed_Strike/UnarmedStrike_01_Regular_Blue_Magical02_800x600.webm
Generic/Unarmed_Attacks/Unarmed_Strike/UnarmedStrike_01_Regular_Blue_Physical01_800x600.webm
Generic/Unarmed_Attacks/Unarmed_Strike/UnarmedStrike_01_Regular_Blue_Physical02_800x600.webm
Generic/Weapon_Attacks/Melee/Dagger02_01_Regular_White_800x600.webm
Generic/Weapon_Attacks/Melee/GreatAxe01_01_Regular_White_800x600.webm
Generic/Weapon_Attacks/Melee/GreatClub01_01_Regular_White_800x600.webm
Generic/Weapon_Attacks/Melee/GreatSword01_01_Regular_White_800x600.webm
Generic/Weapon_Attacks/Melee/HandAxe02_01_Regular_White_800x600.webm
Generic/Weapon_Attacks/Melee/LaserSword01_01_Regular_Blue_800x600.webm
Generic/Weapon_Attacks/Melee/Mace01_01_Regular_White_800x600.webm
Generic/Weapon_Attacks/Melee/Maul01_01_Regular_White_800x600.webm
Generic/Weapon_Attacks/Melee/Rapier01_01_Regular_White_800x600.webm
Generic/Weapon_Attacks/Melee/Spear01_01_Regular_White_800x600.webm
Generic/Weapon_Attacks/Melee/Sword01_01_Regular_White_800x600.webm
Generic/Weapon_Attacks/Ranged/Arrow01_01_Regular_White_30ft_1600x400.webm
Generic/Weapon_Attacks/Ranged/Arrow01_01_Regular_White_60ft_2800x400.webm
Generic/Weapon_Attacks/Ranged/Arrow01_01_Regular_White_90ft_4000x400.webm
Generic/Weapon_Attacks/Ranged/Dagger01_01_Regular_White_15ft_1000x400.webm
Generic/Weapon_Attacks/Ranged/Dagger01_01_Regular_White_30ft_1600x400.webm
Generic/Weapon_Attacks/Ranged/Dagger01_01_Regular_White_45ft_2200x400.webm
Generic/Weapon_Attacks/Ranged/LaserShot_01_Regular_Blue_30ft_1600x400.webm
Generic/Weapon_Attacks/Ranged/LaserShot_01_Regular_Blue_60ft_2800x400.webm
Generic/Weapon_Attacks/Ranged/LaserShot_01_Regular_Blue_90ft_4000x400.webm
Generic/Weapon_Attacks/Ranged/LaserShot_01_Regular_Green_30ft_1600x400.webm
Generic/Weapon_Attacks/Ranged/LaserShot_01_Regular_Green_60ft_2800x400.webm
Generic/Weapon_Attacks/Ranged/LaserShot_01_Regular_Green_90ft_4000x400.webm
Generic/Weapon_Attacks/Ranged/LaserShot_01_Regular_Orange_30ft_1600x400.webm
Generic/Weapon_Attacks/Ranged/LaserShot_01_Regular_Orange_60ft_2800x400.webm
Generic/Weapon_Attacks/Ranged/LaserShot_01_Regular_Orange_90ft_4000x400.webm
Generic/Weapon_Attacks/Ranged/LaserShot_01_Regular_Red_30ft_1600x400.webm
Generic/Weapon_Attacks/Ranged/LaserShot_01_Regular_Red_60ft_2800x400.webm
Generic/Weapon_Attacks/Ranged/LaserShot_01_Regular_Red_90ft_4000x400.webm
Generic/Wind/WindStreams_01_White_20OPA_1200x1200.webm
TMFX/Border/Circle/BorderInPulse_01_Circle_Normal_500.webm
TMFX/Border/Circle/BorderInPulse_02_Circle_Normal_500.webm
TMFX/Border/Circle/BorderOutPulse_01_Circle_Normal_500.webm
TMFX/Border/Circle/BorderOutPulse_02_Circle_Normal_500.webm
TMFX/Border/Circle/BorderSimple_01_Circle_Normal_500.webm
TMFX/Border/Circle/BorderSimple_02_Circle_Normal_500.webm
TMFX/Border/Circle/BorderSimple_03_Circle_Normal_500.webm
TMFX/Border/Circle/BorderSimple_04_Circle_Normal_500.webm
TMFX/InFlow/Circle/InFlow_01_Circle_500x500.webm
TMFX/InPulse/Circle/InPulse_01_Circle_Normal_500.webm
TMFX/InPulse/Circle/InPulse_02_Circle_Normal_500.webm
TMFX/InPulse/Circle/InPulse_03_Circle_Normal_500.webm
TMFX/InPulse/Circle/InPulse_04_Circle_Normal_500.webm
TMFX/OutFlow/Circle/OutFlow_01_Circle_500x500.webm
TMFX/OutFlow/Circle/OutFlow_01_Cone_500x500.webm
TMFX/OutPulse/Circle/OutPulse_01_Circle_Normal_500.webm
TMFX/OutPulse/Circle/OutPulse_02_Circle_Normal_500.webm
TMFX/OutPulse/Circle/OutPulse_03_Circle_Normal_500.webm
TMFX/OutPulse/Circle/OutPulse_04_Circle_Normal_500.webm
TMFX/OutPulse/Cone/OutPulse_01_Cone_Normal_500.webm
TMFX/OutPulse/Cone/OutPulse_02_Cone_Normal_500.webm
TMFX/OutPulse/Cone/OutPulse_03_Cone_Normal_500.webm
TMFX/OutPulse/Cone/OutPulse_04_Cone_Normal_500.webm
TMFX/OutPulse/Line/OutPulse_01_Line_Normal_500.webm
TMFX/OutPulse/Line/OutPulse_02_Line_Normal_500.webm
TMFX/OutPulse/Line/OutPulse_03_Line_Normal_500.webm
TMFX/OutPulse/Line/OutPulse_04_Line_Normal_500.webm
TMFX/Radar/Circle/RadarLoop_01_Circle_Normal_500x500.webm
TMFX/Radar/Circle/RadarPulse_01_Circle_Normal_500x500.webm
TMFX/Runes/Circle/AbjurationSimple_01_Circle_Normal_500.webm
TMFX/Runes/Circle/ConjurationSimple_01_Circle_Normal_500.webm
TMFX/Runes/Circle/DivinationSimple_01_Circle_Normal_500.webm
TMFX/Runes/Circle/EnchantmentSimple_01_Circle_Normal_500.webm
TMFX/Runes/Circle/EvocationSimple_01_Circle_Normal_500.webm
TMFX/Runes/Circle/IllusionSimple_01_Circle_Normal_500.webm
TMFX/Runes/Circle/NecromancySimple_01_Circle_Normal_500.webm
TMFX/Runes/Circle/TransmutationSimple_01_Circle_Normal_500.webm`

