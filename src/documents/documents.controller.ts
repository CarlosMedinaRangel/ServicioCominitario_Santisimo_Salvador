import {
  Controller,
  Post,
  Body,
  Patch,
  Param,
  Get,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { VerifyDocumentDto } from './dto/verify-document.dto';
import { Auth } from '../auth/Decorators/auth.decorator';
import { GetUser } from '../auth/Decorators/get-user.decorator';
import { ValidRoles } from '../auth/interfaces';
import { User } from '../auth/entities/auth.entity';
import { DocumentVerification, DocumentStatus, DocumentType } from './entities/document-verification.entity';

@ApiTags('Documents')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @HttpCode(HttpStatus.OK)
  @Post('verify')
  @Auth(ValidRoles.admin)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Verificar la autenticidad de un código QR físico/digital (Solo Administrador)',
    description:
      'Punto único de verificación administrativa. Recibe el código alfanumérico escaneado del sello QR (ej: SS-DOC:v1:...), lo descifra con AES-256-GCM, valida su firma y retorna los datos del documento verificado.',
  })
  @ApiBody({
    type: VerifyDocumentDto,
    description: 'Código escaneado desde el sello QR impreso',
    examples: {
      ejemplo: {
        summary: 'Código QR de ejemplo',
        value: {
          code: 'SS-DOC:v1:V9DC5RCUrTUdFG87.s7_Bb036ANw5jJfSqaCr8Q.EgxLbhCmKWbv3IgEr71jfavgTuUeuAw0tlQazSWwI6hbYc5RrGWIrXmIcFoeGg152J64u39RVhkYzHKnZJMFDFRdhGfkt-pPDEPfrA6cNUI1aKbw2yXNx2GL8VNjskh0AOCj1M7VjFRvbiY730qgkD_ZrHn9cr71OHNXGZGY205bJyxtgqnnoxIK212TKamlKl17m20kfJ1Ra93piAyl0ReZayW9E2rdQ7895_eT73LzLIfL',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Resultado de la verificación criptográfica del documento.',
  })
  @ApiResponse({
    status: 400,
    description: 'Código con formato inválido, manipulado o falsificado.',
  })
  verifyDocument(@Body() verifyDto: VerifyDocumentDto) {
    return this.documentsService.verifyDocument(verifyDto.code);
  }

  @Get('stats')
  @Auth(ValidRoles.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Estadísticas y conteo global de comprobantes emitidos (Solo Administrador)' })
  @ApiResponse({ status: 200, description: 'Totales de constancias emitidas, válidas y revocadas.' })
  getStats() {
    return this.documentsService.getStats();
  }

  @Get()
  @Auth(ValidRoles.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar todos los comprobantes emitidos con paginación y filtros (Solo Administrador)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'status', enum: DocumentStatus, required: false })
  @ApiQuery({ name: 'documentType', enum: DocumentType, required: false })
  @ApiQuery({ name: 'search', required: false, example: 'Carlos' })
  @ApiQuery({ name: 'from', required: false, example: '2026-01-01' })
  @ApiQuery({ name: 'to', required: false, example: '2026-12-31' })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: DocumentStatus,
    @Query('documentType') documentType?: DocumentType,
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const opts: any = { page, limit, status };
    if (documentType) opts.documentType = documentType;
    if (search) opts.search = search;
    if (from) opts.from = from;
    if (to) opts.to = to;
    return this.documentsService.findAll(opts);
  }

  @Patch(':id/revoke')
  @Auth(ValidRoles.admin)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Anular/Revocar un documento emitido (Solo Administrador)',
    description: 'Marca el estado del comprobante con UUID :id como REVOKED en la base de datos.',
  })
  @ApiResponse({
    status: 200,
    description: 'Documento revocado exitosamente.',
    type: DocumentVerification,
  })
  revokeDocument(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.revokeDocument(id);
  }

  @Get('recipient/:id')
  @Auth()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Listar documentos emitidos a un destinatario',
    description:
      'Devuelve el historial de constancias emitidas a un empleado o alumno. Un usuario regular solo puede consultar sus propios documentos; los administradores pueden consultar los de cualquier destinatario.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de comprobantes del destinatario.',
    type: [DocumentVerification],
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página (1-based)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Cantidad de registros por página' })
  @ApiQuery({ name: 'status', required: false, enum: DocumentStatus, description: 'Filtrar por estado del documento' })
  @ApiQuery({ name: 'documentType', required: false, enum: DocumentType, description: 'Filtrar por tipo de documento' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Filtrar por emisor / emitido por' })
  @ApiQuery({ name: 'from', required: false, type: String, description: 'Fecha inicio rango (ISO)' })
  @ApiQuery({ name: 'to', required: false, type: String, description: 'Fecha fin rango (ISO)' })
  findByRecipient(
    @Param('id') recipientId: string,
    @GetUser() user: User,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: DocumentStatus,
    @Query('documentType') documentType?: DocumentType,
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const isAdmin = user.roles?.includes(ValidRoles.admin);
    if (!isAdmin && user.id !== recipientId) {
      throw new ForbiddenException(
        'No tienes permisos para consultar documentos de otro destinatario.',
      );
    }
    const hasOptions =
      page !== undefined ||
      limit !== undefined ||
      status !== undefined ||
      documentType !== undefined ||
      search !== undefined ||
      from !== undefined ||
      to !== undefined;

    if (hasOptions) {
      return this.documentsService.findByRecipient(recipientId, {
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        status,
        documentType,
        search,
        from,
        to,
      });
    }

    return this.documentsService.findByRecipient(recipientId);
  }
}
