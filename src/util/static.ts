import { StaticCharacterGURPS } from "@actor/static_character"
import { StaticAdvantage } from "@actor/static_character/components"
import { StaticItemGURPS } from "@item/static"

/**
 *
 * @param list
 * @param fn
 * @param parentKey
 * @param depth
 */
export function recurseList(
	list: { [key: string]: any },
	fn: (value: any, key: string, depth: number) => boolean | void | Promise<boolean | void>,
	parentKey = "",
	depth = 0
) {
	if (list)
		for (const [key, value] of Object.entries(list)) {
			if (fn(value, parentKey + key, depth) !== false) {
				recurseList(value.contains, fn, `${parentKey + key}.contains`, depth + 1)
				recurseList(value.collapsed, fn, `${parentKey + key}.collapsed`, depth + 1)
			}
		}
}

/**
 *
 * @param actor
 * @param sname
 */
export function findAdDisad(actor: StaticCharacterGURPS, sname: string): StaticAdvantage | null {
	let t: StaticAdvantage | null = null
	if (!actor) return t
	sname = makeRegexPatternFrom(sname, false)
	let regex = new RegExp(sname, "i")
	recurseList(actor.system.ads, s => {
		if (s.name.match(regex)) {
			t = s
		}
	})
	return t
}

/**
 *
 * @param text
 * @param end
 * @param start
 */
function makeRegexPatternFrom(text: string, end = true, start = true) {
	// Defaults to exact match
	let pattern = text
		.split("*")
		.join(".*?")
		.replaceAll(/\(/g, "\\(")
		.replaceAll(/\)/g, "\\)")
		.replaceAll(/\[/g, "\\[")
		.replaceAll(/\]/g, "\\]")
	return `${start ? "^" : ""}${pattern.trim()}${end ? "$" : ""}`
}

/**
 *
 * @param string
 */
export function extractP(string: string) {
	let v = ""
	if (string) {
		let s = string.split("\n")
		for (let b of s) {
			if (b) {
				if (b.startsWith("@@@@")) {
					b = b.substring(4)
					// V += atou(b) + '\n'
					v += `${b}\n`
				} else v += `${b}\n`
			}
		}
	}
	// Maybe a temporary fix? There are junk characters at the start and end of
	// this string after decoding. Example: ";p&gt;Heavy Mail Hauberk↵/p>↵"
	return v
		.replace(/^;p&gt;/, "")
		.replace(/\n$/, "")
		.replace(/\/p>$/, "")
}

/**
 *
 * @param text
 */
export function convertRollStringToArrayOfInt(text: string) {
	let elements = text.split("-")
	let range = elements.map(it => parseInt(it))

	if (range.length === 0) return []

	for (let i = 0; i < range.length; i++) {
		if (typeof range[i] === "undefined" || isNaN(range[i])) return []
	}

	let results = []
	for (let i = range[0]; i <= range[range.length - 1]; i++) results.push(i)

	return results
}

/**
 *
 * @param obj
 * @param value
 * @param index
 */
export function put(obj: any, value: any, index = -1) {
	if (index === -1) {
		index = 0
		while (obj.hasOwnProperty(zeroFill(index))) index++
	}
	let k = zeroFill(index)
	obj[k] = value
	return k
}

/**
 *
 * @param number
 * @param width
 */
export function zeroFill(number: number, width = 5) {
	width -= number.toString().length
	if (width > 0) {
		return new Array(width + (/\./.test(number.toString()) ? 2 : 1)).join("0") + number
	}
	return `${number}` // Always return a string
}

/**
 *
 * @param context
 * @param level
 * @param parentkey
 * @param data
 * @param isCollapsed
 * @param actorToCheckEquipment
 */
export function flatList(
	context: any,
	level: number,
	parentkey: string,
	data: any,
	isCollapsed: boolean,
	actorToCheckEquipment?: StaticCharacterGURPS
) {
	if (!context) return data

	for (let key in context) {
		let item = context[key]
		let display = true
		if (actorToCheckEquipment) {
			// If we have been given an actor,
			// then check to see if the melee or ranged item is equipped in the inventory
			let checked = false
			recurseList(actorToCheckEquipment.system.equipment.carried, e => {
				// Check
				if (item.name.startsWith(e.name)) {
					checked = true
					if (!e.equipped) display = false
				}
			})
			if (!checked)
				recurseList(actorToCheckEquipment.system.equipment.other, e => {
					if (item.name.startsWith(e.name)) display = false
				})
		}
		if (display) {
			let newKey = parentkey + key

			let newItem: any = { indent: level }
			for (let propertyKey in item) {
				if (!["contains", "collapsed", "indent"].includes(propertyKey)) {
					newItem[propertyKey] = item[propertyKey]
				}
			}
			newItem.hasCollapsed = !!item?.collapsed && Object.values(item?.collapsed).length > 0
			newItem.hasContains = !!item?.contains && Object.values(item?.contains).length > 0
			newItem.isCollapsed = isCollapsed

			data[newKey] = newItem

			if (newItem.hasContains) flatList(item.contains, level + 1, `${newKey}.contains.`, data, isCollapsed)
			if (newItem.hasCollapsed) flatList(item.collapsed, level + 1, `${newKey}.collapsed.`, data, true)
		}
	}
}

/**
 *
 * @param actor
 * @param path
 * @param newobj
 */
export async function insertBeforeKey(actor: StaticCharacterGURPS, path: string, newobj: any) {
	let i = path.lastIndexOf(".")
	let objpath = path.substring(0, i)
	let key = path.substring(i + 1)
	i = objpath.lastIndexOf(".")
	let parentpath = objpath.substring(0, i)
	let objkey = objpath.substring(i + 1)
	let object = getProperty(actor, objpath)
	let t = `${parentpath}.-=${objkey}`
	await actor.update({ [t]: null }) // Delete the whole object
	let start = parseInt(key)

	i = start + 1
	while (object.hasOwnProperty(zeroFill(i))) i++
	i = i - 1
	for (let z = i; z >= start; z--) {
		object[zeroFill(z + 1)] = object[zeroFill(z)]
	}
	object[key] = newobj
	let sorted = Object.keys(object)
		.sort()
		.reduce((a, v) => {
			// @ts-ignore
			a[v] = object[v]
			return a
		}, {}) // Enforced key order
	await actor.update({ [objpath]: sorted }, { diff: false })
}

/**
 * Convolutions to remove a key from an object and fill in the gaps, necessary
 * because the default add behavior just looks for the first open gap
 * @param {GurpsActor} actor
 * @param {string} path
 */
export async function removeKey(actor: StaticCharacterGURPS | StaticItemGURPS, path: string) {
	let i = path.lastIndexOf(".")
	let objpath = path.substring(0, i)
	let key = path.substring(i + 1)
	i = objpath.lastIndexOf(".")
	let parentpath = objpath.substring(0, i)
	let objkey = objpath.substring(i + 1)
	let object = decode(actor, objpath)
	let t = `${parentpath}.-=${objkey}`
	await actor.update({ [t]: null }) // Delete the whole object
	delete object[key]
	i = parseInt(key)

	i = i + 1
	while (object.hasOwnProperty(zeroFill(i))) {
		let k = zeroFill(i)
		object[key] = object[k]
		delete object[k]
		key = k
		i++
	}
	let sorted = Object.keys(object)
		.sort()
		.reduce((a: any, v) => {
			a[v] = object[v]
			return a
		}, {}) // Enforced key order
	await actor.update({ [objpath]: sorted }, { diff: false, render: false })
}

/**
 *
 * @param obj
 * @param path
 * @param all
 */
function decode(obj: any, path: string, all = true) {
	let p = path.split(".")
	let end = p.length
	if (!all) end = end - 1
	for (let i = 0; i < end; i++) {
		let q = p[i]
		obj = obj[q]
	}
	return obj
}
