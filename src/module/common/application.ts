/**
 * A base application class for GURPS applications.
 * This class extends the Foundry VTT ApplicationV2 class and applies
 * options and implements methods common to all or most GURPS system applications.
 *
 * It can also act as a type asserion separation layer between default `fvtt-types``
 * and any types we may choose to override these with.
 */
export class GurpsApplication extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  static override DEFAULT_OPTIONS: foundry.applications.api.Application.DefaultOptions = {
    classes: ['gurps'],
    tag: 'form',
  }
}
