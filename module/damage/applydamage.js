'use strict'

import { digitsAndDecimalOnly, digitsAndNegOnly } from '../../lib/jquery-helper.js'
import * as settings from '../../lib/miscellaneous-settings.js'
import {
  displayMod,
  generateUniqueId,
  isNiceDiceEnabled,
  locateToken,
  objectToArray,
  parseFloatFrom,
  parseIntFrom,
} from '../../lib/utilities.js'
import { GurpsActor } from '../actor/actor.js'
import { handleOnPdf } from '../pdf-refs.js'
import { TokenActions } from '../token-actions.js'
import { CompositeDamageCalculator } from './damagecalculator.js'

const simpleDialogHeight = 160

/**
 * Displays the Apply Damage Dialog. Delegates all the logic behind calculating
 * and applying damage to a character to instance variable _calculator.
 *
 * Takes as input a GurpsActor and DamageData.
 *
 * EXAMPLE DamageData:
 *   let damageData = {
 *     attacker: actor,
 *     dice: '3d+5',
 *     damage: 21,
 *     damageType: 'cut',
 *     armorDivisor: 2
 *   }
 */
export default class ApplyDamageDialog extends Application {
  /**
   * Create a new ADD.
   *
   * @param {GurpsActor} actor
   * @param {Array} damageData
   * @param {*} options
   */
  constructor(actor, damageData, options = {}) {
    super(options)

    if (!Array.isArray(damageData)) damageData = [damageData]

    this._calculator = new CompositeDamageCalculator(actor, damageData)
    this.actor = actor
    this.isSimpleDialog = game.settings.get(settings.SYSTEM_NAME, settings.SETTING_SIMPLE_DAMAGE)
    this.timesToApply = 1
    const attacker = game.actors.get(damageData[0].attacker)
    const gmUser = game.users.find(it => it.isGM && it.active)

    this.sourceTokenImg =
      canvas.tokens.placeables.find(t => t.actor?.id === attacker?.id)?.document.texture.src ||
      attacker?.img ||
      gmUser.avatar

    this.sourceTokenName =
      canvas.tokens.placeables.find(t => t.actor?.id === attacker?.id)?.name || attacker?.name || gmUser.name

    this.targetTokenImg = actor.token?.texture.src || actor.img
    this.targetTokenName = actor.token?.name || actor.name

    let trackers = objectToArray(actor._additionalResources.tracker)
    this._resourceLabels = trackers.filter(it => !!it.isDamageType).filter(it => !!it.alias)

    this._adjustHitLocationIfNecessary()
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['boilerplate', 'sheet', 'actor'],
      id: 'apply-damage-dialog',
      template: 'systems/gurps/templates/apply-damage/apply-damage-dialog.hbs',
      resizable: true,
      minimizable: false,
      width: 800,
      height: game.settings.get(settings.SYSTEM_NAME, settings.SETTING_SIMPLE_DAMAGE) ? simpleDialogHeight : 'auto',
      title: game.i18n.localize('GURPS.addApplyDamageDialog'),
    })
  }

  async getData() {
    let data = super.getData()
    data.actor = this.actor
    data.CALC = this._calculator
    data.timesToApply = this.timesToApply
    data.isSimpleDialog = this.isSimpleDialog
    data.resourceLabels = this._resourceLabels
    data.sourceTokenImage = this.sourceTokenImg
    data.sourceTokenName = this.sourceTokenName
    data.targetTokenImage = this.targetTokenImg
    data.targetTokenName = this.targetTokenName
    data.contextEffects = await this._calculator.addEffectsContext()
    return data
  }

  /*
   * Wire the logic to the UI.
   */
  activateListeners(html) {
    super.activateListeners(html)

    // Activate all PDF links
    html.find('.pdflink').on('click', handleOnPdf)
    html.find('.digits-only').inputFilter(value => digitsAndNegOnly.test(value))
    html.find('.decimal-digits-only').inputFilter(value => digitsAndDecimalOnly.test(value))

    // ==== Multiple Dice ====
    html.find('#pagination-left').on('click', ev => {
      if (this._calculator.viewId === 'all') return
      if (this._calculator.viewId === 0) this._calculator.viewId = 'all'
      else this._calculator.viewId = this._calculator.viewId - 1

      this.updateUI()
    })

    html.find('#pagination-right').on('click', ev => {
      if (this._calculator.viewId === 'all') this._calculator.viewId = 0
      else {
        let index = this._calculator.viewId + 1
        if (index >= this._calculator.length) return
        this._calculator.viewId = index
      }
      this.updateUI()
    })

    for (let index = 0; index < this._calculator.length; index++) {
      html.find(`#pagination-${index}`).on('click', ev => {
        this._calculator.viewId = index
        this.updateUI()
      })
    }

    html.find('#pagination-all').on('click', ev => {
      this._calculator.viewId = 'all'
      this.updateUI()
    })

    // ==== Simple Damage ====
    html
      .find('#basicDamage')
      .on('change', ev => this._updateModelFromInputText($(ev.currentTarget), 'basicDamage', parseIntFrom))

    html.find('#apply-publicly').on('click', ev => {
      this.submitDirectApply(ev.shiftKey, true)
    })

    html.find('#apply-secretly').on('click', ev => {
      let content = html.find('#apply-dropdown')
      this._toggleVisibility(content, content.hasClass('invisible'))
      this.submitDirectApply(ev.shiftKey, false)
    })

    html.find('#apply-keep').on('click', ev => {
      let content = html.find('#apply-dropdown')
      this._toggleVisibility(content, content.hasClass('invisible'))
      this.submitDirectApply(true, true)
    })

    html.find('#apply-secretly-keep').on('click', ev => {
      let content = html.find('#apply-dropdown')
      this._toggleVisibility(content, content.hasClass('invisible'))
      this.submitDirectApply(true, false)
    })

    html.find('#apply-split').on('click', ev => {
      let content = html.find('#apply-dropdown')
      this._toggleVisibility(content, content.hasClass('invisible'))
    })

    // When dropdown changes, update the calculator and refresh GUI.
    html.find('#apply-to').on('change', ev => {
      this._calculator.applyTo = $(ev.currentTarget).find('option:selected').val()
      this.updateUI()
    })

    // ==== Hit Location and DR ====
    // When user-entered DR input changes, update the calculator.
    html
      .find('#override-dr input')
      .on('change', ev => this._updateModelFromInputText($(ev.currentTarget), 'userEnteredDR', parseIntFrom))

    // clear the user override of the Override DR value
    html.find('#override-dr button').click(() => {
      this._calculator.userEnteredDR = null
      this.updateUI()
    })

    html.find('#apply-multiple').on('change', ev => {
      let temp = $(ev.currentTarget).val()
      temp = parseIntFrom(temp, 1)
      this.timesToApply = temp
    })

    // When the 'random' button is clicked, update the hit location.
    html.find('#random-location').on('click', async () => {
      this._calculator._hitLocationAdjusted = false
      await this._randomizeHitLocation()
      await this._adjustHitLocationIfNecessary()
    })

    // When a new Hit Location is selected, calculate the new results and update the UI.
    html
      .find('input[name="hitlocation"]')
      .click(ev => this._updateModelFromRadioValue($(ev.currentTarget), 'hitLocation'))

    // ==== Type and Wounding Modifiers ====
    html
      .find('input[name="woundmodifier"]')
      .click(ev => this._updateModelFromRadioValue($(ev.currentTarget), 'damageType'))

    html
      .find('#user-entered-woundmod')
      .on('change', ev =>
        this._updateModelFromInputText($(ev.currentTarget), 'userEnteredWoundModifier', parseFloatFrom)
      )

    // When 'Additional Mods' text changes, save the (numeric) value in this object and
    // update the result-addmodifier, if necessary.
    html
      .find('#addmodifier')
      .on('change', ev =>
        this._updateModelFromInputText($(ev.currentTarget), 'additionalWoundModifier', parseFloatFrom)
      )

    html
      .find('#adddamagemodifier')
      .on('change', ev => this._updateModelFromInputText($(ev.currentTarget), 'damageModifier', t => t))

    // ==== Tactical Rules ====
    // use armor divisor rules
    html
      .find('#tactical-armordivisor')
      .click(ev => this._updateModelFromCheckedElement($(ev.currentTarget), 'useArmorDivisor'))

    // armor divisor level
    html
      .find('select[name="tactical-armordivisor"]')
      .on('change', ev => this._updateModelFromSelect($(ev.currentTarget), 'armorDivisor', parseFloat))

    // use blunt trauma rules
    html
      .find('#tactical-blunttrauma')
      .click(ev => this._updateModelFromCheckedElement($(ev.currentTarget), 'useBluntTrauma'))

    // use hit location wounding modifiers rules
    html
      .find('#tactical-locationmodifier')
      .click(ev => this._updateModelFromCheckedElement($(ev.currentTarget), 'useLocationModifiers'))

    // ==== Other situations ====
    // is a ranged attack and at 1/2 damage or further range
    html
      .find('#specials-range12D')
      .click(ev => this._updateModelFromCheckedElement($(ev.currentTarget), 'isRangedHalfDamage'))

    // target is vulnerable to this attack
    html.find('#vulnerable').click(ev => this._updateModelFromCheckedElement($(ev.currentTarget), 'isVulnerable'))

    // Vulnerability level
    html
      .find('input[name="vulnerability"]')
      .click(ev => this._updateModelFromRadioValue($(ev.currentTarget), 'vulnerabilityMultiple', parseFloat))

    // target has Hardened DR
    html.find('#hardened').click(ev => this._updateModelFromCheckedElement($(ev.currentTarget), 'isHardenedDR'))

    // Hardened DR level
    html
      .find('input[name="hardened"]')
      .click(ev => this._updateModelFromRadioValue($(ev.currentTarget), 'hardenedDRLevel', parseFloat))

    html
      .find('select[name="hardened"]')
      .on('change', ev => this._updateModelFromSelect($(ev.currentTarget), 'hardenedDRLevel', parseInt))

    // target has Injury Tolerance
    html
      .find('#injury-tolerance')
      .click(ev => this._updateModelFromCheckedElement($(ev.currentTarget), 'isInjuryTolerance'))

    // type of Injury Tolerance
    html
      .find('input[name="injury-tolerance"]')
      .click(ev => this._updateModelFromRadioValue($(ev.currentTarget), 'injuryToleranceType'))

    // if checked, target has Injury Tolerance (Damage Reduction)
    html.find('#damage-reduction').click(ev => {
      if (!$(ev.currentTarget).is(':checked')) {
        this._calculator.damageReductionLevel = null
        this.updateUI()
      }
      this._updateModelFromCheckedElement($(ev.currentTarget), 'useDamageReduction')
    })

    // damage reduction level field
    html
      .find('#damage-reduction-field input')
      .on('change', ev => this._updateModelFromInputText($(ev.currentTarget), 'damageReductionLevel', parseFloatFrom))

    // clear the damage reduction level field
    html.find('#damage-reduction-field button').click(() => {
      this._calculator.damageReductionLevel = null
      this.updateUI()
    })

    // if checked, target has flexible armor; check for blunt trauma
    html
      .find('#flexible-armor')
      .click(ev => this._updateModelFromCheckedElement($(ev.currentTarget), 'isFlexibleArmor'))

    // Blunt Trauma user override text field
    html.find('#blunt-trauma-field input').on('change', ev => {
      let currentValue = $(ev.currentTarget).val()
      this._calculator.bluntTrauma =
        currentValue === '' || currentValue === this._calculator.calculatedBluntTrauma ? null : parseFloat(currentValue)
      this.updateUI()
    })

    // clear the user override of the Blunt trauma value
    html.find('#blunt-trauma-field button').click(() => {
      this._calculator.bluntTrauma = null
      this.updateUI()
    })

    // if checked, target has flexible armor; check for blunt trauma
    html.find('#explosion-damage').click(ev => this._updateModelFromCheckedElement($(ev.currentTarget), 'isExplosion'))

    html.find('#explosion-yards').on('change', ev => {
      let currentValue = $(ev.currentTarget).val()
      this._calculator.hexesFromExplosion = currentValue === '' || currentValue === '0' ? 1 : parseInt(currentValue)
      this.updateUI()
    })

    html.find('#shotgun-damage').click(ev => this._updateModelFromCheckedElement($(ev.currentTarget), 'isShotgun'))

    html.find('#shotgun-rof-multiplier').on('change', ev => {
      let currentValue = $(ev.currentTarget).val()
      this._calculator.shotgunRofMultiplier = currentValue === '' || currentValue === '0' ? 1 : parseInt(currentValue)
      this.updateUI()
    })

    // ==== Results ====
    html.find('#result-effects button').click(async ev => this._handleEffectButtonClick(ev))

    html
      .find(
        '#add-shock-next button, #add-major button, #add-crippling button, #add-knockback button, #add-vitals button'
      )
      .on('click', ev => this._handleEffectAddEffectButtonClick(ev))

    html
      .find('#test-major button, #test-knockback button, #test-vitals button, #test-crippling button')
      .on('click', ev => this._handleTestSaveEffectButtonClick(ev))

    html.find('#apply-injury-split').on('click', ev => {
      let content = html.find('#apply-injury-dropdown')
      this._toggleVisibility(content, content.hasClass('invisible'))
    })

    html.find('#apply-injury-publicly').click(ev => {
      this.submitInjuryApply(ev, ev.shiftKey, true)
    })

    html.find('#apply-injury-secretly').on('click', ev => {
      let content = html.find('#apply-injury-dropdown')
      this._toggleVisibility(content, content.hasClass('invisible'))
      this.submitInjuryApply(ev, ev.shiftKey, false)
    })

    html.find('#apply-injury-keep').on('click', ev => {
      let content = html.find('#apply-injury-dropdown')
      this._toggleVisibility(content, content.hasClass('invisible'))
      this.submitInjuryApply(ev, true, true)
    })

    html.find('#apply-injury-secretly-keep').on('click', ev => {
      let content = html.find('#apply-injury-dropdown')
      this._toggleVisibility(content, content.hasClass('invisible'))
      this.submitInjuryApply(ev, true, false)
    })
  }

  /**
   *
   * @param {node} element to get value from
   * @param {string} property name in the model to update
   * @param {function(string) : any} converter function to covert element value (string) to model data type
   */
  _updateModelFromInputText(element, property, converter) {
    this._calculator[property] = converter(element.val())

    // removes leading zeros or replaces blank with zero
    if (element.val() !== this._calculator[property].toString()) element.val(this._calculator[property])

    this.updateUI()
  }

  /**
   * Update the model based on the property name.
   * @param {*} element
   * @param {*} property
   * @param {*} converter
   */
  _updateModelFromRadioValue(
    element,
    property,
    converter = value => {
      return value
    }
  ) {
    if (element.is(':checked')) {
      this._calculator[property] = converter(element.val())
      this.updateUI()
    }
  }

  /**
   *
   * @param {HtmlElement} select
   * @param {String} property of model to update
   * @param {Function} converter optional converter function; by default its the identity function
   */
  _updateModelFromSelect(
    select,
    property,
    converter = value => {
      return value
    }
  ) {
    let valueText = select.find('option:selected').val()
    this._calculator[property] = converter(valueText)
    this.updateUI()
  }

  /**
   * Update the damage calculator property from a UI element that has the 'checked' attribute
   * @param {*} element
   * @param {*} property
   */
  _updateModelFromCheckedElement(element, property) {
    this._calculator[property] = element.is(':checked')
    this.updateUI()
  }

  async _sendDiceMessage(roll, options = {}) {
    if (!roll) return

    roll.toMessage(options).then(() => this.updateUI())

    if (!isNiceDiceEnabled()) {
      AudioHelper.play({ src: CONFIG.sounds.dice })
    }
  }

  /**
   * Ask the calculator to randomly select a hit location, and return the roll used.
   */
  async _randomizeHitLocation() {
    this._sendDiceMessage(await this._calculator.randomizeHitLocation(), {
      chatMessage: 'Rolling for Hit Location.',
    })
  }

  async _adjustHitLocationIfNecessary() {
    // If the current hit location is Random, resolve the die roll and update the hit location.
    if (this._calculator.hitLocation === 'Random') await this._randomizeHitLocation()

    const options = {
      chatMessage: 'Rolling for Potential Vitals Hit.',
      appearance: {
        foreground: '#ffffff',
        edge: '#bd6e00',
        background: '#bd6e00',
      },
    }
    this._sendDiceMessage(await this._calculator.adjustHitLocationIfNecessary(), options)
  }

  _toggleVisibility(element, isVisible) {
    if (isVisible) {
      element.removeClass('invisible')
    } else {
      element.addClass('invisible')
    }
  }

  /**
   * Updates the UI based on the current state of the _calculator.
   */
  updateUI() {
    this.render(false)
  }

  async _renderTemplate(template, data) {
    return renderTemplate('systems/gurps/templates/apply-damage/' + template, data)
  }

  async _handleTestSaveEffectButtonClick(ev) {
    let dataEffect = ev.currentTarget.attributes['data-effect'].value
    let effect = JSON.parse(dataEffect)
    let otf = ''

    switch (effect.type) {
      case 'headvitalshit':
      case 'majorwound':
      case 'crippling':
        const htCheck =
          (effect?.modifier ?? 0) === 0
            ? 'HT'
            : effect.modifier < 0
              ? `HT+${-effect.modifier}`
              : `HT-${effect.modifier}`

        otf = `/r [!${htCheck}]`
        break

      case 'knockback':
        const dx = game.i18n.localize('GURPS.attributesDX')
        const dxCheck = effect?.modifier && effect.modifier === 0 ? dx : `${dx} -${effect.modifier}`
        const localeAcrobaticsName = game.i18n.localize('GURPS.skillAcrobatics')
        const localeAcrobaticsCheck =
          effect?.modifier && effect.modifier === 0
            ? localeAcrobaticsName
            : `${localeAcrobaticsName} -${effect.modifier}`
        const localeJudoName = game.i18n.localize('GURPS.skillJudo')
        const localeJudoCheck =
          effect?.modifier && effect.modifier === 0 ? localeJudoName : `${localeJudoName} -${effect.modifier}`
        otf = `/r [!${dxCheck} | Sk:${localeAcrobaticsCheck} | Sk:${localeJudoCheck}]`
        break
    }

    if (!!otf) await this.actor.runOTF(otf)
  }

  async _handleEffectAddEffectButtonClick(ev) {
    ev.preventDefault()
    ev.stopPropagation()
    let tokenId = this.actor.token?.id
    if (!tokenId) tokenId = canvas.tokens.placeables.find(it => it.actor === this.actor).id
    const button = $(ev.currentTarget)
    const effect = button.data('effect')
    const token = canvas.tokens.get(tokenId)
    const actions = await TokenActions.fromToken(token)
    const buttonAddClass = `fa-plus-circle`
    const buttonAddedClass = `fa-check-circle`

    const toggleEffect = async (effect, span, starts = '', label = '') => {
      // Check if effect already exists in Token
      const effectExists = token.actor.effects.filter(e =>
        !!starts ? e._source.statuses[0].startsWith(starts) : e._source.statuses[0] === effect
      )
      if (!!effectExists.length > 0) {
        // Remove all effects from Token
        for (let existingEffect of effectExists) {
          await token.setEffectActive(existingEffect._source.statuses[0], false)
        }
        span.removeClass(`${buttonAddedClass} green`).addClass(`${buttonAddClass} black`)
        span.attr('title', game.i18n.localize(`GURPS.add${starts || effect}${label}Effect`))
      } else {
        // Add effect to Token
        await token.setEffectActive(effect, true)
        span.removeClass(`${buttonAddClass} black`).addClass(`${buttonAddedClass} green`)
        span.attr('title', game.i18n.localize(`GURPS.remove${starts || effect}${label}Effect`))
      }
    }

    const span = button.find('span')
    switch (effect.type) {
      case 'shock':
        // Check if the effect is already in the next turn or applied
        const shockEffect = `shock${effect.amount}`
        const applyAt = game.settings.get(settings.SYSTEM_NAME, settings.SETTING_ADD_SHOCK_AT_TURN)
        if (applyAt === 'AtNextTurn') {
          const allShocks = actions.getNextTurnEffects().find(e => e.startsWith('shock'))
          if (!!allShocks) {
            await actions.removeFromNextTurn(allShocks)
            span.removeClass(`${buttonAddedClass} green`).addClass(`${buttonAddClass} black`)
            span.attr('title', game.i18n.localize('GURPS.addShockEffect'))
            ui.notifications.info(game.i18n.localize('GURPS.removedShockEffect'))
          } else {
            const otherShocks = actions.getNextTurnEffects().find(e => e.startsWith('shock') && e !== shockEffect)
            if (!!otherShocks) {
              await actions.removeFromNextTurn(otherShocks)
            }
            // Add the effect to the next turn
            await actions.addToNextTurn([shockEffect])
            span.removeClass(`${buttonAddClass} black`).addClass(`${buttonAddedClass} green`)
            span.attr('title', game.i18n.localize(`GURPS.removeShock${applyAt}Effect`))
            ui.notifications.info(game.i18n.localize(`GURPS.addedShock${applyAt}Effect`))
          }
        } else {
          await toggleEffect(shockEffect, span, 'shock', applyAt)
        }

        break
      case 'headvitalshit':
      case 'majorwound':
      case 'crippling':
        await toggleEffect(effect.effectName, span)
        break
      case 'knockback':
        await toggleEffect(effect.effectName, span)
        break
    }

    this.render(false)
  }

  /**
   * Create and show the chat message for the Effect.
   * @param {*} ev
   */
  async _handleEffectButtonClick(ev) {
    // TODO allow click to automatically apply effect to a selected target
    let stringified = ev.currentTarget.attributes['data-struct']?.value
    if (!stringified) return
    let object = JSON.parse(stringified)

    let token = null
    if (this.actor.isToken) {
      token = this.actor?.token
    } else {
      let tokens = locateToken(this.actor.id)
      token = tokens.length === 1 ? tokens[0] : null
    }

    let message = ''

    if (object.type === 'shock') {
      let button = `/r [/st + shock${object.amount}]`
      if (!!token) button = `/sel ${token.id} \\\\ ${button}`

      message = await this._renderTemplate('chat-shock.hbs', {
        name: !!token ? token.name : this.actor.name,
        modifier: object.amount,
        doubled: object.amount * 2,
        button: button,
      })
    }

    if (object.type === 'majorwound') {
      let htCheck =
        object.modifier === 0 ? 'HT' : object.modifier < 0 ? `HT+${-object.modifier}` : `HT-${object.modifier}`
      let button = `/if ![${htCheck}] {/st + stun \\\\ /st + prone}`
      if (!!token) button = `/sel ${token.id} \\\\ ${button}`

      message = await this._renderTemplate('chat-majorwound.hbs', {
        name: !!token ? token.name : this.actor.name,
        button: button,
        htCheck: htCheck.replace('HT', game.i18n.localize('GURPS.attributesHT')),
      })
    }

    if (object.type === 'headvitalshit') {
      let htCheck =
        object.modifier === 0 ? 'HT' : object.modifier < 0 ? `HT+${-object.modifier}` : `HT-${object.modifier}`
      let button = `/if ![${htCheck}] {/st + stun \\\\ /st + prone}`
      if (!!token) button = `/sel ${token.id} \\\\ ${button}`

      message = await this._renderTemplate('chat-headvitalshit.hbs', {
        name: !!token ? token.name : this.actor.name,
        button: button,
        location: object.detail,
        htCheck: htCheck.replace('HT', game.i18n.localize('GURPS.attributesHT')),
      })
    }

    if (object.type === 'knockback') {
      let dx = game.i18n.localize('GURPS.attributesDX')
      let dxCheck = object.modifier === 0 ? dx : `${dx}-${object.modifier}`
      let acro = game.i18n.localize('GURPS.skillAcrobatics')
      let acroCheck = object.modifier === 0 ? acro : `${acro}-${object.modifier}`
      let judo = game.i18n.localize('GURPS.skillJudo')
      let judoCheck = object.modifier === 0 ? judo : `${judo}-${object.modifier}`

      let button = `/if ![${dxCheck} | Sk:${acroCheck} | Sk:${judoCheck}] {/st + prone}`
      if (!!token) button = `/sel ${token.id} \\\\ ${button}`

      let templateData = {
        name: !!token ? token.name : this.actor.name,
        button: button,
        yards: object.amount,
        pdfref: game.i18n.localize('GURPS.pdfKnockback'),
        unit: object.amount > 1 ? game.i18n.localize('GURPS.yards') : game.i18n.localize('GURPS.yard'),
        dx: dxCheck.replace('-', '−'),
        acrobatics: acroCheck.replace('-', '−'),
        judo: judoCheck.replace('-', '−'),
        classStart: '<span class="pdflink">',
        classEnd: '</span>',
      }

      message = await this._renderTemplate('chat-knockback.hbs', templateData)
    }

    if (object.type === 'crippling') {
      message = await this._renderTemplate('chat-crippling.hbs', {
        name: this.actor.name,
        location: object.detail,
        groundModifier: 'DX-1',
        swimFlyModifer: 'DX-2',
        pdfref: game.i18n.localize('GURPS.pdfCrippling'),
        classStart: '<span class="pdflink">',
        classEnd: '</span>',
      })
    }

    let msgData = {
      content: message,
      author: game.user.id,
      type: CONST.CHAT_MESSAGE_STYLES.OOC,
    }
    if (game.settings.get(settings.SYSTEM_NAME, settings.SETTING_WHISPER_STATUS_EFFECTS)) {
      let users = this.actor.getOwners()
      let ids = users.map(it => it.id)
      msgData.whisper = ids
    }

    ChatMessage.create(msgData)
  }

  _getModifierText(value) {
    let result = displayMod(value)
    if (result === '0') result = ''
    return result
  }

  /**
   * Handle clicking on the Apply (Publicly or Secretly) buttons.
   * @param {boolean} publicly - if true, display to everyone; else display to GM and owner.
   */
  submitDirectApply(keepOpen, publicly) {
    let injury = this._calculator.basicDamage
    this.resolveInjury(keepOpen, injury, publicly)
  }

  /**
   * Handle clicking on the Apply Injury (public or secret) buttons.
   * @param {boolean} publicly - if true, display to everyone; else display to GM and owner.
   */
  async submitInjuryApply(ev, keepOpen, publicly) {
    let injury = this._calculator.pointsToApply

    let dialog = $(ev.currentTarget).parents('.gga-app')
    let results = $(dialog).find('.results-table')
    let clone = results.clone().html()

    for (let index = 0; index < this.timesToApply; index++) {
      await this.resolveInjury(keepOpen, injury, publicly, clone)
    }
  }

  /**
   * Handle the actual loss of HP or FP on the actor and display the results in the chat.
   * @param {boolean} keepOpen - if true, apply the damage and keep this window open.
   * @param {int} injury
   * @param {String} type - a valid damage type (including resources)
   * @param {boolean} publicly - if true, display to everyone; else display to GM and owner.
   */
  async resolveInjury(keepOpen, injury, publicly, results = null) {
    let [resource, path] = this._calculator.resource

    if (!resource || !path) {
      ui.notifications.warn(
        `Actor ${this.actor.name} does not have a resource named "${this._calculator.damageType}"!!`
      )
      return
    }

    let attackingActor = game.actors.get(this._calculator.attacker)

    let data = {
      id: generateUniqueId(),
      injury: injury,
      defender: this.actor.name,
      current: resource.value,
      location: this._calculator.resourceType === 'HP' ? this._calculator.hitLocation : null,
      type: this._calculator.resourceType,
      resultsTable: results,
    }

    let newValue = resource.isDamageTracker ? resource.value + injury : resource.value - injury

    let update = {}
    update[`${path}.value`] = newValue
    await this.actor.update(update)

    this._renderTemplate('chat-damage-results.hbs', data).then(html => {
      let speaker = ChatMessage.getSpeaker(game.user)
      if (!!attackingActor) speaker = ChatMessage.getSpeaker(attackingActor)
      let messageData = {
        user: game.user.id,
        speaker: speaker,
        content: html,
        type: CONST.CHAT_MESSAGE_STYLES.OTHER,
      }

      if (!publicly) {
        let users = this.actor.getOwners()
        let ids = users.map(it => it.id)
        messageData.whisper = ids
      }

      ChatMessage.create(messageData).then(message => {
        GURPS.lastInjuryRoll = data
        GURPS.lastInjuryRolls[this.actor.id] = data
        GURPS.lastInjuryRolls[message.id] = data
      })

      if (!keepOpen) this.close()
    })
  }
}
