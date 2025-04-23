import * as Settings from '../lib/miscellaneous-settings.js'

// Copied from Monks Little Details module
export let patchFunc = (prop, func, type = 'WRAPPER') => {
  let nonLibWrapper = () => {
    const oldFunc = eval(prop)
    eval(`${prop} = function (event) {
            return func.call(this, ${type != 'OVERRIDE' ? 'oldFunc.bind(this),' : ''} ...arguments);
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
