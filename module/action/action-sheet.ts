import { BaseAction } from './base-action.js'
import api = foundry.applications.api
import { DeepPartial } from 'fvtt-types/utils'

namespace BaseActionSheet {
  export interface RenderContext extends api.ApplicationV2.RenderContext {}

  export interface Configuration extends api.ApplicationV2.Configuration {
    document: BaseAction
  }
}

/* ---------------------------------------- */

class BaseActionSheet<
  RenderContext extends BaseActionSheet.RenderContext = BaseActionSheet.RenderContext,
  Configuration extends BaseActionSheet.Configuration = BaseActionSheet.Configuration,
  RenderOptions extends api.ApplicationV2.RenderOptions = api.ApplicationV2.RenderOptions,
> extends api.HandlebarsApplicationMixin(api.ApplicationV2) {
  constructor(options: DeepPartial<Configuration>) {
    super(options)
  }
}

/* ---------------------------------------- */

export { BaseActionSheet }
