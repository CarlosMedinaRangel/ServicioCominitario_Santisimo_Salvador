import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Activity } from '../entities/activity.entity';
import { Employee } from '../entities/employee.entity';

export interface LogActivityInput {
  tipo: string;
  descripcion: string;
  detalle: string;
  destacada?: boolean;
}
@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  // userId del User — si no tiene empleado (ej. admin), se omite silenciosamente
  async log(userId: string, input: LogActivityInput): Promise<void> {
    try {
      const employee = await this.employeeRepository.findOneBy({ userId });
      if (!employee) return;

      await this.activityRepository.save(
        this.activityRepository.create({
          employeeId: employee.userId,
          tipo: input.tipo,
          descripcion: input.descripcion,
          detalle: input.detalle,
          destacada: input.destacada ?? false,
          timestamp: new Date(),
        }),
      );
    } catch {
      // El log nunca debe romper la operación principal
    }
  }

  // Para loguear varios cambios en una sola llamada
  async logMany(userId: string, inputs: LogActivityInput[]): Promise<void> {
    await Promise.all(inputs.map((input) => this.log(userId, input)));
  }
}
