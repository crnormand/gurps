import { ChromiumFileHandler } from './chrome-file-handler.js'
import { FallbackFileHandler } from './fallback-file-handler.js'
function getBrowser() {
  // the code is based on https://developer.mozilla.org/en-US/docs/Web/API/Window/navigator
  const sUsrAg = navigator.userAgent
  // The order matters here, and this may report false positives for unlisted browsers.
  if (sUsrAg.indexOf('Firefox') > -1) {
    return 'Mozilla Firefox'
  } else if (sUsrAg.indexOf('SamsungBrowser') > -1) {
    return 'Samsung Internet'
  } else if (sUsrAg.indexOf('Opera') > -1 || sUsrAg.indexOf('OPR') > -1) {
    return 'Opera'
  } else if (sUsrAg.indexOf('Trident') > -1) {
    return 'Microsoft Internet Explorer'
  } else if (sUsrAg.indexOf('Edge') > -1) {
    return 'Microsoft Edge'
  } else if (sUsrAg.indexOf('Chrome') > -1) {
    return 'Chromium'
  } else if (sUsrAg.indexOf('Safari') > -1) {
    return 'Apple Safari'
  } else {
    return 'unknown'
  }
}
const IS_CHROMIUM = ['Chromium', 'Microsoft Edge', 'Opera'].includes(getBrowser())
const FileHandler = IS_CHROMIUM ? ChromiumFileHandler : FallbackFileHandler
export class UniversalFileHandler {
  static async getFile({ template, templateOptions = {}, extensions = [] }) {
    extensions = typeof extensions === 'string' ? [extensions] : extensions
    return FileHandler.getFile({ template, templateOptions, extensions })
  }
  static async getFolder({ template, templateOptions = {} }) {
    return FileHandler.getFolder({ template, templateOptions })
  }
}
