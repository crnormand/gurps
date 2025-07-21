export namespace SemanticVersion {
  export type VersionString = `${number}.${number}.${number}${string | undefined}`
}

export class SemanticVersion {
  major: number
  minor: number
  patch: number
  preRelease: string
  buildMetaData: string

  /* ---------------------------------------- */

  static re =
    /^(?<major>0|[1-9]\d*)\.(?<minor>0|[1-9]\d*)\.(?<patch>0|[1-9]\d*)(?:-(?<preRelease>[0-9A-Za-z\-\.]+))?(?:\+(?<buildMetaData>[0-9A-Za-z\-\.]+))?$/

  /* ---------------------------------------- */

  constructor() {
    this.major = 0
    this.minor = 0
    this.patch = 0
    this.preRelease = ''
    this.buildMetaData = ''
  }

  /* ---------------------------------------- */

  static fromString(str: string): SemanticVersion | null {
    const match = str.match(this.re)

    if (match) {
      let result = new this()
      result.major = parseInt(match.groups?.major || '0')
      result.minor = parseInt(match.groups?.minor || '0')
      result.patch = parseInt(match.groups?.patch || '0')
      result.preRelease = match.groups?.preRelease || ''
      result.buildMetaData = match.groups?.buildMetaData || ''
      return result
    }
    return null
  }

  /* ---------------------------------------- */

  toString(): string {
    return `${this.major}.${this.minor}.${this.patch}${this.preRelease ? '-' + this.preRelease : ''}${this.buildMetaData ? '+' + this.buildMetaData : ''}`
  }

  /* ---------------------------------------- */

  isHigherThan(otherVersion: SemanticVersion): boolean {
    if (this.major > otherVersion.major) return true
    if (this.major === otherVersion.major && this.minor > otherVersion.minor) return true
    if (this.major === otherVersion.major && this.minor === otherVersion.minor && this.patch > otherVersion.patch)
      return true
    return false
  }

  /* ---------------------------------------- */

  isLowerThan(otherVersion: SemanticVersion): boolean {
    if (this.major < otherVersion.major) return true
    if (this.major === otherVersion.major && this.minor < otherVersion.minor) return true
    if (this.major === otherVersion.major && this.minor === otherVersion.minor && this.patch < otherVersion.patch)
      return true
    return false
  }

  /* ---------------------------------------- */

  isEqualTo(otherVersion: SemanticVersion): boolean {
    return (
      this.major === otherVersion.major &&
      this.minor === otherVersion.minor &&
      this.patch === otherVersion.patch &&
      this.preRelease === otherVersion.preRelease &&
      this.buildMetaData === otherVersion.buildMetaData
    )
  }
}
