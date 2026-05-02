// expression-ast.ts

export type ExprNode = NumberNode | VariableNode | BinaryOpNode | UnaryOpNode | CallNode

export interface NumberNode {
  kind: 'number'
  value: number
}

export interface VariableNode {
  kind: 'variable'
  name: string // margin, level, etc.
}

export interface BinaryOpNode {
  kind: 'binary'
  op: '+' | '-' | '*' | '/'
  left: ExprNode
  right: ExprNode
}

export interface UnaryOpNode {
  kind: 'unary'
  op: '-'
  expr: ExprNode
}

export interface CallNode {
  kind: 'call'
  name: string
  args: ExprNode[]
}
