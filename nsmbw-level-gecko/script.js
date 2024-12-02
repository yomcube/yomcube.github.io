// https://github.com/Swiftshine/Penguin-old/blob/main/include/penguin/savefile.h

const version = document.getElementById('version');
const file = document.getElementById('file');
const stage = document.getElementById('stage');
const out = document.getElementById('out');

const saveaddrs = {
	'E1': 0x80c7fe40,
	'E2': 0x80c7fe60,
	'J1': 0x80c7f720,
	'J2': 0x80c7f740,
	'P1': 0x80c7fe20,
	'P2': 0x80c7fe40,
	'K' : 0x80c85409
};

function getSaveAddr() {
	return saveaddrs[version.value] + (0x980 * Number(file.value));
}
function padHex(n, d) {
	return n.toString(16).padStart(d, '0')
}
function type(type, addr) {
	return padHex((addr & 0x1FFFFFF) | (type << 24), 8);
}

function createCode() {
	var info = JSON.parse(stage.value.replace(/'/g, '"'));

	var s = "";
	s += type(0x02, getSaveAddr() + 3) + " ";
	s += padHex(info.w, 6) + padHex(info.s, 2) + "\n";
	
	s += type(0x00, getSaveAddr() + 5) + " ";
	s += padHex(info.n, 8) + "\n";

	out.innerText = s;
}

createCode();

version.addEventListener("change", createCode);
file.addEventListener("change", createCode);
stage.addEventListener("change", createCode);
