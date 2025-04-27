export {}

declare global {
  const GURPS: any

  interface DocumentClassConfig {
    Item: typeof GURPSItem
    Actor: typeof GURPSActor
  }
}
