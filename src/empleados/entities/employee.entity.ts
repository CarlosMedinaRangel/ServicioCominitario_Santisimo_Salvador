import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import { User } from '../../auth/entities/auth.entity';
import { Schedule } from './schedule.entity';
import { Group } from './group.entity';
import { Activity } from './activity.entity';

@Entity('employees')
export class Employee {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID del usuario (PK + FK → users.id)',
    uniqueItems: true,
  })
  @PrimaryColumn('uuid')
  userId!: string;

  @OneToOne(() => User, (user) => user.employee)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @ApiProperty({ example: 'Docente', description: 'Cargo del empleado' })
  @Column('varchar', { length: 100 })
  position!: string;

  @ApiProperty({ example: '2020-01-15', description: 'Fecha de inicio laboral' })
  @Column('date')
  start_date!: Date;

  @ApiProperty({ example: '08:00:00', description: 'Hora de entrada' })
  @Column('time')
  work_time!: string;

  @ApiProperty({ example: 8, description: 'Horas laborales por día' })
  @Column('int')
  hours_per_day!: number;

  @ApiProperty({ example: 'Lunes a Viernes, 8am - 4pm', description: 'Horario laboral' })
  @Column('varchar', { length: 100 })
  work_schedule!: string;

  @OneToMany(() => Schedule, (schedule) => schedule.employee)
  schedules?: Schedule[];

  @OneToMany(() => Group, (group) => group.employee)
  groups?: Group[];

  @OneToMany(() => Activity, (activity) => activity.employee)
  activities?: Activity[];
}
