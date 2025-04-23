export const SetLastActor = function (actor, tokenDocument) {
  if (actor !== GURPS.LastActor) console.log('Setting Last Actor:' + actor?.name)
  GURPS.LastActor = actor
  GURPS.LastTokenDocument = tokenDocument
  Hooks.call('updateLastActorGURPS')

  // setTimeout(() => {
  //   GURPS.ModifierBucket.refresh()
  // }, 100) // Need to make certain the mod bucket refresh occurs later
}

export const ClearLastActor = function (actor) {
  if (GURPS.LastActor == actor) {
    console.log('Clearing Last Actor:' + GURPS.LastActor?.name)
    GURPS.LastActor = null
    Hooks.call('updateLastActorGURPS')

    // GURPS.ModifierBucket.refresh()
    const tokens = canvas.tokens
    if (tokens && tokens.controlled.length > 0) {
      GURPS.SetLastActor(tokens.controlled[0].actor)
    } // There may still be tokens selected... if so, select one of them
  }
}
