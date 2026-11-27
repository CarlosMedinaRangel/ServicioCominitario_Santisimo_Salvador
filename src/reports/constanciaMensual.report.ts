import type { StyleDictionary } from 'pdfmake/build/pdfmake';
import type { TDocumentDefinitions } from 'src/interfaces/pdfmake.interface';
import { headerSection } from './sections/header.section';
import { DateFormatter } from 'src/helpers/date-formatter';
import { User } from 'src/auth/entities/auth.entity';
import { Employee } from 'src/empleados/entities/employee.entity';
import { DocumentVerification } from 'src/documents/entities/document-verification.entity';

const styles: StyleDictionary = {
  header: {
    fontSize: 20,
    bold: true,
    alignment: 'center',
    margin: [0, 30, 0, 10],
  },
  subheader: {
    fontSize: 12,
    alignment: 'center',
    margin: [0, 0, 0, 20],
    color: '#475569',
  },
  body: {
    alignment: 'justify',
    margin: [0, 0, 0, 15],
    lineHeight: 1.25,
  },
  tableHeader: {
    fontSize: 9,
    bold: true,
    fillColor: '#f1f5f9',
    margin: [0, 4, 0, 4],
    color: '#1e293b',
  },
  tableCell: {
    fontSize: 8,
    margin: [0, 3, 0, 3],
  },
  signature: {
    fontSize: 11,
    bold: true,
  },
  footer: {
    fontSize: 8,
    italics: true,
    alignment: 'center',
    margin: [0, 0, 0, 10],
  },
};

interface ActivityData {
  tipo: string;
  descripcion: string;
  detalle: string;
  timestamp: Date;
}

interface MonthlyReportProps {
  employerName: string;
  employerPosition: string;
  secondarySignerName?: string;
  secondarySignerPosition?: string;
  employeeName: User['fullName'];
  employeeCedula: NonNullable<User['cedula']>;
  employeePosition: Employee['position'];
  employeeStartDate: Employee['start_date'];
  employeeHours: Employee['hours_per_day'];
  employeeWorkSchedule: Employee['work_schedule'];
  employerCompany: string;
  month: string;
  activities: ActivityData[];
  qrDataUrl?: string;
  verificationId?: DocumentVerification['id'];
}

const monthsMap: Record<string, string> = {
  '01': 'enero',
  '02': 'febrero',
  '03': 'marzo',
  '04': 'abril',
  '05': 'mayo',
  '06': 'junio',
  '07': 'julio',
  '08': 'agosto',
  '09': 'septiembre',
  '10': 'octubre',
  '11': 'noviembre',
  '12': 'diciembre',
};

function formatMonth(monthStr: string): string {
  const [mes, year] = monthStr.split('-');
  return `${monthsMap[mes] || mes} de ${year}`;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export const constanciaMensualReport = (
  props: MonthlyReportProps,
): TDocumentDefinitions => {
  const {
    employeeName,
    employeeCedula,
    employeePosition,
    employeeHours,
    employeeStartDate,
    employeeWorkSchedule,
    employerCompany,
    employerName,
    employerPosition,
    secondarySignerName,
    secondarySignerPosition,
    month,
    activities,
    qrDataUrl,
    verificationId,
  } = props;

  const activityRows = activities.map((a) => [
    { text: formatDate(a.timestamp), style: 'tableCell' },
    { text: a.tipo, style: 'tableCell' },
    { text: a.descripcion, style: 'tableCell' },
    { text: a.detalle || '-', style: 'tableCell' },
  ]);

  const formattedCedula = DateFormatter.formatCedulaHyphen(employeeCedula);
  const documentTitle = `Constancia de Trabajo Mensual (${DateFormatter.getDDMMMMYYYY(new Date())}) - ${employeeName} ${formattedCedula}`.trim();

  const docDefinition: TDocumentDefinitions = {
    info: {
      title: documentTitle,
      author: employerCompany,
      subject: `Constancia de Trabajo Mensual para ${employeeName} (${formattedCedula})`,
    },
    styles,
    pageMargins: [40, 45, 40, 45],
    header: headerSection({ showLogo: true, ShowDate: true, horizontalMargin: 40 }),
    content: [
      { text: 'CONSTANCIA DE TRABAJO MENSUAL', style: 'header' },
      {
        text: `Correspondiente al mes de ${formatMonth(month)}`,
        style: 'subheader',
      },
      {
        text: secondarySignerName && secondarySignerPosition
          ? [
              'Quienes suscriben, ',
              { text: employerName, bold: true },
              ` (${employerPosition}) y `,
              { text: secondarySignerName, bold: true },
              ` (${secondarySignerPosition}) de ${employerCompany}, por medio de la presente certifican que `,
              { text: `${employeeName}`, bold: true },
              `, portador de la cédula de identidad Nº ${employeeCedula}, ha laborado en nuestra institución desde el `,
              { text: `${DateFormatter.getDDMMMMYYYY(new Date(employeeStartDate))}` },
              ', desempeñando el cargo de ',
              { text: `${employeePosition}`, bold: true },
              `, con una jornada de ${employeeHours} horas semanales, en horario de ${employeeWorkSchedule}.\n\n`,
            ]
          : [
              'Yo, ',
              { text: employerName, bold: true },
              `, en mi calidad de ${employerPosition} de ${employerCompany}, por medio de la presente certifico que `,
              { text: `${employeeName}`, bold: true },
              `, portador de la cédula de identidad Nº ${employeeCedula}, ha laborado en nuestra institución desde el `,
              { text: `${DateFormatter.getDDMMMMYYYY(new Date(employeeStartDate))}` },
              ', desempeñando el cargo de ',
              { text: `${employeePosition}`, bold: true },
              `, con una jornada de ${employeeHours} horas semanales, en horario de ${employeeWorkSchedule}.\n\n`,
            ],
        style: 'body',
      },
      /* =========================================================================
       * AI_PRESERVE_FEATURE: Monthly Activities Breakdown Table
       * DO NOT DELETE OR STRIP THIS COMMENT BLOCK.
       * 
       * Kept in reserve while historical monthly activity recording is being fully fledged out.
       * When ready to display detailed monthly activity logs on the printed letter, uncomment this block:
       *
      activities.length > 0
        ? {
            table: {
              headerRows: 1,
              widths: ['15%', '20%', '35%', '30%'],
              body: [
                [
                  { text: 'Fecha', style: 'tableHeader' },
                  { text: 'Tipo', style: 'tableHeader' },
                  { text: 'Descripción', style: 'tableHeader' },
                  { text: 'Detalle', style: 'tableHeader' },
                ],
                ...activityRows,
              ],
            },
            layout: 'lightHorizontalLines',
            margin: [0, 5, 0, 15],
          }
        : {
            text: 'No se registraron actividades especiales para este periodo.',
            italics: true,
            margin: [0, 5, 0, 15],
          },
       * ========================================================================= */
      {
        text: 'Se expide la presente constancia a solicitud de la parte interesada para los fines que considere pertinentes.',
        style: 'body',
        margin: [0, 5, 0, 10],
      },
      {
        text: 'Atentamente,',
        style: 'signature',
        margin: [0, 4, 0, 150],
      },
      secondarySignerName && secondarySignerPosition
        ? {
            columns: [
              {
                width: '45%',
                stack: [
                  {
                    canvas: [
                      { type: 'line', x1: 0, y1: 0, x2: 195, y2: 0, lineWidth: 0.8, lineColor: '#334155' },
                    ],
                    margin: [0, 0, 0, 5],
                  },
                  { text: employerName, style: 'signature', fontSize: 10 },
                  { text: employerPosition, fontSize: 9, italics: true },
                  { text: employerCompany, fontSize: 8 },
                ],
              },
              { width: '10%', text: '' },
              {
                width: '45%',
                stack: [
                  {
                    canvas: [
                      { type: 'line', x1: 0, y1: 0, x2: 195, y2: 0, lineWidth: 0.8, lineColor: '#334155' },
                    ],
                    margin: [0, 0, 0, 5],
                  },
                  { text: secondarySignerName, style: 'signature', fontSize: 10 },
                  { text: secondarySignerPosition, fontSize: 9, italics: true },
                  { text: employerCompany, fontSize: 8 },
                ],
              },
            ],
            margin: [0, 0, 0, 20],
          }
        : {
            stack: [
              {
                canvas: [
                  { type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 0.8, lineColor: '#334155' },
                ],
                margin: [0, 0, 0, 5],
              },
              { text: employerName, style: 'signature' },
              { text: employerPosition, fontSize: 9, italics: true },
              { text: employerCompany, fontSize: 9 },
            ],
            margin: [0, 0, 0, 20],
          },
      qrDataUrl
        ? {
            alignment: 'center',
            margin: [0, 6, 0, 0],
            stack: [
              {
                image: qrDataUrl,
                width: 138,
                height: 138,
                alignment: 'center',
              },
              {
                text: 'SELLO DIGITAL OFICIAL',
                fontSize: 8,
                bold: true,
                alignment: 'center',
                margin: [0, 5, 0, 2],
              },
              {
                text: 'Escanear para verificar autenticidad',
                fontSize: 7,
                italics: true,
                alignment: 'center',
                color: '#475569',
              },
            ],
          }
        : {
            text: `Emitido el ${DateFormatter.getDDMMMMYYYY(new Date())}`,
            fontSize: 8,
            color: '#64748b',
            alignment: 'center',
          },
    ],
    footer: {
      text: 'Este documento cuenta con un sello digital de autenticidad criptográfica verificable en el sistema de Santísimo Salvador.',
      style: 'footer',
    },
  };

  return docDefinition;
};
