import { getCssVariable } from '@module/util/get-css-value.js'
import { afterEach, vi } from 'vitest'

describe('getCssVariable', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function mockElement(propertyMap: Record<string, string>): HTMLElement {
    const el = {} as HTMLElement

    vi.stubGlobal('getComputedStyle', (_el: HTMLElement) => ({
      getPropertyValue: (prop: string) => propertyMap[prop] ?? '',
    }))

    return el
  }

  it('should return a plain color value directly', () => {
    const el = mockElement({ '--my-color': '#ff0000' })

    expect(getCssVariable(el, '--my-color')).toBe('#ff0000')
  })

  it('should return the fallback when the property is empty', () => {
    const el = mockElement({})

    expect(getCssVariable(el, '--missing')).toBe('#101010')
  })

  it('should return a custom fallback when the property is empty', () => {
    const el = mockElement({})

    expect(getCssVariable(el, '--missing', '#abcdef')).toBe('#abcdef')
  })

  it('should resolve a var() reference to its actual value', () => {
    const el = mockElement({
      '--alias': 'var(--gcs-color-text)',
      '--gcs-color-text': '#223344',
    })

    expect(getCssVariable(el, '--alias')).toBe('#223344')
  })

  it('should resolve nested var() references', () => {
    const el = mockElement({
      '--a': 'var(--b)',
      '--b': 'var(--c)',
      '--c': 'blue',
    })

    expect(getCssVariable(el, '--a')).toBe('blue')
  })

  it('should return the fallback if a var() chain leads to an empty value', () => {
    const el = mockElement({
      '--a': 'var(--b)',
    })

    expect(getCssVariable(el, '--a')).toBe('#101010')
  })

  it('should not loop infinitely on circular var() references', () => {
    const el = mockElement({
      '--a': 'var(--b)',
      '--b': 'var(--a)',
    })

    expect(getCssVariable(el, '--a')).toBe('#101010')
  })
})
