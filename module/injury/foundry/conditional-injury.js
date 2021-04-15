import * as CI from '../domain/ConditionalInjury.js'
import * as Settings from '../../../lib/miscellaneous-settings.js'

export default class GURPSConditionalInjury {
  constructor() {
    let self = this
    Handlebars.registerHelper('ciSeveritiesTooltip', self.severitiesTooltip)
    Handlebars.registerHelper('ciCurrentGrossEffects', self.currentGrossEffects)
  }

  async update() {
    // FYI render all open apps
    Object.values(ui.windows)
      .filter(it => it.rendered)
      .forEach(app => app.render(true))
  }

  isInUse = () => game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_CONDITIONAL_INJURY)

  conditionalEffectsTable = () => {
    return CI.conditionalEffectsTable
  }

  severitiesTooltip = opt => {
    const data = CI.conditionalEffectsTable.map(row => ({ severity: row.severity, label: row.grossEffects }))
    data.forEach(row => {
      if (row.severity === '-7 or less') {
        row.severity = '<= -7'
      }

      if (row.severity === '6 or more') {
        row.severity = '>= 6'
      }
    })

    let results = ''
    data.forEach(item => {
      results += opt.fn(item)
    })
    return results
  }

  currentGrossEffects = (severity, field) => {
    const result = {
      label: CI.grossEffectsForSeverity(severity),
    }

    if (severity < -1 || severity === '' || severity === null || severity === undefined) {
      result.style = 'normal'
    }

    severity = parseInt(severity, 10)

    if (severity === -1) {
      result.style = 'reeling'
    }

    if (severity >= 0 && severity <= 1) {
      result.style = 'collapse'
    }

    if (severity >= 2 && severity <= 3) {
      result.style = 'check'
    }

    if (severity >= 4 && severity <= 5) {
      result.style = 'dead'
    }

    if (severity >= 6) {
      result.style = 'destroyed'
    }

    return result[field]
  }
}
