// pdfmake.types.ts

export type PageSize =
  | '4A0'
  | '2A0'
  | 'A0'
  | 'A1'
  | 'A2'
  | 'A3'
  | 'A4'
  | 'A5'
  | 'A6'
  | 'A7'
  | 'A8'
  | 'A9'
  | 'A10'
  | 'B0'
  | 'B1'
  | 'B2'
  | 'B3'
  | 'B4'
  | 'B5'
  | 'B6'
  | 'B7'
  | 'B8'
  | 'B9'
  | 'B10'
  | 'C0'
  | 'C1'
  | 'C2'
  | 'C3'
  | 'C4'
  | 'C5'
  | 'C6'
  | 'C7'
  | 'C8'
  | 'C9'
  | 'C10'
  | 'EXECUTIVE'
  | 'FOLIO'
  | 'LEGAL'
  | 'LETTER'
  | 'TABLOID';

export type PageOrientation = 'portrait' | 'landscape';
export type Alignment = 'left' | 'right' | 'center' | 'justify';

// Los márgenes pueden ser un número (todos los lados), [horizontal, vertical] o [izq, arriba, der, abajo]
export type Margins =
  number | [number, number] | [number, number, number, number];

export interface Style {
  font?: string;
  fontSize?: number;
  bold?: boolean;
  italics?: boolean;
  alignment?: Alignment;
  color?: string;
  background?: string;
  margin?: Margins;
  fillColor?: string;
  lineHeight?: number;
  characterSpacing?: number;
  preserveLeadingSpaces?: boolean;
  style?: string | string[];
}

export interface ContentText extends Style {
  text: string | Content | Content[];
}

export interface ContentImage extends Style {
  image: string; // URL o Data URI (base64)
  width?: number;
  height?: number;
  fit?: [number, number];
  cover?: {
    width: number;
    height: number;
    valign?: 'top' | 'center' | 'bottom';
    align?: 'left' | 'center' | 'right';
  };
}

export interface ContentColumns extends Style {
  columns: Content[];
  columnGap?: number;
}

export interface ContentTable extends Style {
  table: {
    widths?: '*' | 'auto' | (string | number)[];
    heights?: number | number[] | ((row: number) => number);
    headerRows?: number;
    dontBreakRows?: boolean;
    keepWithHeaderRows?: number;
    // La tabla exige una matriz bidimensional estricta de Content
    body: Content[][];
  };
  layout?:
    | 'noBorders'
    | 'headerLineOnly'
    | 'lightHorizontalLines'
    | string
    | CustomTableLayout;
}

export interface CustomTableLayout {
  hLineWidth?: (i: number, node: any) => number;
  vLineWidth?: (i: number, node: any) => number;
  hLineColor?: (i: number, node: any) => string;
  vLineColor?: (i: number, node: any) => string;
  hLineStyle?: (
    i: number,
    node: any,
  ) => { dash: { length: number; space: number } } | null;
  vLineStyle?: (
    i: number,
    node: any,
  ) => { dash: { length: number; space: number } } | null;
  paddingLeft?: (i: number, node: any) => number;
  paddingRight?: (i: number, node: any) => number;
  paddingTop?: (i: number, node: any) => number;
  paddingBottom?: (i: number, node: any) => number;
  fillColor?: (
    rowIndex: number,
    node: any,
    columnIndex: number,
  ) => string | null;
}

export interface ContentList extends Style {
  ul?: Content[];
  ol?: Content[];
  type?:
    | 'square'
    | 'circle'
    | 'lower-alpha'
    | 'upper-alpha'
    | 'lower-roman'
    | 'upper-roman'
    | 'none';
  separator?: string | [string, string];
  start?: number;
}

export interface ContentSVG extends Style {
  svg: string;
  width?: number;
  height?: number;
  fit?: [number, number];
}

// Tipo recursivo que agrupa todo el contenido posible
export type Content =
  | string
  | ContentText
  | ContentImage
  | ContentColumns
  | ContentTable
  | ContentList
  | ContentSVG
  | Content[];

export interface DocumentMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
}

export interface TDocumentDefinitions {
  content: Content | Content[];
  styles?: Record<string, Style>;
  defaultStyle?: Style;
  pageSize?: PageSize | { width: number; height: number };
  pageOrientation?: PageOrientation;
  pageMargins?: Margins;
  header?:
    | Content
    | ((currentPage: number, pageCount: number, pageSize: any) => Content);
  footer?:
    | Content
    | ((currentPage: number, pageCount: number, pageSize: any) => Content);
  background?: Content | ((currentPage: number, pageSize: any) => Content);
  watermark?:
    | string
    | {
        text: string;
        color?: string;
        opacity?: number;
        bold?: boolean;
        italics?: boolean;
        fontSize?: number;
        angle?: number;
      };
  info?: DocumentMetadata;
}

// Interfaz para los métodos del lado del cliente / generador
export interface PdfDocumentGenerator {
  download(defaultFileName?: string, cb?: () => void): void;
  open(): void;
  print(): void;
  getBase64(cb: (data: string) => void): void;
  getBlob(cb: (data: Blob) => void): void;
  getBuffer(cb: (data: Buffer) => void): void;
}

export interface PdfMakeAPI {
  createPdf(documentDefinitions: TDocumentDefinitions): PdfDocumentGenerator;
  vfs: Record<string, string>;
  fonts: Record<
    string,
    { normal?: string; bold?: string; italics?: string; bolditalics?: string }
  >;
}
