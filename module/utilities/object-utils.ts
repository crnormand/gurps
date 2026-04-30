export function isPlainObject(obj: any): boolean {
  return Object.prototype.toString.call(obj) === '[object Object]' && Object.getPrototypeOf(obj) === Object.prototype
}
