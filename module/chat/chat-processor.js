export default class ChatProcessor {
  constructor() {
    /** @type {ChatProcessors|null} */
    this.registry = null
  }

  /**
   * Override
   * @param {string} line - chat command
   * @returns {RegExpMatchArray|null|undefined} true if this processor will handle this chat command
   */
  matches(line) {
    return null
  }

  /**
   * Override
   * @param {string} line - chat command
   * @returns {RegExpMatchArray|null|undefined} true if this processor will report how to use command
   */
  usagematches(line) {
    return null
  }

  /**
   * Override to process a chat command
   * @param {string} line
   * @param {any|null} msgs
   * @returns {Promise<any>}
   */
  async process(line, msgs = null) {}

  /**
   * Override to return the '/help' display string
   * @returns {string|null}
   */
  help() {
    return 'Must return help string or null'
  } // This does not need to be i18n

  /**
   * Override to true if this chat command only works for GMs
   */
  isGMOnly() {
    return false
  }

  send() {
    this.registry?.send()
  }

  /**
   * @param {string} txt
   * @param {boolean | undefined} [force]
   */
  priv(txt, force) {
    this.registry?.priv(txt, force)
  }

  /**
   * @param {string} txt
   */
  pub(txt) {
    this.registry?.pub(txt)
  }

  /**
   * @param {string} txt
   */
  prnt(txt) {
    this.registry?.prnt(txt)
  }

  msgs() {
    return this.registry?.msgs
  }
}
