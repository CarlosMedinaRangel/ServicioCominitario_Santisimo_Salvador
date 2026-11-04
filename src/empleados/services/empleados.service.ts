import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateEmpleadoDto } from '../dto/create-empleado.dto';
import { UpdateEmpleadoDto } from '../dto/update-empleado.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, ILike } from 'typeorm';
import { Employee } from '../entities/employee.entity';
import { Schedule } from '../entities/schedule.entity';
import { Group } from '../entities/group.entity';
import { Activity } from '../entities/activity.entity';
import { User } from 'src/auth/entities/auth.entity';
import { IErrorsTypeORM } from 'src/interfaces/error.response';
import { CryptoService } from 'src/crypto/crypto.service';
import {
  ActivityService,
  LogActivityInput,
} from '../activity-service/activity-service.service';

@Injectable()
export class EmpleadosService {
  private readonly logger = new Logger('EmpleadosService');

  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly cryptoService: CryptoService,
    private readonly dataSource: DataSource,
    private readonly activityService: ActivityService,
  ) {}

  async create(createEmpleadoDto: CreateEmpleadoDto) {
    const user = await this.userRepository.findOneBy({
      id: createEmpleadoDto.userId,
    });

    if (!user) {
      throw new BadRequestException(
        `No existe un usuario con id ${createEmpleadoDto.userId}`,
      );
    }

    return await this.dataSource.transaction(async (manager) => {
      // 1. Crear el empleado
      const employee = manager.create(Employee, {
        userId: user.id,
        position: createEmpleadoDto.position,
        start_date: new Date(createEmpleadoDto.start_date),
        work_time: createEmpleadoDto.work_time,
        hours_per_day: createEmpleadoDto.hours_per_day,
        work_schedule: createEmpleadoDto.work_schedule,
      });
      await manager.save(employee);

      if (createEmpleadoDto.schedules?.length) {
        for (const scheduleDto of createEmpleadoDto.schedules) {
          const { groups, ...scheduleData } = scheduleDto;

          const schedule = manager.create(Schedule, {
            ...scheduleData,
            employeeId: employee.userId,
          });
          await manager.save(schedule);

          if (groups?.length) {
            const newGroups = manager.create(
              Group,
              groups.map((g) => ({
                ...g,
                employeeId: employee.userId,
                scheduleId: schedule.id,
              })),
            );
            await manager.save(newGroups);
          }
        }
      }

      return manager.findOne(Employee, {
        where: { userId: employee.userId },
        relations: {
          user: true,
          schedules: {
            groups: true,
          },
        },
      });
    });
  }

  async findAll(
    status?: string,
    page?: number,
    limit?: number,
    search?: string,
    position?: string,
  ) {
    const baseUserWhere: any = {};
    if (status === 'inactive') {
      baseUserWhere.isActive = false;
    } else if (status !== 'all') {
      baseUserWhere.isActive = true;
    }

    let whereCondition: any;
    const trimmedSearch = search?.trim();

    if (trimmedSearch) {
      const cleanSearch = `%${trimmedSearch}%`;
      const isCedulaPattern =
        /^[VEJG]?[-.\s]*\d[\d.\s]*$/i.test(trimmedSearch);
      const rawDigits = trimmedSearch.replace(/\D/g, '');

      const positionFilter =
        position && position !== 'Todos' ? { position } : {};

      const searchConditions: any[] = [
        {
          ...positionFilter,
          user: { ...baseUserWhere, fullName: ILike(cleanSearch) },
        },
        {
          ...positionFilter,
          user: { ...baseUserWhere, email: ILike(cleanSearch) },
        },
      ];

      if (isCedulaPattern && rawDigits) {
        searchConditions.push(
          {
            ...positionFilter,
            user: { ...baseUserWhere, cedula: ILike(`%${rawDigits}%`) },
          },
          {
            ...positionFilter,
            user: { ...baseUserWhere, cedula: ILike(cleanSearch) },
          },
        );
      } else {
        searchConditions.push({
          ...positionFilter,
          user: { ...baseUserWhere, cedula: ILike(cleanSearch) },
        });
      }

      whereCondition = searchConditions;
    } else if (position && position !== 'Todos') {
      whereCondition = {
        position,
        ...(Object.keys(baseUserWhere).length > 0
          ? { user: baseUserWhere }
          : {}),
      };
    } else {
      whereCondition =
        Object.keys(baseUserWhere).length > 0 ? { user: baseUserWhere } : {};
    }

    // Modo paginado si se pasa 'page'
    if (page !== undefined && page !== null) {
      const pageNum = Math.max(1, Number(page) || 1);
      const limitNum = Math.max(1, Math.min(100, Number(limit) || 20));
      const skip = (pageNum - 1) * limitNum;

      const [data, total] = await this.employeeRepository.findAndCount({
        where: whereCondition,
        relations: { user: true },
        skip,
        take: limitNum,
      });

      return {
        data,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      };
    }

    // Modo array completo (retrocompatible con frontend actual)
    return this.employeeRepository.find({
      where: whereCondition,
      relations: { user: true },
    });
  }

  async getCounts() {
    const total = await this.employeeRepository.count();
    const active = await this.employeeRepository.count({
      where: { user: { isActive: true } },
    });
    const inactive = await this.employeeRepository.count({
      where: { user: { isActive: false } },
    });

    return { total, active, inactive };
  }

  async findOne(id: string) {
    let employee: Employee | null = null;

    // Try UUID format (userId)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(id)) {
      employee = await this.employeeRepository.findOne({
        where: { userId: id },
        relations: {
          user: true,
          schedules: {
            groups: true,
          },
        },
      });
    }

    // Try cedula lookup
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
          relations: {
            user: true,
            schedules: {
              groups: true,
            },
          },
        });
      }
    }

    if (!employee) {
      throw new BadRequestException(`No hay empleado con este "${id}" ID`);
    }

    const digitalIdToken = this.cryptoService.encryptPayload(
      {
        employeeId: employee.userId,
        userId: employee.user.id,
        cedula: employee.user.cedula || '',
        fullName: employee.user.fullName,
        cargo: employee.position,
        issuedAt: new Date().toISOString(),
      },
      'EDID',
    );

    return Object.assign(employee, { digitalIdToken });
  }

  async findSchedules(employeeId: string) {
    return this.scheduleRepository.find({
      where: { employeeId },
      order: { dias: 'ASC', horaInicio: 'ASC' },
    });
  }

  async findGroups(employeeId: string) {
    return this.groupRepository.find({
      where: { employeeId },
    });
  }

  async findActivities(employeeId: string) {
    return this.activityRepository.find({
      where: { employeeId },
      order: { timestamp: 'DESC' },
    });
  }

  async update(id: string, updateEmpleadoDto: UpdateEmpleadoDto) {
    const employee = await this.findOne(id);
    const activities: LogActivityInput[] = [];

    const result = await this.dataSource.transaction(async (manager) => {
      await manager.update(
        Employee,
        { userId: employee.userId },
        {
          ...(updateEmpleadoDto.position && {
            position: updateEmpleadoDto.position,
          }),
          ...(updateEmpleadoDto.start_date && {
            start_date: new Date(updateEmpleadoDto.start_date),
          }),
          ...(updateEmpleadoDto.work_time && {
            work_time: updateEmpleadoDto.work_time,
          }),
          ...(updateEmpleadoDto.hours_per_day !== undefined && {
            hours_per_day: updateEmpleadoDto.hours_per_day,
          }),
          ...(updateEmpleadoDto.work_schedule && {
            work_schedule: updateEmpleadoDto.work_schedule,
          }),
        },
      );
      if (
        updateEmpleadoDto.position &&
        updateEmpleadoDto.position !== employee.position
      ) {
        activities.push({
          tipo: 'Actualización Laboral',
          descripcion: 'Cargo actualizado',
          detalle: `Cargo cambiado a "${updateEmpleadoDto.position}"`,
        });
      }

      if (
        updateEmpleadoDto.work_schedule &&
        updateEmpleadoDto.work_schedule !== employee.work_schedule
      ) {
        activities.push({
          tipo: 'Actualización Laboral',
          descripcion: 'Horario laboral actualizado',
          detalle: `Nuevo horario: ${updateEmpleadoDto.work_schedule}`,
        });
      }

      if (
        updateEmpleadoDto.hours_per_day !== undefined &&
        updateEmpleadoDto.hours_per_day !== employee.hours_per_day
      ) {
        activities.push({
          tipo: 'Actualización Laboral',
          descripcion: 'Horas por día actualizadas',
          detalle: `Horas cambiadas a ${updateEmpleadoDto.hours_per_day}h/día`,
        });
      }

      if (updateEmpleadoDto.schedules !== undefined) {
        const existingSchedules = await manager.find(Schedule, {
          where: { employeeId: employee.userId },
        });

        const incomingIds = updateEmpleadoDto.schedules
          .filter((s) => s.id)
          .map((s) => s.id!);

        const toDelete = existingSchedules.filter(
          (s) => !incomingIds.includes(s.id),
        );

        if (toDelete.length) {
          const scheduleIds = toDelete.map((s) => s.id);

          for (const s of toDelete) {
            activities.push({
              tipo: 'Materia Eliminada',
              descripcion: s.nombre,
              detalle: `Aula: ${s.aula}`,
            });
          }
          await manager.delete(Group, { scheduleId: In(scheduleIds) });
          await manager.delete(Schedule, { id: In(scheduleIds) });
        }

        for (const scheduleDto of updateEmpleadoDto.schedules) {
          const { groups, id: scheduleId, ...scheduleData } = scheduleDto;

          let schedule: Schedule;

          if (scheduleId) {
            await manager.update(
              Schedule,
              { id: scheduleId },
              {
                ...scheduleData,
                employeeId: employee.userId,
              },
            );
            schedule = (await manager.findOne(Schedule, {
              where: { id: scheduleId },
            }))!;
          } else {
            schedule = manager.create(Schedule, {
              ...scheduleData,
              employeeId: employee.userId,
            });
            activities.push({
              tipo: 'Nueva Materia',
              descripcion: scheduleDto?.nombre ?? '',
              detalle: `Aula: ${scheduleDto.aula}`,
              destacada: true,
            });
            await manager.save(schedule);
          }

          if (groups !== undefined) {
            const existingGroups = await manager.find(Group, {
              where: { scheduleId: schedule.id },
            });

            const incomingGroupIds = groups
              .filter((g) => g.id)
              .map((g) => g.id!);

            const groupsToDelete = existingGroups.filter(
              (g) => !incomingGroupIds.includes(g.id),
            );

            // ← aquí va, usando groupsToDelete (no toDelete)
            if (groupsToDelete.length) {
              for (const g of groupsToDelete) {
                activities.push({
                  tipo: 'Grupo Eliminado',
                  descripcion: g.nombre,
                  detalle: `${g.cantidadEstudiantes} estudiantes`,
                });
              }
              await manager.delete(Group, {
                id: In(groupsToDelete.map((g) => g.id)),
              });
            }

            for (const groupDto of groups) {
              const { id: groupId, ...groupData } = groupDto;

              if (groupId) {
                await manager.update(
                  Group,
                  { id: groupId },
                  {
                    ...groupData,
                    employeeId: employee.userId,
                    scheduleId: schedule.id,
                  },
                );
              } else {
                const newGroup = manager.create(Group, {
                  ...groupData,
                  employeeId: employee.userId,
                  scheduleId: schedule.id,
                });
                activities.push({
                  tipo: 'Nuevo Grupo',
                  descripcion: groupDto.nombre ?? '',
                  detalle: `${groupDto.cantidadEstudiantes} estudiantes`,
                  destacada: false,
                });
                await manager.save(newGroup);
              }
            }
          }
        }
      }

      return manager.findOne(Employee, {
        where: { userId: employee.userId },
        relations: {
          user: true,
          schedules: { groups: true },
        },
      });
    });

    void this.activityService.logMany(employee.userId, activities);
    return result;
  }

  async updateByUserId(userId: string, dto: UpdateEmpleadoDto) {
    const employee = await this.employeeRepository.findOne({
      where: { userId },
      relations: { schedules: true, groups: true },
    });

    if (!employee) {
      throw new NotFoundException('No tienes datos de empleado registrados');
    }

    // Reutiliza el método update existente con el id real del empleado
    return this.update(employee.userId, dto);
  }

  async remove(id: string) {
    const employee = await this.findOne(id);
    const user = await this.userRepository.findOneBy({ id: employee.userId });
    if (!user) {
      throw new NotFoundException(`Usuario no encontrado para el empleado ${id}`);
    }

    try {
      user.isActive = false;
      await this.userRepository.save(user);
      return {
        message: `Empleado ${user.fullName} desactivado exitosamente (eliminación lógica)`,
        userId: user.id,
        isActive: false,
      };
    } catch (error: any) {
      this.handleExceptions(error);
    }
  }

  async toggleStatus(id: string) {
    const employee = await this.findOne(id);
    const user = await this.userRepository.findOneBy({ id: employee.userId });
    if (!user) {
      throw new NotFoundException(`Usuario no encontrado para el empleado ${id}`);
    }

    try {
      user.isActive = !user.isActive;
      await this.userRepository.save(user);
      return {
        message: `Empleado ${user.fullName} ${user.isActive ? 'activado' : 'desactivado'} exitosamente`,
        userId: user.id,
        isActive: user.isActive,
      };
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
