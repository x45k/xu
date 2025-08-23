"use strict";
const form = document.getElementById("uv-form");
const address = document.getElementById("uv-address");
const searchEngine = document.getElementById("uv-search-engine");
const error = document.getElementById("uv-error");
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

		/* if (!proxyWindow) {
			throw new Error("Popup was blocked. Please allow popups for this site.");
		} */
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

document.addEventListener('DOMContentLoaded', function() {
	const settingsButton = document.getElementById('settingsButton');
	const settingsMenu = document.getElementById('settingsMenu');
	const bgOpacitySlider = document.getElementById('bgOpacity');
	const opacityValue = document.getElementById('opacityValue');
	const videoBackground = document.getElementById('video-background');

	const savedOpacity = localStorage.getItem('bgOpacity');
	if (savedOpacity) {
		videoBackground.style.opacity = savedOpacity;
		bgOpacitySlider.value = savedOpacity;
		opacityValue.textContent = savedOpacity;
	}

	settingsButton.addEventListener('click', function(e) {
		e.stopPropagation();
		settingsMenu.classList.toggle('active');
	});

	bgOpacitySlider.addEventListener('input', function() {
		const opacity = this.value;
		videoBackground.style.opacity = opacity;
		opacityValue.textContent = opacity;
		localStorage.setItem('bgOpacity', opacity);
	});

	document.addEventListener('click', function(event) {
		if (!settingsMenu.contains(event.target) && event.target !== settingsButton) {
			settingsMenu.classList.remove('active');
		}
	});

	settingsMenu.addEventListener('click', function(e) {
		e.stopPropagation();
	});
});