/* eslint-disable jest/no-disabled-tests */
import { parselink } from "@module/otf"

describe('too small or non-matching', () => {
  it("empty", () => {
    let s = ""
    let parsed_otf = parselink(s)
    expect(parsed_otf.action).toBeUndefined()
    expect(parsed_otf.text).toBe(s)
  })
  it("size 1", () => {
    let s = "X"
    let parsed_otf = parselink(s)
    expect(parsed_otf.action).toBeUndefined()
    expect(parsed_otf.text).toBe(s)
  })
  it("non-matching", () => {
    let s = "this should not match anything"
    let parsed_otf = parselink(s)
    expect(parsed_otf.action).toBeUndefined()
    expect(parsed_otf.text).toBe(s)
  })
})
