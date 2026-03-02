import { INameable } from '@module/data/mixins/nameable.js'

class GurpsItems extends foundry.documents.collections.Items {
  // @ts-expect-error - Something wrong with the return type?
  override getName<Options extends foundry.documents.abstract.DocumentCollection.GetOptions | undefined = undefined>(
    name: string,
    options?: Options
  ): Collection.GetReturnType<Item.Stored, Options> {
    let entry = this.find(item => item.name === name)

    if (!entry)
      entry = this.find(
        item =>
          INameable.isApplier(item.system) &&
          'nameWithReplacements' in item.system &&
          typeof item.system.nameWithReplacements === 'string' &&
          item.system.nameWithReplacements === name
      )

    if (options && options.strict && !entry) {
      throw new Error(`An entry with name ${name} does not exist in the collection`)
    }

    return entry as Item.Stored
  }
}

export { GurpsItems }
