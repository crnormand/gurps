export const simpleHash = input => {
  let hash = ''
  for (let i = 0; i < input.length; i++) {
    const charCode = input.charCodeAt(i)
    hash += (charCode * (i + 1)).toString(16)
  }
  if (hash.length > 16) {
    hash = hash.substring(0, 16)
  } else {
    while (hash.length < 16) {
      hash += '0'
    }
  }
  return hash
}
