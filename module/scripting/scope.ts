type VarKind = 'var' | 'let' | 'const' | 'using' | 'await using'

class Scope {
  parent?: Scope
  vars = new Map<string, { kind: VarKind; value: unknown }>()

  /* ---------------------------------------- */

  constructor(parent?: Scope) {
    this.parent = parent
  }

  /* ---------------------------------------- */

  get(name: string): unknown {
    const entry = this.vars.get(name)

    if (entry) return entry.value

    return this.parent?.get(name)
  }

  /* ---------------------------------------- */

  assign(name: string, value: unknown): void {
    if (this.vars.has(name)) {
      const e = this.vars.get(name)!

      if (e.kind === 'const') throw new Error(`Cannot assign to const '${name}'`)
      e.value = value

      return
    }

    if (this.parent) return this.parent.assign(name, value)
    // If not declared, treat as error (safer than implicit globals)
    throw new Error(`'${name}' is not defined`)
  }

  /* ---------------------------------------- */

  define(name: string, kind: VarKind, value: unknown): void {
    if (kind === 'const' && this.vars.has(name)) {
      throw new Error(`Cannot redefine const '${name}'`)
    }

    if (kind === 'let' && this.vars.has(name)) {
      throw new Error(`Cannot redefine let '${name}'`)
    }

    if (kind === 'using' || kind === 'await using') {
      throw new Error(`'using' declarations are not supported in this context`)
    }

    this.vars.set(name, { kind, value })
  }

  /* ---------------------------------------- */

  hasHere(name: string): boolean {
    return this.vars.has(name)
  }

  has(name: string): boolean {
    if (this.vars.has(name)) return true

    return this.parent?.has(name) ?? false
  }
}

/* ---------------------------------------- */

export { Scope }
export type { VarKind }
