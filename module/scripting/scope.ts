class Scope {
  parent?: Scope
  vars = new Map<string, unknown>()

  /* ---------------------------------------- */

  constructor(parent?: Scope) {
    this.parent = parent
  }

  /* ---------------------------------------- */

  get(name: string): unknown {
    if (this.vars.has(name)) return this.vars.get(name)

    return this.parent?.get(name)
  }

  /* ---------------------------------------- */

  set(name: string, value: unknown): void {
    if (this.vars.has(name)) {
      this.vars.set(name, value)

      return
    }

    if (this.parent && this.parent.has(name)) {
      this.parent.set(name, value)

      return
    }

    this.vars.set(name, value)
  }

  /* ---------------------------------------- */

  define(name: string, value: unknown): void {
    this.vars.set(name, value)
  }

  /* ---------------------------------------- */

  has(name: string): boolean {
    if (this.vars.has(name)) return true

    return this.parent?.has(name) ?? false
  }
}

/* ---------------------------------------- */

export { Scope }
