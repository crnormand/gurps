export const init = function () {
  //Add support for the Drag Ruler module: https://foundryvtt.com/packages/drag-ruler
  Hooks.once('dragRuler.ready', SpeedProvider => {
    class GURPSSpeedProvider extends SpeedProvider {
      get colors() {
        return [
          { id: 'walk', default: 0x00ff00, name: 'GURPS.dragruler.Walk' },
          { id: 'sprint', default: 0xffff00, name: 'GURPS.dragruler.Sprint' },
          { id: 'fly', default: 0xff8000, name: 'GURPS.dragruler.Fly' },
        ]
      }

      /**
       * @param {GurpsToken} token
       */
      getRanges(token) {
        const actordata = token.actor.system

        const ranges = [
          { range: actordata.currentmove, color: 'walk' },
          { range: actordata.currentsprint, color: 'sprint' },
        ]
        return ranges
      }
    }
    dragRuler.registerSystem('gurps', GURPSSpeedProvider)
  })
}
