import { HandlebarsApplicationMixin, ActorSheet } from '@gurps-types/foundry/index.js'
import * as Settings from '@module/util/miscellaneous-settings.js'

import { GurpsActorModernSheet } from './sheet.js'

/* ---------------------------------------- */

namespace GurpsActorNpcModernSheet {
  export interface RenderContext extends GurpsActorModernSheet.RenderContext {
    parryblock?: string | number
    defense?: { dr: string; split?: Record<string, number> } | Record<string, unknown>
    useCI?: boolean
  }
}

export class GurpsActorNpcModernSheet extends GurpsActorModernSheet {
  static override DEFAULT_OPTIONS: ActorSheet.DefaultOptions = {
    classes: ['gurps', 'sheet', 'actor', 'modern-sheet', 'ms-compact', 'ms-npc-modern-sheet'],
    position: {
      width: 650,
      height: 550,
    },
  }

  /* ---------------------------------------- */

  static override PARTS: Record<string, HandlebarsApplicationMixin.HandlebarsTemplatePart> = {
    header: {
      template: 'systems/gurps/templates/actor/modern/npc-header.hbs',
    },
    statusBar: {
      template: 'systems/gurps/templates/actor/modern/status-bar.hbs',
    },
    body: {
      template: 'systems/gurps/templates/actor/modern/npc-body.hbs',
    },
  }

  /* ---------------------------------------- */

  protected override async _prepareContext(
    options: GurpsActorModernSheet.RenderOptions
  ): Promise<GurpsActorModernSheet.RenderContext> {
    const baseContext = await super._prepareContext(options)

    const context: GurpsActorNpcModernSheet.RenderContext = {
      ...baseContext,
      defense: this.actor.getTorsoDr(),
      parryblock: this.actor.system.equippedParry,
      useCI: game.settings!.get(GURPS.SYSTEM_NAME, Settings.SETTING_USE_CONDITIONAL_INJURY as never),
    }

    return context
  }

  /* ---------------------------------------- */

  protected override async _onRender(
    context: GurpsActorNpcModernSheet.RenderContext,
    options: GurpsActorModernSheet.RenderOptions
  ): Promise<void> {
    const html = this.element

    const scrollContainer = html.querySelector('.ms-npc-body')
    const scrollTop = scrollContainer?.scrollTop ?? 0

    await super._onRender(context, options)

    if (scrollTop > 0) {
      const newContainer = html.querySelector('.ms-npc-body')

      if (newContainer) newContainer.scrollTop = scrollTop
    }
  }
}
