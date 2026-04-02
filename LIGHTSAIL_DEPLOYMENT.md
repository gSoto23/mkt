# Guía de Despliegue en AWS Lightsail (Modo "A Prueba de Balas")

Bienvenido al mundo de los servidores vivos. AWS Lightsail es el equivalente a alquilar una computadora en la nube que nunca se apaga. Esta guía está diseñada sin jerga técnica para que puedas subir tu portal hoy mismo.

---

## 🏗️ FASE 1: Preparar la Máquina (Tu Servidor)

1. **Crear la Instancia en AWS**
   - Inicia sesión en [AWS Lightsail](https://lightsail.aws.amazon.com/).
   - Haz clic en el botón naranja **Create instance** (Crear instancia).
   - **Localización**: Elige `US East (N. Virginia)` o la que esté más cerca de tu país.
   - **Imagen (OS Only)**: Selecciona **Ubuntu 22.04 LTS** (o 24.04). No uses las Apps (ni Node, ni WordPress, solo el OS pelado).
   - **Plan**: Te sugiero el plan de **$10 USD / mes** (2 GB RAM, 2 vCPUs) como mínimo absoluto. Nuestro motor de IA y bases de datos necesitan memoria RAM para no congelarse.
   - **Nombre de Instancia**: Escribe `gmkt-production` y dale a **Create instance**.

2. **Abrir los Puertos de Red (Firewall)**
   - Una vez la instancia diga "Running" (Corriendo), haz clic en su nombre.
   - Ve a la pestaña **Networking** (Redes).
   - En la sección IPv4 Firewall, haz clic en **+ Add rule**.
   - Añade los puertos:
     - `HTTP` (TCP) en el puerto **80**
     - `HTTPS` (TCP) en el puerto **443**
     - `Custom` (TCP) en el puerto **8000** (Opcional, para testing directo del Backend).
     - `Custom` (TCP) en el puerto **3000** (Opcional, para testing directo del Frontend).

3. **Conectarse al Servidor**
   - Arriba a la derecha verás un botón naranja que dice **Connect using SSH** (o un ícono pequeño de terminal negro). Haz clic ahí. Se te abrirá una terminal negra en tu navegador. ¡Felicidades, estás dentro del cerebro de tu servidor!

---

## 🛠️ FASE 2: Instalar el Ecosistema

En la terminal negra que abriste, copia y pega estos comandos uno por uno (presiona Enter al final de cada uno):

**1. Actualizar la computadora:**
```bash
sudo apt update && sudo apt upgrade -y
```

**2. Instalar Node.js, Python, y PM2 (El administrador que mantiene las apps vivas 24/7):**
```bash
sudo apt install -y python3-pip python3-venv git curl postgresql postgresql-contrib nginx redis-server
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

**3. Clonar y traer tu código al Servidor:**
*(Nota: Pega la URL de tu github, si es privado, github te pedirá tu usuario y un Personal Access Token).*
```bash
git clone https://github.com/TU_USUARIO/TU_REPOSITORIO.git mkt
cd mkt
```

---

## 📦 FASE 3: Prender Motores (Despliegue Inicial)

Siempre dentro de la terminal negra (estando dentro de la carpeta `mkt`):

### A. Prender Base de Datos y Redis (Usando tu Docker)
```bash
sudo apt install docker-compose -y
sudo docker-compose up -d
```

### B. Levantar el Backend (FastAPI / Inteligencia Artificial)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```
👉 *Punto Crítico:* Tienes que clonar tus variables de entorno. Crea tu archivo de claves oculto y pega tu `GEMINI_API_KEY`:
```bash
nano .env
# Pega adentro tus claves y guarda apretando: CTRL+X, luego Y, luego Enter
```

Iniciemos el Backend en modo "Infinito" usando PM2:
```bash
pm2 start "venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000" --name "gmkt-backend"
```

### C. Levantar el Frontend (El Portal Gráfico)
```bash
cd ../frontend
npm install
npm run build
```
👉 *Punto Crítico:* Configura las contraseñas para asegurar el Frontend creando el archivo maestro de variables:
```bash
nano .env
```
*(Se abrirá el editor en consola. Pega exactamente esto adentro):*
```env
PORTAL_USER=gerardo
PORTAL_PASS=231287
```
*(Guarda los cambios usando tu teclado: Presiona `CTRL+X`, luego la letra `Y`, y finalmente `Enter`).*

Iniciemos el Frontend en modo "Infinito":
```bash
pm2 start npm --name "gmkt-frontend" -- start
```

### D. Auto-arranque si falla Lightsail
Si Amazon reinicia tu servidor por razones técnicas, quieres que tus apps revivan solas:
```bash
pm2 save
pm2 startup
# (La consola te escupirá un comando aquí, CÓPIALO y PÉGALO para terminar).
```

¡Ya está! Si vas a la IP de tu servidor Lightsail tipo `http://111.222.333.444:3000`, verás tu portal vivo en internet para todo el mundo.

---

## 🚀 FASE 4: Re-Deploy del Futuro (Cuando Actualices Cosas)

Cuando modifiques tu código localmente, la rutina para que el servidor lo descargue y se actualice es extremadamente sencilla.
En tu terminal de Lightsail corres:

```bash
cd mkt
git pull origin main
```

**Si cambiaste algo en Python (Backend):**
```bash
pm2 restart gmkt-backend
```

**Si cambiaste algo Visual (Frontend Next.js):**
```bash
cd frontend
npm run build
pm2 restart gmkt-frontend
```

> **Dominio Nativo Requerido (El paso final opcional):** Para que las personas entren con `www.tumarketing.com` en vez de una IP desnuda con `:3000`, necesitaríamos enlazar el Nginx Proxy. Eso lo podemos hacer en un par de minutos el día que compres o elijas el dominio oficial de lanzamiento.
