// Bei v0.11 extrahieren wir createFFmpeg und fetchFile direkt aus dem globalen FFmpeg-Objekt
const { createFFmpeg, fetchFile } = FFmpeg;

// FFmpeg-Instanz erstellen und Loggen aktivieren
const ffmpeg = createFFmpeg({ log: true });

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
    // Prüfen, ob FFmpeg fertig geladen ist
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
    const inputName = file.name; // Wir behalten den echten Namen temporär
    const outputName = `output.${targetFormat}`;

    statusDiv.innerText = "Status: Verarbeite Datei...";
    downloadArea.innerHTML = ""; 

    try {
        // Datei ins virtuelle Dateisystem schreiben
        ffmpeg.FS('writeFile', inputName, await fetchFile(file));

        statusDiv.innerText = `Status: Konvertiere zu ${targetFormat.toUpperCase()}...`;
        
        // Befehl ausführen
        await ffmpeg.run('-i', inputName, outputName);

        statusDiv.innerText = "Status: Konvertierung erfolgreich!";

        // Datei auslesen
        const data = ffmpeg.FS('readFile', outputName);

        // Download-Link generieren
        const blob = new Blob([data.buffer], { type: `audio/${targetFormat}` });
        const url = URL.createObjectURL(blob);

        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = `konvertiert_${file.name.split('.')[0]}.${targetFormat}`;
        downloadLink.innerText = "👉 Klicke hier für den Download 👈";
        downloadLink.className = "download-button";
        
        downloadArea.appendChild(downloadLink);

        // Virtuelle Dateien aufräumen, um RAM zu sparen
        ffmpeg.FS('unlink', inputName);
        ffmpeg.FS('unlink', outputName);

    } catch (error) {
        console.error(error);
        statusDiv.innerText = "Status: Fehler bei der Konvertierung!";
    }
}

// Event-Listener
convertBtn.addEventListener('click', convertAudio);

// Direkt starten
loadFFmpeg();