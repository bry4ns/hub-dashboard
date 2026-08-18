# 🚀 Dashboard Hub Central con Login Seguro, Auto-Scraping y Soporte Nativo para Beszel

Lanzador de aplicaciones web, proyectos y servicios centralizado con extracción automática de datos (OpenGraph/Favicons), verificación de estado en tiempo real e **integración completa con Beszel Hub**.

---

## ✨ Características Principales

1. **🔐 Autenticación y Seguridad**:
   - Asistente en el primer inicio para configurar el usuario y clave de administrador.
   - Contraseñas cifradas con `bcryptjs`.
   - Sesiones seguras mediante Cookies `httpOnly` y tokens JWT firmados con `jose`.

2. **⚡ Auto-Scraping Inteligente (Cero carga manual)**:
   - Pega la URL de cualquier proyecto, web o API y pulsa **Auto-detectar**.
   - Extrae automáticamente: **título**, **descripción**, **icono/favicon** y la **imagen de portada (OpenGraph banner)**.

3. **🟢 Monitor de Estado (Uptime & Health Check)**:
   - Indicador visual en tiempo real en cada tarjeta:
     - 🟢 **Online** (con latencia exacta en milisegundos, ej. `38 ms`).
     - 🟡 **Lento / Alerta** (> 1500 ms o redirección).
     - 🔴 **Offline / Caído** (timeout, conexión rechazada o error 5xx).
   - Botón global **"Comprobar Estado"** para verificar todas tus webs en paralelo.
   - Posibilidad de definir endpoints de salud específicos (ej. `https://miapi.com/health`).

4. **⚡ Soporte Nativo para Beszel Hub & Servidores**:
   - Conexión directa con la API de **Beszel Hub** (PocketBase).
   - **Auto-importación masiva**: Un botón para importar y sincronizar todos los servidores registrados en tu Beszel Hub automáticamente.
   - **Métricas completas en la tarjeta**:
     - 🧠 **RAM**: Uso % y GB exactos (`6.4 GB / 16.0 GB`).
     - ⚡ **CPU**: Carga en tiempo real.
     - 💾 **Disco**: Porcentaje de almacenamiento usado.
     - 🐳 **Docker**: Conteo de contenedores en ejecución.
     - 🌡️ **Temperatura**: °C del procesador.
     - 🟢 **Estado del nodo**: UP / DOWN / PAUSED.

5. **📐 Tamaños de Tarjeta Personalizables**:
   - Alterna entre 4 tamaños: **📱 Compacta**, **🔲 Normal (1x1)**, **🖥️ Ancha (2x1)** y **📺 Grande (2x2)** con un solo clic.

6. **📊 Banner Superior de Infraestructura**:
   - Suma la **RAM Total combinada de todos tus servidores**, promedio de CPU y número de nodos en línea.

---

## 🚀 Cómo Iniciar el Dashboard

### Opción 1:
Haz doble clic en:
```text
iniciar-dashboard.bat
```

### Opción 2:
```bash
npm.cmd run dev
```

Luego abre tu navegador en:
👉 **[http://localhost:3000](http://localhost:3000)**
