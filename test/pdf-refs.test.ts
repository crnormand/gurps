import { extractBookAndPage } from '../module/pdf/pdf-refs.js'

describe('pdf-refs', () => {
  describe('handlePdf', () => {
    it('should return { book: "B", page: "10" } for input "B10"', () => {
      expect(extractBookAndPage('B10')).toEqual({ book: 'B', page: 10, pageLabel: null })
    })

    it('should return { book: "B", page: "12" } for input "B:12"', () => {
      expect(extractBookAndPage('B:12')).toEqual({ book: 'B', page: 12, pageLabel: null })
    })

    it('should return { book: "DFRPG", page: "A12" } for input "DFRPG:A12"', () => {
      expect(extractBookAndPage('DFRPG:A12')).toEqual({ book: 'DFRPG', page: null, pageLabel: 'A12' })
    })

    it('should return { book: "PU8", page: null, pageLabel: "A-12" } for input "PU8:A-12"', () => {
      expect(extractBookAndPage('PU8:A-12')).toEqual({ book: 'PU8', page: null, pageLabel: 'A-12' })
    })

    it('should return { book: "PU8", page: "12" } for input "PU8:12"', () => {
      expect(extractBookAndPage('PU8:12')).toEqual({ book: 'PU8', page: 12, pageLabel: null })
    })

    it('should return null for missing book code, page number, or both (without colon)', () => {
      expect(extractBookAndPage('10')).toBeNull()
      expect(extractBookAndPage('B')).toBeNull()
      expect(extractBookAndPage('')).toBeNull()
    })

    it('should return null for missing book code, page number, or both (with colon)', () => {
      expect(extractBookAndPage(':10')).toBeNull()
      expect(extractBookAndPage('B:')).toBeNull()
      expect(extractBookAndPage(':')).toBeNull()
    })

    it('should return null for null or undefined input', () => {
      expect(extractBookAndPage(null as unknown as string)).toBeNull()
    })
  })
})
