/**
 *
 * @param xml
 */
export function XMLtoJS(xml: string) {
	xml = xml.replace(/\\/g, "\\\\");
	return parseXml(xml, [
		"damagebreaks",
		"modifier",
		"trait",
		"bonus",
		"groupitem",
		"attackmode",
		"extendedtag",
		"bonuslist",
	]);
}

/**
 *
 * @param xml
 * @param arrayTags
 */
function parseXml(xml: string, arrayTags: string[]) {
	let dom: any | null = null;
	if (window.DOMParser) {
		try {
			dom = new DOMParser().parseFromString(xml, "text/xml");
		} catch (e) {
			dom = null;
		}
	} else console.error("cannot parse xml string!");

	/**
	 *
	 * @param xmlNode
	 * @param result
	 * @param parent
	 */
	function parseNode(xmlNode: any, result: any, parent = "") {
		if (xmlNode.nodeName === "#text") {
			let v = xmlNode.nodeValue;
			if (v.trim()) result["#text"] = v;
			return;
		}

		let jsonNode: any = {};
		let existing = result[xmlNode.nodeName];
		if (existing) {
			if (!Array.isArray(existing)) result[xmlNode.nodeName] = [existing, jsonNode];
			else result[xmlNode.nodeName].push(jsonNode);
		} else if (arrayTags && arrayTags.indexOf(xmlNode.nodeName) !== -1) result[xmlNode.nodeName] = [jsonNode];
		else {
			result[xmlNode.nodeName] = jsonNode;
		}

		if (xmlNode.attributes)
			for (let attribute of xmlNode.attributes) {
				jsonNode[`@${attribute.nodeName}`] = attribute.nodeValue;
			}

		if (xmlNode.childNodes.length === 0 && parent !== "traits") result[xmlNode.nodeName] = "";
		for (let node of xmlNode.childNodes) {
			if (node.nodeName === "#text" && node.nodeValue.trim()) result[xmlNode.nodeName] = node.nodeValue.trim();
			else if (node.nodeName === "#cdata-section") result[xmlNode.nodeName] = node.nodeValue;
			else parseNode(node, jsonNode, xmlNode.nodeName);
		}
	}

	let result: any = {};
	if (dom !== null) for (let node of dom.childNodes) parseNode(node, result);

	return result;
}
