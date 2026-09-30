import { extractBookAndPage } from '../module/pdf/pdf-refs.js'

const bookCodes = ['BASIC', 'DFRPG:X', 'PU8']

describe('pdf-refs', () => {
  describe('handlePdf', () => {
    it('should return { book: "B", page: "10" } for input "B10"', () => {
      expect(extractBookAndPage('B10')).toEqual({ book: 'B', page: 10, pageLabel: null })
      expect(extractBookAndPage('B10', bookCodes)).toEqual({ book: 'B', page: 10, pageLabel: null })
    })

    it('should return { book: "B", page: "12" } for input "B:12"', () => {
      expect(extractBookAndPage('B:12')).toEqual({ book: 'B', page: 12, pageLabel: null })
      expect(extractBookAndPage('B:12', bookCodes)).toEqual({ book: 'B', page: 12, pageLabel: null })
    })

    it('should return { book: "DFRPG", page: "A12" } for input "DFRPG:A12"', () => {
      expect(extractBookAndPage('DFRPG:A12')).toEqual({ book: 'DFRPG', page: null, pageLabel: 'A12' })
      expect(extractBookAndPage('DFRPG:A12', bookCodes)).toEqual({ book: 'DFRPG', page: null, pageLabel: 'A12' })
    })

    it('should return { book: "PU8", page: null, pageLabel: "A-12" } for input "PU8:A-12"', () => {
      expect(extractBookAndPage('PU8:A-12')).toEqual({ book: 'PU8', page: null, pageLabel: 'A-12' })
      expect(extractBookAndPage('PU8:A-12', bookCodes)).toEqual({ book: 'PU8', page: null, pageLabel: 'A-12' })
    })

    it('should return { book: "PU8", page: 12 } for input "PU8:12"', () => {
      expect(extractBookAndPage('PU8:12')).toEqual({ book: 'PU8', page: 12, pageLabel: null })
      expect(extractBookAndPage('PU8:12', bookCodes)).toEqual({ book: 'PU8', page: 12, pageLabel: null })
    })

    it('should adjust book code and page number for input "B340" if setting is "Separate"', () => {
      expect(extractBookAndPage('B340', bookCodes, 'Separate')).toEqual({ book: 'BX', page: 5, pageLabel: null })
      expect(extractBookAndPage('B336', bookCodes, 'Separate')).toEqual({ book: 'B', page: 336, pageLabel: null })
    })

    it('should adjust page number for input "B338" if setting is "Combined"', () => {
      expect(extractBookAndPage('B338', bookCodes, 'Combined')).toEqual({ book: 'B', page: 340, pageLabel: null })
      expect(extractBookAndPage('B336', bookCodes, 'Combined')).toEqual({ book: 'B', page: 336, pageLabel: null })
    })

    it('should adjust page number for input "BX338" if setting is "Combined"', () => {
      expect(extractBookAndPage('BX338', bookCodes, 'Combined')).toEqual({ book: 'B', page: 340, pageLabel: null })
    })

    it('should adjust page number for input "BX338" if setting is "Separate"', () => {
      expect(extractBookAndPage('BX338', bookCodes, 'Separate')).toEqual({ book: 'BX', page: 3, pageLabel: null })
    })

    it('should not adjust page number if setting is "Revised"', () => {
      expect(extractBookAndPage('B338', bookCodes, 'Revised')).toEqual({ book: 'B', page: 338, pageLabel: null })
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

    describe('matches existing book codes', () => {
      it('should return the correct book and page for a known book code', () => {
        expect(extractBookAndPage('BASIC10', bookCodes)).toEqual({ book: 'BASIC', page: 10, pageLabel: null })
        expect(extractBookAndPage('BASIC:10', bookCodes)).toEqual({ book: 'BASIC', page: 10, pageLabel: null })
        expect(extractBookAndPage('DFRPG:X:12', bookCodes)).toEqual({ book: 'DFRPG:X', page: 12, pageLabel: null })
        expect(extractBookAndPage('PU8:A-12', bookCodes)).toEqual({ book: 'PU8', page: null, pageLabel: 'A-12' })
      })

      it('should return null for a matched book code with missing page number', () => {
        expect(extractBookAndPage('BASIC', bookCodes)).toBeNull()
      })
    })
  })
})
