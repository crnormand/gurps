import { fields } from '@gurps-types/foundry/index.js'

import { diceNormalize, diceValidate } from '../validators/dice-validator.js'

class DiceField extends fields.StringField {
  constructor(options: any = {}) {
    super({
      ...options,
      validate: options.validate ?? diceValidate,
      validationError: options.validationError ?? game.i18n!.localize('GURPS.invalidDice'),
    })
  }

  override clean(value: unknown, options: any = {}): string {
    const normalized = diceNormalize(String(value), options.useGurpsFormat)

    if (normalized === null) {
      throw new Error(game.i18n!.localize('GURPS.invalidDice'))
    }

    return normalized
  }
}

export default DiceField
