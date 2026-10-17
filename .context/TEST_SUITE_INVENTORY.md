# Especificación de la Suite de Pruebas Backend (Test Inventory)

> **Documento de Referencia Técnica para Implementación de Pruebas Automatizadas (Jest / Supertest)**  
> **Objetivo:** Catálogo técnico exhaustivo de los casos de prueba validados en la integración backend para ser convertidos en tests unitarios y de integración per `AGENTS.md`.

---

## 1. Módulo: Autenticación & Seguridad (`/api/auth`)

### Test 1: Inicio de Sesión de Administrador con Cloudflare Turnstile & Cookie httpOnly
- **Propósito:** Validar autenticación válida, emisión de cookie segura y exclusión de hash de contraseñas.
- **Ruta & Método:** `POST /api/auth/login`
- **Headers:** `Content-Type: application/json`
- **Payload (Body):**
  ```json
  {
    "email": "admin@santisimo.edu",
    "password": "Admin123!",
    "turnstileToken": "0.dummy-token",
    "rememberMe": true
  }
  ```
- **Aserciones / Comportamiento Esperado:**
  - Código HTTP `200` o `201`.
  - Header `Set-Cookie` presente con nombre `auth_token` y flags: `HttpOnly; SameSite=Strict; Path=/`.
  - Si `rememberMe: true`, `Max-Age` configurado a 15 días (1,296,000s); si es falso, cookie de sesión sin `Max-Age`.
  - Body JSON de respuesta contiene `id`, `email`, `fullName`, `roles: ["admin"]`, `isActive: true`.
  - **Invariante Crítica:** El campo `password` (o hash bcrypt) **NUNCA** debe estar presente en el cuerpo de respuesta (`response.body.password === undefined`).
  - El token JWT crudo **no** debe exponerse en el cuerpo JSON principal cuando se use cookie httpOnly como fuente de la verdad.

---

### Test 2: Bloqueo Anti-Bot Cloudflare Turnstile (Falta o Invalidez de Token)
- **Propósito:** Validar que ninguna petición de login sea procesada sin verificación de captcha previa.
- **Ruta & Método:** `POST /api/auth/login`
- **Payload (Body):**
  ```json
  {
    "email": "admin@santisimo.edu",
    "password": "Admin123!"
  }
  ```
- **Aserciones:**
  - Código HTTP `403 Forbidden` con mensaje descriptivo (`"Token de verificación Turnstile requerido"`).
  - La base de datos no debe ser consultada ni debe generarse ninguna sesión.

---

### Test 3: Política de Bloqueo por Fuerza Bruta (Account Lockout) & Throttler
- **Propósito:** Prevenir ataques de diccionario y denegación de servicio.
- **Ruta & Método:** `POST /api/auth/login`
- **Condición:** 5 intentos fallidos consecutivos con contraseña errónea para la misma cuenta.
- **Aserciones:**
  - Intentos 1 al 4: HTTP `401 Unauthorized`.
  - Intento 5: HTTP `423 Locked` con mensaje informando bloqueo temporal por 15 minutos.
  - Rate limiting general (`@Throttle`): Más de 5 peticiones por minuto por IP devuelven HTTP `429 Too Many Requests`.

---

### Test 4: Verificación de Sesión Activa (`checkAuthStatus`)
- **Propósito:** Validar renovación de credenciales y lectura de estado de usuario autenticado.
- **Ruta & Método:** `GET /api/auth/check-status`
- **Headers:** `Cookie: auth_token=<JWT_VALIDO>`
- **Aserciones:**
  - Código HTTP `200 OK`.
  - Body JSON con la entidad de usuario completa y roles vigentes.
  - Sin cookie o con token manipulado/expirado: HTTP `401 Unauthorized`.

---

### Test 5: Actualización de Perfil Propio (`PATCH /auth/update-profile`)
- **Propósito:** Permitir a cualquier usuario autenticado actualizar sus datos personales (nombre, teléfono, foto, cambio de clave).
- **Ruta & Método:** `PATCH /api/auth/update-profile`
- **Headers:** `Cookie: auth_token=<JWT_VALIDO>`, `Content-Type: application/json` o `multipart/form-data`
- **Payload Ejemplo:**
  ```json
  {
    "fullName": "Carlos Medina Rangel",
    "telefono": "0414-1234567"
  }
  ```
- **Aserciones:**
  - Código HTTP `200 OK`.
  - Retorna el usuario actualizado sin incluir contraseña.
  - Si se envía `newPassword`, `currentPassword` es requerido y se valida con `await bcrypt.compare()`. El nuevo hash se calcula de forma asíncrona (`await bcrypt.hash()`).

---

### Test 6: Cierre de Sesión Seguro (`POST /auth/logout`)
- **Propósito:** Destruir la cookie de sesión en el navegador cliente.
- **Ruta & Método:** `POST /api/auth/logout`
- **Aserciones:**
  - Código HTTP `200 OK`.
  - Header `Set-Cookie` emite `auth_token=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`.

---

## 2. Módulo: Empleados (`/api/empleados`)

### Test 7: Listado General con Filtrado de Soft-Delete
- **Propósito:** Obtener catálogo de empleados activos, excluyendo bajas lógicas.
- **Ruta & Método:** `GET /api/empleados` (opcional query `?status=all` o `?status=active`)
- **Headers:** `Cookie: auth_token=<JWT_VALIDO>`
- **Aserciones:**
  - Código HTTP `200 OK`.
  - Retorna un array de empleados.
  - Cada elemento incluye datos laborales (`position`, `hours_per_day`, `work_schedule`, `start_date`) y relación `user`.
  - Por defecto, los empleados con `user.isActive === false` están excluidos salvo que se solicite filtro administrativo explícito.

---

### Test 8: Detalle de Empleado con Token de Carnet Digital (`digitalIdToken`)
- **Propósito:** Garantizar que al consultar un empleado se genere dinámicamente su token criptográfico para carnet estudiantil/institucional.
- **Ruta & Método:** `GET /api/empleados/:id`
- **Aserciones:**
  - Código HTTP `200 OK`.
  - Propiedad `digitalIdToken` no nula, de tipo string base64url o HMAC firmado.
  - Empleado inexistente: HTTP `404 Not Found`.

---

### Test 9: Horarios y Grupos Académicos del Empleado
- **Propósito:** Validar endpoints de agenda laboral y asignación de cursos.
- **Rutas & Métodos:**
  - `GET /api/empleados/:id/schedules` -> HTTP `200`, array con `day_of_week`, `start_time`, `end_time`.
  - `GET /api/empleados/:id/groups` -> HTTP `200`, array con `grade`, `section`, `subject`.

---

### Test 10: Baja Lógica (Soft Delete) y Reactivación
- **Propósito:** Validar que nunca se borren registros físicos de la base de datos per directiva de `AGENTS.md`.
- **Rutas & Métodos:**
  - `DELETE /api/empleados/:id` (o `PATCH /api/empleados/:id/toggle-status`)
- **Aserciones:**
  - Código HTTP `200 OK`.
  - En base de datos, `user.isActive` cambia a `false`.
  - El registro del empleado y sus constancias históricas permanecen intactos en la tabla `employee`.

---

## 3. Módulo: Documentos, Sellos QR & Auditoría (`/api/documents` & `/api/reports`)

### Test 11: Generación de Constancia de Trabajo Simple con Sello QR Criptográfico
- **Propósito:** Emitir PDF institucional con sello criptográfico inviolable embebido.
- **Ruta & Método:** `GET /api/empleados/Constancia-Empleado/:id`
- **Headers:** `Cookie: auth_token=<JWT_VALIDO>`
- **Aserciones:**
  - Código HTTP `200 OK`.
  - Header `Content-Type: application/pdf`.
  - Longitud binaria del buffer > 50,000 bytes.
  - Se registra internamente en la tabla `document_verification` un registro con `id`, hash SHA-256 de los datos y tipo `CONSTANCIA_TRABAJO`.
  - Se genera un evento de auditoría en `ActivityService` con tipo `"Constancia Generada"`.

---

### Test 12: Generación de Constancia Mensual con Desglose de Actividades
- **Propósito:** Emitir PDF de constancia con parámetro de periodo y firma autorizada.
- **Ruta & Método:** `GET /api/empleados/Constancia-Empleado/:id?month=2026-10&employerName=Carlos+Medina&employerPosition=Director`
- **Aserciones:**
  - Código HTTP `200 OK`, `Content-Type: application/pdf`.
  - Espacio de firma de 40pt para suscripción manuscrita al lado del Sello QR oficial.
  - Registro de auditoría en `activities` detallando: `Constancia mensual de 10-2026`, firmada por Carlos Medina (Director).

---

### Test 13: Verificación Pública de Sello QR (`POST /api/documents/verify`)
- **Propósito:** Portal público para autenticar constancias emitidas sin requerir sesión iniciada.
- **Ruta & Método:** `POST /api/documents/verify`
- **Headers:** `Content-Type: application/json`
- **Casos:**
  1. **Sello Inválido / Manipulado:** Body `{ "code": "INVALID-FORMAT" }` -> HTTP `400 Bad Request` (`"Formato de sello QR inválido"`).
  2. **Firma Alterada:** Body con IV o authTag alterado -> HTTP `400 Bad Request` o `401` (`"Sello adulterado o firma HMAC inválida"`).
  3. **Sello Válido:** Body con `SS-DOC:v1:<iv>.<authTag>.<cipher>` -> HTTP `200 OK`, retornando metadatos del documento (nombre, cédula, fecha emisión, estado: *"VÁLIDO"*).

---

## 4. Documentación & Infraestructura

### Test 14: Especificación OpenAPI / Swagger
- **Ruta & Método:** `GET /docs-json` y `GET /docs`
- **Aserciones:**
  - Código HTTP `200 OK`.
  - Título de API: `"Servicio Comunitario RESTFul API"`.
  - **Invariante:** Swagger debe estar montado en `/docs`, **nunca** en `/api` para evitar colisiones de enrutamiento con los controladores.
