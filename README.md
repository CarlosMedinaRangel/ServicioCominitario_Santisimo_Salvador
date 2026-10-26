<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

Nest Santisimo Salvador

## Project setup

```bash
$ npm install


```

## Compile and run the project

```bash

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Up Docker

```bash
# unit tests
$  docker compose up -d

```

```Ingresar en el Puerto 8081 del LocalHost

$ PGADMIN_DEFAULT_PASSWORD=Servicio_Com1
$ PGADMIN_DEFAULT_EMAIL=admin@google.com
```

```Registrar en el servidor

Al registrar el serviror las variables son:

$ Name:SantisimoServer

$ HostName: Santisimo_Salvador
$ port: 5432
$ Maintenance database: postgres

$ Username:postgres
$ password: Servicio_Com1


Una vez creado click derecho en el servidor, create => database => Escribe exactamente SantisimoServer en el nombre y guárdalo.
```

```Dependencias usadas hasta el momento

 @nestjs/config

 @nestjs/typeorm typeorm pg

 class-validator class-transformer

 -g @nestjs/cli

 pdfmake@0.2.10
 --save-dev @types/pdfkit

 @nestjs/passport passport

@nestjs/jwt passport-jwt

 bcrypt
```

---

## 🗄️ Poblar Base de Datos de Desarrollo (Seeder)

Para reiniciar y poblar la base de datos con los arquetipos canónicos escolares y registros de volumen:

```powershell
bun run seed
```

> [!IMPORTANT]
> **Requisito de Seguridad**: El seeder valida que `NODE_ENV=development` esté presente en tu archivo `.env`. Si `NODE_ENV` está configurado como `production` o ausente, la ejecución será rechazada con un `403 Forbidden` para proteger las bases de datos reales. En `AppModule`, el módulo de seed se desacopla automáticamente en entornos que no sean de desarrollo.

### 👤 Usuarios Canónicos Disponibles (Login en Frontend)

| Rol / Perfil | Correo Electrónico | Contraseña por Defecto | Propósito en Pruebas |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin@santisimo.edu` | `Admin123!` | Emisión/revocación de documentos, gestión de personal, reportes |
| **Docente Titular** | `elena.rodriguez@academia.edu` | `Elena123!` | Horarios completos, materias asignadas, grupos y bitácora |
| **Docente de Aula** | `carlos.perez@academia.edu` | `Carlos123!` | Docente con horarios matutinos alternos |
| **Coordinación** | `ana.torres@academia.edu` | `Ana123!` | Coordinación académica escolar |
| **Docente Inactivo** | `docente.inactivo@santisimo.edu` | `Inactivo123!` | Pruebas de borrado lógico, reactivación (`toggleStatus`) y carnets revocados |
| **Bulk (15 Usuarios, siendo N el numero de usuario que son cuando se generaron)** | `employeeN@santisimo.edu` .. `employeeN@santisimo.edu` | `EmployeePass123!` | Paginación de tablas, búsquedas y filtros en la UI |

---

## 🛡️ Cloudflare Turnstile en Desarrollo y Pruebas API (/docs)

Para probar los endpoints de autenticación (como `POST /api/auth/login`) en Swagger ([/docs](http://localhost:3000/docs)) o clientes HTTP sin necesidad de resolver el widget interactivo del navegador:

- **Condición requerida:** `NODE_ENV=development` en el archivo `.env`.
- **Tokens de prueba admitidos:** Puedes enviar cualquiera de los siguientes tokens en el campo `turnstileToken`:
  - `XXXX.DUMMY.TOKEN.XXXX` (Token predeterminado en Swagger)
  - `1x00000000000000000000AA` (Token dummy oficial de Cloudflare)
  - `bypass-dev-token`
- **Comportamiento en Producción:** Cuando `NODE_ENV=production`, este bypass se desactiva estrictamente y se exige la validación del token real contra los servidores de Cloudflare.

