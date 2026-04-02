# G-MKT AI - Plataforma de Automatización de Redes Sociales

Este repositorio contiene el código fuente de "G-MKT AI", una plataforma SaaS para facilitar a marcas, agencias y creadores planificar, escribir y publicar estrategias en redes sociales de manera automatizada usando Inteligencia Artificial.

## Arquitectura Tecnológica

- **Frontend**: Interfaz visual estilizada y moderna usando **Next.js** (React) de forma nativa.
- **Backend / API**: Motor en **FastAPI** (Python) que despacha la información en milisegundos.
- **Cola de Tareas Asíncronas**: **Celery** apoyado por **Redis** (para que tareas pesadas como hacer videos con IA no congelen la app).
- **Base de Datos**: **PostgreSQL**, gestionado localmente por Docker Compose.
- **Cerebro Artificial**: Conectado e integrado mediante API a **Google Gemini** para generación de contenidos.

---

## 🛠 Guía para "Dummies": Cómo prender el proyecto

No te preocupes si no recuerdas cómo arrancar todo. Solo sigue estos sencillos pasos cada mañana que vayas a trabajar en el proyecto:

### 1. Prender el Motor Local (Base de datos y Caché)
La plataforma necesita una base de datos.
1. Abre **Docker Desktop** en tu Mac para cerciorarte que Docker esté activo.
2. Ve a tu terminal y entra a la carpeta del proyecto:
   ```bash
   cd /Users/gsoto/Desktop/mkt
   ```
3. Levanta la Base de Datos escribiendo:
   ```bash
   docker-compose up -d
   ```
   *(Verás "Started". Esto significa que PostgreSQL ya está recibiendo peticiones).*

### 2. Prender el Backend (La caja fuerte del proyecto)
El backend es el encargado de interactuar con IA y comunicarse con tus redes sociales.
1. Abre una **nueva pestaña** en la terminal.
2. Accede a la bóveda del backend y prende el entorno virtual (que evita problemas de dependencias):
   ```bash
   cd /Users/gsoto/Desktop/mkt/backend
   source venv/bin/activate
   ```
3. Enciende el servidor con este comando:
   ```bash
   uvicorn app.main:app --reload
   ```
   *(Dato de oro: Verás "Application startup complete". Tu API vive en [http://localhost:8000](http://localhost:8000))*

### 3. Prender el Frontend (La cara bonita del proyecto)
Esta es la interfaz de trabajo.
1. Abre una **tercera pestaña** en tu terminal.
2. Entra a la carpeta frontend:
   ```bash
   cd /Users/gsoto/Desktop/mkt/frontend
   ```
3. Ejecuta el entorno de desarrollo:
   ```bash
   npm run dev
   ```
   *(¡Boom! Entra a [http://localhost:3000](http://localhost:3000) en Safari o Chrome y verás el proyecto).*

### Bonus: Configuración por Primera Vez
Si abres este proyecto por primera vez en una compu nueva, en lugar de solo `npm run dev`, debes hacer:
- En frontend: Correr `npm install` (una única vez para descargar los paquetes).
- En backend: Correr `pip install -r requirements.txt` (una vez creado ese archivo).

---
*Con esto, ¡ya estás listo para usar G-MKT AI!*
