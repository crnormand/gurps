export const SetLastActor = function (actor, tokenDocument) {
  if (actor !== GURPS.LastActor) console.log('Setting Last Actor:' + actor?.name)
  GURPS.LastActor = actor
  GURPS.LastTokenDocument = tokenDocument
  Hooks.call('updateLastActorGURPS', actor)
}

export const ClearLastActor = function (actor) {
  if (GURPS.LastActor == actor) {
    console.log('Clearing Last Actor:' + GURPS.LastActor?.name)
    GURPS.LastActor = null
    Hooks.call('updateLastActorGURPS', null)

    // GURPS.ModifierBucket.refresh()
    const tokens = canvas.tokens
    if (tokens && tokens.controlled.length > 0) {
      GURPS.SetLastActor(tokens.controlled[0].actor)
    } // There may still be tokens selected... if so, select one of them
  }
}
