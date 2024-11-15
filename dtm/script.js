// Elements
const fileInput = document.getElementById("fileInput");
const errorP = document.getElementById("errorP");
const table = document.getElementById("table");
const tbody = document.getElementById("tbody");

// Common variables
var utf8decoder = new TextDecoder();

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView
const littleEndian = (() => {
  const buffer = new ArrayBuffer(2);
  new DataView(buffer).setInt16(0, 256, true /* littleEndian */);
  // Int16Array uses the platform's endianness.
  return new Int16Array(buffer)[0] === 256;
})();

// Helper functions
function row(p, v) {
	return `<tr><th>${p}</th><td>${v}</td></tr>\n`;
}
function get_u_le(data, offset, bytes) {
	var val = 0n;
	for (var i = bytes - 1; i > -1; i--) {
		val = val | BigInt(data[offset+i] << (i*8));
	}
	return val;
}
function yn(val) {
	return val == 0 ? "No" : "Yes";
}
function ed(val) {
	return val == 0 ? "Disabled" : "Enabled";
}
// https://www.xaymar.com/articles/2020/12/08/fastest-uint8array-to-hex-string-conversion-in-javascript/
function toHex(data) {
	return Array.prototype.map.call(data, x => ('00' + x.toString(16)).slice(-2)).join('');
}
function numToHex(x) {
	return ('00' + x.toString(16)).slice(-2);
}

function handleFile() {
	var file = fileInput.files[0];
	var headerBlob = file.slice(0, 0x100);

	const reader = new FileReader();
	reader.onload = function() {
		var headerBuffer = this.result;
		var header = new Uint8Array(headerBuffer);

		var isValid = header != null && (
			header[0] == 0x44 && header[1] == 0x54 &&
			header[2] == 0x4D && header[3] == 0x1A
		);

		if (!isValid) {
			table.hidden = true;
			errorP.hidden = false;
			errorP.innerText = "File is not a valid DTM!";
			return;
		}

		table.hidden = false;
		errorP.hidden = true;
		tbody.innerHTML = "";
		errorP.innerHTML = "";

		var html = "";
		
		html += row("Game ID", utf8decoder.decode(header.slice(4, 10)));
		html += row("Game Type", header[0xA] == 0 ? "GameCube" : "Wii");

		var controllers = "";
		var first = true;
		for (var i = 0; i < 8; i++) {
			if (header[0xB] & (1 << i)) {
				controllers += (first ? "" : ", ") + (i/4 < 1 ? "GC " : "Wii ") + ((i % 4) + 1);
				first = false;
			}
		}
		html += row("Controllers", controllers);
		
		html += row("Savestate", yn(header[0xC]));
		html += row("VI Count", get_u_le(header, 0xD, 8));
		html += row("Input Count", get_u_le(header, 0x15, 8));
		html += row("Lag Counter", get_u_le(header, 0x1D, 8));
		html += row("Rerecord Count", get_u_le(header, 0x2D, 4));
		html += row("Author", utf8decoder.decode(header.slice(0x31, 0x51)));
		html += row("Video Backend", utf8decoder.decode(header.slice(0x51, 0x61)));
		html += row("Audio Emulator", utf8decoder.decode(header.slice(0x61, 0x71)));
		html += row("MD5 Hash", `<span class="c">${toHex(header.slice(0x71, 0x81))}</span>`);

		var timestamp = get_u_le(header, 0x81, 8);
		var date = new Date((Number)(timestamp) * 1000);
		html += row("Start Time", `${date.toLocaleDateString()} ${date.toLocaleTimeString()} (<span class="c">${timestamp}</span>)`);
		
		html += row("Saved Config Valid", yn(header[0x89]));
		html += row("Idle Skipping", ed(header[0x8A]));
		html += row("Dual Core", ed(header[0x8B]));
		html += row("Progressive Scan", ed(header[0x8C]));
		html += row("DSP Type", header[0x8D] == 0 ? "LLE" : "HLE");
		html += row("Fast Disc Speed", ed(header[0x8E]));
		html += row("EFB Access", ed(header[0x90]));
		html += row("EFB Copy", ed(header[0x91]));
		html += row("Copy EFB To...", header[0x92] == 0 ? "RAM" : "Texture");
		html += row("Emulate Format Changes", yn(header[0x93]));
		html += row("Use XFB Emulation", yn(header[0x94]));
		html += row("Use Real XFB Emulation", yn(header[0x95]));
		
		var memcarda = header[0x96] & 1;
		var memcardb = header[0x96] & 2;
		var memcards = "";
		// Thank you, vabold!
		//https://discord.com/channels/1230981272139075765/1230981272613028003/1306833437180690494
		if (memcarda) {
			memcards = memcardb ? "A, B" : "A";
		} else {
			memcards = memcardb ? "B" : "None";
		}
		html += row("Memcards Present", memcards);
		
		html += row("Memcard Blank", yn(header[0x98]));
		html += row("Sync GPU Thread", ed(header[0x99]));
		html += row("Recorded In Netplay Session", yn(header[0x9A]));
		html += row('<div class="tt" data-tooltip="This setting only applies to Wii games that support both 50 Hz and 60 Hz.">PAL60</div>', ed(header[0x9B]));
		html += row("Language", `${header[0x9D]} (<span class="c">0x${numToHex(header[0x9D])}</span>)`);
		html += row("JIT Branch Following", ed(header[0x9F]));
		html += row("Name of Second Disc ISO", utf8decoder.decode(header.slice(0xA9, 0xD1)));
		html += row("Dolphin Git Revision", `<span class="c">${toHex(header.slice(0xD1, 0xE5))}</span>`);
		html += row("DSP IROM Hash", `<span class="c">${toHex(header.slice(0xE5, 0xE9))}</span>`);
		html += row("DSP COEF Hash", `<span class="c">${toHex(header.slice(0xE9, 0xED))}</span>`);
		var tickcount = header.slice(0xED, 0xF5);
		if (littleEndian) tickcount.reverse();
		tickcount = BigInt.asUintN(64, "0x" + toHex(tickcount));
		html += row("Tick Count", tickcount);
		
		tbody.innerHTML = html;
	};
	reader.readAsArrayBuffer(headerBlob);
}


// Hook to events
fileInput.addEventListener("change", handleFile, false);
