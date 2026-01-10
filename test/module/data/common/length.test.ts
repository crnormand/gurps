// @ts-expect-error - extension-less import for ts-jest ESM
import { Length } from '../../../../module/data/common/length'

describe('Length', () => {
  Length._localize = (key: any) => key // or a mock function

  describe('fromString', () => {
    it('parses inches', () => {
      const l = Length.fromString('12 in', Length.Unit.Inch)

      expect(l).not.toBeNull()
      expect(l?.value).toBe(12)
      expect(l?.unit).toBe(Length.Unit.Inch)
    })

    it('parses feet', () => {
      const l = Length.fromString('3 ft', Length.Unit.Inch)

      expect(l).not.toBeNull()
      expect(l?.value).toBe(3)
      expect(l?.unit).toBe(Length.Unit.Feet)
    })

    it('parses feet and inches notation', () => {
      const l = Length.fromString(`5' 7"`, Length.Unit.Inch)

      expect(l).not.toBeNull()
      expect(l?.value).toBe(5 * 12 + 7)
      expect(l?.unit).toBe(Length.Unit.FeetAndInches)
    })

    it('parses only inches in feet/inches notation', () => {
      const l = Length.fromString(`0' 11"`, Length.Unit.Inch)

      expect(l).not.toBeNull()
      expect(l?.value).toBe(11)
      expect(l?.unit).toBe(Length.Unit.FeetAndInches)
    })

    it('parses only feet in feet/inches notation', () => {
      const l = Length.fromString(`6'`, Length.Unit.Inch)

      expect(l).not.toBeNull()
      expect(l?.value).toBe(72)
      expect(l?.unit).toBe(Length.Unit.FeetAndInches)
    })

    it('parses centimeters', () => {
      const l = Length.fromString('100 cm', Length.Unit.Inch)

      expect(l).not.toBeNull()
      expect(l?.value).toBe(100)
      expect(l?.unit).toBe(Length.Unit.Centimeter)
    })

    it('parses kilometers', () => {
      const l = Length.fromString('2 km', Length.Unit.Inch)

      expect(l).not.toBeNull()
      expect(l?.value).toBe(2)
      expect(l?.unit).toBe(Length.Unit.Kilometer)
    })

    it('parses lightyears', () => {
      const l = Length.fromString('1 ly', Length.Unit.Inch)

      expect(l).not.toBeNull()
      expect(l?.value).toBe(1)
      expect(l?.unit).toBe(Length.Unit.Lightyear)
    })

    it('parses plain number as default unit', () => {
      const l = Length.fromString('42', Length.Unit.Meter)

      expect(l).not.toBeNull()
      expect(l?.value).toBe(42)
      expect(l?.unit).toBe(Length.Unit.Meter)
    })

    it('returns null for invalid string', () => {
      const l = Length.fromString('not a number', Length.Unit.Inch)

      expect(l).toBeNull()
    })

    it('returns Length(0) if forced and invalid', () => {
      const l = Length.fromString('invalid', Length.Unit.Inch, true)

      expect(l).not.toBeNull()
      expect(l?.value).toBe(0)
      expect(l?.unit).toBe(Length.Unit.Inch)
    })
  })

  describe('objectToString', () => {
    it('formats feet and inches', () => {
      expect(Length.objectToString({ value: 74, unit: Length.Unit.FeetAndInches })).toBe(`6' 2"`)
      expect(Length.objectToString({ value: 11, unit: Length.Unit.FeetAndInches })).toBe(`11"`)
    })

    it('formats meters', () => {
      expect(Length.objectToString({ value: 1.23456, unit: Length.Unit.Meter })).toBe('1.2346 m')
    })
  })

  describe('to', () => {
    it('converts inches to feet', () => {
      const l = new Length({ value: 24, unit: Length.Unit.Inch })
      const feet = l.to(Length.Unit.Feet)

      expect(feet.value).toBeCloseTo(2)
      expect(feet.unit).toBe(Length.Unit.Feet)
    })

    it('converts miles to inches', () => {
      const l = new Length({ value: 1, unit: Length.Unit.Mile })
      const inches = l.to(Length.Unit.Inch)

      expect(inches.value).toBeCloseTo(63360)
      expect(inches.unit).toBe(Length.Unit.Inch)
    })
  })

  describe.skip('toString', () => {
    it('calls objectToString', () => {
      const l = new Length({ value: 12, unit: Length.Unit.Inch })

      expect(l.toString()).toBe('12 in')
    })
  })

  describe('From -> To', () => {
    it('converts from feet to inches', () => {
      const yards = Length.from(3, 'yd').to(Length.Unit.Yard).value

      expect(yards).toBe(3)
    })
  })
})
