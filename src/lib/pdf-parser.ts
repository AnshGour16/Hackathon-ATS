import PDFParser from 'pdf2json';

export interface IParsedSlide {
    slideNumber: number;
    title?: string;
    content: string;
    hasImages?: boolean;
}

export interface IParsedDocumentResult {
    format: 'pdf' | 'pptx' | 'ppt';
    slideCount: number;
    text: string;
    slides: IParsedSlide[];
    hasVisualAssetsOnlyWarning?: boolean;
}

/**
 * Validates whether a buffer contains a PDF header signature
 */
export function isPdfBuffer(buffer: Buffer): boolean {
    if (!buffer || buffer.length < 5) return false;
    return buffer.subarray(0, 5).toString('ascii').startsWith('%PDF-');
}

/**
 * Checks if a PDF buffer has password encryption enabled
 */
export function isPdfEncrypted(buffer: Buffer): boolean {
    try {
        const header = buffer.subarray(0, 4096).toString('binary');
        const trailer = buffer.subarray(Math.max(0, buffer.length - 8192)).toString('binary');
        const combined = header + ' ' + trailer;
        return /\/Encrypt\s+[0-9]+\s+[0-9]+\s+R/i.test(combined) || /\/Encrypt\s*<</i.test(combined);
    } catch {
        return false;
    }
}

/**
 * Parses PDF presentation buffer into structured slides and normalized text
 */
export async function parsePdfPresentation(pdfBuffer: Buffer): Promise<IParsedDocumentResult> {
    if (!isPdfBuffer(pdfBuffer)) {
        throw new Error('Invalid PDF document: missing %PDF- header signature or corrupted file.');
    }

    if (isPdfEncrypted(pdfBuffer)) {
        throw new Error('Password-protected PDF documents are not supported. Please remove password protection and re-upload.');
    }

    return new Promise((resolve, reject) => {
        const pdfParser = new PDFParser(null, true);

        pdfParser.on('pdfParser_dataError', (errData: unknown) => {
            const parsedErr = errData as { parserError?: Error | string };
            const rawMessage =
                parsedErr?.parserError instanceof Error
                    ? parsedErr.parserError.message
                    : typeof parsedErr?.parserError === 'string'
                    ? parsedErr.parserError
                    : 'Failed to parse PDF document';

            if (/password|encrypt/i.test(rawMessage)) {
                reject(new Error('Password-protected PDF documents are not supported. Please remove password protection and re-upload.'));
            } else {
                reject(new Error(`Corrupted or unreadable PDF document: ${rawMessage}`));
            }
        });

        pdfParser.on('pdfParser_dataReady', (pdfData: { Pages?: Array<{ Texts?: Array<{ R?: Array<{ T?: string }> }> }> }) => {
            try {
                const pages = pdfData?.Pages || [];
                const slides: IParsedSlide[] = [];
                let aggregatedText = '';

                pages.forEach((page, index) => {
                    const slideNumber = index + 1;
                    const textChunks: string[] = [];

                    if (Array.isArray(page.Texts)) {
                        for (const textObj of page.Texts) {
                            if (Array.isArray(textObj.R)) {
                                for (const run of textObj.R) {
                                    if (run.T) {
                                        try {
                                            const decoded = decodeURIComponent(run.T);
                                            textChunks.push(decoded);
                                        } catch {
                                            textChunks.push(run.T);
                                        }
                                    }
                                }
                            }
                        }
                    }

                    const pageContent = textChunks.join(' ').replace(/\s+/g, ' ').trim();
                    const slideTitle = pageContent.length > 0 ? pageContent.split(/[.\n?!]/)[0].substring(0, 60) : undefined;

                    slides.push({
                        slideNumber,
                        title: slideTitle,
                        content: pageContent || '[Empty slide or graphic-only content]'
                    });

                    aggregatedText += `\n--- Slide ${slideNumber}${slideTitle ? `: ${slideTitle}` : ''} ---\n`;
                    aggregatedText += (pageContent || '[Empty slide or graphic-only content]') + '\n';
                });

                const totalExtractableChars = slides.reduce((acc, s) => {
                    const clean = s.content.replace(/\[Empty slide or graphic-only content\]/g, '').trim();
                    return acc + clean.length;
                }, 0);

                if (slides.length === 0 || totalExtractableChars === 0) {
                    throw new Error('The uploaded PDF presentation is empty or contains no readable text.');
                }

                resolve({
                    format: 'pdf',
                    slideCount: slides.length,
                    text: aggregatedText.trim(),
                    slides
                });
            } catch (err) {
                reject(err);
            }
        });

        try {
            pdfParser.parseBuffer(pdfBuffer);
        } catch (e) {
            reject(new Error(`Corrupted PDF structure: ${e instanceof Error ? e.message : 'Unknown parsing error'}`));
        }
    });
}

/**
 * Extracts raw text from a PDF Buffer using pdf2json (Preserved for backwards compatibility)
 */
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
    const result = await parsePdfPresentation(pdfBuffer);
    return result.text;
}
