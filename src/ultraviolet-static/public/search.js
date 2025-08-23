"use strict";
/**
 *
 * @param {string} input
 * @param {string} template Template for a search query.
 * @returns {string} Fully qualified URL
 */
function search(input, template) {
	try {
		return new URL(input).toString();
	} catch (err) {}

	try {
		const url = new URL(`http://${input}`);
		if (url.hostname.includes(".")) return url.toString();
	} catch (err) {}

	const formattedInput = encodeURIComponent(input).replace(/%20/g, '+');
	return `https://www.startpage.com/sp/search?query=${formattedInput}`;
}