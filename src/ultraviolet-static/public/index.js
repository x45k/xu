"use strict";
/**
 * @type {HTMLFormElement}
 */
const form = document.getElementById("uv-form");
/**
 * @type {HTMLInputElement}
 */
const address = document.getElementById("uv-address");
/**
 * @type {HTMLInputElement}
 */
const searchEngine = document.getElementById("uv-search-engine");
/**
 * @type {HTMLParagraphElement}
 */
const error = document.getElementById("uv-error");
/**
 * @type {HTMLPreElement}
 */
const errorCode = document.getElementById("uv-error-code");
const connection = new BareMux.BareMuxConnection("/baremux/worker.js")

let proxyWindow = null;

const popupOverlay = document.getElementById("popup-overlay");
const popupClose = document.getElementById("popup-close");

function isWindowClosed(win) {
	return win.closed || !win || !win.window;
}

setInterval(() => {
	if (proxyWindow && isWindowClosed(proxyWindow)) {
		proxyWindow = null;
	}
	if (isWindowClosed(window) && proxyWindow && !isWindowClosed(proxyWindow)) {
		proxyWindow.close();
	}
}, 1000);

window.addEventListener('beforeunload', () => {
	if (proxyWindow && !isWindowClosed(proxyWindow)) {
		proxyWindow.close();
	}
});

function showPopup() {
	popupOverlay.classList.add("active");
}

function hidePopup() {
	popupOverlay.classList.remove("active");
}

popupClose.addEventListener("click", hidePopup);

popupOverlay.addEventListener("click", (e) => {
	if (e.target === popupOverlay) {
		hidePopup();
	}
});

form.addEventListener("submit", async (event) => {
	event.preventDefault();

	try {
		await registerSW();
	} catch (err) {
		error.textContent = "Failed to register service worker.";
		errorCode.textContent = err.toString();
		throw err;
	}

	const url = search(address.value, searchEngine.value);

	if (proxyWindow && !isWindowClosed(proxyWindow)) {
		showPopup();
		proxyWindow.focus();
		return;
	}

	try {
		let wispUrl = (location.protocol === "https:" ? "wss" : "ws") + "://" + location.host + "/wisp/";
		if (await connection.getTransport() !== "/epoxy/index.mjs") {
			await connection.setTransport("/epoxy/index.mjs", [{ wisp: wispUrl }]);
		}

		const proxyUrl = __uv$config.prefix + __uv$config.encodeUrl(url);

		proxyWindow = window.open(proxyUrl, '_blank');

		if (!proxyWindow) {
			throw new Error("Popup was blocked. Please allow popups for this site.");
		}
	} catch (err) {
		error.textContent = "Failed to open the URL.";
		errorCode.textContent = err.toString();
	}
});

document.addEventListener('DOMContentLoaded', function() {
	const video = document.getElementById('video-background');
	video.play().catch(error => {
		console.log('Video autoplay prevented:', error);
	});
});