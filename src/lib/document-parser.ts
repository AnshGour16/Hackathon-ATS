import path from 'path';
import { parsePdfPresentation, isPdfBuffer, isPdfEncrypted, IParsedDocumentResult } from './pdf-parser';
import { parsePptxPresentation, isPptxBuffer, isEncryptedOfficeBuffer } from './pptx-parser';
import { parsePptPresentation, isPptBuffer } from './ppt-parser';

export const MAX_PRESENTATION_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

export type SupportedPresentationFormat = 'pdf' | 'pptx' | 'ppt';

/**
 * Detects the presentation format by inspecting magic bytes
 */
export function detectPresentationFormat(buffer: Buffer): SupportedPresentationFormat | null {
    if (!buffer || buffer.length < 4) return null;

    if (isPdfBuffer(buffer)) {
        return 'pdf';
    }

    if (isPptxBuffer(buffer)) {
        return 'pptx';
    }

    if (isPptBuffer(buffer)) {
        // If it starts with OLE header, check whether it is an encrypted OOXML (.pptx) or legacy PPT
        if (isEncryptedOfficeBuffer(buffer)) {
            return 'pptx';
        }
        return 'ppt';
    }

    return null;
}

/**
 * Unified presentation parser that validates, securely detects format, and extracts structured text
 */
export async function parsePresentationDocument(
    buffer: Buffer,
    filename: string
): Promise<IParsedDocumentResult> {
    // 1. File Size Verification
    if (!buffer || buffer.length === 0) {
        throw new Error('The uploaded file is empty (0 bytes).');
    }

    if (buffer.length > MAX_PRESENTATION_FILE_SIZE) {
        throw new Error(`File size (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds the maximum allowed limit of 25 MB.`);
    }

    // 2. Extension Verification
    const ext = path.extname(filename).toLowerCase().replace('.', '');
    const validExtensions = ['pdf', 'pptx', 'ppt'];

    if (!validExtensions.includes(ext)) {
        throw new Error(
            `Unsupported file format ".${ext || 'unknown'}". Please upload a presentation in PDF (.pdf), PowerPoint (.pptx), or legacy PowerPoint (.ppt) format.`
        );
    }

    // 3. Security & Encryption Pre-checks
    if (isPdfEncrypted(buffer)) {
        throw new Error('Password-protected PDF documents are not supported. Please remove password protection and re-upload.');
    }
    if (isEncryptedOfficeBuffer(buffer)) {
        throw new Error('Password-protected PowerPoint presentations are not supported. Please remove the password and re-upload.');
    }

    // 4. Magic Bytes Content Inspection
    const detectedFormat = detectPresentationFormat(buffer);

    if (!detectedFormat) {
        throw new Error(
            `Invalid presentation file. The file contents do not match a valid PDF, PPTX, or PPT presentation.`
        );
    }

    // Check extension vs signature consistency
    if (ext === 'pdf' && detectedFormat !== 'pdf') {
        throw new Error('File content mismatch: The uploaded file has a .pdf extension but is not a valid PDF document.');
    }
    if (ext === 'pptx' && detectedFormat !== 'pptx') {
        throw new Error('File content mismatch: The uploaded file has a .pptx extension but is not a valid PPTX presentation.');
    }
    if (ext === 'ppt' && detectedFormat !== 'ppt') {
        throw new Error('File content mismatch: The uploaded file has a .ppt extension but is not a valid legacy PPT presentation.');
    }

    // 4. Delegate to the specialized format parser
    let parseResult: IParsedDocumentResult;

    switch (detectedFormat) {
        case 'pdf':
            parseResult = await parsePdfPresentation(buffer);
            break;
        case 'pptx':
            parseResult = await parsePptxPresentation(buffer);
            break;
        case 'ppt':
            parseResult = await parsePptPresentation(buffer);
            break;
        default:
            throw new Error(`Unsupported presentation format: ${detectedFormat}`);
    }

    // 5. Build Normalized Gemini Prompt Context
    // We clearly disclose extraction methodology and flag visual assets
    let normalizedHeader = `=== PRESENTATION METADATA ===\n`;
    normalizedHeader += `Document Format: ${parseResult.format.toUpperCase()}\n`;
    normalizedHeader += `Total Slide Count: ${parseResult.slideCount}\n`;
    if (parseResult.hasVisualAssetsOnlyWarning) {
        normalizedHeader += `Visual Elements: Slide deck contains embedded images, diagrams, or charts. Note: Only text has been extracted; visual assets have been flagged for judge review.\n`;
    }
    normalizedHeader += `=============================\n\n`;

    parseResult.text = normalizedHeader + parseResult.text;

    return parseResult;
}

export { extractTextFromPDF } from './pdf-parser';
