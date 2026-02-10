import { INameable } from '@module/data/mixins/nameable.js'

class GurpsItems extends foundry.documents.collections.Items {
  override getName<Options extends Collection.GetOptions | undefined = undefined>(
    name: string,
    options?: Options
  ): Collection.GetReturn<Item.Stored, Options> {
    let entry = this.find(item => item.name === name)

    if (!entry)
      entry = this.find(
        item =>
          INameable.isApplier(item.system) &&
          'nameWithReplacements' in item.system &&
          typeof item.system.nameWithReplacements === 'string' &&
          item.system.nameWithReplacements === name
      )

    if (options && options.strict && entry === undefined) {
      throw new Error(`An entry with name ${name} does not exist in the collection`)
    }

    return (entry ?? undefined) as Collection.GetReturn<Item.Stored, Options>
  }
}

export { GurpsItems }
