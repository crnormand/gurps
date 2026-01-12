;(async () => {
  const fn =
    (typeof globalThis !== 'undefined' && globalThis.exportCompendiumActorsToFile) ||
    (typeof exportCompendiumActorsToFile !== 'undefined' ? exportCompendiumActorsToFile : null)

  if (typeof fn === 'function') {
    await fn()
    return
  }

  const packs = Array.from(game.packs).filter(p => p.documentName === 'Actor' || p.type === 'Actor')
  if (!packs.length) {
    ui.notifications.warn('No Actor compendiums found')
    return
  }

  const options = packs
    .map(p => `<option value="${p.collection}">${p.metadata?.label ?? p.title} (${p.collection})</option>`)
    .join('')

  const content = `
    <form>
      <div class="form-group">
        <label>Select Actor Compendium</label>
        <select name="pack">${options}</select>
      </div>
    </form>
  `

  const dialog = new Dialog({
    title: 'Export Actors from Compendium',
    content,
    buttons: {
      export: {
        icon: '<i class="fas fa-file-export"></i>',
        label: 'Export',
        callback: async html => {
          const collection = html.find('select[name="pack"]').val()
          const pack = game.packs.get(collection)
          if (!pack) {
            ui.notifications.error('Selected compendium not found')
            return
          }

          try {
            const docs = await pack.getDocuments()
            const outputs = docs.map(actor => JSON.stringify(actor, null, 2))
            const fileContent = `[\n${outputs.join(',\n')}\n]`
            const filename = `${(pack.metadata?.label ?? pack.collection).replace(/\s+/g, '_')}_actors.json`
            saveDataToFile(fileContent, 'application/json', filename)
            ui.notifications.info(`Exported ${docs.length} actors from ${pack.metadata?.label ?? pack.collection}`)
          } catch (err) {
            console.error(err)
            ui.notifications.error('Failed to export compendium actors')
          }
        },
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: 'Cancel',
      },
    },
    default: 'export',
  })

  await dialog.render(true)
})()
