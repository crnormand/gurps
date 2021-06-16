export default class ChatProcessor {
  /**
   * Override
   * @param {*} line - chat command
   * @returns true if this processor will handle this chat command
   */
  matches(line) {}

  /**
   * Override to process a chat command
   * @param {*} line
   */
  process(line, msgs) {}

  /**
   * Override to return the '/help' display string
   * @param {*} isGMOnly
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
    this.registry.send()
  }
  priv(txt, force) {
    this.registry.priv(txt, force)
  }
  pub(txt) {
    this.registry.pub(txt)
  }
  prnt(txt) {
    this.registry.prnt(txt)
  }
  msgs() {
    return this.registry.msgs
  }
}
