import { BadRequestException, Injectable } from '@nestjs/common';
import { EmpleadosService } from 'src/empleados/empleados.service';
import { PrinterService } from 'src/printer/printer.service';
import { TDocumentDefinitions } from 'src/interfaces/pdfmake.interface';
import { getHelloWorldReport } from 'src/reports/helloWorld.report';
import { employementLetterReportByID } from 'src/reports/employementLetterByID.report';
import { DocumentsService } from 'src/documents/documents.service';
import { DocumentType, RecipientType } from 'src/documents/entities/document-verification.entity';

@Injectable()
export class BasicReportsService {
  constructor(
    private readonly EmpleadoService: EmpleadosService,
    private readonly PrinterService: PrinterService,
    private readonly documentsService: DocumentsService,
  ) {}

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

    const user = employee.user;
    const employerName = 'Carlos Medina';
    const employerPosition = 'Director';
    const employerCompany = 'Santisimo Salvador';

    // Issue cryptographic verification record and QR
    const { record: docRecord, qrDataUrl } =
      await this.documentsService.issueDocument({
        documentType: DocumentType.CONSTANCIA_TRABAJO,
        recipientType: RecipientType.EMPLOYEE,
        recipientId: employee.userId,
        recipientIdentifier: user.cedula || 'N/A',
        recipientName: user.fullName,
        issuedByName: `${employerName} (${employerPosition})`,
        metadata: {
          empresa: employerCompany,
          cargo: employee.position,
          horas: employee.hours_per_day,
          horario: employee.work_schedule,
          fechaInicio: employee.start_date,
        },
      });

    const docDefinition = employementLetterReportByID({
      employerName,
      employerPosition,
      employerCompany,
      employeeName: user.fullName,
      employeeCedula: user.cedula || 'N/A',
      employeePosition: employee.position,
      employeeStartDate: employee.start_date,
      employeeHours: employee.hours_per_day,
      employeeWorkSchedule: employee.work_schedule,
      qrDataUrl,
      verificationId: docRecord.id,
    });

    return this.PrinterService.createPdf(docDefinition);
  }
}
