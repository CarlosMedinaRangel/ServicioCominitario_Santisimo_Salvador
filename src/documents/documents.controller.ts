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
import { ValidRoles } from '../auth/interfaces';
import { DocumentVerification, DocumentStatus } from './entities/document-verification.entity';

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
  @ApiOperation({ summary: 'Listar todos los comprobantes emitidos con paginación (Solo Administrador)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'status', enum: DocumentStatus, required: false })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: DocumentStatus,
  ) {
    return this.documentsService.findAll({ page, limit, status });
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
  @Auth(ValidRoles.admin)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Listar documentos emitidos a un destinatario (Solo Administrador)',
    description: 'Devuelve todo el historial de constancias emitidas a un empleado o alumno.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de comprobantes del destinatario.',
    type: [DocumentVerification],
  })
  findByRecipient(@Param('id') recipientId: string) {
    return this.documentsService.findByRecipient(recipientId);
  }
}
