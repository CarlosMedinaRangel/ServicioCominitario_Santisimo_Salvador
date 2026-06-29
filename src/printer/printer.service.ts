import { Injectable } from '@nestjs/common';
import PdfPrinter from 'pdfmake';
import { TDocumentDefinitions, BufferOptions } from 'pdfmake/build/pdfmake';
import * as PDFKit from 'pdfkit';

const fonts = {
  Roboto: {
    normal: 'fonts/GoogleSans-Regular.ttf',
    bold: 'fonts/GoogleSans-Bold.ttf',
    italics: 'fonts/GoogleSans-Italic.ttf',
    bolditalics: 'fonts/GoogleSans-BoldItalic.ttf',
  },
};
@Injectable()
export class PrinterService {
  private printer = new PdfPrinter(fonts);

  createPdf(
    docDefinition: TDocumentDefinitions,
    options: BufferOptions = {},
  ): PDFKit.PDFDocument {
    return this.printer.createPdfKitDocument(docDefinition, options);
  }
}
