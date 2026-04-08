export class PoolValueElement extends foundry.applications.elements.AbstractFormInputElement<number> {
  static override tagName = 'pool-value'
  static observedAttributes = ['disabled', 'value', 'data-max']

  /* ---------------------------------------- */

  /** Not declared on the superclass in the types but exists in Foundry's implementation */
  protected _primaryInput: HTMLInputElement = document.createElement('input')

  /** Not declared on the superclass in the types but exists in Foundry's implementation */
  declare protected abortSignal: AbortSignal

  /* ---------------------------------------- */

  protected override _buildElements(): HTMLElement[] {
    this._primaryInput.type = 'number'
    this._applyInputAttributes(this._primaryInput)

    return [this._primaryInput]
  }

  /* ---------------------------------------- */

  protected override _activateListeners(): void {
    this._primaryInput.addEventListener(
      'change',
      () => {
        const displayed = Number(this._primaryInput.value) || 0

        this._setValue(this.effectiveMax - displayed)

        // Redraw after commit
        this._refresh()

        this.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }))
      },
      { signal: this.abortSignal }
    )
  }

  /* ---------------------------------------- */

  protected override _setValue(value: number): void {
    this._value = Math.max(Number(value) || 0, 0)
  }

  /* ---------------------------------------- */

  protected override _getValue(): number {
    return Number(this._value) || 0
  }

  /* ---------------------------------------- */

  protected override _refresh(): void {
    if (!this._primaryInput) return
    this._primaryInput.value = String(this.effectiveMax - (Number(this._value) || 0))
  }

  /* ---------------------------------------- */

  attributeChangedCallback(attrName: string, _oldValue: string | null, newValue: string | null): void {
    if (attrName === 'value') {
      this._setValue(Number(newValue) || 0)
      this._refresh()
    }

    if (attrName === 'data-max') {
      this._refresh()
    }

    if (attrName === 'disabled' && this._primaryInput) {
      this._applyInputAttributes(this._primaryInput)
    }
  }

  /* ---------------------------------------- */

  get effectiveMax(): number {
    return Number(this.dataset.max ?? 0)
  }
}
