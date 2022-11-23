'use strict'

export type OtF = "modifier" | "attribute" | "pdf" | "controlroll" // ...

export interface ParsedOtF {
  text: string,
  action?: OtFAction 
}

export interface OtFAction {
  orig: string,
  spantext: string,
  type: OtF
}

export function sanitizeOtF(str: string): string {
  str = str.replace(/%(?![0-9][0-9a-fA-F]+)/g, '%25')
  str = decodeURIComponent(str) // convert % (not followed by 2 digit hex) to %25, unicode characters into html format
  str = str.replace(/&nbsp;/g, ' ') // we need to convert non-breaking spaces into regular spaces for parsing
  str = str.replace(/&amp;/g, '&') // we need to convert to & for easier parsing
  str = str.replace(/&minus;/g, '-') // we need to convert to - for easier parsing
  str = str.replace(/&plus;/g, '+') // we need to convert to - for easier parsing
  str = str.replace(/(&#215;|&#xD7;|&times)/g, 'x') // we need to convert the multiplication symbol to x for easier parsing
  str = str.replace(/(<([^>]+)>)/gi, '') // remove <html> tags
  str = str.replace(/(\u201c|\u201d)/g, '"') // double quotes
  str = str.replace(/&quot;/g, '"') // double quotes
  // str = str.replace(/(\u2018|\u2019)/g, "'") // single quotes
  str = str.replace(/\u2011/g, '-') // replace non-breaking hyphon with a minus sign
  return str
}
