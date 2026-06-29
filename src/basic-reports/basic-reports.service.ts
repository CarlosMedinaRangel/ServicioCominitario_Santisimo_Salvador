import { BadRequestException, Injectable } from '@nestjs/common';
import { EmpleadosService } from 'src/empleados/empleados.service';

import PDFprinter from 'pdfmake';
import { TDocumentDefinitions } from 'src/interfaces/pdfmake.interface';
import { PrinterService } from 'src/printer/printer.service';
import { getHelloWorldReport } from 'src/reports/helloWorld.report';
import { employementLetterReportByID } from 'src/reports/employementLetterByID.report';

const fonts = {
  Roboto: {
    normal: 'fonts/GoogleSans-Regular.ttf',
    bold: 'fonts/GoogleSans-Bold.ttf',
    italics: 'fonts/GoogleSans-Italic.ttf',
    bolditalics: 'fonts/GoogleSans-BoldItalic.ttf',
  },
};

@Injectable()
export class BasicReportsService {
  constructor(
    private readonly EmpleadoService: EmpleadosService,

    private readonly PrinterService: PrinterService,
  ) {}
  //

  hello() {
    const docDefinitions: TDocumentDefinitions = getHelloWorldReport({
      name: 'carlos',
    });

    const doc = this.PrinterService.createPdf(docDefinitions);

    return doc;
  }

  async employementLetterByID(id: string) {
    const employee = await this.EmpleadoService.findOne(id);

    if (!employee) {
      throw new BadRequestException(`No hay ningun empleado con este id ${id}`);
    }

    console.log(employee);
    const docDefinition = employementLetterReportByID({
      employerName: 'Carlos Medina',
      employerPosition: 'Director',
      employerCompany: 'Santisimo Salvador',
      employeeName: employee.name,
      employeeCedula: employee.cedula,
      employeePosition: employee.position,
      employeeStartDate: employee.start_date,
      employeeHours: employee.hours_per_day,
      employeeWorkSchedule: employee.work_schedule,
    });

    return this.PrinterService.createPdf(docDefinition);
  }
}
