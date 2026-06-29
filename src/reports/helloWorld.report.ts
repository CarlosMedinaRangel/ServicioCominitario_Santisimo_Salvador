import type {
  TDocumentDefinitions,
  BufferOptions,
} from 'pdfmake/build/pdfmake';

interface ReportOptions {
  name: string;
}

export const getHelloWorldReport = ({
  name,
}: ReportOptions): TDocumentDefinitions => {
  const docDefinition: TDocumentDefinitions = {
    content: [{ text: `Hola ${name}`, style: 'header' }],
    styles: {
      header: { fontSize: 18, bold: true },
    },
  };

  return docDefinition;
};
