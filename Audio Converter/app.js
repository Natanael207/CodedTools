// 1. Sichere Erkennung: Wo hat der Browser FFmpeg versteckt?
let FFmpegClass = null;

if (window.FFmpegWasm && window.FFmpegWasm.FFmpeg) {
    FFmpegClass = window.FFmpegWasm.FFmpeg;
} else if (window.FFmpeg && window.FFmpeg.FFmpeg) {
    FFmpegClass = window.FFmpeg.FFmpeg;
} else if (window.FFmpeg) {
    FFmpegClass = window.FFmpeg;
}

// 2. Sichere Erkennung für FFmpegUtil (fetchFile)
let fetchFileFunc = null;
if (window.FFmpegUtil && window.FFmpegUtil.fetchFile) {
    fetchFileFunc = window.FFmpegUtil.fetchFile;
} else if (window.fetchFile) {
    fetchFileFunc = window.fetchFile;
}

// Überprüfung, ob alles da ist
if (!FFmpegClass || !fetchFileFunc) {
    console.error("FFmpeg-Klassen konnten nicht im globalen Window-Objekt gefunden werden!");
}

// Die Variablen für den restlichen Code bereitstellen
const FFmpeg = FFmpegClass;
const fetchFile = fetchFileFunc;

let ffmpeg = null;

const uploadInput = document.getElementById('audio-upload');
const formatSelect = document.getElementById('format-select');
const convertBtn = document.getElementById('convert-btn');
const statusDiv = document.getElementById('status');
const downloadArea = document.getElementById('download-area');

// 1. FFmpeg im Hintergrund laden
async function loadFFmpeg() {
    statusDiv.innerText = "Status: Lade Konverter-Engine (FFmpeg)...";
    ffmpeg = new FFmpeg();
    
    // Loggt den Fortschritt in die Browser-Konsole
    ffmpeg.on('log', ({ message }) => {
        console.log(message);
    });

    await ffmpeg.load({
        coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js',
    });
    statusDiv.innerText = "Status: Konverter bereit!";
}

// 2. Die Konvertierung ausführen
async function convertAudio() {
    if (!ffmpeg) {
        statusDiv.innerText = "Status: FFmpeg wird noch geladen. Bitte warten.";
        return;
    }

    const file = uploadInput.files[0];
    if (!file) {
        statusDiv.innerText = "Status: Bitte wähle zuerst eine Datei aus!";
        return;
    }

    const targetFormat = formatSelect.value;
    const inputName = 'input_file';
    const outputName = `output_file.${targetFormat}`;

    statusDiv.innerText = "Status: Verarbeite Datei...";
    downloadArea.innerHTML = ""; // Alten Download-Link entfernen

    try {
        // Datei in das virtuelle FFmpeg-Dateisystem schreiben
        await ffmpeg.writeFile(inputName, await fetchFile(file));

        statusDiv.innerText = `Status: Konvertiere zu ${targetFormat.toUpperCase()}...`;
        
        // Den FFmpeg-Befehl ausführen (z.B. ffmpeg -i input_file output_file.mp3)
        await ffmpeg.exec(['-i', inputName, outputName]);

        statusDiv.innerText = "Status: Konvertierung erfolgreich!";

        // Die fertige Datei aus dem virtuellen Dateisystem auslesen
        const data = await ffmpeg.readFile(outputName);

        // Datei für den Browser als Download-Link bereitstellen
        const blob = new Blob([data.buffer], { type: `audio/${targetFormat}` });
        const url = URL.createObjectURL(blob);

        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = `konvertiert_${file.name.split('.')[0]}.${targetFormat}`;
        downloadLink.innerText = "👉 Klicke hier, um deine Datei herunterzuladen 👈";
        downloadLink.className = "download-button";
        
        downloadArea.appendChild(downloadLink);

    } catch (error) {
        console.error(error);
        statusDiv.innerText = "Status: Fehler bei der Konvertierung!";
    }
}

// Event-Listener setzen
convertBtn.addEventListener('click', convertAudio);

// FFmpeg direkt beim Laden der Seite starten
loadFFmpeg();