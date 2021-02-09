export function resolveDamageRoll() {
  let dlg = new Dialog({
    title: 'Resolve Damage Roll',
    content: `
        <div style='display: flex; flex-flow: column nowrap; place-items: center;'>
          <p><b>${otf}</b></p>
          <p>What do you want to do with this Damage Roll?</p>
          <div style='display: inline-grid; grid-template-columns: auto 1fr; place-items: center; gap: 4px'>
            <label>Number of rolls:</label>
            <input type='text' id='number-rolls' class='digits-only' value='2'>
          </div>
          <p/>
        </div>
        `,
    buttons: {
      send: {
        icon: '<i class="fas fa-paper-plane"></i>',
        label: 'Send OtF to...',
        callback: () => GURPS.whisperOtfToOwner(event.currentTarget.dataset.otf, event, !isDamageRoll, this.actor) // Can't blind roll damages (yet)
      },
      multiple: {
        icon: '<i class="fas fa-clone"></i>',
        label: 'Multiple rolls',
        callback: () => {
          console.log(event)
          let targets = []
          for (let index = 0; index < 4; index++) {
            targets[index] = `${index + 1}`
          }
          this._onClickRoll(event, targets)
        }
      }
    },
    default: 'send'
  })
  dlg.render(true)
}
