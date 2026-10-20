import type { StyleDictionary } from 'pdfmake/build/pdfmake';

import { TDocumentDefinitions } from 'src/interfaces/pdfmake.interface';
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
    margin: [0, 25, 0, 25],
  },
  body: {
    alignment: 'justify',
    lineHeight: 1.35,
    fontSize: 11,
  },
  signature: {
    fontSize: 11,
    bold: true,
  },
};

interface ReportProps {
  employerName: string;
  employerPosition: string;
  employeeName: User['fullName'];
  employeeCedula: NonNullable<User['cedula']>;
  employeePosition: Employee['position'];
  employeeStartDate: Employee['start_date'];
  employeeHours: Employee['hours_per_day'];
  employeeWorkSchedule: Employee['work_schedule'];
  employerCompany: string;
  qrDataUrl?: string;
  verificationId?: DocumentVerification['id'];
}

export const employementLetterReportByID = (
  Props: ReportProps,
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
    qrDataUrl,
    verificationId,
  } = Props;

  const docDefinition: TDocumentDefinitions = {
    styles: styles,
    pageMargins: [40, 40, 40, 40],

    header: headerSection({ showLogo: true, ShowDate: true }),

    content: [
      {
        text: 'CONSTANCIA DE EMPLEO',
        style: 'header',
      },
      {
        text: [
          `Yo, `,
          { text: employerName, bold: true },
          `, en mi calidad de ${employerPosition} de ${employerCompany}, por medio de la presente certifico que `,
          { text: employeeName, bold: true },
          `, titular de la cédula de identidad Nº `,
          { text: employeeCedula, bold: true },
          `, labora en nuestra institución desde el `,
          { text: DateFormatter.getDDMMMMYYYY(new Date(employeeStartDate)), bold: true },
          `, desempeñando el cargo de `,
          { text: employeePosition, bold: true },
          `.`,
        ],
        style: 'body',
        margin: [0, 0, 0, 16],
      },
      {
        text: `La jornada laboral del Sr./Sra. ${employeeName} es de ${employeeHours} horas semanales, con un horario de ${employeeWorkSchedule}, cumpliendo a cabalidad con las políticas y procedimientos establecidos por la institución.`,
        style: 'body',
        margin: [0, 0, 0, 16],
      },
      {
        text: `Esta constancia se expide a solicitud de la parte interesada para los fines que considere convenientes.`,
        style: 'body',
        margin: [0, 0, 0, 40],
      },
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: 'Atentamente,', style: 'signature', margin: [0, 0, 0, 16] },
              { text: employerName, style: 'signature' },
              { text: employerPosition, fontSize: 10, italics: true },
              { text: employerCompany, fontSize: 10 },
              { text: DateFormatter.getDDMMMMYYYY(new Date()), fontSize: 9, color: '#64748b', margin: [0, 4, 0, 0] },
            ],
          },
          qrDataUrl
            ? {
                width: 140,
                alignment: 'center',
                stack: [
                  {
                    image: qrDataUrl,
                    width: 80,
                    height: 80,
                    alignment: 'center',
                  },
                  {
                    text: 'SELLO DIGITAL OFICIAL',
                    fontSize: 7,
                    bold: true,
                    alignment: 'center',
                    margin: [0, 4, 0, 1],
                    color: '#1e293b',
                  },
                  {
                    text: verificationId ? `ID: ${verificationId.slice(0, 8)}...` : 'Verificación Criptográfica',
                    fontSize: 6,
                    alignment: 'center',
                    color: '#64748b',
                  },
                  {
                    text: 'Escanear para verificar autenticidad',
                    fontSize: 6,
                    italics: true,
                    alignment: 'center',
                    color: '#475569',
                  },
                ],
              }
            : { width: 0, text: '' },
        ],
        margin: [0, 10, 0, 0],
      },
    ],
  };

  return docDefinition;
};
