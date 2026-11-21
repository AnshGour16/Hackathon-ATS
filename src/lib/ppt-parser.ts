import CFB from 'cfb';
import { IParsedDocumentResult, IParsedSlide } from './pdf-parser';

/**
 * Validates whether a buffer starts with standard OLE2 Compound File Binary Format magic bytes
 */
export function isPptBuffer(buffer: Buffer): boolean {
    if (!buffer || buffer.length < 8) return false;
    // OLE header: D0 CF 11 E0 A1 B1 1A E1
    return buffer[0] === 0xD0 && buffer[1] === 0xCF && buffer[2] === 0x11 && buffer[3] === 0xE0 &&
        buffer[4] === 0xA1 && buffer[5] === 0xB1 && buffer[6] === 0x1A && buffer[7] === 0xE1;
}

/**
 * Checks whether the CFB container contains password encryption streams
 */
function isEncryptedCfb(cfb: CFB.CFB$Container): boolean {
    const paths = cfb.FullPaths || [];
    for (const p of paths) {
        if (/EncryptedSummary|EncryptionInfo|EncryptedPackage/i.test(p)) {
            return true;
        }
    }
    return false;
}

/**
 * Cleans extracted binary text: removes null characters, control characters, and normalizes spacing
 */
function cleanExtractedText(raw: string): string {
    return raw
        .replace(/\0/g, '')
        .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ')
        .replace(/[ \t]+/g, ' ')
        .trim();
}

/**
 * Parses binary PowerPoint 97-2003 presentation (.ppt) into structured slides and normalized text
 */
export async function parsePptPresentation(buffer: Buffer): Promise<IParsedDocumentResult> {
    if (!isPptBuffer(buffer)) {
        throw new Error('Invalid PPT file: missing Microsoft OLE2 binary header (0xD0CF11E0).');
    }

    let cfb: CFB.CFB$Container;
    try {
        cfb = CFB.read(buffer, { type: 'buffer' });
    } catch (cfbErr) {
        throw new Error(`Corrupted or unreadable PPT file: ${cfbErr instanceof Error ? cfbErr.message : 'Invalid CFB structure'}`);
    }

    if (isEncryptedCfb(cfb)) {
        throw new Error('Password-protected PPT presentations are not supported. Please remove the password and re-upload.');
    }

    // Locate the PowerPoint Document stream
    const pptStreamEntry = CFB.find(cfb, 'PowerPoint Document') ||
        CFB.find(cfb, '/PowerPoint Document') ||
        CFB.find(cfb, 'PP97_DUALSTORAGE/PowerPoint Document');

    if (!pptStreamEntry || !pptStreamEntry.content) {
        throw new Error('Corrupted or invalid PPT file: missing PowerPoint Document binary stream.');
    }

    const streamData = Buffer.from(pptStreamEntry.content as Uint8Array);
    const slides: IParsedSlide[] = [];
    let currentSlideNumber = 0;
    let currentSlideTexts: string[] = [];

    const flushSlide = () => {
        if (currentSlideNumber > 0) {
            const validLines = currentSlideTexts
                .map(t => cleanExtractedText(t))
                .filter(t => t.length > 0 && !/^[\s.,\-*]+$/.test(t));

            const content = validLines.join('\n');
            const title = validLines.length > 0 ? validLines[0].substring(0, 80) : undefined;

            slides.push({
                slideNumber: currentSlideNumber,
                title,
                content: content || '[Empty slide]'
            });
            currentSlideTexts = [];
        }
    };

    // Traverse the binary stream record by record
    let offset = 0;
    const len = streamData.length;

    while (offset + 8 <= len) {
        const verInst = streamData.readUInt16LE(offset);
        const recType = streamData.readUInt16LE(offset + 2);
        const recLen = streamData.readUInt32LE(offset + 4);
        const recVer = verInst & 0x0F;

        // Check for password protection record
        if (recType === 12000 /* CryptSession10Container */) {
            throw new Error('Password-protected PPT presentations are not supported. Please remove the password and re-upload.');
        }

        // Slide boundary markers
        if (recType === 1000 /* Slide container */ || recType === 1006 /* SlideAtom */) {
            flushSlide();
            currentSlideNumber++;
        }

        const dataStart = offset + 8;
        const dataEnd = Math.min(len, dataStart + recLen);

        // Text Atoms
        if (recType === 4000 /* TextCharsAtom - UTF-16LE */) {
            if (currentSlideNumber === 0) currentSlideNumber = 1;
            const textRaw = streamData.toString('utf16le', dataStart, dataEnd);
            const clean = cleanExtractedText(textRaw);
            if (clean) currentSlideTexts.push(clean);
        } else if (recType === 4008 /* TextBytesAtom - Latin1 / ASCII */) {
            if (currentSlideNumber === 0) currentSlideNumber = 1;
            const textRaw = streamData.toString('latin1', dataStart, dataEnd);
            const clean = cleanExtractedText(textRaw);
            if (clean) currentSlideTexts.push(clean);
        } else if (recType === 4026 /* CString - UTF-16LE */) {
            if (currentSlideNumber === 0) currentSlideNumber = 1;
            const textRaw = streamData.toString('utf16le', dataStart, dataEnd);
            const clean = cleanExtractedText(textRaw);
            if (clean && clean.length > 2) currentSlideTexts.push(clean);
        }

        // If it's a container record (recVer === 0x0F), step into its header (8 bytes) so children are read.
        // If it's an atom, advance past its payload (8 + recLen bytes).
        if (recVer === 0x0F) {
            offset += 8;
        } else {
            offset += 8 + recLen;
        }
    }

    // Flush final slide
    flushSlide();

    // Fallback if records were organized in SlideListWithText without top-level Slide containers
    if (slides.length === 0 && currentSlideTexts.length > 0) {
        const validLines = currentSlideTexts
            .map(t => cleanExtractedText(t))
            .filter(t => t.length > 0);
        if (validLines.length > 0) {
            slides.push({
                slideNumber: 1,
                title: validLines[0].substring(0, 80),
                content: validLines.join('\n')
            });
        }
    }

    let aggregatedText = '';
    slides.forEach(s => {
        aggregatedText += `\n--- Slide ${s.slideNumber}${s.title ? `: ${s.title}` : ''} ---\n`;
        aggregatedText += s.content + '\n';
    });

    const totalChars = slides.reduce((acc, s) => {
        const clean = s.content.replace(/\[Empty slide\]/g, '').trim();
        return acc + clean.length;
    }, 0);

    if (slides.length === 0 || totalChars === 0) {
        throw new Error('The uploaded PPT presentation is empty or contains no readable text.');
    }

    return {
        format: 'ppt',
        slideCount: slides.length,
        text: aggregatedText.trim(),
        slides
    };
}
