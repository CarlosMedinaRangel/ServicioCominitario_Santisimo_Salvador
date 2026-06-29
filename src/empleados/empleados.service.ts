import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateEmpleadoDto } from './dto/create-empleado.dto';
import { UpdateEmpleadoDto } from './dto/update-empleado.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Empleado } from './entities/empleado.entity';
import { IErrorsTypeORM } from 'src/interfaces/error.response';
import { PrinterService } from 'src/printer/printer.service';
import { employementLetterReportByID } from 'src/reports/employementLetterByID.report';

@Injectable()
export class EmpleadosService {
  private readonly logger = new Logger('EmpleadosService');

  constructor(
    @InjectRepository(Empleado)
    private readonly EmpleadoRepository: Repository<Empleado>,
    private readonly PrinterService: PrinterService,
  ) {}
  async create(createEmpleadoDto: CreateEmpleadoDto) {
    try {
      const empleado = this.EmpleadoRepository.create(createEmpleadoDto);
      await this.EmpleadoRepository.save(empleado);

      return empleado;
    } catch (error: any) {
      this.handleExceptions(error);
    }
  }

  async findAll() {
    const empleados = await this.EmpleadoRepository.find({});
    return empleados;
  }

  async findOne(id: string) {
    let empleado: Empleado | null = null;

    if (!isNaN(+id)) {
      empleado = await this.EmpleadoRepository.findOneBy({ id: +id });
    } else {
      const queryBuilder = this.EmpleadoRepository.createQueryBuilder();

      empleado = await queryBuilder
        .where(`UPPER(name) =:name`, {
          name: id.toUpperCase(),
        })
        .getOne();
    }

    if (!empleado) {
      const queryBuilder = this.EmpleadoRepository.createQueryBuilder();
      let cedulaLimpia = id.replace(/\./g, '');
      cedulaLimpia = cedulaLimpia.toUpperCase();
      if (!cedulaLimpia.startsWith('V')) {
        cedulaLimpia = 'V' + cedulaLimpia;
      }

      empleado = await queryBuilder
        .where(`"cedula" =:term`, {
          term: cedulaLimpia,
        })
        .getOne();
    }

    if (!empleado)
      throw new BadRequestException(`No hay empleado con este "${id}" ID`);

    return empleado;
  }

  async ConstanciaEmpleadoByID(id: string) {
    const employee = await this.findOne(id);

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

  async update(id: string, updateEmpleadoDto: UpdateEmpleadoDto) {
    const empelado = await this.EmpleadoRepository.preload({
      id: +id,
      ...updateEmpleadoDto,
    });

    if (!empelado) {
      throw new NotFoundException(`El empleado con el id ${id} no se encontró`);
    }

    try {
      const result = await this.EmpleadoRepository.save(empelado);
      return result;
    } catch (error: any) {
      this.handleExceptions(error);
    }
  }

  async remove(id: string) {
    const empleado = await this.findOne(id);

    if (!empleado) {
      throw new BadRequestException(
        `No existe ningun  empleado con el termino proporcionado "${id}" `,
      );
    }

    try {
      const result = await this.EmpleadoRepository.remove(empleado);
      return `Eliminado`;
    } catch (error: any) {
      this.handleExceptions(error);
    }
  }

  private handleExceptions(error: IErrorsTypeORM) {
    if (error.code === '23505') throw new BadRequestException(error.detail);
    this.logger.error(error);
    throw new InternalServerErrorException('Revisar el LOG');
  }
}
