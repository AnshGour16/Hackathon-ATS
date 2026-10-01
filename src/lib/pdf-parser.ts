import PDFParser from 'pdf2json';

/**
 * Extracts raw text from a PDF Buffer using pdf2json (Server-safe)
 * @param pdfBuffer The file buffer of the uploaded PDF
 * @returns The extracted text as a string
 */
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser(null, true);

    pdfParser.on('pdfParser_dataError', (errData: unknown) => {
      const parsedErr = errData as { parserError?: Error | string };
      const errorMessage =
        parsedErr?.parserError instanceof Error
          ? parsedErr.parserError.message
          : typeof parsedErr?.parserError === 'string'
          ? parsedErr.parserError
          : 'Failed to parse PDF';
      console.error('PDF Parse Error:', errorMessage);
      reject(new Error(errorMessage));
    });

    pdfParser.on('pdfParser_dataReady', () => {
      // pdf2json returns text when initialized with (null, 1)
      const rawText = pdfParser.getRawTextContent();
      resolve(rawText);
    });

    try {
      pdfParser.parseBuffer(pdfBuffer);
    } catch (e) {
      reject(e);
    }
  });
}
