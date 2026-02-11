export {}

declare global {
  namespace gurps {
    /**
     * Helper type representing any DataModel which contains the static "metadata" property.
     */
    interface MetaDataOwner {
      metadata: {
        embedded: Record<string, string>
      }
    }
  }
}
