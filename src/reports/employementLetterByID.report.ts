import type { StyleDictionary } from 'pdfmake/build/pdfmake';

import { TDocumentDefinitions } from 'src/interfaces/pdfmake.interface';
import { headerSection } from './sections/header.section';
import { DateFormatter } from 'src/helpers/date-formatter';

const styles: StyleDictionary = {
  header: {
    fontSize: 22,
    bold: true,
    alignment: 'center',
    margin: [0, 60, 0, 50], //IZQUIERDA ARRIBA DERECHA  ABAJO
  },
  body: {
    alignment: `justify`,
    margin: [0, 0, 0, 70],
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

interface ReportProps {
  employerName: string;
  employerPosition: string;
  employeeName: string;
  employeeCedula: string;
  employeePosition: string;
  employeeStartDate: Date;
  employeeHours: number;
  employeeWorkSchedule: string;
  employerCompany: string;
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
  } = Props;
  const docDefinition: TDocumentDefinitions = {
    styles: styles,
    pageMargins: [40, 60, 40, 60],

    header: headerSection({ showLogo: true, ShowDate: true }),

    content: [
      {
        text: 'CONSTANCIA DE EMPLEO',
        style: 'header',
      },
      {
        text: `Yo, ${employerName}, en mi calidad de ${employerPosition} de ${employerCompany},por medio de la presente certifico que ${employeeName} ha sido empleado en nuestra empresa desde el ${employeeStartDate}.\n
                Durante su empleo, el Sr./Sra. ${employeeName}  de cedula de identidad ${employeeCedula} ha desempeñado el cargo de ${employeePosition}, demostrando responsabilidad, compromiso y habilidades profesionales en sus
                labores.\n
                La jornada laboral del Sr./ Sra. ${employeeName} es de ${employeeHours} horas semanales, con un horario de ${employeeWorkSchedule}, cumpliendo con las políticas y procedimientos establecidos por la empresa.\m
                Esta constancia se expide a solicitud del interesado para los fines que considere conveniente.\n`,

        style: `body`,
      },
      { text: `Atentamente`, style: 'signature' },

      { text: `${employerName}`, style: 'signature' },
      { text: `${employerPosition}`, style: 'signature' },
      { text: `${employerCompany}`, style: 'signature' },
      { text: DateFormatter.getDDMMMMYYYY(new Date()), style: 'signature' },
    ],

    footer: {
      text: 'Este documento es una constancia de empleo y no representa un compromiso laboral.',
      style: `footer`,
    },
  };

  return docDefinition;
};
