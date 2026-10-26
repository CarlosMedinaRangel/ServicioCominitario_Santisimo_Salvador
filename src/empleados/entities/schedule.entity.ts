import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Employee } from './employee.entity';
import { Group } from './group.entity';

@Entity('schedules')
export class Schedule {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID único del horario',
  })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ description: 'UUID del empleado' })
  @Column('uuid')
  employeeId!: string;

  @ManyToOne(() => Employee, (employee) => employee.schedules)
  @JoinColumn({ name: 'employeeId' })
  employee?: Relation<Employee>;

  @OneToMany(() => Group, (group) => group.schedule)
  groups?: Relation<Group>[];

  @ApiProperty({
    example: 'Biología Molecular III',
    description: 'Nombre de la clase',
  })
  @Column('varchar', { length: 200 })
  nombre!: string;

  @ApiProperty({ example: 'Lab 402', description: 'Aula o laboratorio' })
  @Column('varchar', { length: 100 })
  aula!: string;

  @ApiProperty({ example: '09:00', description: 'Hora de inicio' })
  @Column('time')
  horaInicio!: string;

  @ApiProperty({ example: '11:30', description: 'Hora de fin' })
  @Column('time')
  horaFin!: string;

  @ApiProperty({
    example: ['Lunes', 'Miércoles'],
    description: 'Días de la semana',
  })
  @Column('simple-json', { nullable: true })
  dias!: string[];

  @ApiProperty({ example: 'flask', description: 'Ícono representativo' })
  @Column('varchar', { length: 50 })
  icono!: string;

  @ApiProperty({
    example: true,
    description: 'Indica si la clase está activa',
    default: true,
  })
  @Column('boolean', { default: true })
  activa!: boolean;
}
