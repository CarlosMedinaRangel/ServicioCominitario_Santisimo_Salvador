import type { StyleDictionary } from 'pdfmake/build/pdfmake';
import type { TDocumentDefinitions } from 'src/interfaces/pdfmake.interface';
import { headerSection } from './sections/header.section';
import { DateFormatter } from 'src/helpers/date-formatter';

const styles: StyleDictionary = {
  header: {
    fontSize: 22,
    bold: true,
    alignment: 'center',
    margin: [0, 60, 0, 50],
  },
  subheader: {
    fontSize: 14,
    bold: true,
    margin: [0, 10, 0, 10],
  },
  body: {
    alignment: 'justify',
    margin: [0, 0, 0, 20],
  },
  tableHeader: {
    fontSize: 10,
    bold: true,
    fillColor: '#f3f4f6',
    margin: [0, 4, 0, 4],
  },
  tableCell: {
    fontSize: 9,
    margin: [0, 3, 0, 3],
  },
  signature: {
    fontSize: 14,
    bold: true,
  },
  footer: {
    fontSize: 10,
    italics: true,
    alignment: 'center',
    margin: [0, 0, 0, 20],
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
  employeeName: string;
  employeeCedula: string;
  employeePosition: string;
  employeeStartDate: Date;
  employeeHours: number;
  employeeWorkSchedule: string;
  employerCompany: string;
  month: string;
  activities: ActivityData[];
}

const monthsMap: Record<string, string> = {
  '01': 'enero', '02': 'febrero', '03': 'marzo', '04': 'abril',
  '05': 'mayo', '06': 'junio', '07': 'julio', '08': 'agosto',
  '09': 'septiembre', '10': 'octubre', '11': 'noviembre', '12': 'diciembre',
};

function formatMonth(monthStr: string): string {
  const [mes, year] = monthStr.split('-');
  return `${monthsMap[mes] || mes} de ${year}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export const constanciaMensualReport = (
  props: MonthlyReportProps,
): TDocumentDefinitions => {
  const {
    employeeName, employeeCedula, employeePosition, employeeHours,
    employeeStartDate, employeeWorkSchedule, employerCompany,
    employerName, employerPosition, month, activities,
  } = props;

  const activityRows = activities.map((a) => [
    { text: formatDate(a.timestamp), style: 'tableCell' },
    { text: a.tipo, style: 'tableCell' },
    { text: a.descripcion, style: 'tableCell' },
    { text: a.detalle, style: 'tableCell' },
  ]);

  const docDefinition: TDocumentDefinitions = {
    styles,
    pageMargins: [40, 60, 40, 60],
    header: headerSection({ showLogo: true, ShowDate: true }),
    content: [
      { text: 'CONSTANCIA DE TRABAJO MENSUAL', style: 'header' },
      {
        text: `Correspondiente al mes de ${formatMonth(month)}`,
        alignment: 'center',
        fontSize: 12,
        margin: [0, 0, 0, 30],
      },
      {
        text: [
          `Yo, ${employerName}, en mi calidad de ${employerPosition} de ${employerCompany}, por medio de la presente certifico que `,
          { text: `${employeeName}`, bold: true },
          `, portador de la cédula de identidad Nº ${employeeCedula}, ha laborado en nuestra institución desde el `,
          { text: `${DateFormatter.getDDMMMMYYYY(new Date(employeeStartDate))}`, bold: false },
          `, desempeñando el cargo de `,
          { text: `${employeePosition}`, bold: true },
          `, con una jornada de ${employeeHours} horas semanales, en horario de ${employeeWorkSchedule}.\n\n`,
          `Durante el mes de ${formatMonth(month)}, el empleado realizó las siguientes actividades:`,
        ],
        style: 'body',
      },
      activities.length > 0
        ? {
            table: {
              headerRows: 1,
              widths: ['25%', '20%', '30%', '25%'],
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
            margin: [0, 10, 0, 20],
          }
        : {
            text: 'No se registraron actividades para este periodo.',
            italics: true,
            margin: [0, 10, 0, 20],
          },
      {
        text: 'Se expide la presente constancia a solicitud del interesado para los fines que considere pertinentes.',
        style: 'body',
        margin: [0, 10, 0, 40],
      },
      { text: 'Atentamente,', style: 'signature' },
      { text: employerName, style: 'signature' },
      { text: employerPosition, style: 'signature' },
      { text: employerCompany, style: 'signature' },
      { text: DateFormatter.getDDMMMMYYYY(new Date()), style: 'signature' },
    ],
    footer: {
      text: 'Este documento es una constancia mensual de trabajo y no representa un compromiso laboral.',
      style: 'footer',
    },
  };

  return docDefinition;
};
