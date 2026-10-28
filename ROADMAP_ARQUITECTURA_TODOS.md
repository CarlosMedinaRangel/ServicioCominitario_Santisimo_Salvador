# 🗺️ Plan de Desarrollo, Arquitectura y Tareas Pendientes (TODOs)
> **Colegio Santísimo Salvador - Sistema de Gestión Institucional y Digital ID**

---

## 🚀 ORDEN DE PRIORIDADES Y PRÓXIMAS FASES DE IMPLEMENTACIÓN

A continuación se establece el orden estricto de trabajo acordado para cerrar los módulos operativos y pasar a fases posteriores:

1. **FASE INMEDIATA: Modelo Universal de Documentos, Relación con Personas y Revocación Criptográfica (Punto B)**
   - **Objetivo:** Consolidar `DocumentVerification` como la entidad maestra canónica de emisión y auditoría para todos los certificados institucionales.
   - **Backend:**
     - Clave foránea formal `recipientUserId` vinculada a `User` (`@ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })`).
     - Campos de auditoría de revocación: `revokedAt`, `revokedByUserId` (`@ManyToOne(() => User)`), `revocationReason` (obligatorio).
     - Endpoint `PATCH /api/documents/:id/revoke` protegido con `@UseGuards(JwtAuthGuard, RolesGuard)` y `@Roles('ADMIN')`.
     - Endpoint `GET /api/documents/recipient/:userId` para listar el historial de documentos de un empleado/usuario.
   - **Frontend:**
     - Envolver la ruta `/verificar` con `<RoleGuard allowedRoles={["admin"]}>` (**Verificación PRIVADA exclusiva de Administradores**).
     - Componente `AdminRevokeDocumentModal.tsx` en `/constancias-admin` con selector de motivo y confirmación.
     - Indicador visual de documento revocado con motivo oficial y fecha.
   - **Cápsula del Tiempo (`metadata` JSONB):** Mantener el snapshot inmutable de datos en base de datos para verificación y regeneración idéntica de PDFs sin almacenar archivos binarios pesados.

2. **FASE FUTURA: Nuevos Tipos de Documentos y Esquemas de Metadatos (A integrar progresivamente)**
   - **`CONSTANCIA_TRABAJO` (Activo):** `cargo`, `horasPorDia`, `horario`, `fechaIngreso`, `institucion`, `periodo`.
   - **`RECIBO_PAGO` (Pendiente FASE 5):** `periodo`, `quincena`, `totalAsignaciones`, `totalDeducciones`, `netoCobrado`, `moneda`, `referencia`.
   - **`CONSTANCIA_ESTUDIO` (Futuro Estudiantil):** `anoEscolar`, `grado`, `seccion`, `mencion`, `representante`.
   - **`NOTAS_CERTIFICADAS` (Futuro Académico):** `anoGraduacion`, `promedioGeneral`, `totalMateriasAprobadas`, `actaNumero`.
   - **`SOLVENCIA_ADMINISTRATIVA` (Futuro Administrativo):** `concepto`, `anoEscolar`, `fechaLimite`.
   - **`CARNET_DIGITAL` (Activo):** Criptografía AES-256-GCM EDID/DID con validación instantánea de estatus activo/inactivo.

3. **REGLAS GENERALES DE NEGOCIO Y SEGURIDAD PARA DOCUMENTOS:**
   - **Exclusión por defecto de ANULADOS (Tratamiento Soft-Delete):**
     - Los documentos con `estado = 'ANULADO'` o `status = 'REVOKED'` se tratan como eliminación lógica y **NO** se incluyen en consultas estándar (`?estado=Todos` o queries base) ni en los KPI de registros activos.
     - Solo se consultan y retornan cuando el usuario/admin selecciona explícitamente el filtro `Estado: 'Anulado'`.
   - **Control de Frecuencia y Prevención de Spam (Rate Limiting de Emisión):**
     - Límite diario por usuario y por tipo de documento (máximo 1 solicitud por 24 horas por período).
     - Si ya existe un documento emitido para ese período/mes en las últimas 24 horas, el backend y frontend devuelven/descargan el documento existente en lugar de duplicar firmas o emitir registros redundantes.
     - Protección mediante `ThrottlerGuard` y validación de timestamp en PostgreSQL (`last_issued_at`).

3. **FASE DE DISEÑO & UI: Estandarización Tipográfica Estricta en `rem` y Tokens Semánticos**
   - **Objetivo:** Reemplazar valores arbitrarios aislados (`text-[10px]`, `text-[11px]`) por tokens unificados en `rem` de acuerdo con `index.css`.
   - **Escala de Texto:** `text-2xs` (`0.6875rem` / micro-badges), `text-xs` (`0.75rem` / metadatos y `<th>`), `text-sm` (`0.875rem` / celdas `<td>` y botones), `text-base` (`1rem` / destacados).
   - **Escala de Títulos Responsive:** `h4` (`text-sm md:text-base`), `h3` (`text-base md:text-lg`), `h2` (`text-lg md:text-xl`), `h1` (`text-xl md:text-2xl lg:text-3xl`).

4. **FASE 1: Optimización de la Carga Masiva de Empleados y Nómina (Punto C)**
   - Pre-flight checks en cliente (cédulas duplicadas en Excel/CSV).
   - Reporte descargable de filas con error en Excel.
   - Barra de progreso interactiva durante la inserción.

5. **FASE 2: Formalización del Registro Administrativo de Empleados (Punto D)**
   - Consolidar la creación individual de empleados en modal/vista administrativa (`/empleados/nuevo`).
   - Restricción estricta al rol `ADMIN`.
   - Inclusión de los nuevos atributos (`academicTitle`, `isTenured`).

6. **FASE 3: Activación de Cloudflare Turnstile en Producción (Punto A)**
   - Configuración de Site Key y Secret Key en variables de entorno tras la creación de la cuenta en Cloudflare.

7. **FASE 4: Arquitectura de Periodos Académicos e Históricos (`AcademicPeriod`)**
   - Creación de la entidad `AcademicPeriod` para desacoplar horarios, asignaturas y grupos por año escolar (evitando sobrescritura destructiva).
   - Trazabilidad laboral (`EmployeeCareerHistory`).

8. **FASE 5: Migración de Comprobantes de Pago a BD Real (`payroll_receipts`)**
   - Sustituir los mocks de `src/mock/comprobanteMock.ts` por la tabla real de nómina en PostgreSQL y generación de sellos criptográficos `RECIBO_PAGO`.

---

---

## 1. Diagnóstico y Análisis: Datos Históricos vs. Snapshots Vigentes

### 1.1. Estado Actual del Sistema

| Entidad / Módulo | Tipo de Persistencia | Comportamiento Actual |
| :--- | :--- | :--- |
| **`document_verifications`** | **Histórico Inmutable** | Cada constancia o recibo emitido almacena un registro único con `issuedAt`, `verificationCode` (QR) y un snapshot en `metadata` (JSONB) con cargo, sueldo y datos de ese momento. |
| **`employees`** | **Snapshot Vigente** | Contiene columnas directas (`position`, `start_date`, `work_schedule`, `hours_per_day`). Si se actualiza el cargo o sueldo de un docente, se sobrescribe el valor previo sin dejar trazabilidad. |
| **`schedules`** | **Snapshot Vigente** | Las materias y horarios tienen `activa: boolean`. Si inicia un nuevo año escolar y se reasignan las clases, los registros viejos se modifican o desactivan, pero no están vinculados a un ciclo formal. |
| **`groups` / `activities`** | **Snapshot Vigente** | Representan la asignación actual de grados y actividades del empleado. |

---

## 2. Estudio de Alternativas para la Persistencia Histórica

El objetivo es poder consultar el pasado (ej. *"¿Qué horario y materias tenía la Prof. Elena en el año escolar 2023-2024?"* o *"¿Qué cargo ocupaba el empleado antes de su último ascenso?"*) sin sobrecargar la base de datos ni complejizar innecesariamente las consultas del día a día.

### Alternativa A: Modelo Dimensional Académico (`AcademicPeriod`) *(Recomendada)*
- **Estructura:** Se crea la entidad `academic_periods`:
  ```sql
  CREATE TABLE academic_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL, -- Ej: '2025-2026'
    name VARCHAR(100) NOT NULL,       -- Ej: 'Año Escolar 2025-2026'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT false
  );
  ```
- **Relación:** Las tablas `schedules`, `groups`, `activities` y nóminas llevan una clave foránea `academic_period_id`.
- **Ventajas:**
  - Se adapta al 100% al modelo operativo real de una institución educativa.
  - Consultas ultra-eficientes mediante índices simples `(employee_id, academic_period_id)`.
  - El sistema siempre consulta por defecto el periodo donde `is_current = true`, y permite al usuario seleccionar un periodo anterior desde un desplegable en el frontend.

### Alternativa B: Tabla Central de Eventos / Timeline Histórico ("Data Lake Relacional")
- **Estructura:** Una tabla central `historical_events` donde cada cambio en cualquier entidad se guarda como un evento:
  ```sql
  CREATE TABLE historical_events (
    id UUID PRIMARY KEY,
    entity_name VARCHAR(50), -- 'employees', 'schedules'
    entity_id VARCHAR(255),
    event_type VARCHAR(50),  -- 'POSITION_CHANGED', 'SCHEDULE_UPDATED'
    payload JSONB,
    effective_date DATE,
    created_at TIMESTAMP WITH TIME ZONE
  );
  ```
- **Evaluación:**
  - *Ventaja:* No requiere modificar esquemas existentes para agregar nuevas tablas.
  - *Desventaja:* Para reconstruir una vista histórica (ej. armar el horario completo de un profesor en 2023) se requieren queries complejas con parsing de JSONB en PostgreSQL, lo que penaliza el rendimiento frente a tablas estructuradas.

### Alternativa C: Historial Laboral del Empleado (`EmployeeCareerHistory`)
- Para los cargos y condiciones laborales, una tabla dedicada `employee_career_history`:
  - `employee_id`, `position`, `department`, `salary`, `start_date`, `end_date`, `is_current`.
  - Permite emitir constancias retrospectivas con exactitud legal.

> **💡 Conclusión y Recomendación Técnica:**
> La mejor arquitectura es **híbrida y relacional**:
> 1. Crear la entidad **`AcademicPeriod`** para gobernar horarios, materias, grupos y nóminas por año escolar.
> 2. Mantener `document_verifications` como el libro inmutable de constancias emitidas.
> 3. Añadir **`EmployeeCareerHistory`** para la trazabilidad laboral de ascensos y cargos.

---

## 3. Módulo de Carga Masiva de Nóminas (Mejoras Pendientes)

El módulo de carga de nóminas permite al administrador procesar pagos de forma masiva subiendo archivos Excel/CSV (`AdminNominaUploadModal.tsx` + `AdminColumnMappingModal.tsx`).

### Tareas a implementar:
- [ ] **Validación Preventiva en Cliente (Pre-flight Checks):**
  - Detectar antes del envío si hay filas con cédulas duplicadas dentro del mismo archivo.
  - Validar tipos de datos (que los campos de montos o sueldos no contengan letras o caracteres especiales).
- [ ] **Reporte Descargable de Errores e Incidencias:**
  - Si el procesamiento de 150 filas falla en 4, generar un archivo Excel descargable con las filas rechazadas y el motivo exacto del error (ej. *"Fila 23: Cédula V-18234567 no registrada en el sistema"*).
- [ ] **Barra de Progreso y Feedback Visual:**
  - Barra de porcentaje animada durante la lectura de archivos pesados y la inserción en base de datos.

---

## 4. Gestión Administrativa: Registro de Nuevos Empleados en el Frontend

Actualmente, el backend cuenta con los endpoints de creación de usuarios y empleados (`POST /api/auth/register` y `POST /api/empleados`). En el frontend ya existe una base inicial:

- **Punto de partida existente:**
  - En el Dashboard temporal (`http://localhost:5173/dashboard`) ya se cuenta con un botón *"Agregar Empleado"* que redirige a la ruta `/Nuevo-Usuario/new`.
  - En la estructura de carpetas existen vistas preliminares en `src/pages/Registrar/` (`RegistrarNuevoUsuarioPage.tsx`, `RegistroEmpleadoPage.tsx`, `FormEmpleado.tsx`).
- **Tareas para consolidarlo:**
  - [ ] Reutilizar y pulir el formulario de `FormEmpleado.tsx` para integrarlo como un Modal o Vista administrativa definitiva (`AdminCreateEmployeeModal`).
  - [ ] Restringir el acceso **estrictamente a usuarios con rol `ADMIN`** (tanto en frontend con guardias de navegación como en backend).
  - [ ] Campos requeridos: Cédula, Nombre Completo, Correo Institucional, Contraseña temporal, Cargo, Horario Laboral, Hora de Entrada y Horas por Día.
  - [ ] Integrar botón de acceso directo *"Nuevo Empleado"* también en la cabecera de la tabla de [AdministracionPage.tsx](file:///c:/Users/Pob/Desktop/Pob/Unet/Informatica%208%20%288vo%20Semestre%29/Servicio%20Comunitario/Servicio_Comunitario_Frontend/src/pages/AdministracionPage.tsx).

---

## 5. Módulo de Revocación de Constancias y Sellos Digitales

Permitirá anular constancias o documentos emitidos previamente en caso de error, retiro o fraude.

### Tareas a implementar:
- [x] **Backend:**
  - Endpoint `PATCH /api/documents/:id/revoke` implementado y testeado con validación de UUID y actualización de `status = 'REVOKED'`.
- [ ] **Frontend (`AdminConstanciasPage.tsx`):**
  - Acción *"Revocar Documento"* en la tabla de constancias emitidas.
  - Modal de confirmación con campo obligatorio para especificar el motivo.
- [x] **Verificación Pública (`/verificar`):**
  - Al escanear un QR revocado, la UI muestra una alerta roja destacada: **"DOCUMENTO REVOCADO"**, con la fecha de revocación y el motivo institucional en [VerificarDocumentoPage.tsx](file:///c:/Users/Pob/Desktop/Pob/Unet/Informatica%208%20(8vo%20Semestre)/Servicio%20Comunitario/Servicio_Comunitario_Frontend/src/pages/VerificarDocumentoPage.tsx).

---

## 6. Carnet Digital Oficial: Descarga e Impresión

### Estado: ✅ Completado e Integrado
- **Ubicación:** [DigitalIDCard.tsx](file:///c:/Users/Pob/Desktop/Pob/Unet/Informatica%208%20%288vo%20Semestre%29/Servicio%20Comunitario/Servicio_Comunitario_Frontend/src/components/features/DigitalIDCard.tsx).
- **Características:**
  - **Botón de Descarga (PNG):** Ubicado en la cabecera de la tarjeta junto al ícono QR. Genera un lienzo Canvas en alta resolución (800x1200 px) con la plantilla oficial del Colegio Santísimo Salvador, periodo escolar, QR nítido, datos del docente y sello digital.

---


> [!TIP]
> **💡 Proposición Arquitectónica (Control Histórico de Tiempos de Servicio e Intervalos Laborales):**
> A futuro, si se desea calcular de forma exacta el tiempo neto de servicio docente para prestaciones o jubilaciones (descontando permisos no remunerados, suspensiones temporales o periodos sabáticos), se propone registrar intervalos laborales en `employee_work_intervals` (`employee_id`, `start_date`, `end_date`, `interval_type`: `'ACTIVO'` | `'LICENCIA'` | `'VACACIONES'`), permitiendo emitir constancias retrospectivas que indiquen tanto la fecha de ingreso primigenia como el tiempo efectivo de servicio.

## 7. Extensión de Atributos de Empleado (DB & Perfiles)

Para alimentar de forma dinámica el **Modal de Eliminación Lógica** ([AdminDeleteEmployeeModal.tsx](file:///c:/Users/Pob/Desktop/Pob/Unet/Informatica%208%20(8vo%20Semestre)/Servicio%20Comunitario/Servicio_Comunitario_Frontend/src/components/features/AdminDeleteEmployeeModal.tsx)) y los **Perfiles de Empleados** ([ProfileHeader.tsx](file:///c:/Users/Pob/Desktop/Pob/Unet/Informatica%208%20(8vo%20Semestre)/Servicio%20Comunitario/Servicio_Comunitario_Frontend/src/components/features/ProfileHeader.tsx)), se requiere agregar las siguientes columnas en la tabla `employees`:

1. **`is_tenured` (o `contract_type`) - Condición Laboral**:
   - **Tipo:** `BOOLEAN DEFAULT true` o `VARCHAR(50)` (`'TITULAR'` | `'CONTRATADO'`).
   - **Propósito:** Distinguir si el docente/personal es titular fijo de la institución o bajo contrato temporal.
   - **Uso en Frontend:** Renderiza la badge oficial (*"Profesor Titular"*, *"Docente Contratado"*, *"Personal Fijo"*).

2. **`academic_title` - Título Universitario / Grado Educativo**:
   - **Tipo:** `VARCHAR(150) NULL` (Ej. *"Licenciado en Educación mención Informática"*, *"Ingeniero de Sistemas"*, *"Técnico Superior Universitario"*).
   - **Propósito:** Certificación profesional del empleado.
   - **Uso en Frontend:** Muestra el grado académico en el modal de eliminación y en la cabecera del perfil docente.

> [!NOTE]
> Si estas dos columnas no se implementan en la base de datos a futuro, el espacio en el modal y perfil deberá reconfigurarse con otros campos ya existentes (ej. fecha de ingreso `start_date` u horario semanal `work_schedule`).

---

---

## 8. Módulo de Documentos Dinámicos y Comprobantes (`/constancias-admin` y `/constancias`)

### 8.1. Estado Actual y Diagnóstico
- **Rutas del Sistema:** `http://localhost:5173/constancias-admin` (Panel de Administración de Comprobantes) y `http://localhost:5173/constancias` (Portal del Empleado).
- **Estado:** ✅ **Completado e Integrado con Persistencia Real (`DocumentVerification`)**
  - Los mocks de `comprobanteMock.ts` y el indicador flotante fueron retirados por completo.
  - Ambas vistas consumen directamente la entidad canónica `DocumentVerification` vía TanStack Query (`useDocuments` y `useDocumentsByRecipient`).
  - Los endpoints `/documents` y `/documents/recipient/:id` realizan consultas reales en PostgreSQL con paginación, filtros de tipo, estado, rango de fechas y búsqueda textual en base de datos.
  - Estandarización de títulos y descargas: `<Tipo de Doc> (<Dia Mes Año>) - <Nombre Destinatario> <Cedula Parseada>`.
  - La barra de filtros de `/constancias` está organizada en 2 filas limpias, y `/constancias-admin` mantiene su cabecera de fila única.
  - El botón "Cargar Nómina del Mes" redirige a `/administracion?upload=true`, expandiendo la sección de carga con animación suave e integrando el flujo de carga real de empleados (`POST /empleados/upload`).

### 8.2. Esquema Relacional de Base de Datos Implementado (`document_verifications`)

La entidad `DocumentVerification` opera como el registro universal e inmutable de certificados y documentos emitidos en el sistema:
- Clave foránea `recipientUserId` vinculada a `users(id)`.
- Metadata JSONB que preserva el snapshot inmutable de emisión (cargo, horas, horario, sueldo).
- Códigos de verificación con sellos criptográficos QR AES-256-GCM.
- Auditoría de estado (`VALID`, `REVOKED`).

### 8.3. Endpoints de la API Backend (NestJS)
1. `GET /documents`:
   - Parámetros: `?search=`, `?page=`, `?limit=`, `?documentType=`, `?status=`, `?from=`, `?to=`.
   - Consulta TypeORM directa con filtrado en base de datos y paginación estructurada.
2. `GET /documents/recipient/:userId`:
   - Historial de documentos del usuario con autorización de auto-acceso y filtros de emisor, tipo, estado y fechas.
3. `GET /documents/stats`:
   - Contadores globales de documentos válidos, revocados y total emitido.
4. `PATCH /documents/:id/revoke`:
   - Revocación de documento con validación de UUID.