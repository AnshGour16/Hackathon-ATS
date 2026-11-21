import JSZip from 'jszip';
import { IParsedDocumentResult, IParsedSlide } from './pdf-parser';

/**
 * Validates whether a buffer starts with standard ZIP magic bytes
 */
export function isPptxBuffer(buffer: Buffer): boolean {
    if (!buffer || buffer.length < 4) return false;
    // PK\x03\x04 or PK\x05\x06 (empty zip) or PK\x07\x08
    return buffer[0] === 0x50 && buffer[1] === 0x4B &&
        (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07);
}

/**
 * Checks if a buffer represents an encrypted Office document (stored in OLE compound wrapper)
 */
export function isEncryptedOfficeBuffer(buffer: Buffer): boolean {
    if (!buffer || buffer.length < 512) return false;
    // Check if it's an OLE container (0xD0CF11E0) with EncryptedPackage or EncryptionInfo
    const isOle = buffer[0] === 0xD0 && buffer[1] === 0xCF && buffer[2] === 0x11 && buffer[3] === 0xE0;
    if (isOle) {
        const binaryStr = buffer.toString('binary');
        if (binaryStr.includes('EncryptedPackage') || binaryStr.includes('EncryptionInfo')) {
            return true;
        }
        const utf16Package = Buffer.from('EncryptedPackage', 'utf16le').toString('binary');
        const utf16Info = Buffer.from('EncryptionInfo', 'utf16le').toString('binary');
        if (binaryStr.includes(utf16Package) || binaryStr.includes(utf16Info)) {
            return true;
        }
    }
    return false;
}

/**
 * Extracts plain text from an XML element or string by removing XML tags and decoding basic entities
 */
function decodeXmlText(xmlSnippet: string): string {
    return xmlSnippet
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
        .trim();
}

/**
 * Extracts XML tag attribute value
 */
function getAttribute(tagString: string, attrName: string): string | null {
    const regex = new RegExp(`${attrName}=["']([^"']+)["']`, 'i');
    const match = tagString.match(regex);
    return match ? match[1] : null;
}

/**
 * Parses markdown-formatted tables from slide XML if <a:tbl> exists
 */
function extractTablesFromSlideXml(slideXml: string): string[] {
    const tables: string[] = [];
    const tableRegex = /<a:tbl\b[\s\S]*?<\/a:tbl>/gi;
    let tableMatch;

    while ((tableMatch = tableRegex.exec(slideXml)) !== null) {
        const tableContent = tableMatch[0];
        const rowRegex = /<a:tr\b[\s\S]*?<\/a:tr>/gi;
        const rows: string[][] = [];
        let rowMatch;

        while ((rowMatch = rowRegex.exec(tableContent)) !== null) {
            const rowContent = rowMatch[0];
            const cellRegex = /<a:tc\b[\s\S]*?<\/a:tc>/gi;
            const cells: string[] = [];
            let cellMatch;

            while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
                const cellContent = cellMatch[0];
                const textRegex = /<a:t\b[^>]*>([\s\S]*?)<\/a:t>/gi;
                const cellTexts: string[] = [];
                let textMatch;
                while ((textMatch = textRegex.exec(cellContent)) !== null) {
                    const text = decodeXmlText(textMatch[1]);
                    if (text) cellTexts.push(text);
                }
                cells.push(cellTexts.join(' ').trim() || '-');
            }
            if (cells.length > 0) {
                rows.push(cells);
            }
        }

        if (rows.length > 0) {
            let tableMd = '\n';
            const colCount = Math.max(...rows.map(r => r.length));
            const headerRow = rows[0];
            while (headerRow.length < colCount) headerRow.push('-');

            tableMd += `| ${headerRow.join(' | ')} |\n`;
            tableMd += `| ${new Array(colCount).fill('---').join(' | ')} |\n`;

            for (let r = 1; r < rows.length; r++) {
                const row = rows[r];
                while (row.length < colCount) row.push('-');
                tableMd += `| ${row.join(' | ')} |\n`;
            }
            tableMd += '\n';
            tables.push(tableMd);
        }
    }

    return tables;
}

/**
 * Parses a single PPTX slide XML into text blocks, titles, tables, and flags
 */
function parseSingleSlideXml(slideXml: string, slideNumber: number): IParsedSlide {
    // 1. Detect images and diagrams
    const hasPictures = /<p:pic\b|<a:blip\b/i.test(slideXml);
    const hasGraphicFrames = /<p:graphicFrame\b|<dgm:|<c:chart\b/i.test(slideXml);
    const hasImages = hasPictures || hasGraphicFrames;

    // 2. Extract Title
    let title: string | undefined = undefined;
    const titleShapeRegex = /<p:sp\b[\s\S]*?<\/p:sp>/gi;
    let shapeMatch;

    while ((shapeMatch = titleShapeRegex.exec(slideXml)) !== null) {
        const shapeXml = shapeMatch[0];
        if (/<p:ph\b[^>]*(type=["'](title|ctrTitle)["'])/i.test(shapeXml)) {
            const textMatch = shapeXml.match(/<a:t\b[^>]*>([\s\S]*?)<\/a:t>/gi);
            if (textMatch) {
                const extractedTitle = textMatch
                    .map(t => decodeXmlText(t.replace(/<\/?a:t\b[^>]*>/gi, '')))
                    .join(' ')
                    .trim();
                if (extractedTitle) {
                    title = extractedTitle;
                    break;
                }
            }
        }
    }

    // 3. Extract Tables
    const tables = extractTablesFromSlideXml(slideXml);

    // 4. Extract Paragraphs, Text Boxes, and Bullet Points (excluding text already extracted in tables)
    // Strip table tags temporarily so table text is not duplicated in paragraphs
    const xmlWithoutTables = slideXml.replace(/<a:tbl\b[\s\S]*?<\/a:tbl>/gi, '');
    const paragraphRegex = /<a:p\b[\s\S]*?<\/a:p>/gi;
    const paragraphLines: string[] = [];
    let pMatch;

    while ((pMatch = paragraphRegex.exec(xmlWithoutTables)) !== null) {
        const pXml = pMatch[0];
        const textRegex = /<a:t\b[^>]*>([\s\S]*?)<\/a:t>/gi;
        const pTexts: string[] = [];
        let tMatch;

        while ((tMatch = textRegex.exec(pXml)) !== null) {
            const text = decodeXmlText(tMatch[1]);
            if (text) pTexts.push(text);
        }

        const line = pTexts.join(' ').trim();
        if (line) {
            // Check paragraph bullet level
            const pPrMatch = pXml.match(/<a:pPr\b([^>]*)>/i);
            const lvl = pPrMatch ? getAttribute(pPrMatch[0], 'lvl') : null;
            if (lvl && parseInt(lvl) > 0) {
                const indent = '  '.repeat(parseInt(lvl));
                paragraphLines.push(`${indent}* ${line}`);
            } else if (/<a:bu\w+/i.test(pXml) || /<a:buChar\b/i.test(pXml) || /<a:buFont\b/i.test(pXml)) {
                paragraphLines.push(`* ${line}`);
            } else {
                paragraphLines.push(line);
            }
        }
    }

    // If title was not explicitly tagged with <p:ph type="title">, adopt the first non-bullet line as title
    if (!title && paragraphLines.length > 0 && !paragraphLines[0].startsWith('*')) {
        title = paragraphLines[0].substring(0, 80);
    }

    // Combine lines and tables
    const contentParts: string[] = [];
    if (paragraphLines.length > 0) {
        contentParts.push(paragraphLines.join('\n'));
    }
    if (tables.length > 0) {
        contentParts.push(tables.join('\n'));
    }
    if (hasImages) {
        contentParts.push('[Visual Asset: Embedded Diagram or Image present on slide — visual illustration not parsed into text]');
    }

    const content = contentParts.join('\n\n').trim();

    return {
        slideNumber,
        title,
        content: content || (hasImages ? '[Visual Asset: Image-only slide with no text content]' : '[Empty slide]'),
        hasImages
    };
}

/**
 * Parses modern PowerPoint presentation (.pptx) from buffer into structured slides and normalized text
 */
export async function parsePptxPresentation(buffer: Buffer): Promise<IParsedDocumentResult> {
    if (isEncryptedOfficeBuffer(buffer)) {
        throw new Error('Password-protected PPTX presentations are not supported. Please remove the password and re-upload.');
    }

    if (!isPptxBuffer(buffer)) {
        throw new Error('Invalid PPTX file: missing PK zip header or unsupported format.');
    }

    let zip: JSZip;
    try {
        zip = await JSZip.loadAsync(buffer);
    } catch (zipErr) {
        throw new Error(`Corrupted or unreadable PPTX archive: ${zipErr instanceof Error ? zipErr.message : 'Invalid zip data'}`);
    }

    // Verify this is indeed a PowerPoint presentation
    const presentationXmlFile = zip.file('ppt/presentation.xml');
    if (!presentationXmlFile) {
        throw new Error('Corrupted or invalid PPTX file: missing ppt/presentation.xml structure.');
    }

    const presentationXml = await presentationXmlFile.async('text');

    // 1. Resolve Slide Ordering from presentation.xml and presentation.xml.rels
    const slideOrderMap: string[] = [];
    const relsFile = zip.file('ppt/_rels/presentation.xml.rels');

    if (relsFile) {
        const relsXml = await relsFile.async('text');
        // Map rId to target slide path
        const rIdToTarget: Record<string, string> = {};
        const relRegex = /<Relationship\b([^>]+)\/>/gi;
        let relMatch;
        while ((relMatch = relRegex.exec(relsXml)) !== null) {
            const relStr = relMatch[1];
            const id = getAttribute(relStr, 'Id');
            const target = getAttribute(relStr, 'Target');
            const type = getAttribute(relStr, 'Type');
            if (id && target && (!type || type.includes('slide'))) {
                // target is usually slides/slide1.xml or /ppt/slides/slide1.xml
                const cleanTarget = target.replace(/^\/?(ppt\/)?/, 'ppt/');
                rIdToTarget[id] = cleanTarget;
            }
        }

        // Extract ordered rId references from <p:sldIdLst>
        const sldIdRegex = /<p:sldId\b([^>]+)\/?>/gi;
        let sldMatch;
        while ((sldMatch = sldIdRegex.exec(presentationXml)) !== null) {
            const sldStr = sldMatch[1];
            const rId = getAttribute(sldStr, 'r:id');
            if (rId && rIdToTarget[rId]) {
                slideOrderMap.push(rIdToTarget[rId]);
            }
        }
    }

    // Fallback: If relationship mapping yielded no slides, find all slide*.xml files and sort naturally
    if (slideOrderMap.length === 0) {
        const allSlideFiles = Object.keys(zip.files).filter(name => /^ppt\/slides\/slide\d+\.xml$/i.test(name));
        allSlideFiles.sort((a, b) => {
            const numA = parseInt(a.replace(/\D/g, '')) || 0;
            const numB = parseInt(b.replace(/\D/g, '')) || 0;
            return numA - numB;
        });
        slideOrderMap.push(...allSlideFiles);
    }

    if (slideOrderMap.length === 0) {
        throw new Error('The uploaded PPTX presentation contains 0 slides.');
    }

    // 2. Parse each slide in exact order
    const slides: IParsedSlide[] = [];
    let hasVisualAssetsOnlyWarning = false;
    let aggregatedText = '';

    for (let i = 0; i < slideOrderMap.length; i++) {
        const slidePath = slideOrderMap[i];
        const slideNumber = i + 1;
        const slideFile = zip.file(slidePath);

        if (!slideFile) continue;

        const slideXml = await slideFile.async('text');
        const parsedSlide = parseSingleSlideXml(slideXml, slideNumber);
        slides.push(parsedSlide);

        if (parsedSlide.hasImages) {
            hasVisualAssetsOnlyWarning = true;
        }

        aggregatedText += `\n--- Slide ${parsedSlide.slideNumber}${parsedSlide.title ? `: ${parsedSlide.title}` : ''} ---\n`;
        aggregatedText += parsedSlide.content + '\n';
    }

    const totalExtractableChars = slides.reduce((acc, s) => {
        const clean = s.content
            .replace(/\[Visual Asset:.*?\]/g, '')
            .replace(/\[Empty slide\]/g, '')
            .trim();
        return acc + clean.length;
    }, 0);

    if (slides.length === 0 || totalExtractableChars === 0) {
        throw new Error('The uploaded PPTX presentation is empty or contains no readable text.');
    }

    return {
        format: 'pptx',
        slideCount: slides.length,
        text: aggregatedText.trim(),
        slides,
        hasVisualAssetsOnlyWarning
    };
}
