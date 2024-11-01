/**
 * Copy of Times Up Hooks registry.
 */
export function readyTimesUpSetup() {
  Hooks.on('createActiveEffect', (effect, options, user) => {
    //@ts-expect-error
    if (!game.users.activeGM?.isSelf) return
    
    if (effect.transfer && !(getEffectActor(effect) instanceof Actor)) return
    if (debugEnabled > 0) debug('create active effect', effect.uuid, effect.updateDuration(), isTransferEffect(effect))
    // record passive, start time/round/turn duration any flags of relevance.
    if (hasDurationSeconds(effect)) {
      if (debugEnabled > 0) warn('create effect', effect.uuid, effect.updateDuration(), isTransferEffect(effect))
      GMEffectQueue('createEffect', effect)
    }
  })

  Hooks.on('preUpdateActiveEffect', (effect, update, options, user) => {
    if (!timesUpEnabled || !enablePassiveEffects || !isTransferEffect(effect)) return true
    const durationToUse = effect.updateDuration()
    if (update.duration) {
      durationToUse.seconds = update.duration.seconds ?? durationToUse.seconds
      durationToUse.rounds = update.duration.rounds ?? durationToUse.rounds
      durationToUse.turns = update.duration.turns ?? durationToUse.turns
    }
    // If disabled updated to false, isTransfer and expired then reset the duration start time/round/turn
    if (hasExpiry(durationToUse)) {
      if (debugEnabled > 1)
        debug('Update active effect', effect.uuid, update, effect.updateDuration(), isTransferEffect(effect))
      const isExpired = isDurationExpired(durationToUse, { secondsOnly: true }) || !durationToUse.starTime
      if (!isExpired) return true
      if (update.disabled === false) {
        // we are enabling an expired transfer effect set it's start time/round/turn to now.
        if (debugEnabled > 0) warn('resetting duration', effect.uuid, durationToUse, isTransferEffect(effect))
        // game.combat should be the current users combat
        const unexpireUpdate = getUnexpireEffectUpdate(effect, game.combat, durationToUse)
        update = mergeObject(update, unexpireUpdate, { inplace: true })
      } else if (update.disabled ?? effect.disabled === true) {
        if (debugEnabled > 0) warn('expiring effect', effect.uuid, effect.updateDuration(), isTransferEffect(effect))
        const expireUpdate = getExpireTransferEffectUpdate(effect)
        update = mergeObject(update, expireUpdate, { inplace: true })
      }
    }
    if (debugEnabled > 0) warn('update effect', effect.uuid, update, effect.updateDuration(), isTransferEffect(effect))
    return true
  })

  Hooks.on('updateActiveEffect', async (effect, update, options, user) => {
    //@ts-expect-error
    if (!game.users.activeGM?.isSelf) return
    if (!effect.transfer && effect.parent instanceof Item) return
    if (!hasDurationSeconds(effect) || (update.disabled ?? effect.disabled)) GMEffectQueue('deleteEffect', effect)
    else if (hasDurationSeconds(effect)) GMEffectQueue('createEffect', effect)
    return
  })

  Hooks.on('deleteActiveEffect', (effect, options, user) => {
    // if (!timesUpEnabled) return;
    //@ts-expect-error
    if (!game.users.activeGM?.isSelf) return
    if (debugEnabled > 1) debug('active effect deleted', effect.uuid, effect.updateDuration(), isTransferEffect(effect))
    GMEffectQueue('deleteEffect', effect)
  })

  Hooks.on('updateWorldTime', async (worldTime: number, dt: number, options, user) => {
    if (!timesUpEnabled) return
    //@ts-expect-error
    if (!game.users.activeGM?.isSelf) return
    warn('world time update', worldTime, dt)
    for (let entry of effectQueue.effects) {
      //@ts-expect-error
      const effect = fromUuidSync(entry)
      if (effect && isEffectExpired(effect, { secondsOnly: true })) {
        if (debugEnabled > 0)
          warn('world time expired effect', effect.name, effect.uuid, effect.updateDuration(), isTransferEffect(effect))
        GMEffectQueue('deleteEffect', effect)
        expireEffect(effect, { 'expiry-reason': 'times-up:expired' })
      }
    }
  })

  Hooks.on('preUpdateCombat', async (combat, update, options, user) => {
    //@ts-expect-error
    foundry.utils.setProperty(options, 'times-up.combat.round', combat.round)
    //@ts-expect-error
    foundry.utils.setProperty(options, 'times-up.combat.turn', combat.turn)
    return true
  })

  Hooks.on('updateCombat', async (combat, update, options, user) => {
    // Think about multiple gms and viewing different combats.
    if (!timesUpEnabled) return
    //@ts-expect-error
    if (!game.users.activeGM?.isSelf) return
    if (debugEnabled > 1) debug('update combat', combat, update, options, user)
    let combatantIndex = 0
    const totalTurns = combat.combatants?.contents.length ?? 0
    //@ts-expect-error
    const lastCombatTurn =
      (foundry.utils.getProperty(options, 'times-up.combat.round') ?? combat.round) * totalTurns +
      (foundry.utils.getProperty(options, 'times-up.combat.turn') ?? combat.turn)

    for (let combatant of combat.turns) {
      if (combatant.actor) {
        let actor = combatant.actor
        for (let effect of getApplicableEffects(actor, { includeEnchantments: true })) {
          if (isEffectExpired(effect, { combat, secondsOnly: false })) {
            if (!!timesUpEnabled) {
              if (debugEnabled > 0)
                warn('update combat expired effect', effect.name, effect.updateDuration(), isTransferEffect(effect))
              GMEffectQueue('deleteEffect', effect)
              await expireEffect(effect, { 'expiry-reason': 'times-up:expired' })
            }
          }
        }

        const checkTurn = (update.round ?? combat.round) * totalTurns + (update.turn ?? combat.turn)
        //@ts-expect-error
        let lastCheckedTurn =
          (foundry.utils.getProperty(options, 'times-up.combat.round') ?? combat.round) * totalTurns +
          (foundry.utils.getProperty(options, 'times-up.combat.turn') ?? combat.turn)
        const advanced1Turn = lastCheckedTurn + 1 === checkTurn
        //@ ts-expect-error
        let combatantNextTurn = (update.round ?? combat.round) * totalTurns + combatantIndex
        if (combatantNextTurn < checkTurn) combatantNextTurn += totalTurns
        //@ts-expect-error
        let combatantLastTurn =
          (foundry.utils.getProperty(options, 'times-up.combat.round') ?? combat.round) * totalTurns + combatantIndex
        // if (combatantLastTurn > lastCheckedTurn) combatantLastTurn -= totalTurns;
        if (update.round !== undefined || update.turn !== undefined) {
          // Handle any turn start/end effects
          for (let effect of getApplicableEffects(actor, { includeEnchantments: true })) {
            let effectStart = (effect.duration.startRound ?? 0) * totalTurns + (effect.duration.startTurn ?? 0)
            //@ts-expect-error
            const specialDuration = foundry.utils.getProperty(effect, 'flags.dae.specialDuration')
            if (specialDuration?.length > 0) {
              if (
                specialDuration.includes('turnStart') &&
                (checkTurn >= combatantNextTurn || checkTurn >= lastCombatTurn + totalTurns)
              ) {
                GMEffectQueue('deleteEffect', effect)
                await expireEffect(effect, { 'expiry-reason': `times-up:turnStart` })
              }
              if (
                specialDuration?.includes('turnEnd') &&
                checkTurn > combatantLastTurn &&
                combatantLastTurn > effectStart
              ) {
                GMEffectQueue('deleteEffect', effect)
                await expireEffect(effect, { 'expiry-reason': `times-up:turnEnd` })
              }
            }

            if (dae) {
              const macroRepeat = getMacroRepeat(effect)
              switch (macroRepeat) {
                case 'startEveryTurn':
                case 'startEveryTurnAny':
                case 'startEndEveryTurn':
                case 'startEndEveryTurnAny':
                  if (
                    (checkTurn >= combatantLastTurn && lastCheckedTurn < combatantLastTurn) ||
                    checkTurn === combatantNextTurn
                  ) {
                    if (
                      !['startEveryTurn', 'startEndEveryTurn'].includes(macroRepeat) ||
                      (!effect.disabled && !effect.isSuppressed)
                    )
                      dae.daeMacro('each', actor, effect, {
                        actor,
                        effectId: effect.id,
                        tokenId: combatant.token?.id,
                        actorUuid: actor.uuid,
                        actorID: actor.id,
                        efData: effect.toObject(),
                        turn: 'startTurn',
                      })
                  }
                  if (['startEveryTurn', 'startEveryTurnAny'].includes(macroRepeat)) break
                case 'endEveryTurn':
                case 'endEveryTurnAny':
                  if (
                    (advanced1Turn && combatantLastTurn + 1 === checkTurn) ||
                    (!advanced1Turn && combatantLastTurn < checkTurn && combatantLastTurn >= lastCheckedTurn)
                  ) {
                    if (
                      ['endEveryTurn', 'startEndEveryTurn'].includes(macroRepeat) &&
                      (effect.disabled || effect.isSuppressed)
                    )
                      break
                    dae.daeMacro('each', actor, effect, {
                      actor,
                      effectId: effect.id,
                      tokenId: combatant.token?.id,
                      actorUuid: actor.uuid,
                      actorID: actor.id,
                      efData: effect.toObject(),
                      turn: 'endTurn',
                    })
                  }
                  break
              }
            }
          }
          for (let turn of combat.turns) {
            let testActor = turn.actor
            if (!testActor) continue
            for (let effect of getApplicableEffects(testActor, { includeEnchantments: true })) {
              //@ts-expect-error
              const specialDuration = foundry.utils.getProperty(effect, 'flags.dae.specialDuration')
              if (!(specialDuration?.length > 0)) continue
              if (!effect.origin?.startsWith(actor?.uuid)) continue
              let effectStart = (effect.duration.startRound ?? 0) * totalTurns + (effect.duration.startTurn ?? 0)
              if (
                specialDuration.includes('turnStartSource') &&
                checkTurn >= combatantNextTurn &&
                lastCombatTurn !== combatantNextTurn
              ) {
                GMEffectQueue('deleteEffect', effect)
                await expireEffect(effect, { 'expiry-reason': `times-up:turnStartSource` })
              } else if (
                specialDuration?.includes('turnEndSource') &&
                checkTurn > combatantLastTurn &&
                combatantLastTurn > effectStart
              ) {
                GMEffectQueue('deleteEffect', effect)
                await expireEffect(effect, { 'expiry-reason': `times-up:turnEndSource` })
              }
            }
          }
        }
        // Handle any each turn effects
        // starting combat is update round 0 turn 1
      }
      combatantIndex += 1
    }
  })

  Hooks.on('combatStart', async (combat, options, user) => {
    if (!timesUpEnabled) return
    //@ts-expect-error
    if (!game.users.activeGM?.isSelf) return
    for (let combatant of combat.combatants) {
      if (combatant.actor) setEffectsExpiryToRounds(combatant.actor, combat)
    }
  })

  Hooks.on('createCombatant', async (combatant, options, user) => {
    if (!timesUpEnabled) return
    //@ts-expect-error
    if (!game.users.activeGM?.isSelf) return
    if (combatant.actor) setEffectsExpiryToRounds(combatant.actor, combatant.combat)
  })

  Hooks.on('deleteCombatant', async (combatant, options, user) => {
    if (!timesUpEnabled) return
    //@ts-expect-error
    if (!game.users.activeGM?.isSelf) return
    if (combatant.actor) setEffectsExpiryToSeconds(combatant.actor)
  })

  Hooks.on('deleteCombat', async (combat, options, user) => {
    if (!timesUpEnabled) return
    //@ts-expect-error
    if (!game.users.activeGM?.isSelf) return

    for (let combatant of combat.combatants) {
      expireCombatEndEffects(combatant.actor)
      if (combatant.actor) setEffectsExpiryToSeconds(combatant.actor, combat)
    }
  })

  async function expireCombatEndEffects(actor) {
    if (!timesUpEnabled) return
    for (let effect of getApplicableEffects(actor, { includeEnchantments: true })) {
      //@ts-expect-error
      const specialDurations = foundry.utils.getProperty(effect, 'flags.dae.specialDuration')
      if (specialDurations?.includes('combatEnd')) {
        if (debugEnabled > 0)
          warn('end combat expired effect', effect.name, effect.updateDuration(), isTransferEffect(effect))
        GMEffectQueue('deleteEffect', effect)
        await expireEffect(effect, { 'expiry-reason': 'times-up:expired:combat-end' })
      }
    }
  }

  Hooks.on('createItem', async (item, options, user) => {
    if (CONFIG.ActiveEffect.legacyTransferral) return
    //@ts-expect-error
    if (!game.users.activeGM?.isSelf) return
    if (debugEnabled > 1) debug('create item', item.uuid, item.effects)
    item.effects.forEach(effect => {
      if (!effect.disabled && hasDurationSeconds(effect) && isTransferEffect(effect)) {
        if (debugEnabled > 0) warn('create effect', effect.uuid, effect.duration, isTransferEffect(effect))
        GMEffectQueue('createEffect', effect)
      }
    })
  })

  Hooks.on('updateItem', async (item, update, options, user) => {
    //@ts-expect-error
    if (!game.users.activeGM?.isSelf) return
    if (CONFIG.ActiveEffect.legacyTransferral) return
    for (let effect of item.effects) {
      if (effect.disabled || !hasDuration(effect) || !isTransferEffect(effect)) {
        if (debugEnabled > 1)
          debug('updateItem | remove from queue', effect.uuid, effect.duration, isTransferEffect(effect))
        GMEffectQueue('deleteEffect', effect)
        continue
      }
      // Only auto expire when seconds is updated - since we don't know what combat to use
      // Will have to wait for the combat to update
      if (isEffectExpired(effect, { secondsOnly: true })) {
        if (debugEnabled > 0) warn('updateItem | expired', effect.uuid, effect.duration, isTransferEffect(effect))
        if (!!timesUpEnabled) {
          // update the effect queue
          GMEffectQueue('deleteEffect', effect)
          expireEffect(effect, { 'expiry-reason': 'times-up:expired' })
        }
      } else if (hasDurationSeconds(effect)) {
        if (debugEnabled > 0) warn('updateItem | add to queue', effect.uuid, effect.duration, isTransferEffect(effect))
        GMEffectQueue('createEffect', effect)
      }
    }
  })

  Hooks.on('deleteItem', async (item, options, user) => {
    //@ts-expect-error
    if (!game.users.activeGM?.isSelf) return
    if (debugEnabled > 1) debug('delete item', item.uuid, item.effects)
    item.effects.forEach(effect => {
      // remove from the effect queue
      if (debugEnabled > 1) debug('delete item | remove effect from queue', effect.uuid, isTransferEffect(effect))
      GMEffectQueue('deleteEffect', effect)
    })
  })
}
