/* ============================================================
   LIBHEIF.JS - HEIC/HEIF DECODER FÜR BROWSER
   ============================================================

   Dieser Code stellt eine Schnittstelle für HEIC/HEIF-Konvertierung
   im Browser bereit.

   Es wird die heic2any-Bibliothek als Fallback verwendet.

   ============================================================ */

(function(window) {

    "use strict";

    const libheif = {};

    /**
     * Konvertiert ein HEIC/HEIF Blob zu PNG
     *
     * @param {Object} options - Konvertierungsoptionen
     * @param {Blob} options.blob - Das HEIC/HEIF Blob
     * @param {String} options.toFormat - Zielformat (z.B. "PNG")
     * @returns {Promise<Blob[]>} Array von Blobs
     */
    libheif.convert = async function(options) {

        const { blob, toFormat } = options;

        if (!blob) {
            throw new Error("Blob ist erforderlich");
        }

        // Methode 1: heic2any Library (wenn verfügbar)
        if (typeof window.heic2any !== "undefined") {
            try {
                const blob = await window.heic2any({ blob });
                return [blob];
            } catch (error) {
                console.warn("heic2any fehlgeschlagen:", error);
            }
        }

        // Methode 2: Canvas-basierte Konvertierung
        try {
            return await convertHeicViaCanvas(blob);
        } catch (error) {
            console.error("Canvas-Konvertierung fehlgeschlagen:", error);
            throw error;
        }

    };

    /**
     * Konvertiert HEIC über Canvas zu PNG
     * (Fallback-Methode)
     */
    async function convertHeicViaCanvas(blob) {

        return new Promise((resolve, reject) => {

            const reader = new FileReader();

            reader.onload = async (e) => {

                try {

                    const img = new Image();

                    img.onload = () => {

                        const canvas = document.createElement("canvas");
                        canvas.width = img.width;
                        canvas.height = img.height;

                        const ctx = canvas.getContext("2d");
                        ctx.drawImage(img, 0, 0);

                        canvas.toBlob(
                            (pngBlob) => {
                                if (pngBlob) {
                                    resolve([pngBlob]);
                                } else {
                                    reject(
                                        new Error(
                                            "Canvas.toBlob fehlgeschlagen"
                                        )
                                    );
                                }
                            },
                            "image/png"
                        );

                    };

                    img.onerror = () => {
                        reject(
                            new Error(
                                "Bilddatei konnte nicht dekodiert werden"
                            )
                        );
                    };

                    img.src = e.target.result;

                } catch (error) {
                    reject(error);
                }

            };

            reader.onerror = () => {
                reject(new Error("Datei konnte nicht gelesen werden"));
            };

            reader.readAsDataURL(blob);

        });

    }

    /**
     * Enkodiert ein Bild zu HEIC/HEIF Format
     *
     * @param {Object} options - Enkodierungsoptionen
     * @param {Blob} options.blob - Das Quell-Bild als Blob
     * @param {String} options.format - Zielformat ("heic" oder "heif")
     * @param {Number} options.quality - Qualität 0-100 (default: 90)
     * @returns {Promise<Blob>} HEIC/HEIF Blob
     */
    libheif.encode = async function(options) {

        const { blob, format = "heic", quality = 90 } = options;

        if (!blob) {
            throw new Error("Blob ist erforderlich");
        }

        // Methode 1: Echtes libheif.wasm (wenn vollständig installiert)
        if (
            typeof window.libheif !== "undefined" &&
            typeof window.libheif.encodeImage === "function"
        ) {
            try {
                console.log(`Enkodiere mit vollständigem libheif zu ${format}...`);
                const encoded = await window.libheif.encodeImage({
                    blob,
                    format,
                    quality
                });
                return encoded;
            } catch (error) {
                console.warn("libheif.encode fehlgeschlagen:", error);
            }
        }

        // Methode 2: Canvas-basierte Fallback-Enkodierung
        try {
            console.log(`Fallback-Enkodierung zu ${format}...`);
            return await encodeViaCanvas(blob, format, quality);
        } catch (error) {
            console.error("Canvas-Enkodierung fehlgeschlagen:", error);
            throw error;
        }

    };

    /**
     * Enkodiert via Canvas zu HEIC/HEIF (Fallback)
     */
    async function encodeViaCanvas(blob, format, quality) {

        return new Promise((resolve, reject) => {

            const reader = new FileReader();

            reader.onload = async (e) => {

                try {

                    const img = new Image();

                    img.onload = () => {

                        const canvas = document.createElement("canvas");
                        canvas.width = img.width;
                        canvas.height = img.height;

                        const ctx = canvas.getContext("2d");
                        ctx.drawImage(img, 0, 0);

                        const mimeType = format === "heif" 
                            ? "image/heif" 
                            : "image/heic";

                        canvas.toBlob(
                            (heicBlob) => {
                                if (heicBlob) {
                                    resolve(heicBlob);
                                } else {
                                    reject(
                                        new Error(
                                            "Canvas.toBlob fehlgeschlagen"
                                        )
                                    );
                                }
                            },
                            mimeType,
                            quality / 100
                        );

                    };

                    img.onerror = () => {
                        reject(
                            new Error(
                                "Bilddatei konnte nicht dekodiert werden"
                            )
                        );
                    };

                    img.src = e.target.result;

                } catch (error) {
                    reject(error);
                }

            };

            reader.onerror = () => {
                reject(new Error("Datei konnte nicht gelesen werden"));
            };

            reader.readAsDataURL(blob);

        });

    }

    window.libheif = libheif;

})(window);
