/* ============================================================
   IMAGE CONVERTER
   ============================================================

   Erwartete Struktur:

   Image Converter/
   │
   ├── index.html
   ├── style.css
   ├── app.js
   │
   ├── ffmpeg/
   │   ├── ffmpeg.js
   │   ├── 814.ffmpeg.js
   │   ├── ffmpeg-core.js
   │   └── ffmpeg-core.wasm
   │
   └── libs/
       └── jszip.min.js

   ============================================================ */


/* ============================================================
   DOM
   ============================================================ */

const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const folderInput = document.getElementById("folderInput");

const selectFilesButton =
    document.getElementById("selectFilesButton");

const folderButton =
    document.getElementById("folderButton");

const clearButton =
    document.getElementById("clearButton");

const fileSection =
    document.getElementById("fileSection");

const fileList =
    document.getElementById("fileList");

const fileCount =
    document.getElementById("fileCount");

const formatSelect =
    document.getElementById("formatSelect");

const modifierButton =
    document.getElementById("modifierButton");

const convertButton =
    document.getElementById("convertButton");

const status =
    document.getElementById("status");


/* ============================================================
   STATE
   ============================================================ */

let selectedFiles = [];

let ffmpeg = null;

let ffmpegLoaded = false;

let ffmpegLoading = false;


/* ============================================================
   FORMATE
   ============================================================ */

const outputMimeTypes = {
    png: "image/png",
    jpg: "image/jpeg",
    webp: "image/webp",
    bmp: "image/bmp",
    tiff: "image/tiff",
    ico: "image/x-icon"
};


const supportedExtensions = new Set([
    "png",
    "jpg",
    "jpeg",
    "webp",
    "gif",
    "bmp",
    "tif",
    "tiff",
    "ico",
    "tga",
    "ppm",
    "pgm",
    "pbm"
]);


/* ============================================================
   MODIFIKATOREN

   Platzhalter für später.

   Hier können später z.B. stehen:

   - Comic
   - Ölfarben
   - Schwarzweiß
   - Blur
   - Schärfen
   - Helligkeit
   - Kontrast
   - usw.

   ============================================================ */

const modifiers = [];


/* ============================================================
   HILFSFUNKTIONEN
   ============================================================ */

function getExtension(filename) {

    const match =
        filename.match(/\.([^.]+)$/);

    return match
        ? match[1].toLowerCase()
        : "";
}


function removeExtension(filename) {

    return filename.replace(
        /\.[^/.]+$/,
        ""
    );
}


function formatBytes(bytes) {

    if (bytes === 0) {
        return "0 Bytes";
    }

    const units = [
        "Bytes",
        "KB",
        "MB",
        "GB"
    ];

    const index =
        Math.floor(
            Math.log(bytes) /
            Math.log(1024)
        );

    return (
        (
            bytes /
            Math.pow(1024, index)
        ).toFixed(
            index === 0 ? 0 : 1
        )
        + " "
        + units[index]
    );
}


function isImage(file) {

    if (
        file.type &&
        file.type.startsWith("image/")
    ) {
        return true;
    }

    return supportedExtensions.has(
        getExtension(file.name)
    );
}


/* ============================================================
   STATUS
   ============================================================ */

function hideStatus() {

    status.hidden = true;
    status.className = "status";
    status.innerHTML = "";

}


function showError(message) {

    status.hidden = false;

    status.className =
        "status error";

    status.textContent =
        message;

    console.error(
        "[Image Converter]",
        message
    );

}


function showSuccess(message) {

    status.hidden = false;

    status.className =
        "status success";

    status.textContent =
        message;

}


function showProgress(
    message,
    percent
) {

    const value =
        Math.max(
            0,
            Math.min(
                100,
                percent
            )
        );


    status.hidden = false;

    status.className =
        "status";


    status.innerHTML = `

        <div class="progress-header">

            <span>${escapeHtml(message)}</span>

            <strong>
                ${Math.round(value)}%
            </strong>

        </div>

        <div class="progress-track">

            <div
                class="progress-bar"
                style="width:${value}%"
            ></div>

        </div>

    `;

}


function escapeHtml(text) {

    const div =
        document.createElement("div");

    div.textContent =
        text;

    return div.innerHTML;

}


/* ============================================================
   DATEIEN HINZUFÜGEN
   ============================================================ */

function addFiles(files) {

    const incoming =
        Array.from(files);


    const images =
        incoming.filter(
            isImage
        );


    if (images.length === 0) {

        showError(
            "Keine unterstützten Bilddateien gefunden."
        );

        return;
    }


    hideStatus();


    for (const file of images) {

        const duplicate =
            selectedFiles.some(
                existing =>
                    existing.name === file.name &&
                    existing.size === file.size &&
                    existing.lastModified ===
                        file.lastModified
            );


        if (!duplicate) {

            selectedFiles.push(file);

        }

    }


    renderFiles();

}


/* ============================================================
   DATEIEN RENDERN
   ============================================================ */

function renderFiles() {

    fileList.innerHTML = "";


    if (
        selectedFiles.length === 0
    ) {

        fileSection.hidden = true;

        clearButton.hidden = true;

        convertButton.disabled = true;

        updateConvertButton();

        return;

    }


    fileSection.hidden = false;

    clearButton.hidden = false;

    convertButton.disabled = false;


    fileCount.textContent =
        `${selectedFiles.length} ${
            selectedFiles.length === 1
                ? "Datei"
                : "Dateien"
        } ausgewählt`;


    selectedFiles.forEach(
        (file, index) => {

            const item =
                document.createElement("div");

            item.className =
                "file-item";


            /* --------------------------------------------
               Thumbnail
               -------------------------------------------- */

            const thumbnail =
                document.createElement("div");

            thumbnail.className =
                "thumbnail";


            const img =
                document.createElement("img");

            img.alt = "";


            const objectURL =
                URL.createObjectURL(file);

            img.src =
                objectURL;


            img.onload = () => {

                URL.revokeObjectURL(
                    objectURL
                );

            };


            thumbnail.appendChild(
                img
            );


            /* --------------------------------------------
               Informationen
               -------------------------------------------- */

            const info =
                document.createElement("div");

            info.className =
                "file-info";


            const name =
                document.createElement("span");

            name.className =
                "file-name";

            name.textContent =
                file.name;


            const meta =
                document.createElement("span");

            meta.className =
                "file-meta";

            meta.textContent =
                `${formatBytes(file.size)} · ${
                    getExtension(file.name)
                        .toUpperCase()
                }`;


            info.appendChild(
                name
            );

            info.appendChild(
                meta
            );


            /* --------------------------------------------
               Entfernen
               -------------------------------------------- */

            const remove =
                document.createElement("button");

            remove.type =
                "button";

            remove.className =
                "remove-file";

            remove.textContent =
                "×";

            remove.title =
                "Datei entfernen";


            remove.addEventListener(
                "click",
                () => {

                    selectedFiles.splice(
                        index,
                        1
                    );

                    renderFiles();

                }
            );


            item.appendChild(
                thumbnail
            );

            item.appendChild(
                info
            );

            item.appendChild(
                remove
            );


            fileList.appendChild(
                item
            );

        }
    );


    updateConvertButton();

}


/* ============================================================
   BUTTON-TEXT
   ============================================================ */

function updateConvertButton() {

    const strong =
        convertButton.querySelector(
            "strong"
        );


    if (!strong) {
        return;
    }


    if (
        selectedFiles.length > 1
    ) {

        strong.textContent =
            `${selectedFiles.length} Bilder konvertieren`;

    } else {

        strong.textContent =
            "Bild konvertieren";

    }

}


/* ============================================================
   FFMPEG LADEN
   ============================================================ */

async function loadFFmpeg() {

    if (ffmpegLoaded) {

        return true;

    }


    if (ffmpegLoading) {

        return false;

    }


    /*
     * Dein ffmpeg.js exportiert:
     *
     * window.FFmpegWASM
     *
     * und NICHT window.FFmpeg.
     */

    if (
        !window.FFmpegWASM
    ) {

        showError(
            "FFmpegWASM wurde nicht gefunden. Prüfe, ob ffmpeg/ffmpeg.js in index.html geladen wird."
        );

        return false;

    }


    if (
        !window.FFmpegWASM.FFmpeg
    ) {

        showError(
            "Die FFmpeg-Klasse wurde nicht gefunden."
        );

        return false;

    }


    ffmpegLoading =
        true;


    try {

        showProgress(
            "FFmpeg wird gestartet...",
            5
        );


        /*
         * FFmpeg-Instanz erstellen.
         */

        ffmpeg =
            new window.FFmpegWASM.FFmpeg();


        /*
         * FFmpeg Logs.
         */

        ffmpeg.on(
            "log",
            ({ message }) => {

                console.log(
                    "[FFmpeg]",
                    message
                );

            }
        );


        /*
         * Konvertierungsfortschritt.
         */

        ffmpeg.on(
            "progress",
            ({ progress }) => {

                showProgress(
                    "Konvertiere Bild...",
                    progress * 100
                );

            }
        );


        /*
         * Lokale Dateien.
         *
         * Wichtig:
         * Wir verwenden die Dateien aus deiner ZIP.
         */

        const coreURL =
            new URL(
                "./ffmpeg/ffmpeg-core.js",
                window.location.href
            ).href;


        const wasmURL =
            new URL(
                "./ffmpeg/ffmpeg-core.wasm",
                window.location.href
            ).href;


        const workerURL =
            new URL(
                "./ffmpeg/814.ffmpeg.js",
                window.location.href
            ).href;


        console.log(
            "FFmpeg Core:",
            coreURL
        );

        console.log(
            "FFmpeg WASM:",
            wasmURL
        );

        console.log(
            "FFmpeg Worker:",
            workerURL
        );


        /*
         * FFmpeg laden.
         *
         * workerURL sorgt dafür, dass dein lokaler
         * 814.ffmpeg.js verwendet wird.
         */

        await ffmpeg.load({

            coreURL:
                coreURL,

            wasmURL:
                wasmURL,

            workerURL:
                workerURL

        });


        ffmpegLoaded =
            true;

        ffmpegLoading =
            false;


        showProgress(
            "FFmpeg bereit.",
            100
        );


        console.log(
            "FFmpeg erfolgreich geladen."
        );


        return true;

    } catch (error) {

        console.error(
            "FFmpeg Ladefehler:",
            error
        );


        ffmpegLoading =
            false;


        showError(
            "FFmpeg konnte nicht geladen werden. Details stehen in der Browser-Konsole."
        );


        return false;

    }

}


/* ============================================================
   FILE → UINT8ARRAY
   ============================================================ */

async function fileToUint8Array(file) {

    const buffer =
        await file.arrayBuffer();

    return new Uint8Array(
        buffer
    );

}


/* ============================================================
   DOWNLOAD
   ============================================================ */

function downloadBlob(
    blob,
    filename
) {

    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement("a");

    link.href =
        url;

    link.download =
        filename;


    document.body.appendChild(
        link
    );


    link.click();


    link.remove();


    setTimeout(
        () => {

            URL.revokeObjectURL(
                url
            );

        },
        1000
    );

}


/* ============================================================
   EIN BILD KONVERTIEREN
   ============================================================ */

async function convertSingleFile(
    file,
    index,
    outputFormat
) {

    const inputExtension =
        getExtension(file.name) || "img";


    const inputName =
        `input_${index}.${inputExtension}`;


    const outputName =
        `output_${index}.${outputFormat}`;


    console.log(
        "Schreibe Datei:",
        inputName
    );


    /*
     * Datei in FFmpeg-Dateisystem schreiben.
     */

    const data =
        await fileToUint8Array(
            file
        );


    await ffmpeg.writeFile(
        inputName,
        data
    );


    /*
     * FFmpeg-Argumente.
     */

    const args = [
        "-i",
        inputName
    ];


    /*
     * JPEG-Pixelformat.
     */

    if (
        outputFormat === "jpg"
    ) {

        args.push(
            "-pix_fmt",
            "yuvj420p"
        );

    }


    /*
     * Modifikatoren.

     * Aktuell leer.
     *
     * Später können hier Filter
     * hinzugefügt werden.
     */

    const filters = [];


    for (
        const modifier
        of modifiers
    ) {

        if (
            !modifier.enabled
        ) {
            continue;
        }


        if (
            typeof modifier.getFilter ===
            "function"
        ) {

            filters.push(
                modifier.getFilter()
            );

        }

    }


    if (
        filters.length > 0
    ) {

        args.push(
            "-vf",
            filters.join(",")
        );

    }


    /*
     * Ausgabe.
     */

    args.push(
        outputName
    );


    console.log(
        "FFmpeg:",
        args
    );


    /*
     * Konvertieren.
     */

    const result =
        await ffmpeg.exec(
            args
        );


    console.log(
        "FFmpeg Ergebnis:",
        result
    );


    /*
     * Ergebnis lesen.
     */

    const outputData =
        await ffmpeg.readFile(
            outputName
        );


    /*
     * Blob erzeugen.
     */

    const blob =
        new Blob(
            [outputData],
            {
                type:
                    outputMimeTypes[
                        outputFormat
                    ]
            }
        );


    /*
     * Temporäre Dateien löschen.
     */

    try {

        await ffmpeg.deleteFile(
            inputName
        );

    } catch (error) {

        console.warn(
            "Input konnte nicht gelöscht werden.",
            error
        );

    }


    try {

        await ffmpeg.deleteFile(
            outputName
        );

    } catch (error) {

        console.warn(
            "Output konnte nicht gelöscht werden.",
            error
        );

    }


    return {

        name:
            `${removeExtension(
                file.name
            )}.${outputFormat}`,

        blob:
            blob

    };

}


/* ============================================================
   ALLE BILDER KONVERTIEREN
   ============================================================ */

async function convertImages() {

    console.log(
        "convertImages() gestartet"
    );

    console.log(
        "Ausgewählte Dateien:",
        selectedFiles
    );


    if (
        selectedFiles.length === 0
    ) {

        showError(
            "Bitte zuerst mindestens ein Bild auswählen."
        );

        return;

    }


    convertButton.disabled =
        true;

    formatSelect.disabled =
        true;


    try {

        /*
         * FFmpeg laden.
         */

        const loaded =
            await loadFFmpeg();


        if (!loaded) {

            return;

        }


        const outputFormat =
            formatSelect.value;


        const results = [];


        /*
         * Bilder nacheinander konvertieren.
         */

        for (
            let i = 0;
            i < selectedFiles.length;
            i++
        ) {

            const file =
                selectedFiles[i];


            const percentage =
                (
                    i /
                    selectedFiles.length
                ) * 100;


            showProgress(
                `Konvertiere ${file.name}...`,
                percentage
            );


            const result =
                await convertSingleFile(
                    file,
                    i,
                    outputFormat
                );


            results.push(
                result
            );

        }


        /*
         * EINE Datei
         */

        if (
            results.length === 1
        ) {

            downloadBlob(
                results[0].blob,
                results[0].name
            );


            showSuccess(
                "Bild erfolgreich konvertiert."
            );


            return;

        }


        /*
         * MEHRERE Dateien
         *
         * → ZIP
         */

        if (
            typeof JSZip === "undefined"
        ) {

            throw new Error(
                "JSZip wurde nicht geladen."
            );

        }


        showProgress(
            "ZIP-Datei wird erstellt...",
            0
        );


        const zip =
            new JSZip();


        for (
            const result
            of results
        ) {

            zip.file(
                result.name,
                result.blob
            );

        }


        const zipBlob =
            await zip.generateAsync(
                {
                    type:
                        "blob",

                    compression:
                        "DEFLATE",

                    compressionOptions:
                        {
                            level: 6
                        }
                },

                metadata => {

                    showProgress(
                        "ZIP-Datei wird erstellt...",
                        metadata.percent
                    );

                }
            );


        downloadBlob(
            zipBlob,
            "converted-images.zip"
        );


        showSuccess(
            `${results.length} Bilder erfolgreich konvertiert und als ZIP heruntergeladen.`
        );


    } catch (error) {

        console.error(
            "KONVERTIERUNGSFEHLER:",
            error
        );


        showError(
            `Konvertierung fehlgeschlagen: ${
                error?.message ||
                "Unbekannter Fehler"
            }`
        );

    } finally {

        convertButton.disabled =
            false;

        formatSelect.disabled =
            false;

    }

}


/* ============================================================
   DATEI-AUSWAHL
   ============================================================ */

selectFilesButton.addEventListener(
    "click",
    event => {

        event.stopPropagation();

        fileInput.click();

    }
);


fileInput.addEventListener(
    "change",
    event => {

        addFiles(
            event.target.files
        );

        fileInput.value =
            "";

    }
);


/* ============================================================
   ORDNER
   ============================================================ */

folderButton.addEventListener(
    "click",
    () => {

        folderInput.click();

    }
);


folderInput.addEventListener(
    "change",
    event => {

        addFiles(
            event.target.files
        );

        folderInput.value =
            "";

    }
);


/* ============================================================
   DRAG & DROP
   ============================================================ */

dropZone.addEventListener(
    "dragenter",
    event => {

        event.preventDefault();

        dropZone.classList.add(
            "dragging"
        );

    }
);


dropZone.addEventListener(
    "dragover",
    event => {

        event.preventDefault();

        dropZone.classList.add(
            "dragging"
        );

    }
);


dropZone.addEventListener(
    "dragleave",
    event => {

        event.preventDefault();

        dropZone.classList.remove(
            "dragging"
        );

    }
);


dropZone.addEventListener(
    "drop",
    event => {

        event.preventDefault();

        dropZone.classList.remove(
            "dragging"
        );


        addFiles(
            event.dataTransfer.files
        );

    }
);


/* ============================================================
   DROPZONE KLICK
   ============================================================ */

dropZone.addEventListener(
    "click",
    event => {

        if (
            event.target.closest(
                "button"
            )
        ) {

            return;

        }


        fileInput.click();

    }
);


/* ============================================================
   ALLE DATEIEN ENTFERNEN
   ============================================================ */

clearButton.addEventListener(
    "click",
    () => {

        selectedFiles = [];

        renderFiles();

        hideStatus();

    }
);


/* ============================================================
   MODIFIKATOREN
   ============================================================ */

modifierButton.addEventListener(
    "click",
    () => {

        showError(
            "Modifikatoren sind für ein zukünftiges Update vorgesehen."
        );

    }
);


/* ============================================================
   KONVERTIEREN
   ============================================================ */

convertButton.addEventListener(
    "click",
    () => {

        console.log(
            "KONVERTIEREN BUTTON GEKLICKT"
        );

        convertImages();

    }
);


/* ============================================================
   START
   ============================================================ */

console.log(
    "Image Converter gestartet."
);

console.log(
    "FFmpegWASM:",
    window.FFmpegWASM
);

console.log(
    "JSZip:",
    typeof JSZip !== "undefined"
);


renderFiles();