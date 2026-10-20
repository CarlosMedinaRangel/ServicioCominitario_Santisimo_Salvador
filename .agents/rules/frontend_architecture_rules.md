# Reglas y Estándares de Desarrollo — Proyecto Santísimo Salvador

## 1. Runtime y Gestor de Paquetes
- **Usar exclusivamente Bun:** Todos los scripts de frontend, gestión de dependencias y compilación deben ejecutarse mediante `bun` y `bunx` (nunca `npm` ni `npx`).
- **Rutas en Windows:** En PowerShell, navegar usando `Set-Location -LiteralPath "<ruta>"` para evitar errores con caracteres especiales y espacios.

## 2. Sistema de Diseño, Tokens y Tailwind
- **Revisar `index.css` como Fuente de Verdad:** Antes de estilizar, consultar `src/index.css` para utilizar las clases y variables semánticas configuradas.
- **Unidades `rem` Obligatorias:** Usar `rem` en lugar de `px` siempre que sea posible para mantener accesibilidad, escalabilidad tipográfica y consistencia responsive.
- **Colores Semánticos de Shadcn / Tailwind:**
  - Fondos y texto base: `bg-card`, `text-card-foreground`, `bg-background`, `text-foreground`, `border-border`.
  - Informativo: `bg-info`, `text-info`, `bg-info/10`, `border-info/20`.
  - Éxito: `bg-success`, `text-success`, `bg-success/15`, `border-success/30`.
  - Advertencia: `bg-warning`, `text-warning`, `bg-warning/15`, `border-warning/30`.
  - Destructivo / Error: `bg-destructive`, `text-destructive`, `bg-destructive/15`, `border-destructive/30`.
  - Silenciado / Muted: `text-muted-foreground`, `bg-muted/30`.
  - *Prohibido el uso de colores genéricos planos como `bg-red-500`, `bg-blue-600` sin justificación explícita.*
- **Diseños de Referencia:** Consultar la carpeta `desing/` en el frontend para referencias visuales e intenciones de diseño.

## 3. Importaciones y Alias de Módulo
- **Usar siempre alias `@/...`:** Importar desde `@/components/...`, `@/hooks/...`, `@/services/...`, `@/utils/...` en lugar de rutas relativas largas (`../../../`).

## 4. Formateadores Centralizados
- **Prohibido duplicar formateadores inline.** Reutilizar siempre las funciones centralizadas en `@/utils/formatters.ts`:
  - `formatCedula`: Formateo con puntos y prefijo venezolano (ej. `V-30.000.000`).
  - `formatVES`: Formateo monetario en Bolívares usando `Intl.NumberFormat`.
  - `formatDDMMYYYY`: Formateo de fechas legible.
  - `formatSeniority`: Cálculo legible de años y meses de servicio.
  - `getInitials`: Extracción de iniciales para avatares.

## 5. Arquitectura y Modularización Atómica
- **Páginas Ligeras (`src/pages/`):** Deben funcionar como orquestadores declarativos con menos de 250 líneas de código.
- **Hooks de Estado y Queries (`src/hooks/<dominio>/`):** Toda la lógica de react-query, filtrado, ordenamiento y mutaciones debe residir en hooks desacoplados.
- **Componentes de Feature (`src/components/features/`):** Modales, barras laterales y tarjetas específicas de una funcionalidad.
- **Componentes Comunes y Atómicos (`src/components/common/` y `src/components/ui/`):** Dropzones, botones, inputs y primitivas de shadcn reutilizables.
- **Servicios Puros (`src/services/`):** Algoritmos no visuales (Canvas, ZXing/jsQR, PDF.js, criptografía AES-256-GCM) sin hooks de React ni JSX.

## 6. Memoria y Hoja de Ruta del Proyecto
- Consultar el archivo de pendientes `ROADMAP_ARQUITECTURA_TODOS.md` y la carpeta `OpenCodeMds/` antes de tomar decisiones sobre funcionalidades futuras.

## 7. Accesibilidad y Tablas
- En tablas con datos densos, incluir siempre atributos `title` o tooltips accesibles en celdas de texto susceptible a truncamiento (Nombres, Cédulas, Cargos, Correos).

## 8. Ciclo de Vida de Documentos, Tratamiento de Anulados y Prevención de Spam
- **Exclusión por defecto de ANULADOS (Soft-Delete):**
  - Los documentos o comprobantes con `estado === "ANULADO"` se consideran eliminaciones lógicas (generadas por errores o rectificaciones).
  - Por defecto (en consultas regulares y con el filtro "Todos"), **NO** deben incluirse en la lista ni sumarse al conteo de registros activos.
  - Únicamente se consultan y muestran cuando el usuario selecciona explícitamente el filtro `Estado: "Anulado"`.
- **Prevención de Spam y Límite Diario de Emisión (Rate Limiting):**
  - Cada tipo de documento (`CONSTANCIA_TRABAJO`, `RECIBO_PAGO`, `CONSTANCIA_ESTUDIO`, etc.) debe contar con un límite de emisión (máximo 1 solicitud por 24 horas por período).
  - Si un usuario ya generó un documento de ese tipo hoy, se le debe advertir amistosamente y ofrecerle la descarga del comprobante existente en lugar de duplicar registros y firmas criptográficas en la base de datos.
