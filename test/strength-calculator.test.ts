// @ts-ignore: no-check
import { BasicSetStrength } from '../module/actor/strength-calculator'

describe('BasicSetStrength', () => {
  it('should calculate thrust and swing damage for ST = 9', () => {
    const strength = new BasicSetStrength()
    expect(strength.calculateSwingDamage(9)).toBe('1d-1')
    expect(strength.calculateThrustDamage(9)).toBe('1d-2')
    expect(strength.calculateLift(9)).toBe(16)
  })

  it('should calculate thrust and swing damage for ST = 10', () => {
    const strength = new BasicSetStrength()
    expect(strength.calculateSwingDamage(10)).toBe('1d')
    expect(strength.calculateThrustDamage(10)).toBe('1d-2')
    expect(strength.calculateLift(10)).toBe(20)
  })

  it('should calculate thrust and swing damage for ST = 11', () => {
    const strength = new BasicSetStrength()
    expect(strength.calculateSwingDamage(11)).toBe('1d+1')
    expect(strength.calculateThrustDamage(11)).toBe('1d-1')
    expect(strength.calculateLift(11)).toBe(24)
  })

  it('should calculate thrust and swing damage for ST = 12', () => {
    const strength = new BasicSetStrength()
    expect(strength.calculateSwingDamage(12)).toBe('1d+2')
    expect(strength.calculateThrustDamage(12)).toBe('1d-1')
    expect(strength.calculateLift(12)).toBe(28)
  })

  it('should calculate thrust and swing damage for ST = 13', () => {
    const strength = new BasicSetStrength()
    expect(strength.calculateSwingDamage(13)).toBe('2d-1')
    expect(strength.calculateThrustDamage(13)).toBe('1d')
    expect(strength.calculateLift(13)).toBe(33)
  })

  it('should calculate thrust and swing damage for ST = 14', () => {
    const strength = new BasicSetStrength()
    expect(strength.calculateSwingDamage(14)).toBe('2d')
    expect(strength.calculateThrustDamage(14)).toBe('1d')
    expect(strength.calculateLift(14)).toBe(39)
  })

  it('should calculate thrust and swing damage for ST = 15', () => {
    const strength = new BasicSetStrength()
    expect(strength.calculateSwingDamage(15)).toBe('2d+1')
    expect(strength.calculateThrustDamage(15)).toBe('1d+1')
    expect(strength.calculateLift(15)).toBe(45)
  })

  it('should calculate thrust and swing damage for ST = 20', () => {
    const strength = new BasicSetStrength()
    expect(strength.calculateSwingDamage(20)).toBe('3d+2')
    expect(strength.calculateThrustDamage(20)).toBe('2d-1')
    expect(strength.calculateLift(20)).toBe(80)
  })

  it('should calculate thrust and swing damage for ST = 21', () => {
    const strength = new BasicSetStrength()
    expect(strength.calculateSwingDamage(21)).toBe('4d-1')
    expect(strength.calculateThrustDamage(21)).toBe('2d')
    expect(strength.calculateLift(21)).toBe(88)
  })

  it('should calculate thrust and swing damage for ST = 22', () => {
    const strength = new BasicSetStrength()
    expect(strength.calculateSwingDamage(22)).toBe('4d')
    expect(strength.calculateThrustDamage(22)).toBe('2d')
    expect(strength.calculateLift(22)).toBe(96)
  })

  it('should calculate thrust and swing damage for ST = 26', () => {
    const strength = new BasicSetStrength()
    expect(strength.calculateSwingDamage(26)).toBe('5d')
    expect(strength.calculateThrustDamage(26)).toBe('2d+2')
    expect(strength.calculateLift(26)).toBe(135)
  })

  it('should calculate thrust and swing damage for ST = 27', () => {
    const strength = new BasicSetStrength()
    expect(strength.calculateSwingDamage(27)).toBe('5d+1')
    expect(strength.calculateThrustDamage(27)).toBe('3d-1')
  })

  it('should calculate thrust and swing damage for ST = 28', () => {
    const strength = new BasicSetStrength()
    expect(strength.calculateSwingDamage(28)).toBe('5d+1')
    expect(strength.calculateThrustDamage(28)).toBe('3d-1')
  })

  it('should calculate thrust and swing damage for ST = 29', () => {
    const strength = new BasicSetStrength()
    expect(strength.calculateSwingDamage(29)).toBe('5d+2')
    expect(strength.calculateThrustDamage(29)).toBe('3d')
  })

  it('should calculate thrust and swing damage for ST = 30', () => {
    const strength = new BasicSetStrength()
    expect(strength.calculateSwingDamage(30)).toBe('5d+2')
    expect(strength.calculateThrustDamage(30)).toBe('3d')
  })
})
