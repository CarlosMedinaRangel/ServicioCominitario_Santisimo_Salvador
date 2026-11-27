import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Employee } from '../entities/employee.entity';
import { Activity } from '../entities/activity.entity';
import { User } from 'src/auth/entities/auth.entity';
import { PrinterService } from 'src/printer/printer.service';
import { DocumentsService } from 'src/documents/documents.service';
import { CryptoService } from 'src/crypto/crypto.service';
import { ActivityService } from '../activity-service/activity-service.service';
import {
  DocumentStatus,
  DocumentType,
  RecipientType,
} from 'src/documents/entities/document-verification.entity';
import { employementLetterReportByID } from 'src/reports/employementLetterByID.report';
import { constanciaMensualReport } from 'src/reports/constanciaMensual.report';

export interface ConstanciaOptions {
  month?: string;
  employerName?: string;
  employerPosition?: string;
  employerCompany?: string;
  documentId?: string;
  issuedByUser?: User;
}

@Injectable()
export class ConstanciaService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly printerService: PrinterService,
    private readonly documentsService: DocumentsService,
    private readonly cryptoService: CryptoService,
    private readonly activityService: ActivityService,
  ) {}

  private async findEmployee(id: string): Promise<Employee> {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let employee: Employee | null = null;

    if (uuidRegex.test(id)) {
      employee = await this.employeeRepository.findOne({
        where: { userId: id },
        relations: { user: true },
      });
    }

    if (!employee) {
      let cedulaLimpia = id.replace(/\./g, '').toUpperCase();
      if (!cedulaLimpia.startsWith('V')) {
        cedulaLimpia = 'V' + cedulaLimpia;
      }
      const user = await this.userRepository.findOneBy({
        cedula: cedulaLimpia,
      });
      if (user) {
        employee = await this.employeeRepository.findOne({
          where: { userId: user.id },
          relations: { user: true },
        });
      }
    }

    if (!employee) {
      throw new BadRequestException(`No hay empleado con este "${id}" ID`);
    }

    return employee;
  }

  private async resolveInstitutionalSignatories(): Promise<{
    director: { name: string; position: string };
    rector: { name: string; position: string };
  }> {
    const fallback = {
      director: { name: 'Prof. Sussy Margarita Morales', position: 'Directora' },
      rector: { name: 'Lcdo. Ronald Medina', position: 'Rector Administrativo' },
    };

    if (typeof this.employeeRepository.find !== 'function') {
      return fallback;
    }

    const candidates =
      (await this.employeeRepository.find({
        where: { user: { isActive: true } },
        relations: { user: true },
      })) || [];

    const directorEmp = candidates.find(
      (e) => /^director/i.test(e.position?.trim() || '') && e.user?.fullName,
    );
    const rectorEmp = candidates.find(
      (e) => /rector.*administrativ/i.test(e.position?.trim() || '') && e.user?.fullName,
    );

    return {
      director: directorEmp
        ? { name: directorEmp.user!.fullName, position: directorEmp.position }
        : fallback.director,
      rector: rectorEmp
        ? { name: rectorEmp.user!.fullName, position: rectorEmp.position }
        : fallback.rector,
    };
  }

  async ConstanciaEmpleadoByID(
    id: string,
    options?: ConstanciaOptions,
  ) {
    const employee = await this.findEmployee(id);
    const user = employee.user!;
    const { director, rector } = await this.resolveInstitutionalSignatories();

    const hasManualOverride = Boolean(options?.employerName);
    const employerName = options?.employerName || director.name;
    const employerPosition = options?.employerPosition || director.position;
    const secondarySignerName = hasManualOverride ? undefined : rector.name;
    const secondarySignerPosition = hasManualOverride ? undefined : rector.position;
    const employerCompany = options?.employerCompany || 'U.E. Colegio Santísimo Salvador';
    const issuedBySummary = hasManualOverride
      ? `${employerName} (${employerPosition})`
      : `${employerName} (${employerPosition}) / ${rector.name} (${rector.position})`;

    let docRecordId: string;
    let qrDataUrl: string;
    let effectiveIssueDate: Date | string;

    if (options?.documentId) {
      // 1. Reconstruir documento existente desde el registro criptográfico
      const existing = await this.documentsService.findOne(options.documentId);
      if (!existing) {
        throw new NotFoundException(
          `Documento con ID ${options.documentId} no encontrado.`,
        );
      }
      if (existing.status === DocumentStatus.REVOKED) {
        throw new BadRequestException(
          'No se puede generar la constancia de un documento revocado o anulado.',
        );
      }

      // 2. Desencriptar sello criptográfico AES-256-GCM para verificar integridad y extraer fecha inalterable
      const payload = this.cryptoService.decryptPayload(
        existing.verificationCode,
        'DOC',
      );
      effectiveIssueDate = payload.issuedAt || existing.issuedAt;

      // 3. Regenerar QR desde el sello existente sin duplicar registros en base de datos
      qrDataUrl = await this.documentsService.getQrDataUrl(
        existing.verificationCode,
      );
      docRecordId = existing.id;
    } else {
      // 1. Verificar si ya existe un documento VÁLIDO emitido para este empleado y período
      const existing =
        await this.documentsService.findValidByRecipientAndPeriod(
          employee.userId,
          DocumentType.CONSTANCIA_TRABAJO,
          options?.month,
        );

      if (existing) {
        // Reutilizar documento criptográfico existente para garantizar idempotencia y no duplicar registros
        const payload = this.cryptoService.decryptPayload(
          existing.verificationCode,
          'DOC',
        );
        effectiveIssueDate = payload.issuedAt || existing.issuedAt;
        qrDataUrl = await this.documentsService.getQrDataUrl(
          existing.verificationCode,
        );
        docRecordId = existing.id;
      } else {
        // Emisión de documento nuevo cuando no existe constancia previa para el período
        const firmantes = secondarySignerName && secondarySignerPosition
          ? [
              `${employerName} (${employerPosition})`,
              `${secondarySignerName} (${secondarySignerPosition})`,
            ]
          : [`${employerName} (${employerPosition})`];

        const issued = await this.documentsService.issueDocument({
          documentType: DocumentType.CONSTANCIA_TRABAJO,
          recipientType: RecipientType.EMPLOYEE,
          recipientId: employee.userId,
          recipientIdentifier: user.cedula || 'N/A',
          recipientName: user.fullName,
          issuedByUserId: options?.issuedByUser?.id,
          issuedByName: options?.issuedByUser?.fullName || issuedBySummary,
          metadata: {
            empresa: employerCompany,
            cargo: employee.position,
            horas: employee.hours_per_day,
            horario: employee.work_schedule,
            fechaInicio: employee.start_date,
            mes: options?.month || null,
            firmantes,
          },
        });
        docRecordId = issued.record.id;
        qrDataUrl = issued.qrDataUrl;
        effectiveIssueDate = issued.record.issuedAt;
      }
    }

    if (options?.month) {
      const [yearStr, monthStr] = options.month.split('-');
      const year = parseInt(yearStr, 10);
      const mes = parseInt(monthStr, 10);

      const startDate = new Date(year, mes - 1, 1);
      const endDate = new Date(year, mes, 0, 23, 59, 59);

      const activities =
        (await this.activityRepository.find({
          where: {
            employeeId: employee.userId,
            timestamp: Between(startDate, endDate),
          },
          order: { timestamp: 'DESC' },
        })) || [];

      const docDefinition = constanciaMensualReport({
        employerName,
        employerPosition,
        secondarySignerName,
        secondarySignerPosition,
        employerCompany,
        employeeName: user.fullName,
        employeeCedula: user.cedula || 'N/A',
        employeePosition: employee.position,
        employeeStartDate: employee.start_date,
        employeeHours: employee.hours_per_day,
        employeeWorkSchedule: employee.work_schedule,
        month: `${monthStr}-${yearStr}`,
        qrDataUrl,
        verificationId: docRecordId,
        activities: activities.map((a) => ({
          tipo: a.tipo,
          descripcion: a.descripcion,
          detalle: a.detalle,
          timestamp: a.timestamp,
        })),
      });

      const pdf = this.printerService.createPdf(docDefinition);
      void this.activityService.log(employee.userId, {
        tipo: 'Constancia Generada',
        descripcion: `Constancia mensual de ${monthStr}-${yearStr}`,
        detalle: `Firmada por ${issuedBySummary}`,
        destacada: true,
      });

      return pdf;
    }

    const docDefinition = employementLetterReportByID({
      employerName,
      employerPosition,
      secondarySignerName,
      secondarySignerPosition,
      employerCompany,
      employeeName: user.fullName,
      employeeCedula: user.cedula || 'N/A',
      employeePosition: employee.position,
      employeeStartDate: employee.start_date,
      employeeHours: employee.hours_per_day,
      employeeWorkSchedule: employee.work_schedule,
      qrDataUrl,
      verificationId: docRecordId,
      issueDate: effectiveIssueDate,
    });

    const pdf = this.printerService.createPdf(docDefinition);
    void this.activityService.log(employee.userId, {
      tipo: 'Constancia Generada',
      descripcion: 'Constancia de trabajo',
      detalle: `Firmada por ${issuedBySummary}`,
      destacada: true,
    });

    return pdf;
  }
}
