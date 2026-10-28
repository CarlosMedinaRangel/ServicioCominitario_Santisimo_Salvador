import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  UnauthorizedException,
  NotFoundException,
  ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { EmpleadosController } from '../empleados.controller';
import { EmpleadosService } from '../empleados.service';
import {
  createMockUser,
  createMockAdminUser,
  MockType,
} from '../../../test/fixtures/user.fixture';
import { createMockEmployee } from '../../../test/fixtures/employee.fixture';

describe('EmpleadosController (Exhaustive HTTP Integration with Supertest)', () => {
  let app: INestApplication;
  let mockEmpleadosService: MockType<EmpleadosService>;

  const mockNormalUser = createMockUser({
    id: 'user-uuid-1',
    email: 'docente@santisimo.edu',
    fullName: 'Prof. Mario Silva',
    roles: ['user'],
  });

  const mockAdminUser = createMockAdminUser({
    id: 'admin-uuid-1',
    email: 'director@santisimo.edu',
    fullName: 'Directora Elena Gómez',
    roles: ['admin'],
  });

  const mockEmployee = createMockEmployee({
    userId: mockNormalUser.id,
    position: 'Profesor de Matemáticas',
    hours_per_day: 6,
    work_time: '07:00:00',
    work_schedule: 'Lunes a Viernes 7am - 1pm',
    user: mockNormalUser,
  });

  beforeEach(async () => {
    mockEmpleadosService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      getCounts: jest.fn(),
      update: jest.fn(),
      updateByUserId: jest.fn(),
      toggleStatus: jest.fn(),
      remove: jest.fn(),
      findSchedules: jest.fn(),
      findGroups: jest.fn(),
      findActivities: jest.fn(),
      uploadFile: jest.fn(),
      ConstanciaEmpleadoByID: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [EmpleadosController],
      providers: [
        { provide: EmpleadosService, useValue: mockEmpleadosService },
        Reflector,
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          const authHeader = req.headers['authorization'];
          if (!authHeader) {
            throw new UnauthorizedException('Token no proporcionado');
          }
          if (authHeader === 'Bearer admin-token') {
            req.user = mockAdminUser;
            return true;
          }
          if (authHeader === 'Bearer user-token') {
            req.user = mockNormalUser;
            return true;
          }
          throw new UnauthorizedException('Token inválido o expirado');
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  // ════════════════════════════════════════════════════════════════════════════════
  // 1. POST /empleados - Creation & Role Guards
  // ════════════════════════════════════════════════════════════════════════════════
  describe('POST /empleados', () => {
    const validDto = {
      userId: '550e8400-e29b-41d4-a716-446655440000',
      position: 'Docente de Biología',
      start_date: '2024-01-15',
      work_time: '08:00',
      hours_per_day: 8,
      work_schedule: 'Lunes a Viernes, 8am - 4pm',
    };

    it('should return 401 Unauthorized when unauthenticated', async () => {
      await request(app.getHttpServer())
        .post('/empleados')
        .send(validDto)
        .expect(401);

      expect(mockEmpleadosService.create).not.toHaveBeenCalled();
    });

    it('should return 403 Forbidden when non-admin user attempts creation', async () => {
      const res = await request(app.getHttpServer())
        .post('/empleados')
        .set('Authorization', 'Bearer user-token')
        .send(validDto)
        .expect(403);

      expect(res.body.message).toContain('need a valid role: Admin');
      expect(mockEmpleadosService.create).not.toHaveBeenCalled();
    });

    it('should return 400 Bad Request when userId is not a valid UUID', async () => {
      const res = await request(app.getHttpServer())
        .post('/empleados')
        .set('Authorization', 'Bearer admin-token')
        .send({
          ...validDto,
          userId: 'invalid-uuid-format',
        })
        .expect(400);

      expect(res.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('userId must be a UUID')]),
      );
      expect(mockEmpleadosService.create).not.toHaveBeenCalled();
    });

    it('should return 400 Bad Request when unwhitelisted properties are injected', async () => {
      const res = await request(app.getHttpServer())
        .post('/empleados')
        .set('Authorization', 'Bearer admin-token')
        .send({
          ...validDto,
          injectedField: 'hack',
        })
        .expect(400);

      expect(res.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('property injectedField should not exist')]),
      );
      expect(mockEmpleadosService.create).not.toHaveBeenCalled();
    });

    it('should return 201 Created and return employee record when admin posts valid DTO', async () => {
      (mockEmpleadosService.create as jest.Mock).mockResolvedValue(mockEmployee);

      const res = await request(app.getHttpServer())
        .post('/empleados')
        .set('Authorization', 'Bearer admin-token')
        .send(validDto)
        .expect(201);

      expect(res.body.userId).toBe(mockNormalUser.id);
      expect(res.body.position).toBe('Profesor de Matemáticas');
      expect(mockEmpleadosService.create).toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════════════════════════════════════
  // 2. GET /empleados - List & Query Filters
  // ════════════════════════════════════════════════════════════════════════════════
  describe('GET /empleados', () => {
    it('should return 401 Unauthorized when unauthenticated', async () => {
      await request(app.getHttpServer())
        .get('/empleados')
        .expect(401);
    });

    it('should return 403 Forbidden when standard user attempts listing', async () => {
      await request(app.getHttpServer())
        .get('/empleados')
        .set('Authorization', 'Bearer user-token')
        .expect(403);
    });

    it('should return 200 OK and forward pagination query parameters to service', async () => {
      const paginatedResult = {
        data: [mockEmployee],
        total: 1,
        page: 2,
        limit: 10,
        totalPages: 1,
      };
      (mockEmpleadosService.findAll as jest.Mock).mockResolvedValue(paginatedResult);

      const res = await request(app.getHttpServer())
        .get('/empleados?status=active&page=2&limit=10')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.total).toBe(1);
      expect(mockEmpleadosService.findAll).toHaveBeenCalledWith('active', 2, 10);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════════
  // 3. GET /empleados/count - Statistics
  // ════════════════════════════════════════════════════════════════════════════════
  describe('GET /empleados/count', () => {
    it('should return 200 OK with total, active, and inactive counts for admin', async () => {
      const counts = { total: 10, active: 8, inactive: 2 };
      (mockEmpleadosService.getCounts as jest.Mock).mockResolvedValue(counts);

      const res = await request(app.getHttpServer())
        .get('/empleados/count')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(res.body).toEqual(counts);
      expect(mockEmpleadosService.getCounts).toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════════════════════════════════════
  // 4. GET /empleados/:id - Single Employee Retrieval
  // ════════════════════════════════════════════════════════════════════════════════
  describe('GET /empleados/:id', () => {
    it('should return 200 OK when employee exists for authenticated user', async () => {
      (mockEmpleadosService.findOne as jest.Mock).mockResolvedValue(mockEmployee);

      const res = await request(app.getHttpServer())
        .get(`/empleados/${mockEmployee.userId}`)
        .set('Authorization', 'Bearer user-token')
        .expect(200);

      expect(res.body.userId).toBe(mockEmployee.userId);
      expect(mockEmpleadosService.findOne).toHaveBeenCalledWith(mockEmployee.userId);
    });

    it('should return 404 Not Found when employee does not exist', async () => {
      (mockEmpleadosService.findOne as jest.Mock).mockRejectedValue(
        new NotFoundException(`Empleado con ID non-existent no encontrado`),
      );

      const res = await request(app.getHttpServer())
        .get('/empleados/non-existent')
        .set('Authorization', 'Bearer user-token')
        .expect(404);

      expect(res.body.message).toContain('no encontrado');
    });
  });

  // ════════════════════════════════════════════════════════════════════════════════
  // 5. PATCH /empleados/:id & PATCH /empleados/me - Updates
  // ════════════════════════════════════════════════════════════════════════════════
  describe('PATCH /empleados/:id & PATCH /empleados/me', () => {
    it('should return 403 Forbidden when standard user attempts admin PATCH /empleados/:id', async () => {
      await request(app.getHttpServer())
        .patch(`/empleados/${mockEmployee.userId}`)
        .set('Authorization', 'Bearer user-token')
        .send({ position: 'Nuevo Cargo' })
        .expect(403);

      expect(mockEmpleadosService.update).not.toHaveBeenCalled();
    });

    it('should return 200 OK when admin updates an employee via PATCH /empleados/:id', async () => {
      const updated = { ...mockEmployee, position: 'Director Académico' };
      (mockEmpleadosService.update as jest.Mock).mockResolvedValue(updated);

      const res = await request(app.getHttpServer())
        .patch(`/empleados/${mockEmployee.userId}`)
        .set('Authorization', 'Bearer admin-token')
        .send({ position: 'Director Académico' })
        .expect(200);

      expect(res.body.position).toBe('Director Académico');
      expect(mockEmpleadosService.update).toHaveBeenCalledWith(
        mockEmployee.userId,
        expect.objectContaining({ position: 'Director Académico' }),
      );
    });

    it('should return 200 OK when user updates their own employee profile via PATCH /empleados/me', async () => {
      const updated = { ...mockEmployee, work_schedule: 'Tardes 1pm - 6pm' };
      (mockEmpleadosService.updateByUserId as jest.Mock).mockResolvedValue(updated);

      const res = await request(app.getHttpServer())
        .patch('/empleados/me')
        .set('Authorization', 'Bearer user-token')
        .send({ work_schedule: 'Tardes 1pm - 6pm' })
        .expect(200);

      expect(res.body.work_schedule).toBe('Tardes 1pm - 6pm');
      expect(mockEmpleadosService.updateByUserId).toHaveBeenCalledWith(
        mockNormalUser.id,
        expect.objectContaining({ work_schedule: 'Tardes 1pm - 6pm' }),
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════════════════
  // 6. PATCH /empleados/:id/toggle-status & DELETE /empleados/:id - Soft Delete
  // ════════════════════════════════════════════════════════════════════════════════
  describe('PATCH /empleados/:id/toggle-status & DELETE /empleados/:id', () => {
    it('should return 403 Forbidden when standard user attempts status toggle', async () => {
      await request(app.getHttpServer())
        .patch(`/empleados/${mockEmployee.userId}/toggle-status`)
        .set('Authorization', 'Bearer user-token')
        .expect(403);
    });

    it('should return 200 OK when admin toggles employee status', async () => {
      (mockEmpleadosService.toggleStatus as jest.Mock).mockResolvedValue({
        message: 'Estado del empleado alternado exitosamente',
        isActive: false,
      });

      const res = await request(app.getHttpServer())
        .patch(`/empleados/${mockEmployee.userId}/toggle-status`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(res.body.isActive).toBe(false);
      expect(mockEmpleadosService.toggleStatus).toHaveBeenCalledWith(mockEmployee.userId);
    });

    it('should return 200 OK when admin soft-deletes an employee via DELETE /empleados/:id', async () => {
      (mockEmpleadosService.remove as jest.Mock).mockResolvedValue({
        message: 'Empleado desactivado correctamente',
      });

      const res = await request(app.getHttpServer())
        .delete(`/empleados/${mockEmployee.userId}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(res.body.message).toContain('desactivado correctamente');
      expect(mockEmpleadosService.remove).toHaveBeenCalledWith(mockEmployee.userId);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════════
  // 7. Sub-routes: Schedules, Groups, Activities
  // ════════════════════════════════════════════════════════════════════════════════
  describe('Sub-routes: schedules, groups, activities', () => {
    it('GET /empleados/:id/schedules should return 200 OK', async () => {
      (mockEmpleadosService.findSchedules as jest.Mock).mockResolvedValue([]);

      await request(app.getHttpServer())
        .get(`/empleados/${mockEmployee.userId}/schedules`)
        .set('Authorization', 'Bearer user-token')
        .expect(200);

      expect(mockEmpleadosService.findSchedules).toHaveBeenCalledWith(mockEmployee.userId);
    });

    it('GET /empleados/:id/groups should return 200 OK', async () => {
      (mockEmpleadosService.findGroups as jest.Mock).mockResolvedValue([]);

      await request(app.getHttpServer())
        .get(`/empleados/${mockEmployee.userId}/groups`)
        .set('Authorization', 'Bearer user-token')
        .expect(200);

      expect(mockEmpleadosService.findGroups).toHaveBeenCalledWith(mockEmployee.userId);
    });

    it('GET /empleados/:id/activities should return 200 OK', async () => {
      (mockEmpleadosService.findActivities as jest.Mock).mockResolvedValue([]);

      await request(app.getHttpServer())
        .get(`/empleados/${mockEmployee.userId}/activities`)
        .set('Authorization', 'Bearer user-token')
        .expect(200);

      expect(mockEmpleadosService.findActivities).toHaveBeenCalledWith(mockEmployee.userId);
    });
  });
});
