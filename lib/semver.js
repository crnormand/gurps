export class SemanticVersion {
  static re = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/

  constructor() {
    this.major = 0;
    this.minor = 0;
    this.patch = 0;
    this.preRelease = "";
    this.buildMetaData = "";
  }

  static fromString(str) {
    if (str.match(this.re)) {
      let result = new this();
      result.major = parseInt(RegExp.$1);
      result.minor = parseInt(RegExp.$2);
      result.patch = parseInt(RegExp.$3);
      result.preRelease = RegExp.$4 || "";
      result.buildMetaData = RegExp.$5 || "";
      return result;
    }
    return null;
  }

  toString() {
    return `${this.major}.${this.minor}.${this.patch}`;
  }

  isHigherThan(otherVersion) {
    if (this.major > otherVersion.major) return true;
    if (this.major === otherVersion.major && this.minor > otherVersion.minor) return true;
    if (this.major === otherVersion.major
      && this.minor === otherVersion.minor
      && this.patch > otherVersion.patch) return true;
    return false;
  }

  isLowerThan(otherVersion) {
    if (this.major < otherVersion.major) return true;
    if (this.major === otherVersion.major && this.minor < otherVersion.minor) return true;
    if (this.major === otherVersion.major
      && this.minor === otherVersion.minor
      && this.patch < otherVersion.patch) return true;
    return false;
  }
}
