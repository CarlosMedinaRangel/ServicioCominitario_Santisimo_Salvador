import { Controller, Get, Param, Res } from '@nestjs/common';
import { BasicReportsService } from './basic-reports.service';
import type { Response } from 'express';

@Controller('basic-reports')
export class BasicReportsController {
  constructor(private readonly basicReportsService: BasicReportsService) {}

  @Get()
  async findOne(@Res() response: Response) {
    const pdfDoc = this.basicReportsService.hello();
    response.setHeader('Content-Type', 'application/pdf');
    pdfDoc.pipe(response);
    pdfDoc.end();
  }

  @Get('employement-letter/:id')
  async employementLetterByID(
    @Res() response: Response,
    @Param('id') id: string,
  ) {
    const pdfDoc = await this.basicReportsService.employementLetterByID(id);

    // Configura las cabeceras correctamente
    response.setHeader('Content-Type', 'application/pdf');
    pdfDoc.info.Title = 'employement-letter.pdf';
    pdfDoc.pipe(response);
    pdfDoc.end();
  }
}
