class ReturnSignal {
  constructor(public value: unknown) {}
}

/* ---------------------------------------- */

class BreakSignal {
  constructor(public label?: string) {}
}

/* ---------------------------------------- */

class ContinueSignal {
  constructor(public label?: string) {}
}

/* ---------------------------------------- */

export { ReturnSignal, BreakSignal, ContinueSignal }
