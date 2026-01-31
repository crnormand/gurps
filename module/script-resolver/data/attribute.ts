import { GcsAttribute } from '../../actor/data/gcs-attribute.ts'
import { ScriptMethodSpec, ScriptMethodType } from '../types.ts'

class ScriptAttribute {
  data: {
    id: string
    kind: string
    name: string
    fullName: string
    maximum: number
    isDecimal: boolean
    // valueOf: number
  }

  methods: Record<string, ScriptMethodSpec> = {
    valueOf: { type: ScriptMethodType.Expr, args: [], expr: 'String(this.value)' },
  }

  constructor(attribute: GcsAttribute) {
    const definition = attribute.definition

    if (!definition) {
      throw new Error('Attribute definition is missing')
    }

    this.data = {
      id: attribute.id,
      kind: definition.kind,
      name: definition.name,
      fullName: definition.resolvedFullName,
      maximum: attribute.max,
      isDecimal: definition.isDecimal,
      // valueOf: attribute.max,
    }
  }
}

export { ScriptAttribute }
