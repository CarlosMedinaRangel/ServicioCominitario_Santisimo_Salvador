# Proyecto: Servicio Comunitario — Santísimo Salvador

API REST para gestionar empleados del sistema "Santisimo Salvador".  
Proyecto de servicio comunitario — Universidad Nacional Experimental del Táchira (UNET).

---

## Stack Tecnológico

| Capa          | Tecnología                          | Versión |
| ------------- | ----------------------------------- | ------- |
| Runtime       | Node.js                             | —       |
| Lenguaje      | TypeScript                          | ^5.7.3  |
| Framework     | NestJS                              | ^11.0.1 |
| ORM           | **TypeORM** (NO Prisma, NO genérico) | ^1.0.0  |
| Base de datos | PostgreSQL                          | 16.3    |
| Validación    | class-validator + class-transformer | —       |
| Contenedores  | Docker + Docker Compose             | —       |
| Admin DB      | pgAdmin 4                           | 8.6     |

> **¿Qué ORM usa?** Usa **TypeORM** v1 con integración @nestjs/typeorm.  
> No usa Prisma, Sequelize, ni un cliente SQL genérico.  
> TypeORM es un ORM completo que mapea clases TypeScript (entidades decoradas con @Entity) a tablas PostgreSQL automáticamente.  
> La entidad se define en src/empleados/entities/empleado.entity.ts y TypeORM sincroniza el schema automáticamente con synchronize: true.

---

## Arranque Rápido

`ash
# 1. Clonar y entrar
cd ServicioCominitario_Santisimo_Salvador

# 2. Crear .env desde template
cp .env.template .env
# Editar .env con: DB_PASSWORD=Servicio_Com1, DB_NAME=SantisimoServer, DB_PORT=5432

# 3. Levantar PostgreSQL + pgAdmin
docker-compose up -d

# 4. Instalar dependencias
npm install

# 5. Iniciar en desarrollo
npm run start:dev

# La API corre en: http://localhost:3000/api/
# pgAdmin en: http://localhost:8081 (admin@google.com / Servicio_Com1)
```

### Docker: qué corre dentro y qué no

| Componente   | ¿En Docker? | Imagen / comando            | Puerto       |
| ------------ | ----------- | --------------------------- | ------------ |
| PostgreSQL   | Sí          | `postgres:16.3`             | `5438:5432`  |
| pgAdmin      | Sí          | `dpage/pgadmin4:8.6`        | `8081:80`    |
| App NestJS   | **No**      | Corre nativo con `npm run`  | `3000`       |

No hay `Dockerfile` para la app. Si en el futuro se quiere containerizar el backend también, habría que crearlo.

### Flujo diario de trabajo

```bash
# 1. Prender los contenedores (DB + pgAdmin en background)
docker-compose up -d

# 2. Iniciar la app NestJS
npm run start:dev

# ... trabajas, haces cambios, el servidor se recarga solo ...

# 3. Al terminar (opcional — puedes dejar los contenedores arriba)
docker-compose down
```

Los contenedores consumen pocos recursos, puedes dejarlos corriendo días sin problema y solo reiniciar `npm run start:dev` cuando edites código.

---

## Árbol del Proyecto

`
ServicioCominitario_Santisimo_Salvador/
│
├── .env.template               # Variables de entorno (copiar a .env)
├── docker-compose.yml          # Postgres 16.3 (5438) + pgAdmin 8.6 (8081)
├── package.json                # Dependencias y scripts
├── tsconfig.json               # Config TypeScript
├── eslint.config.mjs           # ESLint flat config
├── queries/
│   └── empelados.sql           # Seed data (20 empleados de ejemplo)
│
├── src/
│   ├── main.ts                 # Entry point: setGlobalPrefix('api/'), CORS, ValidationPipe
│   ├── app.module.ts           # Módulo raíz: ConfigModule + TypeOrmModule + EmpleadosModule
│   │
│   ├── interfaces/
│   │   └── error.response.ts   # Interfaces IErrorsTypeORM, IDriverError
│   │
│   └── empleados/              # Módulo feature (único)
│       ├── empleados.module.ts      # @Module con TypeOrm.forFeature([Empleado])
│       ├── empleados.controller.ts  # CRUD: POST, GET, GET/:id, PATCH/:id, DELETE/:id
│       ├── empleados.service.ts     # Lógica de negocio + manejo de errores
│       ├── dto/
│       │   ├── create-empleado.dto.ts   # Validación para creación
│       │   └── update-empleado.dto.ts   # PartialType (todo opcional)
│       └── entities/
│           └── empleado.entity.ts       # TypeORM entity → tabla "Empleados"
│
└── test/
    └── app.e2e-spec.ts         # Test E2E base
`

---

## Arquitectura

`
Cliente HTTP → NestJS → Controller → Service → TypeORM Repository → PostgreSQL
                   ↑
            ValidationPipe (global)
            - transform: true
            - whitelist: true
            - forbidNonWhitelisted: true
`

- **Módulos**: NestJS modular. Solo existe EmpleadosModule. Escalable añadiendo más módulos.
- **ORM**: TypeORM con synchronize: true — las tablas se crean automáticamente desde las entidades. NO hay archivos de migración.
- **Prefijo global**: /api/ — todos los endpoints arrancan con /api/empleados/....
- **CORS**: Habilitado globalmente.
- **Validación**: Global con class-validator. Peticiones con campos extra son rechazadas (orbidNonWhitelisted).

---

## Entidad: Empleado (tabla "Empleados")

| Columna        | TypeScript      | SQL               | Restricciones            |
| -------------- | --------------- | ----------------- | ------------------------ |
| id           | 
umber        | SERIAL          | PK, auto-increment       |
| 
ame         | string        | archar(100)    | NOT NULL                 |
| cedula       | string        | archar(100)    | NOT NULL, normalizada    |
| 	elefono     | string        | archar(15)     | NOT NULL, solo dígitos   |
| position     | string        | archar(50)     | Cargo del empleado       |
| start_date   | Date          | date            | Fecha de ingreso         |
| work_time    | string        | 	ime            | Hora inicio (ej. 09:00)  |
| hours_per_day| 
umber        | int             | Horas por día            |
| work_schedule| string        | archar(50)     | Descripción horario      |

### Normalizaciones automáticas (TypeORM @BeforeInsert / @BeforeUpdate)

- **Cédula**: se eliminan puntos, se pasa a mayúsculas, se antepone V si no existe.  
  Ej: "v-12.345.678" → "V12345678"
- **Teléfono**: se eliminan todos los caracteres no dígitos.  
  Ej: "0412-123.4567" → "04121234567"

---

## Endpoints

Todos bajo http://localhost:3000/api/empleados

| Método | Ruta                   | Controlador     | Descripción                           |
| ------ | ---------------------- | --------------- | ------------------------------------- |
| POST   | /api/empleados       | create()      | Crear empleado                        |
| GET    | /api/empleados       | indAll()     | Listar todos                          |
| GET    | /api/empleados/:id   | indOne(id)   | Buscar por PK numérica, nombre o cédula |
| PATCH  | /api/empleados/:id   | update(id, dto) | Actualización parcial (por PK numérica) |
| DELETE | /api/empleados/:id   | emove(id)    | Eliminar por PK numérica, nombre o cédula |

### DTOs — payloads válidos

#### CreateEmpleadoDto (POST)

`json
{
  "name": "Juan Pérez",
  "cedula": "V12345678",
  "telefono": "04141234567",
  "position": "Desarrollador",
  "start_date": "2024-01-15T00:00:00.000Z",
  "work_time": "09:00",
  "hours_per_day": 8,
  "work_schedule": "Lunes a Viernes 9am-5pm"
}
`

**Reglas de validación:**

| Campo | Tipo | Validación |
|-------|------|------------|
| 
ame | string | @IsString(), @MinLength(1) |
| cedula | string | @IsString(), @MinLength(1) |
| 	elefono | string | @Matches(/^(0414|0424|0412|0422|0416|0426)\d{7}$/) — solo prefijos móviles venezolanos |
| position | string | @IsString(), @MinLength(1) |
| start_date | Date (ISO string) | @IsDate() |
| work_time | string | @IsString(), @MinLength(1) |
| hours_per_day | number | @IsNumber(), @IsPositive() |
| work_schedule | string | @IsString(), @MinLength(1) |

#### UpdateEmpleadoDto (PATCH)

Mismos campos que Create pero TODOS opcionales (hereda de PartialType(CreateEmpleadoDto)).

`json
{
  "telefono": "04241234567",
  "hours_per_day": 6
}
`

### Ejemplos de uso con curl

`ash
# CREAR empleado
curl -X POST http://localhost:3000/api/empleados \
  -H "Content-Type: application/json" \
  -d '{
    "name": "María García",
    "cedula": "V87654321",
    "telefono": "04161234567",
    "position": "Recepcionista",
    "start_date": "2025-06-01T00:00:00.000Z",
    "work_time": "08:00",
    "hours_per_day": 7,
    "work_schedule": "Lunes a Sábado 8am-3pm"
  }'

# LISTAR todos los empleados
curl http://localhost:3000/api/empleados

# BUSCAR por ID numérico
curl http://localhost:3000/api/empleados/1

# BUSCAR por cédula (normalización automática)
curl http://localhost:3000/api/empleados/v-12.345.678

# BUSCAR por nombre (case-insensitive)
curl http://localhost:3000/api/empleados/MARÍA%20GARCÍA

# ACTUALIZAR parcialmente (PATCH)
curl -X PATCH http://localhost:3000/api/empleados/1 \
  -H "Content-Type: application/json" \
  -d '{
    "telefono": "04221234567",
    "hours_per_day": 6
  }'

# ELIMINAR
curl -X DELETE http://localhost:3000/api/empleados/1
`

### Respuestas esperadas

**GET /api/empleados** → 200 Array de empleados:
`json
[
  {
    "id": 1,
    "name": "Juan Pérez",
    "cedula": "V12345678",
    "telefono": "04141234567",
    "position": "Desarrollador",
    "start_date": "2024-01-15T00:00:00.000Z",
    "work_time": "09:00",
    "hours_per_day": 8,
    "work_schedule": "Lunes a Viernes 9am-5pm"
  }
]
`

**GET /api/empleados/:id** → 200 Objeto único o 400 ("No hay empleado con este '...' ID")

**POST /api/empleados** → 201 Objeto creado  
**PATCH /api/empleados/:id** → 200 Objeto actualizado o 404 ("El empleado con el id ... no se encontró")  
**DELETE /api/empleados/:id** → 200 "Eliminado" o 400 ("No existe ningun empleado con el termino proporcionado")

**Errores de validación** → 400 con:
`json
{
  "message": ["Formato de teléfono inválido. Debe ser ..."],
  "error": "Bad Request",
  "statusCode": 400
}
`

**Error unique constraint (cédula duplicada)** → 400 con el detalle de PostgreSQL.

---

## Módulo de Reportes (PDF) - Rama `develop`

La generación de reportes (como la constancia de trabajo) se encuentra implementada en la rama `develop`. Utiliza la librería **pdfmake** para generar documentos PDF al vuelo y enviarlos directamente como respuesta HTTP (stream), sin guardarlos en el disco.

### Endpoints de Reportes
- `GET /api/basic-reports/employment-letter/:id` - Genera y devuelve el PDF de la constancia de trabajo de un empleado.

### Estructura y cómo modificar los reportes
Para modificar el diseño o contenido de los PDFs, no es necesario tener conocimientos avanzados de NestJS, pero sí entender la sintaxis de definición de documentos de [pdfmake](https://pdfmake.github.io/docs/).

| Archivo / Directorio | Descripción |
|----------------------|-------------|
| `src/reports/employementLetterByID.report.ts` | **Aquí se modifica el diseño del PDF.** Define los estilos, márgenes y todo el contenido textual de la constancia. |
| `src/reports/sections/` | Contiene secciones reutilizables del PDF (ej. `header.section.ts` para el logo del Santísimo Salvador). |
| `src/basic-reports/` | Controlador y servicio. Obtienen los datos del empleado y llaman a la generación del reporte. |
| `src/printer/` | Servicio genérico que toma la definición de `pdfmake` y genera el PDF final. |

### Códigos QR en Reportes
Para agregar códigos QR en los PDFs (ej. conteniendo información validable como el ID del empleado y la fecha), se debe hacer en el backend. Usando una librería de Node.js como `qrcode`, se genera la imagen del QR en base64 y se añade como un elemento de imagen directamente dentro de la estructura de documento de `pdfmake`.

---

## Puntos Clave que debes saber

1. **Solo hay un módulo: empleados/** (en la rama `main`) — Ten en cuenta que en la rama `develop` ya se están introduciendo nuevos módulos como `auth/`, `basic-reports/` y `printer/`.
2. **TypeORM con synchronize: true** — Las tablas se crean/alteran automáticamente al iniciar la app. No hay migraciones. Esto está bien para desarrollo pero **no es seguro para producción**.
3. **indOne() acepta 3 tipos de búsqueda**: ID numérico, cédula (con normalización) y nombre (case-insensitive). Es un endpoint "inteligente" que prueba distintas estrategias.
4. **update() usa Repository.preload()** — Solo actualiza campos presentes en el DTO. Los campos no enviados se mantienen intactos.
5. **Phone validation es específico de Venezuela** — Solo acepta prefijos móviles:  412,  414,  424,  422,  416,  426 + 7 dígitos.
6. **No hay frontend** — Es 100% backend. Solo responde JSON. No hay HTML, no hay plantillas, no hay vistas.
7. **CORS abierto** — pp.enableCors() sin configuración permite cualquier origen.
8. **Global ValidationPipe** con whitelist: true y orbidNonWhitelisted: true — cualquier campo extra en el body es rechazado automáticamente.
9. **Estructura de proyecto escalable** — Para agregar un nuevo módulo (ej. sistencia/), crear sistencia.module.ts, sistencia.controller.ts, sistencia.service.ts, dto/ y entities/ siguiendo el patrón de empleados/.

---

## Rutas Absolutas Clave

| Archivo | Ruta |
|---------|------|
| Entry point | src/main.ts |
| Módulo raíz | src/app.module.ts |
| Controlador | src/empleados/empleados.controller.ts |
| Servicio | src/empleados/empleados.service.ts |
| Entidad | src/empleados/entities/empleado.entity.ts |
| Create DTO | src/empleados/dto/create-empleado.dto.ts |
| Update DTO | src/empleados/dto/update-empleado.dto.ts |
| Docker Compose | docker-compose.yml |
| Env template | .env.template |
| Seed SQL | queries/empelados.sql |
| Test E2E | 	est/app.e2e-spec.ts |
