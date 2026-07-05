const { createFFmpeg, fetchFile } = FFmpeg;

// HIER IST DIE ÄNDERUNG: Wir fügen den Standard-corePath für v0.11 hinzu
const ffmpeg = createFFmpeg({ 
    log: true,
    corePath: 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js' 
});

const uploadInput = document.getElementById('audio-upload');
const formatSelect = document.getElementById('format-select');
const convertBtn = document.getElementById('convert-btn');
const statusDiv = document.getElementById('status');
const downloadArea = document.getElementById('download-area');

// 1. FFmpeg im Hintergrund laden
async function loadFFmpeg() {
    statusDiv.innerText = "Status: Lade Konverter-Engine (FFmpeg)...";
    try {
        await ffmpeg.load();
        statusDiv.innerText = "Status: Konverter bereit!";
    } catch (error) {
        console.error(error);
        statusDiv.innerText = "Status: Fehler beim Laden der Engine.";
    }
}

// 2. Die Konvertierung ausführen
async function convertAudio() {
    if (!ffmpeg.isLoaded()) {
        statusDiv.innerText = "Status: FFmpeg wird noch geladen. Bitte warten.";
        return;
    }

    const file = uploadInput.files[0];
    if (!file) {
        statusDiv.innerText = "Status: Bitte wähle zuerst eine Datei aus!";
        return;
    }

    const targetFormat = formatSelect.value;
    const inputName = file.name; 
    const outputName = `output.${targetFormat}`;

    statusDiv.innerText = "Status: Verarbeite Datei...";
    downloadArea.innerHTML = ""; 

    try {
        ffmpeg.FS('writeFile', inputName, await fetchFile(file));
        statusDiv.innerText = `Status: Konvertiere zu ${targetFormat.toUpperCase()}...`;
        
        await ffmpeg.run('-i', inputName, outputName);
        statusDiv.innerText = "Status: Konvertierung erfolgreich!";

        const data = ffmpeg.FS('readFile', outputName);
        const blob = new Blob([data.buffer], { type: `audio/${targetFormat}` });
        const url = URL.createObjectURL(blob);

        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = `konvertiert_${file.name.split('.')[0]}.${targetFormat}`;
        downloadLink.innerText = "👉 Klicke hier für den Download 👈";
        downloadLink.className = "download-button";
        
        downloadArea.appendChild(downloadLink);

        ffmpeg.FS('unlink', inputName);
        ffmpeg.FS('unlink', outputName);

    } catch (error) {
        console.error(error);
        statusDiv.innerText = "Status: Fehler bei der Konvertierung!";
    }
}

convertBtn.addEventListener('click', convertAudio);
loadFFmpeg();