enum AttributeType {
  Integer = 'integer',
  IntegerRef = 'integerRef',
  Decimal = 'decimal',
  DecimalRef = 'decimalRef',
  Pool = 'pool',
  PoolRef = 'poolRef',
  PrimarySeparator = 'primarySeparator',
  SecondarySeparator = 'secondarySeparator',
  PoolSeparator = 'poolSeparator',
}

/* ---------------------------------------- */

enum GcsAttributePlacement {
  Automatic = 'automatic',
  Primary = 'primary',
  Secondary = 'secondary',
  Hidden = 'hidden',
}

/* ---------------------------------------- */

enum GcsAttributeKind {
  Primary = 'primary',
  Secondary = 'secondary',
  Pool = 'pool',
}

/* ---------------------------------------- */

enum GcsThresholdOp {
  HalveMove = 'halve_move',
  HalveDodge = 'halve_dodge',
  HalveST = 'halve_st',
}

/* ---------------------------------------- */

export { AttributeType, GcsAttributeKind, GcsAttributePlacement, GcsThresholdOp }
