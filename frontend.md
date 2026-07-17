# Frontend — Santísimo Salvador

Guía para agregar una interfaz web al backend NestJS del proyecto.

---

## 1. ¿Dónde va el frontend?

**Fuera del backend, al mismo nivel:**

```
ServicioCominitario_Santisimo_Salvador/   ← backend NestJS (este repo)
├── src/
├── docker-compose.yml
├── frontend.md                ← este archivo
│
└── frontend/                  ← frontend React (Vite)
    ├── package.json
    ├── vite.config.ts
    ├── index.html
    └── src/
```

Razones:
- **package.json separado** — evita conflictos con las dependencias de NestJS
- **Config propia** — vite.config.ts, tsconfig, ESLint independientes
- **Despliegue flexible** — backend en Railway/Render, frontend en Vercel/Netlify
- **Sin monorepo** — Nx/Turborepo agregan complejidad innecesaria para este proyecto

Si más adelante el proyecto crece mucho, puedes migrar a un monorepo (Nx, Turborepo, PNPM workspace), pero por ahora no hace falta.

---

## 2. Stack Stack tecnológico

| Capa | Tecnología | Propósito |
|------|-----------|-----------|
| Framework | React 18 + TypeScript | UI de componentes |
| Build tool | Vite 7 | Dev rápido, build optimizado |
| Routing | React Router v7 | Navegación SPA |
| Estilos | Tailwind CSS v4 | CSS utilitario responsive |
| Iconos | Lucide React | Iconos SVG |
| HTTP client | Axios | Llamadas a la API NestJS |
| (opcional) | TanStack React Query | Cache y sincronización de datos del servidor |
| (opcional) | React Hook Form + Zod | Formularios con validación |

### NOTA sobre Prisma

**Prisma no va en el frontend.** Prisma es un ORM de backend que se conecta directo a la base de datos. El frontend se comunica con el backend **exclusivamente a través de la API REST** (`http://localhost:3000/api/empleados`, etc.).

Si quieres tipos compartidos entre frontend y backend, puedes:
- Exportar tipos manualmente desde el backend y copiarlos al frontend
- Usar un paquete compartido (si montas un monorepo más adelante)
- Generar tipos desde la API con **openapi-typescript** o **Orval** si documentas los endpoints con Swagger

---

## 3. Conexión con la API

El backend corre en `http://localhost:3000/api/`. Crea un archivo de configuración de Axios:

```ts
// src/lib/axios.ts
import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: { 'Content-Type': 'application/json' },
})

export default api
```

Uso en un componente:

```tsx
import { useEffect, useState } from 'react'
import api from '../lib/axios'

interface Empleado {
  id: number
  name: string
  cedula: string
  telefono: string
  position: string
}

function EmpleadosList() {
  const [empleados, setEmpleados] = useState<Empleado[]>([])

  useEffect(() => {
    api.get('/empleados').then(res => setEmpleados(res.data))
  }, [])

  return (
    <ul>
      {empleados.map(emp => (
        <li key={emp.id}>{emp.name} — {emp.position}</li>
      ))}
    </ul>
  )
}
```

---

## 4. Diseño responsive con Tailwind CSS

### Mobile-first: ¿qué significa?

**Mobile-first** significa que los estilos base (sin breakpoint) son para mobile, y usas breakpoints para **mejorar** la vista en pantallas más grandes.

Tailwind está diseñado para mobile-first. Los breakpoints de Tailwind:

| Breakpoint | Min-width | Apunta a |
|-----------|-----------|----------|
| `sm` | 640px | Tablets pequeñas |
| `md` | 768px | Tablets grandes |
| `lg` | 1024px | Laptops |
| `xl` | 1280px | Desktop |
| `2xl` | 1536px | Pantallas grandes |

### Regla de oro

> **Base = mobile. Breakpoint = mejora progresiva.**

```html
<!-- Mobile: stacked. md+: row -->
<div class="flex flex-col gap-4 md:flex-row md:gap-6">

<!-- Mobile: 1 col. md: 2 cols. lg: 3 cols -->
<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">

<!-- Mobile: oculto. lg+: visible como sidebar -->
<aside class="hidden lg:block lg:w-64">

<!-- Mobile: texto chico. md+: más grande -->
<h1 class="text-xl font-bold md:text-2xl lg:text-3xl">
```

### Patrones responsive comunes

#### Layout principal (sidebar + contenido)

```tsx
function Layout() {
  return (
    <div className="flex flex-col min-h-screen lg:flex-row">
      {/* Sidebar: abajo en mobile, izquierda en desktop */}
      <nav className="w-full lg:w-64 lg:min-h-screen bg-gray-900 text-white p-4">
        ...
      </nav>

      {/* Contenido principal */}
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        ...
      </main>
    </div>
  )
}
```

#### Tabla responsive (cards en mobile, tabla en desktop)

```tsx
function EmpleadosTable() {
  return (
    <>
      {/* Vista mobile: cards */}
      <div className="grid gap-4 md:hidden">
        {empleados.map(emp => (
          <div key={emp.id} className="bg-white rounded-xl shadow p-4">
            <p className="font-bold">{emp.name}</p>
            <p className="text-sm text-gray-500">{emp.position}</p>
            <p className="text-sm text-gray-500">{emp.cedula}</p>
          </div>
        ))}
      </div>

      {/* Vista desktop: tabla */}
      <table className="hidden md:table w-full text-left">
        <thead>
          <tr className="border-b">
            <th className="p-3">Nombre</th>
            <th className="p-3">Cédula</th>
            <th className="p-3">Cargo</th>
          </tr>
        </thead>
        <tbody>
          {empleados.map(emp => (
            <tr key={emp.id} className="border-b hover:bg-gray-50">
              <td className="p-3">{emp.name}</td>
              <td className="p-3">{emp.cedula}</td>
              <td className="p-3">{emp.position}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
```

#### Grilla de tarjetas responsive

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
  {items.map(item => (
    <div key={item.id} className="bg-white rounded-xl shadow p-4">
      ...
    </div>
  ))}
</div>
```

#### Formulario responsive

```tsx
<form className="max-w-md mx-auto space-y-4">
  <div className="flex flex-col gap-1">
    <label className="text-sm font-medium">Nombre</label>
    <input className="border rounded-lg p-2" />
  </div>

  {/* Dos columnas en tablet+ */}
  <div className="flex flex-col gap-4 sm:flex-row">
    <div className="flex-1 flex flex-col gap-1">
      <label className="text-sm font-medium">Teléfono</label>
      <input className="border rounded-lg p-2" />
    </div>
    <div className="flex-1 flex flex-col gap-1">
      <label className="text-sm font-medium">Cargo</label>
      <input className="border rounded-lg p-2" />
    </div>
  </div>

  <button className="w-full bg-blue-600 text-white rounded-lg p-2 hover:bg-blue-700">
    Guardar
  </button>
</form>
```

### Tips prácticos

1. **Diseña en mobile primero** — Abre el navegador en 375px de ancho y construye la vista. Luego ve estirando hasta que se vea mal, y ahí agregas el breakpoint.

2. **Usa `flex-col` como base** — Casi todo empieza apilado en mobile. Solo agregas `md:flex-row` cuando necesites filas.

3. **`hidden` y `lg:block`** — Muestra/oculta elementos según el tamaño. Útil para menús hamburguesa que se convierten en sidebar en desktop.

4. **`text-sm md:text-base lg:text-lg`** — Texto responsive sin saltos abruptos.

5. **`p-4 md:p-6 lg:p-8`** — Espaciado que crece con la pantalla.

6. **Usa la extensión de VS Code "Tailwind CSS IntelliSense"** — autocompletado de clases.

7. **No pienses en "tamaños de pantalla", piensa en "cuándo se rompe el diseño"** — Agrega breakpoints solo donde el layout deje de verse bien.

---

## 5. Estructura sugerida del frontend

```
frontend/src/
├── lib/
│   └── axios.ts                # Instancia de Axios configurada
├── components/
│   ├── ui/                     # Componentes reutilizables (Button, Input, Modal...)
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── Layout.tsx
│   └── empleados/
│       ├── EmpleadosList.tsx
│       ├── EmpleadoCard.tsx
│       └── EmpleadoForm.tsx
├── pages/
│   ├── Dashboard.tsx
│   ├── Empleados.tsx
│   └── Login.tsx
├── App.tsx                     # Router
├── main.tsx                    # Entry point
└── index.css                   # @import "tailwindcss"
```

---

## 6. Configuración inicial (ya está hecha)

El proyecto ya fue inicializado con:

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install tailwindcss @tailwindcss/vite react-router-dom lucide-react axios
```

- **Tailwind v4** configurado via `@tailwindcss/vite` plugin en `vite.config.ts`
- **React Router** listo para usar
- **Lucide React** instalado para iconos
- **Axios** instalado para HTTP

Para arrancar:

```bash
cd frontend
npm run dev
```

Abre `http://localhost:5173` y empieza a desarrollar.

---

## 7. Resumen de pasos siguientes

1. Crea `src/lib/axios.ts` con la instancia de Axios
2. Define layouts responsive (sidebar + header + main)
3. Crea páginas: Login, Dashboard, Empleados (lista + formulario)
4. Conecta cada página con los endpoints del backend
5. Diseña mobile-first: arranca con `flex-col`, agrega breakpoints donde sea necesario
