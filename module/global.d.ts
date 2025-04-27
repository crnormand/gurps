export {}

declare global {
  const GURPS: any

  interface DocumentClassConfig {
    Item: typeof GURPSItem
    Actor: typeof GURPSActor
  }

  export interface SettingConfig {
    'gurps.migration-version': any
    'gurps.default-hitlocation': any
    'gurps.combat-simple-damage': any
    'gurps.combat-apply-divisor': any
    'gurps.combat-blunt-trauma': any
    'gurps.combat-body-hits': any
    'gurps.combat-location-modifiers': any
    'gurps.whisper-status-effectss': any
    'gurps.changelogVersion': any
    'gurps.showChangelogv2': any
    'gurps.basicsetpdf': any
    'gurps.pdf-open-first': any
    'gurps.range-to-bucket': any
    'gurps.modifier_tooltip': any
    'gurps.ignore_import_name': any
    'gurps.import_hp_fp': any
    'gurps.import_bodyplan': any
    'gurps.import_extended_values_gcs': any
    'gurps.enhanced-numeric-input': any
    'gurps.show-the-math': any
    'gurps.automatic-encumbrance': any
    'gurps.mook-default-editor': any
    'gurps.mook-default': any
    'gurps.sheet-navigation': any
    'gurps.only-gms-open-add': any
    'gurps.automatic-onethird': any
    'gurps.player-chat-private': any
    'gurps.tracker-manager': any
    'gurps.tracker-templates': any
    'gurps.bucket-select-journals': any
    'gurps.bucket-position': any
    'gurps.bucket-3d6-image': any
    'gurps.bucket-d6-image': any
    'gurps.bucket-journals': any
    'gurps.bucket-scale-factor': any
    'gurps.frightcheck-table': any
    'gurps.initiative-formula': any
    'gurps.rangeStrategy': any
    'gurps.useConditionalInjury': any
    'gurps.check-equipped': any
    'gurps.shift-click-blind': any
    'gurps.show-user-created': any
    'gurps.show-foundry-created': any
    'gurps.ignoreImportQty': any
    'gurps.block-import': any
    'gurps.show-3d6': any
    'gurps.convert-ranged': any
    'gurps.maneuver-visibility': any
    'gurps.maneuver-detail': any
    'gurps.auto-ignore-qty': any
    'gurps.alt-sheet': any
    'gurps.physical-dice': any
    'gurps.import-file-encoding': any
    'gurps.remove-unequipped-weapons': any
    'gurps.use-browser-importer': any
    'gurps.maneuver-updates-move': any
    'gurps.show-chat-reeling-tired': any
    'gurps.use-quintessence': any
    'gurps.default-add-action': any
    'gurps.portrait-path': any
    'gurps.overwrite-portraitsk': any
    'gurps.ctrl-key': any
    'gurps.use-on-target': any
    'gurps.use-foundry-items': any
    'gurps.show-debug-info': any
    'gurps.show-foundry-global-items': any
    'gurps.show-item-image': any
    'gurps.use-quick-rolls': any
    'gurps.show-confirmation-roll-dialog': any
    'gurps.allow-roll-based-on-maneuver': any
    'gurps.allow-targeted-rolls': any
    'gurps.use-tagged-modifiers': any
    'gurps.modify-dice-plus-adds': any
    'gurps.use-max-actions': any
    'gurps.allow-after-max-actions': any
    'gurps.add-shock-at-turn': any
    'gurps.allow-rolls-before-combat-start': any
    'gurps.add-cumulative-parry-penalties': any
  }
}
