/**
  This is a subset of Dynamic effects for Active Effects module (which only work with DnD5e).   
  Mainly for the 'teleport token function.   ;-)
**/

export var socketlibSocket = undefined
export let setupSocket = () => {
  if (globalThis.socketlib) {
    socketlibSocket = globalThis.socketlib.registerSystem('gurps')
    socketlibSocket.register('recreateToken', _recreateToken)
    socketlibSocket.register('createToken', _createToken)
    socketlibSocket.register('deleteToken', _deleteToken)
    socketlibSocket.register('renameToken', _renameToken)
    socketlibSocket.register('setTokenFlag', _setTokenFlag)
    socketlibSocket.register('setFlag', _setFlag)
    socketlibSocket.register('unsetFlag', _unsetFlag)
    socketlibSocket.register('deleteUuid', _deleteUuid)
  }
  return !!globalThis.socketlib
}

function DAEfromUuid(uuid) {
  let doc
  try {
    let parts = uuid.split('.')
    const [docName, docId] = parts.slice(0, 2)
    parts = parts.slice(2)
    const collection = CONFIG[docName].collection.instance
    doc = collection.get(docId)
    // Embedded Documents
    while (parts.length > 1) {
      const [embeddedName, embeddedId] = parts.slice(0, 2)
      doc = doc.getEmbeddedDocument(embeddedName, embeddedId)
      parts = parts.slice(2)
    }
  } finally {
    /*catch (err) {
      error(`dae | could not fetch ${uuid} ${err}`)
    } */
    return doc || null
  }
}
function DAEfromActorUuid(uuid) {
  let doc = DAEfromUuid(uuid)
  if (doc instanceof CONFIG.Token.documentClass) doc = doc.actor
  return doc || null
}
async function _deleteUuid(data) {
  const entity = await fromUuid(data.uuid)
  if (entity && entity instanceof Item && !data.uuid.startsWith('Compendium') && !data.uuid.startsWith('Item')) {
    // only allow deletion of owned items
    return await entity.delete()
  }
  if (
    entity &&
    entity instanceof CONFIG.Token.documentClass &&
    !data.uuid.startsWith('Compendium') &&
    !data.uuid.startsWith('Item')
  ) {
    // only allow deletion of owned items
    return await entity.delete()
  }
  if (entity && entity instanceof CONFIG.ActiveEffect.documentClass) return await entity.delete()
  return false
}
async function _unsetFlag(data) {
  return await DAEfromActorUuid(data.actorUuid)?.unsetFlag('dae', data.flagId)
}
async function _setFlag(data) {
  if (!data.actorUuid) return await game.actors.get(data.actorId)?.setFlag('dae', data.flagId, data.value)
  else return await DAEfromActorUuid(data.actorUuid)?.setFlag('dae', data.flagId, data.value)
}
async function _setTokenFlag(data) {
  const update = {}
  update[`flags.dae.${data.flagName}`] = data.flagValue
  return await DAEfromUuid(data.tokenUuid)?.update(update)
}
async function _createToken(data) {
  let scenes = game.scenes
  let targetScene = scenes.get(data.targetSceneId)
  //@ts-ignore
  return await targetScene.createEmbeddedDocuments('Token', [
    foundry.utils.mergeObject(
      foundry.utils.duplicate(data.tokenData),
      { x: data.x, y: data.y, hidden: false },
      { overwrite: true, inplace: true }
    ),
  ])
}
async function _deleteToken(data) {
  return await DAEfromUuid(data.tokenUuid)?.delete()
}
async function _recreateToken(data) {
  await _createToken(data)
  return await DAEfromUuid(data.tokenUuid)?.delete()
}
async function _renameToken(data) {
  return await canvas.tokens.placeables.find(t => t.id === data.tokenData._id).update({ name: data.newName })
}
let tokenScene = (tokenName, sceneName) => {
  if (!sceneName) {
    for (let scene of game.scenes) {
      //@ts-ignore
      let found = scene.tokens.getName(tokenName)
      if (found) return { scene, found }
    }
  } else {
    //@ts-ignore
    let scene = game.scenes.getName(sceneName)
    if (scene) {
      //@ts-ignore
      let found = scene.tokens.getName(tokenName)
      if (found) {
        return { scene, found }
      }
    }
  }
  return { scene: null, tokenDocument: null }
}
export let moveToken = async (token, targetTokenName, xGridOffset = 0, yGridOffset = 0, targetSceneName = '') => {
  let { scene, found } = tokenScene(targetTokenName, targetSceneName)
  if (!token) {
    warn('Dynmaiceffects | moveToken: Token not found')
    return 'Token not found'
  }
  if (!found) {
    warn('dae | moveToken: Target Not found')
    return `Token ${targetTokenName} not found`
  }
  socketlibSocket.executeAsGM('recreateToken', {
    userId: game.user.id,
    startSceneId: canvas.scene.id,
    tokenUuid: token.uuid,
    targetSceneId: scene.id,
    tokenData: token.data,
    x: found.data.x + xGridOffset * canvas.scene.grid.size,
    y: found.data.y + yGridOffset * canvas.scene.grid.size,
  })
  /*
    return await requestGMAction(GMAction.actions.recreateToken,
      { userId: game.user.id,
        startSceneId: canvas.scene.id,
        tokenUuid: token.uuid,
         targetSceneId: scene.id, tokenData: token.data,
         x: found.data.x + xGridOffset * canvas.scene.data.grid.size,
         y: found.data.y + yGridOffset * canvas.scene.data.grid.size
    });
    */
}
export async function createToken(tokenData, x, y) {
  let targetSceneId = canvas.scene.id
  // requestGMAction(GMAction.actions.createToken, {userId: game.user.id, targetSceneId, tokenData, x, y})
  return socketlibSocket.execuateAsGM('createToken', { userId: game.user.id, targetSceneId, tokenData, x, y })
}
export let teleport = async (tokenDocument, targetScene, xpos, ypos) => {
  let x = Number(xpos)
  let y = parseInt(ypos)
  if (isNaN(x) || isNaN(y)) {
    console.error('dae| teleport: Invalid co-ords', xpos, ypos)
    return `Invalid target co-ordinates (${xpos}, ${ypos})`
  }
  if (!tokenDocument) {
    console.warn('dae | teleport: No Token')
    return 'No active token'
  }
  // Hide the current token
  if (targetScene.name === canvas.scene.name) {
    //@ts-ignore
    CanvasAnimation.terminateAnimation(`Token.${tokenDocument.id}.animateMovement`)
    let sourceSceneId = canvas.scene.id
    // After the token is transported, we need to store the new token as the active token (and select it, since the original was selected)
    GURPS.IgnoreTokenSelect = true
    let newDocument = await socketlibSocket.executeAsGM('recreateToken', {
      userId: game.user.id,
      tokenUuid: tokenDocument.uuid,
      startSceneId: sourceSceneId,
      targetSceneId: targetScene.id,
      tokenData: tokenDocument.data,
      x: xpos,
      y: ypos,
    })
    let actor = newDocument.actor
    if (!actor && newDocument.actorId) actor = game.actors.get(newDocument.actorId)
    GURPS.SetLastActor(actor, newDocument)
    GURPS.IgnoreTokenSelect = false
    setTimeout(() => canvas.pan({ x: xpos, y: ypos }), 200)
    return true
  }
  // deletes and recreates the token
  var sourceSceneId = canvas.scene.id
  Hooks.once('canvasReady', async () => {
    GURPS.IgnoreTokenSelect = true
    let newDocument = await socketlibSocket.executeAsGM('createToken', {
      userId: game.user.id,
      startSceneId: sourceSceneId,
      targetSceneId: targetScene.id,
      tokenData: tokenDocument.data,
      x: xpos,
      y: ypos,
    })
    await socketlibSocket.executeAsGM('deleteToken', { userId: game.user.id, tokenUuid: tokenDocument.uuid })
    if (Array.isArray(newDocument)) newDocument = newDocument[0]
    let actor = newDocument.actor
    if (!actor && newDocument.actorId) actor = game.actors.get(newDocument.actorId)
    GURPS.SetLastActor(actor, newDocument)
    GURPS.IgnoreTokenSelect = false
    setTimeout(() => canvas.pan({ x: xpos, y: ypos }), 200)
  })
  // Need to stop animation since we are going to delete the token and if that happens before the animation completes we get an error
  //@ts-ignore
  CanvasAnimation.terminateAnimation(`Token.${tokenDocument.id}.animateMovement`)
  return await targetScene.view()
}
