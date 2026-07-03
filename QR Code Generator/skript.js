const PREVIEW_SIZE = 320;
let currentQRConfig = {
    data: "https://github.com",
    size: 512,
    colorDark: "#000000",
    colorBg: "#ffffff",
    logoDataUrl: ""
};

// Initialisiere das globale QR-Code Objekt von qr-code-styling
const qrCode = new QRCodeStyling({
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    type: "svg",
    data: currentQRConfig.data,
    dotsOptions: { color: currentQRConfig.colorDark, type: "squared" },
    backgroundOptions: { color: currentQRConfig.colorBg },
    imageOptions: { crossOrigin: "anonymous", hideBackgroundDots: true, imageSize: 0.4, margin: 5 }
});

// Warten, bis das DOM komplett geladen ist
document.addEventListener("DOMContentLoaded", () => {
    qrCode.append(document.getElementById("canvas-container"));

    document.getElementById("qr-type").addEventListener("change", switchType);
    document.getElementById("btn-generate").addEventListener("click", updateQR);

    document.querySelectorAll(".btn-download").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const format = e.target.getAttribute("data-format");
            downloadQR(format);
        });
    });

    const colorDark = document.getElementById("color-dark");
    const colorDarkVal = document.getElementById("color-dark-val");
    colorDark.addEventListener("input", (e) => {
        colorDarkVal.textContent = e.target.value.toUpperCase();
    });

    const colorBg = document.getElementById("color-bg");
    const colorBgVal = document.getElementById("color-bg-val");
    colorBg.addEventListener("input", (e) => {
        colorBgVal.textContent = e.target.value.toUpperCase();
    });

    switchType();
    updateQR();
});

// Schaltet die Eingabefelder je nach Dropdown um
function switchType() {
    const selected = document.getElementById("qr-type").value;
    document.querySelectorAll('.input-group').forEach(div => div.classList.add('hidden'));
    const target = document.getElementById(`field-${selected}`);
    if (target) {
        target.classList.remove('hidden');
    }
}

// Liest die Daten aus und generiert den passenden Text-String für den QR-Code
function getQRData() {
    const type = document.getElementById("qr-type").value;

    switch(type) {
        case "text":
            return document.getElementById("input-text").value;
        case "wifi":
            const ssid = document.getElementById("wifi-ssid").value;
            const pass = document.getElementById("wifi-pass").value;
            const enc = document.getElementById("wifi-enc").value;
            return `WIFI:S:${ssid};T:${enc};P:${pass};;`;
        case "vcard":
            const name = document.getElementById("card-name").value;
            const phone = document.getElementById("card-phone").value;
            const email = document.getElementById("card-email").value;
            const org = document.getElementById("card-org").value;
            const website = document.getElementById("card-website").value;
            const address = document.getElementById("card-address").value;
            return `BEGIN:VCARD\nVERSION:3.0\nN:${name}\nFN:${name}\nORG:${org}\nTEL:${phone}\nEMAIL:${email}\nURL:${website}\nADR;TYPE=HOME:;;${address};;;\nEND:VCARD`;
        case "mail":
            const to = document.getElementById("mail-to").value;
            const sub = encodeURIComponent(document.getElementById("mail-sub").value);
            const body = encodeURIComponent(document.getElementById("mail-body").value);
            return `mailto:${to}?subject=${sub}&body=${body}`;
        case "phone":
            return `tel:${document.getElementById("phone-num").value}`;
        case "maps":
            const lat = document.getElementById("maps-lat").value;
            const lon = document.getElementById("maps-lon").value;
            return `http://maps.google.com/maps?q=${lat},${lon}`;
        default:
            return "https://github.com";
    }
}

// Aktualisiert den QR-Code basierend auf den aktuellen Einstellungen
function updateQR() {
    const dataString = getQRData();
    const size = parseInt(document.getElementById("qr-size").value);
    const colorDark = document.getElementById("color-dark").value;
    const colorBg = document.getElementById("color-bg").value;
    const logoFile = document.getElementById("logo-file").files[0];

    currentQRConfig = {
        data: dataString,
        size,
        colorDark,
        colorBg,
        logoDataUrl: ""
    };

    const previewOptions = {
        width: PREVIEW_SIZE,
        height: PREVIEW_SIZE,
        data: dataString,
        dotsOptions: { color: colorDark },
        backgroundOptions: { color: colorBg }
    };

    if (logoFile) {
        const reader = new FileReader();
        reader.onload = function(e) {
            currentQRConfig.logoDataUrl = e.target.result;
            previewOptions.image = e.target.result;
            qrCode.update(previewOptions);
        };
        reader.readAsDataURL(logoFile);
    } else {
        previewOptions.image = "";
        qrCode.update(previewOptions);
    }
}

// Download-Funktion
function downloadQR(format) {
    const downloadQr = new QRCodeStyling({
        width: currentQRConfig.size,
        height: currentQRConfig.size,
        type: "svg",
        data: currentQRConfig.data,
        dotsOptions: { color: currentQRConfig.colorDark },
        backgroundOptions: { color: currentQRConfig.colorBg },
        image: currentQRConfig.logoDataUrl,
        imageOptions: { crossOrigin: "anonymous", hideBackgroundDots: true, imageSize: 0.4, margin: 5 }
    });

    downloadQr.download({ name: "qr-code", extension: format });
}