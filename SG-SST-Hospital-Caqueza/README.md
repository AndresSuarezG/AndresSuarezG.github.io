# Plataforma SG-SST – Inducción Interactiva
## ESE Hospital San Rafael de Cáqueza y Centros de Salud Adscritos

Plataforma web de inducción interactiva al Sistema de Gestión de Seguridad y Salud en el Trabajo (SG-SST), lista para producción con frontend puro (HTML + CSS + JS) y base de datos en localStorage del navegador.

---

## Estructura del proyecto

```
SG-SST-Hospital-Caqueza/
├── index.html                  ← Login + Registro (punto de entrada)
├── css/
│   ├── styles.css              ← Estilos globales + variables corporativas
│   ├── login.css               ← Estilos de login/registro
│   ├── dashboard.css           ← Dashboard del invitado
│   ├── modulo.css              ← Vista de módulo + evaluación
│   └── admin.css               ← Panel de administración
├── js/
│   ├── database.js             ← BD en localStorage (10 módulos completos)
│   └── auth.js                 ← Gestión de sesión (sessionStorage)
└── pages/
    ├── dashboard.html          ← Menú de módulos del invitado
    ├── modulo.html             ← Pantallas de contenido + evaluación
    ├── certificado.html        ← Vista + descarga PDF del certificado
    └── admin.html              ← Panel admin (usuarios, progreso, edición)
```

---

## Credenciales de acceso

| Rol       | Usuario   | Contraseña |
|-----------|-----------|------------|
| **Admin** | `admin`   | `admin2026` |
| Invitado  | (documento) | (mismo documento) |

---

## Funcionalidades

### Invitado
- ✅ Registro con validación completa y aceptación de aviso de privacidad
- ✅ Login con sesión persistente en sessionStorage
- ✅ Dashboard con progreso visual (% completado, módulos aprobados)
- ✅ 10 módulos secuenciales bloqueados hasta aprobar el anterior
- ✅ Cada módulo: 4–5 pantallas de contenido con botón "Marcar como revisado"
- ✅ Evaluación: 2 preguntas aleatorias del banco de 4 por módulo
- ✅ Retroalimentación inmediata con colores (verde/rojo)
- ✅ Reintentos ilimitados con nuevas preguntas cada vez
- ✅ Certificado PDF descargable solo al aprobar los 10 módulos

### Admin
- ✅ Panel con 4 secciones (Usuarios, Progreso, Módulos, Preguntas)
- ✅ Tabla de usuarios con filtros (nombre, sede, estado)
- ✅ Estadísticas de progreso por usuario
- ✅ **Exportar Excel** con SheetJS (datos de usuarios + intentos por módulo)
- ✅ Edición de pantallas de cada módulo (título, contenido HTML, icono)
- ✅ Edición del banco de preguntas (texto, opciones, respuesta correcta)
- ✅ Eliminación de usuarios con confirmación

---

## Contenido de los 10 módulos

| # | Módulo | Estado en guión |
|---|--------|----------------|
| 1 | Conoce nuestro SG-SST | Parcial |
| 2 | Nuestro compromiso con la seguridad | Base suficiente |
| 3 | Trabajamos por un entorno seguro | Base suficiente |
| 4 | La seguridad es responsabilidad de todos | Parcial |
| 5 | Tu voz cuenta: comités | Parcial |
| 6 | Reconoce los peligros, previene los riesgos | Parcial |
| 7 | Aprende a reportar y actuar | Parcial |
| 8 | Preparados para actuar | Por construir |
| 9 | Cuidamos tu salud | Por construir |
| 10 | Participa y construye prevención | Parcial |

> Los módulos marcados "Parcial" o "Por construir" en el guión tienen contenido pedagógico propuesto en la plataforma. El administrador debe validar y actualizar los datos pendientes (comités, brigadistas, rutas de emergencia, QR) directamente desde el panel de administración.

---

## Base de datos (localStorage)

No requiere servidor. Toda la información se almacena en el navegador del cliente:

- `sgsstdb_usuarios` – Array de usuarios registrados
- `sgsstdb_modulos`  – Array de módulos con contenido y preguntas
- `sgsstdb_progreso_{userId}` – Progreso individual por usuario

**Para producción real** con múltiples usuarios, migrar a un backend (Firebase, Supabase, Node.js + PostgreSQL, o Google Apps Script con Sheets).

---

## Producción: notas previas al lanzamiento

Según el guión, antes de publicar confirmar con el área SST:

- [ ] Actas y períodos vigentes de COPASST y CCL
- [ ] Integrantes y datos de contacto de los comités
- [ ] Rutas de emergencia y brigadistas por sede
- [ ] Planos y puntos de encuentro por sede
- [ ] QR de reporte vigente (pág. 19 del PDF fuente)
- [ ] Procedimiento de evaluaciones médicas ocupacionales
- [ ] Versiones oficiales de las tres políticas institucionales

---

## Cómo abrir

1. Abrir `index.html` directamente en el navegador (doble clic) **o**
2. Usar un servidor local: `npx serve .` / `python -m http.server 8080`

> No requiere instalación de dependencias. Las librerías externas (jsPDF, SheetJS) se cargan vía CDN.

---

*Desarrollado para la ESE Hospital San Rafael de Cáqueza • SG-SST 2026*
