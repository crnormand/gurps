'use strict'

import { extractP } from '../../lib/utilities.js'

export const LIMB = 'limb'
export const EXTREMITY = 'extremity'

const hitLocationAlias = {
  "Eyes": { RAW: "Eye" },
  "Arm": { prefix: ["Right", "Left"] },
  "Arms": { RAW: "Arm", prefix: ["Right", "Left"] },
  "Legs": { RAW: "Leg", prefix: ["Right", "Left"] },
  "Leg": { RAW: "Leg", prefix: ["Right", "Left"] },
  "Hands": { RAW: "Hand" },
  "Feet": { RAW: "Foot" },
  "Hindleg": { RAW: "Hind Leg" },
  "Midleg": { RAW: "Mid Leg" },
}

export class HitLocation {
  constructor(isFoundryGCA = false) {
    this._isFoundryGCA = isFoundryGCA
    this.dr = ''
    this.equipment = ''
    this.penalty = ''
    this.roll = ''
    this.where = ''
  }

  /**
   * Given a bodyplan, return the associated hit location table. (Default to 'humanoid').
   * 
   * @param {String} bodyplan 
   */
  static getHitLocationRolls(bodyplan) {
    if (!bodyplan) {
      bodyplan = 'humanoid'
    }

    let table = hitlocationDictionary[bodyplan]
    return (!!table) ? table : hitlocationDictionary['humanoid']
  }

  setEquipment(frmttext) {
    let e = extractP(frmttext)
    this.equipment = e.trim().replace('\n', ', ')
  }

  /**
   * Translates this HitLocation to one or more RAW/canonical HitLocations
   * as needed.
   * 
   * @returns array of HitLocation
   */
  get locations() {
    let entry = hitLocationAlias[this.where]
    if (!entry) {
      return [this]
    }

    // replace non-RAW name with RAW name
    let name = (!!entry.RAW) ? entry.RAW : this.where

    let locations = []
    if (!!entry.prefix && this._isFoundryGCA) {
      entry.prefix.forEach(it => {
        let location = new HitLocation()
        location.dr = this.dr
        location.equipment = this.equipment
        location.where = `${it} ${name}`
        locations.push(location)
      })
    } else {
      let location = new HitLocation()
      location.dr = this.dr
      location.equipment = this.equipment
      location.where = name
      locations.push(location)
    }
    return locations
  }
}

const humanoidHitLocations = {
  "Eye": { roll: "-", penalty: -9 },
  "Skull": { roll: "3-4", penalty: -7 },
  "Face": { roll: "5", penalty: -5 },
  "Right Leg": { roll: "6-7", penalty: -2, role: LIMB },
  "Right Arm": { roll: "8", penalty: -2, role: LIMB },
  "Torso": { roll: "9-10", penalty: 0 },
  "Groin": { roll: "11", penalty: -3 },
  "Left Arm": { roll: "12", penalty: -2, role: LIMB },
  "Left Leg": { roll: "13-14", penalty: -2, role: LIMB },
  "Hand": { roll: "15", penalty: -4, role: EXTREMITY },
  "Foot": { roll: "16", penalty: -4, role: EXTREMITY },
  "Neck": { roll: "17-18", penalty: -5 },
  "Vitals": { roll: "-", penalty: -3 }
}

const quadrupedHitLocations = {
  "Eye": { roll: "-", penalty: -9 },
  "Skull": { roll: "3-4", penalty: -7 },
  "Face": { roll: "5", penalty: -5 },
  "Neck": { roll: "6", penalty: -5 },
  "Foreleg": { roll: "7-8", penalty: -2, role: LIMB },
  "Torso": { roll: "9-11", penalty: 0 },
  "Groin": { roll: "12", penalty: -3 },
  "Hind Leg": { roll: "13-14", penalty: -2, role: LIMB },
  "Foot": { roll: "15-16", penalty: -4, role: EXTREMITY },
  "Tail": { roll: "17-18", penalty: -3, role: EXTREMITY },
  "Vitals": { roll: "-", penalty: -3 }
}

const avianHitLocations = {
  "Eye": { roll: "-", penalty: -9 },
  "Skull": { roll: "3-4", penalty: -7 },
  "Face": { roll: "5", penalty: -5 },
  "Neck": { roll: "6", penalty: -5 },
  "Wing": { roll: "7-8", penalty: -2, role: LIMB },
  "Torso": { roll: "9-11", penalty: 0 },
  "Groin": { roll: "12", penalty: -3 },
  "Leg": { roll: "13-14", penalty: -2, role: LIMB },
  "Foot": { roll: "15-16", penalty: -4, role: EXTREMITY },
  "Tail": { roll: "17-18", penalty: -3, role: EXTREMITY },
  "Vitals": { roll: "-", penalty: -3 }
};

const centaurHitLocations = {
  "Eye": { roll: "-", penalty: -9 },
  "Skull": { roll: "3-4", penalty: -7 },
  "Neck": { roll: "5", penalty: -5 },
  "Face": { roll: "6", penalty: -5 },
  "Foreleg": { roll: "7-8", penalty: -2, role: LIMB },
  "Torso": { roll: "9-11", penalty: 0 },
  "Groin": { roll: "12", penalty: -3 },
  "Hind Leg": { roll: "13-14", penalty: -2, role: LIMB },
  "Arm": { roll: "15-16", penalty: -2, role: LIMB },
  "Extremity": { roll: "17-18", penalty: -4, role: EXTREMITY },
  "Vitals": { roll: "-", penalty: -3 }
};

const wingedQuadHitLocations = {
  "Eye": { roll: "-", penalty: -9 },
  "Skull": { roll: "3-4", penalty: -7 },
  "Face": { roll: "5", penalty: -5 },
  "Neck": { roll: "6", penalty: -5 },
  "Foreleg": { roll: "7-8", penalty: -2, role: LIMB },
  "Torso": { roll: "9-11", penalty: 0 },
  "Wing": { roll: "12", penalty: -2, role: LIMB },
  "Hind Leg": { roll: "13-14", penalty: -2, role: LIMB },
  "Foot": { roll: "15-16", penalty: -4, role: EXTREMITY },
  "Tail": { roll: "17-18", penalty: -3, role: EXTREMITY },
  "Vitals": { roll: "-", penalty: -3 }
};

const hexapodHitLocations = {
  "Eye": { roll: "-", penalty: -9 },
  "Skull": { roll: "3-4", penalty: -7 },
  "Neck": { roll: "5", penalty: -5 },
  "Face": { roll: "6", penalty: -5 },
  "Foreleg": { roll: "7-8", penalty: -2, role: LIMB },
  "Torso": { roll: "9-10", penalty: 0 },
  "Mid Leg": { roll: "11", penalty: -2, role: LIMB },
  "Groin": { roll: "12", penalty: -3 },
  "Hind Leg": { roll: "13-14", penalty: -2, role: LIMB },
  "Foot": { roll: "15-16", penalty: -4, role: EXTREMITY },
  "Mid Leg*": { roll: "17-18", penalty: -2, role: LIMB },
  "Vitals": { roll: "-", penalty: -3 }
};

const wingedHexHitLocations = {
  "Eye": { roll: "-", penalty: -9 },
  "Skull": { roll: "3-4", penalty: -7 },
  "Neck": { roll: "5", penalty: -5 },
  "Face": { roll: "6", penalty: -5 },
  "Foreleg": { roll: "7-8", penalty: -2, role: LIMB },
  "Torso": { roll: "9-10", penalty: 0 },
  "Mid Leg": { roll: "11", penalty: -2, role: LIMB },
  "Wing": { roll: "12", penalty: -2, role: LIMB },
  "Hind Leg": { roll: "13-14", penalty: -2, role: LIMB },
  "Mid Leg*": { roll: "15-16", penalty: -2, role: LIMB },
  "Foot": { roll: "17-18", penalty: -4, role: EXTREMITY },
  "Vitals": { roll: "-", penalty: -3 }
};

const vermiformHitLocations = {
  "Eye": { roll: "-", penalty: -9 },
  "Skull": { roll: "3-4", penalty: -7 },
  "Face": { roll: "5", penalty: -5 },
  "Neck": { roll: "6-8", penalty: -5 },
  "Torso": { roll: "9-18", penalty: 0 },
  "Vitals": { roll: "-", penalty: -3 }
};

const snakeManHitLocations = {
  "Eye": { roll: "-", penalty: -9 },
  "Skull": { roll: "3-4", penalty: -7 },
  "Face": { roll: "5", penalty: -5 },
  "Neck": { roll: "6", penalty: -5 },
  "Arm": { roll: "7-8", penalty: -2, role: LIMB },
  "Torso": { roll: "9-12", penalty: 0 },
  "Arm*": { roll: "13-14", penalty: -2, role: LIMB },
  "Torso*": { roll: "15-16", penalty: 0 },
  "Hand": { roll: "17-18", penalty: -4, role: EXTREMITY },
  "Vitals": { roll: "-", penalty: -3 }
};

const wingedSerpentHitLocations = {
  "Eye": { roll: "-", penalty: -9 },
  "Skull": { roll: "3-4", penalty: -7 },
  "Face": { roll: "5", penalty: -5 },
  "Neck": { roll: "6-8", penalty: -5 },
  "Torso": { roll: "9-14", penalty: 0 },
  "Wing": { roll: "15-18", penalty: -2, role: LIMB },
  "Vitals": { roll: "-", penalty: -3 }
};

const octopodHitLocations = {
  "Eye": { roll: "-", penalty: -8 },
  "Brain": { roll: "3-4", penalty: -7 },
  "Face": { roll: "5", penalty: -5 },
  "Neck": { roll: "6", penalty: -5 },
  "Arm 1-2": { roll: "7-8", penalty: -2, role: LIMB },
  "Torso": { roll: "9-12", penalty: 0 },
  "Arm 3-4": { roll: "13-14", penalty: -2, role: LIMB },
  "Arm 5-6": { roll: "15-16", penalty: -2, role: LIMB },
  "Arm 7-8": { roll: "17-18", penalty: -2, role: LIMB },
  "Vitals": { roll: "-", penalty: -3 }
}

const squidHitLocations = {
  "Eye": { roll: "-", penalty: -8 },
  "Brain": { roll: "3-4", penalty: -7 },
  "Face": { roll: "5", penalty: -5 },
  "Neck": { roll: "6", penalty: -5 },
  "Arm 1-2": { roll: "7-8", penalty: -2, role: LIMB },
  "Torso": { roll: "9-12", penalty: 0 },
  "Extremity": { roll: "13-16", penalty: -3, role: EXTREMITY },
  "Torso*": { roll: "17-18", penalty: -2 },
  "Vitals": { roll: "-", penalty: -3 }
}

const cancroidHitLocations = {
  "Eye": { roll: "-", penalty: -9 },
  "Skull": { roll: "3-4", penalty: -7 },
  "Face": { roll: "5", penalty: -5 },
  "Neck": { roll: "6", penalty: -5 },
  "Arm": { roll: "7-8", penalty: -2, role: LIMB },
  "Torso": { roll: "9-12", penalty: 0 },
  "Leg": { roll: "13-16", penalty: -2, role: LIMB },
  "Foot": { roll: "17-18", penalty: -4, role: EXTREMITY },
  "Vitals": { roll: "-", penalty: -3 }
}

const scorpionHitLocations = {
  "Eye": { roll: "-", penalty: -9 },
  "Skull": { roll: "3-4", penalty: -7 },
  "Face": { roll: "5", penalty: -5 },
  "Neck": { roll: "6", penalty: -5 },
  "Arm": { roll: "7-8", penalty: -2, role: LIMB },
  "Torso": { roll: "9-11", penalty: 0 },
  "Tail": { roll: "12", penalty: -3, role: LIMB },
  "Leg": { roll: "13-16", penalty: -2, role: LIMB },
  "Foot": { roll: "17-18", penalty: -4, role: EXTREMITY },
  "Vitals": { roll: "-", penalty: -3 }
}

const ichthyoidHitLocations = {
  "Eye": { roll: "-", penalty: -8 },
  "Skull": { roll: "3-4", penalty: -7 },
  "Face": { roll: "5", penalty: -5 },
  "Fin": { roll: "6", penalty: -4, role: EXTREMITY },
  "Torso": { roll: "8-12", penalty: 0 },
  "Fin*": { roll: "13-16", penalty: -4, role: EXTREMITY },
  "Tail": { roll: "17-18", penalty: -5, role: EXTREMITY },
  "Vitals": { roll: "-", penalty: -3 }
}

const arachnoidHitLocations = {
  "Eye": { roll: "-", penalty: -9 },
  "Brain": { roll: "3-4", penalty: -7 },
  "Neck": { roll: "5", penalty: -5 },
  "Face": { roll: "6", penalty: -5 },
  "Leg 1-2": { roll: "7-8", penalty: -2, role: LIMB },
  "Torso": { roll: "9-11", penalty: 0 },
  "Groin": { roll: "12", penalty: -3 },
  "Leg 3-4": { roll: "13-14", penalty: -2, role: LIMB },
  "Leg 5-6": { roll: "15-16", penalty: -2, role: LIMB },
  "Leg 7-8": { roll: "17-18", penalty: -2, role: LIMB },
  "Vitals": { roll: "-", penalty: -3 }
}


export const hitlocationDictionary = {
  "humanoid": humanoidHitLocations,
  "quadruped": quadrupedHitLocations,
  "quadrupedWinged": wingedQuadHitLocations,
  "avian": avianHitLocations,
  "centaur": centaurHitLocations,
  "hexapod": hexapodHitLocations,
  "hexapodWinged": wingedHexHitLocations,
  "vermiform": vermiformHitLocations,
  "vermiformWinged": wingedSerpentHitLocations,
  "snakeman": snakeManHitLocations,
  "octopod": octopodHitLocations,
  "squid": squidHitLocations,
  "cancroid": cancroidHitLocations,
  "scorpion": scorpionHitLocations,
  "ichthyoid": ichthyoidHitLocations,
  "arachnoid": arachnoidHitLocations,
}

export const getHitLocationTableNames = function () {
  return Object.keys(hitlocationDictionary)
}
