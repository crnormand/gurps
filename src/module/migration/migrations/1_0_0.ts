import { getGame } from '@module/util/guards.js'

import { MigrationReport } from '../types.js'

const MIGRATION_VERSION = '1.0.0-alpha'

// Pop up a dialog informing the user about the one-way migration and asking them to confirm they want to proceed.
// If they cancel, shutdown the world (game.shutDown()) to prevent them from accidentally doing the migration.
async function migrate(): Promise<MigrationReport | void> {
  const style = document.createElement('style')

  style.id = 'blackout-overlay'
  style.textContent = `
  body::before {
    content: '';
    position: fixed;
    inset: 0;
    background: black;
    z-index: 100;
    pointer-events: none;
  }
`

  document.head.appendChild(style)

  if (getGame().user.isGM) {
    const warningText = getGame().i18n.localize('GURPS.migration.toV1_0_0.warningText')
    const proceedText = getGame().i18n.localize('GURPS.migration.toV1_0_0.proceedText')

    const confirmed = await foundry.applications.api.DialogV2.wait({
      window: { title: 'GURPS.migration.toV1_0_0.title' },
      content: `<p>${warningText}</p><p>${proceedText}</p>`,
      position: { height: 'auto', width: 600 },
      buttons: [
        {
          action: 'proceed',
          icon: 'fas fa-check',
          label: 'GURPS.migration.toV1_0_0.proceed',
        },
        {
          action: 'cancel',
          icon: 'fas fa-times',
          label: 'GURPS.migration.toV1_0_0.cancel',
        },
      ],
      default: 'cancel',
    })

    if (confirmed !== 'proceed') {
      ui.notifications?.warn('GURPS.migration.toV1_0_0.cancellationMessage', { localize: true })
      await getGame().shutDown()
    }

    document.getElementById('blackout-overlay')?.remove()
  } else {
    const notGMText = getGame().i18n.localize('GURPS.migration.toV1_0_0.notGMMessage')

    await foundry.applications.api.DialogV2.prompt({
      window: { title: 'GURPS.migration.toV1_0_0.title' },
      content: `<p>${notGMText}</p>`,
    })

    getGame().logOut()
  }
}

export const v1_0_0 = {
  version: MIGRATION_VERSION,
  migrate,
}
