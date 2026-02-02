import * as Settings from '../lib/miscellaneous-settings.js'

globalThis._patchedFuncs = {}

// Copied from Monks Little Details module
export let patchFunc = (prop, func, type = 'WRAPPER') => {
  let nonLibWrapper = () => {
    const id = foundry.utils.randomID()
    _patchedFuncs[id] = eval(prop)
    eval(`${prop} = function (event) {
            return func.call(this, ${type != 'OVERRIDE' ? `_patchedFuncs["${id}"].bind(this),` : ''} ...arguments);
        }`)
  }
  if (game.modules.get('lib-wrapper')?.active) {
    try {
      libWrapper.register('gurps', prop, func, type)
    } catch (e) {
      nonLibWrapper()
    }
  } else {
    nonLibWrapper()
  }
}

export class GGADebugger {
  static init() {
    if (!game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_SHOW_DEBUG_INFO)) return
    patchFunc('DocumentSheet.prototype._createDocumentIdLink', async function (wrapped, ...args) {
      wrapped(...args)
      let [html] = args

      if (
        !(this.object instanceof foundry.abstract.Document) ||
        !this.object.id ||
        !(this.object.src || this.object.img)
      )
        return
      const title = html.find('.window-title')
      const label = game.i18n.localize(this.object.constructor.metadata.label)
      const name = this.object.name
      const srcLink = document.createElement('a')
      srcLink.classList.add('document-debug-link')
      srcLink.setAttribute('alt', game.i18n.localize('GURPS.settingShowDebugTooltip'))
      srcLink.dataset.tooltip = game.i18n.localize('GURPS.settingShowDebugTooltip')
      srcLink.dataset.tooltipDirection = 'UP'
      srcLink.innerHTML = '<i class="fa-solid fa-bug"></i>'
      srcLink.addEventListener('click', async event => {
        event.preventDefault()
        const dialog = new Dialog({
          title: `Debug: ${name} (${label})`,
          content: `<div class="debug-content" style="max-height: 500px; overflow-y: auto;"><pre>${JSON.stringify(this.object, null, 2)}</pre></div>`,
          buttons: {
            copy: {
              icon: '<i class="fas fa-copy"></i>',
              label: 'Copy',
              callback: () => {
                let src = JSON.stringify(this.object, null, 2)
                game.clipboard.copyPlainText(src)
                ui.notifications.info(`Copied to clipboard`)
              },
            },
            close: {
              icon: '<i class="fas fa-check"></i>',
              label: 'Close',
              callback: () => {},
            },
          },
          default: 'close',
        })
        await dialog.render(true)
      })
      title.append(srcLink)
    })
  }
}

// Prompt the user to select an Actor compendium, then export all actors as JSON
export async function exportCompendiumActorsToFile() {
  const packs = Array.from(game.packs).filter(p => p.documentName === 'Actor' || p.type === 'Actor')

  if (!packs.length) {
    ui.notifications.warn('No Actor compendiums found')
    return
  }

  const options = packs
    .map(p => `<option value="${p.collection}">${p.metadata?.label ?? p.title} (${p.collection})</option>`) // v13 metadata.label
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
            // Foundry global helper to trigger a browser download
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
}
