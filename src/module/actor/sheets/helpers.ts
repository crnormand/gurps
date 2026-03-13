export async function resolveItemDropPosition(
  item: Item.Implementation
): Promise<'before' | 'inside' | 'after' | null> {
  return await foundry.applications.api.DialogV2.wait({
    window: { title: item.name },
    content: `<p>${game.i18n!.localize('GURPS.dropResolve')}</p>`,
    buttons: [
      {
        action: 'before',
        icon: 'fa-solid fa-turn-left-down',
        label: 'GURPS.dropBefore',
        default: true,
      },
      {
        action: 'inside',
        icon: 'fas fa-sign-in-alt',
        label: 'GURPS.dropInside',
      },
    ],
  })
}
