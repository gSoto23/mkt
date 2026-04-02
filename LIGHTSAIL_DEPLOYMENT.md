# Guía de Despliegue en AWS Lightsail (Modo "A Prueba de Balas")

Bienvenido al mundo de los servidores vivos. AWS Lightsail es el equivalente a alquilar una computadora en la nube que nunca se apaga. Esta guía está diseñada sin jerga técnica para que puedas lanzar al público la plataforma utilizando el dominio maestro **juguetessinazucar.com**.

---

## 🏗️ FASE 1: Preparar la Máquina (Tu Servidor)

1. **Crear la Instancia en AWS**
   - Inicia sesión en [AWS Lightsail](https://lightsail.aws.amazon.com/).
   - Haz clic en el botón naranja **Create instance** (Crear instancia).
   - **Localización**: Elige `US East (N. Virginia)` o la que esté más cerca de tu país.
   - **Imagen (OS Only)**: Selecciona **Ubuntu 22.04 LTS** (o 24.04). No uses las Apps.
   - **Plan**: Es súper recomendado elegir el plan de **$12 USD / mes** (2 GB de memoria RAM, 2 vCPUs). Éste asegura que todo el motor (Next.js, FastAPI, bases de datos y Celery) pueda compilar velozmente "a la segura" sin atascamientos.
   - **Nombre de Instancia**: Escribe `gmkt-production` y dale a **Create instance**.

2. **Abrir los Puertos de Red (Firewall)**
   - Una vez la instancia diga "Running" (Corriendo), haz clic en su nombre.
   - Ve a la pestaña **Networking** (Redes).
   - En la sección IPv4 Firewall, añade los siguientes Custom Ports (Haciendo click en `+ Add rule`):
     - `HTTP` (TCP) en el puerto **80**
     - `HTTPS` (TCP) en el puerto **443**

3. **Conectarse al Servidor**
   - Arriba a la derecha verás un botón naranja que dice **Connect using SSH** (o un ícono pequeño de terminal). Al darle clic se desplegará una terminal. Serás "root" del sistema operativo.

---

## 🧠 FASE 2: Configurar Memoria Swap (El Secreto de la Instancia Pequeña)

Dado que usarás la instancia más pequeña y económica (con 512MB o 1GB de RAM), correr todos estos motores a la vez (Base de Datos, IA, Web, Workers Celery) haría que el servidor colapsara si no hacemos este truco. Configuraremos un disco SWAP de 4GB que funcionará como memoria RAM de emergencia vital, usando tu disco SSD. Esto hace que todo sea ultra estable aunque sea barato:

Escribe esto uno por uno en la consola de Lightsail:
```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 🛠️ FASE 3: Instalar el Ecosistema y Dependencias

**1. Actualizar e instalar software fundacional de la Nube:**
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3-pip python3-venv git curl postgresql postgresql-contrib nginx redis-server apt-transport-https ca-certificates software-properties-common docker-compose python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

**2. Traer el Código desde tu GitHub:**
```bash
git clone https://github.com/gSoto23/mkt.git mkt
cd mkt
```

---

## 📦 FASE 4: Prender Motores en modo Producción

**A. Levantar la Base de Datos Inquebrantable:**
```bash
sudo docker-compose up -d
```

**B. Ajustar Backend e Inteligencia de Criptografía (OAuth Meta/TikTok):**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```
👉 *Punto Crítico:* Crea el `.env` del backend para blindar los secrets:
```bash
nano .env
```
Copia y pega EXACTAMENTE esto, cambiando las APIs reales. Es MUY crítico que las URLs contengan tu nuevo dominio final.
```env
GEMINI_API_KEY="..."
META_CLIENT_ID="..."
META_CLIENT_SECRET="..."
TIKTOK_CLIENT_KEY="..."
TIKTOK_CLIENT_SECRET="..."
BACKEND_URL="https://juguetessinazucar.com"
FRONTEND_URL="https://juguetessinazucar.com"
```
*(Guarda con `CTRL+X`, `Y`, `Enter`)*

Encendamos el API y el Robot Celery Beat de Autopublicación en el fondo mediante PM2:
```bash
pm2 start "venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000" --name "gmkt-backend"
pm2 start "venv/bin/celery -A app.core.celery_app worker -l info -B" --name "gmkt-celery"
```

**C. Compilar el Next.js (Visión de Panel UI):**
```bash
cd ../frontend
npm install
npm run build
```
👉 *Punto Crítico:* Seguridad de panel frontal:
```bash
nano .env
```
```env
PORTAL_USER=gerardo
PORTAL_PASS=231287
NEXT_PUBLIC_API_URL="https://juguetessinazucar.com"
```
Y arranca el Front:
```bash
pm2 start npm --name "gmkt-frontend" -- start
```

**D. Inmortalidad (Que todo inicie si Amazon apaga la instancia):**
```bash
pm2 save
pm2 startup
# La consola te dará un link que empieza con `sudo ...`, CÓPIALO y PÉGALO.
```

---

## 🔒 FASE 5: Conectar el Dominio Maestro y Encriptación (HTTPS)

⚠️ **ALTO:** Antes de este paso, ve al Administrador de Dominio donde compraste **juguetessinazucar.com** y configura los *Registros A* apuntando a la Dirección IP estática pública de tu instancia de Lightsail (ideal apuntar tanto la base `juguetessinazucar.com` como el sub `www`).

**1. Interceptar el Tráfico con Nginx Proxy:**
Vamos a instruir al cerebro general a dividir el tráfico entre API Port 8000 y Front Port 3000.
```bash
sudo rm /etc/nginx/sites-enabled/default
sudo nano /etc/nginx/sites-available/mkt
```
Pega exactamente esto:
```nginx
server {
    listen 80;
    server_name juguetessinazucar.com www.juguetessinazucar.com;

    # Backend / Enrutado Graph Meta
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_addrs;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend Principal
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_addrs;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Actívalo y enciende a Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/mkt /etc/nginx/sites-enabled/
sudo systemctl reload nginx
```

**2. Obtener el Candado HTTPS con Let's Encrypt (Certbot):**
Gracias al certificado HTTPS gratuito, Graph API de Facebook y TikTok podrán descargar y enviar webhooks protegidos:
```bash
sudo certbot --nginx -d juguetessinazucar.com -d www.juguetessinazucar.com
```
*Sigue las instrucciones en consola; provee tu email, y escoge `Y` a redirigir HTTP a HTTPS (Para que nadie pueda usar el portal inseguro).*

---

## 🚀 FASE 6: Re-Deploy del Olympo (Mantenimiento de Software)

Cuando agreguemos lógicas nuevas de Redes a tu compu y necesites actualizar Lightsail:

```bash
cd mkt
git pull origin main
```

**Si fue código de Python (Reglas de Automotización o API):**
```bash
pm2 restart gmkt-backend
pm2 restart gmkt-celery
```

**Si fue algo visual o de experiencia UI (Next.js):**
```bash
cd frontend
npm run build
pm2 restart gmkt-frontend
```
