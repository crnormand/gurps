
export function parseOverrideText(str: string): [string, string | undefined] {
    let override: string | undefined
    let m = str.match(/^"(?<quoted>[^"]*)"(?<remain>.*)/)  // check for double quotes
    if (m?.groups) {
      override = m.groups.quoted
      str = m.groups.remain.trim()
    } else {
      m = str.match(/^'(?<quoted>[^']*)'(?<remain>.*)/)   // or single quotes
      if (m?.groups) {
        override = m.groups.quoted
        str = m.groups.remain.trim()
      }
    }
    return [str, override]
  }
  
  export function parseBlindRoll(str: string): [string, boolean, string] {
     if (str[0] === '!') {
      return [str.substring(1).trim(), true, '(Blind Roll) ']
    }
    return [str, false, '']
  }
  
    /** Support the format @actorid@ to indicate the actor that created this OTF.  
        Most notably, it allows a GM to attack and create damage where the damage chat 
        shows the originator of the damage, not the currently selected LastActor.
        (a common problem for GMs that manage a lot of NPCs)
    */
  export function parseSourceId(str: string): [string, string | undefined ] {
    let m = str.match(/^@((?<src>[^@]+)@(?<remain>.*)/)
    if (m?.groups) {
      return [m.groups.reamin.trim(), m.groups.src]
    }
    return [str, undefined]
  }

