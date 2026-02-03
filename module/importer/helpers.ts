import { DataModel } from '../types/foundry/index.js'

type TypedItemCreateData<SubType extends Item.SubType> = Item.CreateData<SubType> & {
  // @ts-expect-error: the type system doesn't like this because it doesn't extend some empty object but it does in fact work.
  system: DataModel.CreateData<DataModel.SchemaOf<Item.SystemOfType<SubType>>>
}

/* ---------------------------------------- */

export function createDataIsOfType<SubType extends Item.SubType>(
  data: Item.CreateData,
  ...types: SubType[]
): data is TypedItemCreateData<SubType>

export function createDataIsOfType(data: Item.CreateData, ...types: string[]): boolean {
  return types.includes(data.type as Item.SubType)
}
