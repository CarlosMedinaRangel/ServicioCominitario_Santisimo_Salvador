import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Employee } from './employee.entity';
import { Schedule } from './schedule.entity';

@Entity('groups')
export class Group {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID único del grupo',
  })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ description: 'UUID del empleado al que pertenece el grupo' })
  @Column('uuid')
  employeeId!: string;

  @ManyToOne(() => Employee, (employee) => employee.groups)
  @JoinColumn({ name: 'employeeId' })
  employee?: Relation<Employee>;

  @ApiProperty({
    description: 'UUID del horario (clase) al que pertenece este grupo',
  })
  @Column('uuid', { nullable: true })
  scheduleId!: string;

  @ManyToOne(() => Schedule, (schedule) => schedule.groups)
  @JoinColumn({ name: 'scheduleId' })
  schedule?: Relation<Schedule>;

  @ApiProperty({ example: 'Grupo A-1', description: 'Nombre del grupo' })
  @Column('varchar', { length: 100 })
  nombre!: string;

  @ApiProperty({ example: 24, description: 'Cantidad de estudiantes' })
  @Column('int')
  cantidadEstudiantes!: number;
}
