import { ChromiumFileHandler } from './chrome-file-handler.js'
import { FallbackFileHandler } from './fallback-file-handler.js'

function getBrowser() {
  // the code is based on https://developer.mozilla.org/en-US/docs/Web/API/Window/navigator
  const userAgent = navigator.userAgent

  // The order matters here, and this may report false positives for unlisted browsers.
  if (userAgent.indexOf('Firefox') > -1) {
    return 'Mozilla Firefox'
  } else if (userAgent.indexOf('SamsungBrowser') > -1) {
    return 'Samsung Internet'
  } else if (userAgent.indexOf('Opera') > -1 || userAgent.indexOf('OPR') > -1) {
    return 'Opera'
  } else if (userAgent.indexOf('Trident') > -1) {
    return 'Microsoft Internet Explorer'
  } else if (userAgent.indexOf('Edge') > -1) {
    return 'Microsoft Edge'
  } else if (userAgent.indexOf('Chrome') > -1) {
    return 'Chromium'
  } else if (userAgent.indexOf('Safari') > -1) {
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
