import { Length } from '@module/data/common/length.js'

describe('Length', () => {
  describe('fromString', () => {
    it('parses inches', () => {
      const length = Length.fromString('12 in', Length.Unit.Inch)

      expect(length).not.toBeNull()
      expect(length?.value).toBe(12)
      expect(length?.unit).toBe(Length.Unit.Inch)
    })

    it('parses feet', () => {
      const length = Length.fromString('3 ft', Length.Unit.Inch)

      expect(length).not.toBeNull()
      expect(length?.value).toBe(3)
      expect(length?.unit).toBe(Length.Unit.Feet)
    })

    it('parses feet and inches notation', () => {
      const length = Length.fromString(`5' 7"`, Length.Unit.Inch)

      expect(length).not.toBeNull()
      expect(length?.value).toBe(5 * 12 + 7)
      expect(length?.unit).toBe(Length.Unit.FeetAndInches)
    })

    it('parses only inches in feet/inches notation', () => {
      const length = Length.fromString(`0' 11"`, Length.Unit.Inch)

      expect(length).not.toBeNull()
      expect(length?.value).toBe(11)
      expect(length?.unit).toBe(Length.Unit.FeetAndInches)
    })

    it('parses only feet in feet/inches notation', () => {
      const length = Length.fromString(`6'`, Length.Unit.Inch)

      expect(length).not.toBeNull()
      expect(length?.value).toBe(72)
      expect(length?.unit).toBe(Length.Unit.FeetAndInches)
    })

    it('parses centimeters', () => {
      const length = Length.fromString('100 cm', Length.Unit.Inch)

      expect(length).not.toBeNull()
      expect(length?.value).toBe(100)
      expect(length?.unit).toBe(Length.Unit.Centimeter)
    })

    it('parses kilometers', () => {
      const length = Length.fromString('2 km', Length.Unit.Inch)

      expect(length).not.toBeNull()
      expect(length?.value).toBe(2)
      expect(length?.unit).toBe(Length.Unit.Kilometer)
    })

    it('parses lightyears', () => {
      const length = Length.fromString('1 ly', Length.Unit.Inch)

      expect(length).not.toBeNull()
      expect(length?.value).toBe(1)
      expect(length?.unit).toBe(Length.Unit.Lightyear)
    })

    it('parses plain number as default unit', () => {
      const length = Length.fromString('42', Length.Unit.Meter)

      expect(length).not.toBeNull()
      expect(length?.value).toBe(42)
      expect(length?.unit).toBe(Length.Unit.Meter)
    })

    it('returns null for invalid string', () => {
      const length = Length.fromString('not a number', Length.Unit.Inch)

      expect(length).toBeNull()
    })

    it('returns Length(0) if forced and invalid', () => {
      const length = Length.fromString('invalid', Length.Unit.Inch, true)

      expect(length).not.toBeNull()
      expect(length?.value).toBe(0)
      expect(length?.unit).toBe(Length.Unit.Inch)
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
      const length = new Length({ value: 24, unit: Length.Unit.Inch })
      const feet = length.to(Length.Unit.Feet)

      expect(feet.value).toBeCloseTo(2)
      expect(feet.unit).toBe(Length.Unit.Feet)
    })

    it('converts miles to inches', () => {
      const length = new Length({ value: 1, unit: Length.Unit.Mile })
      const inches = length.to(Length.Unit.Inch)

      expect(inches.value).toBeCloseTo(63360)
      expect(inches.unit).toBe(Length.Unit.Inch)
    })
  })

  describe.skip('toString', () => {
    it('calls objectToString', () => {
      const length = new Length({ value: 12, unit: Length.Unit.Inch })

      expect(length.toString()).toBe('12 in')
    })
  })

  describe('From -> To', () => {
    it('converts from feet to inches', () => {
      const yards = Length.from(3, Length.Unit.Yard)?.to(Length.Unit.Yard).value

      expect(yards).toBe(3)
    })
  })
})
