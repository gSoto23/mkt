# Guía de API Keys para "Dummies" 🔑

Para que G-MKT AI pueda hablar con otras plataformas (como la inteligencia de Gemini o los servidores de Facebook y TikTok), necesita "Llaves" o "API Keys".
Míralo como entregar tu gafete de acceso en un edificio: te identifica y te da permiso de hacer ciertas acciones.

---

## 1. ¿Dónde se configuran?

Por motivos de seguridad, estas llaves **NUNCA** se escriben directamente en el código que se comparte a otras personas (para que nadie robe tu gafete). En su lugar, utilizamos un archivo secreto llamado `.env`.

### Pasos para configurarlas en el proyecto:
1. Asegúrate de estar en la bóveda del motor: abre tu carpeta `backend`.
2. Crea un archivo de texto llamado **exactamente** `.env` (con un punto al inicio, sin extensión .txt).
3. Dentro de ese archivo, copiarás y pegarás tus llaves usando este molde:

```env
GEMINI_API_KEY="tu-llave-secreta-de-gemini-aqui"

META_CLIENT_ID="tu-id-de-cliente-aqui"
META_CLIENT_SECRET="tu-secreto-de-meta-aqui"

TIKTOK_CLIENT_KEY="tu-llave-de-tiktok-aqui"
TIKTOK_CLIENT_SECRET="tu-secreto-de-tiktok-aqui"
```

*(Nota: ¡No le pongas espacios alrededor del signo de igual `=´!)*

El código del proyecto (ubicado internamente en `backend/app/core/config.py`) está programado para buscar este archivo `.env` invisible y chuparse estas claves de manera automática y segura. 

---

## 2. ¿De dónde saco estos valores mágicos?

### A. Para `GEMINI_API_KEY` (La Mente)
El cerebro de la aplicación es Gemini de Google.
- **¿De dónde sale?** Tienes que entrar con tu cuenta de Google a: [Google AI Studio](https://aistudio.google.com/app/apikey).
- **Proceso Explicado**: 
  1. Haces clic en el botón azul "Create API Key".
  2. Vas a copiar una tira larga de caracteres (ej: `AIzaSyB-xxxxx`).
  3. Esa tira la pegas en tu archivo `.env` en la línea `GEMINI_API_KEY`.

### B. Para `META_CLIENT_ID` y `META_CLIENT_SECRET` (Facebook e Instagram)
Para permitir que nuestro sistema publique fotos en FB e IG, tienes que decirle a Mark Zuckerberg que existe tu app.
- **¿De dónde sale?** Entra a [Meta for Developers](https://developers.facebook.com/).
- **Proceso Explicado**:
  1. Entra con tu Facebook e inscríbete como desarrollador (es gratis).
  2. Haz clic en "Mis Apps" y luego "Crear Aplicación".
  3. Elige que quieres usarla para un fin de negocio/empresa.
  4. Una vez creado el panel de la app, ve al menú izquierdo a **App Settings -> Basic (Configuración Básica)**.
  5. Allí verás claramente el **"Identificador de la aplicación"** (Este es tu `META_CLIENT_ID`).
  6. Abajo dirá **"Clave secreta de la aplicación"**. Tendrás que poner tu contraseña para verlo. (Este es tu `META_CLIENT_SECRET`).

### C. Para `TIKTOK_CLIENT_KEY` y `TIKTOK_CLIENT_SECRET`
Exactamente igual que con Meta, pero en TikTok.
- **¿De dónde sale?** Entra a [TikTok for Developers](https://developers.tiktok.com/).
- **Proceso Explicado**:
  1. Inicia sesión y registra una App Web en el portal.
  2. En el Dashboard de tu App, ve a la sección de "Auth" o Configuración.
  3. Allí encontrarás tu **Client Key** y tu **Client Secret**.
  4. Pégalos en tu archivo `.env`.

> **🌟 Pro-Tip:** Cuando estés registrando las apps en Meta y en TikTok, te pedirán un campo llamado **"Redirect URI"** o *"URL de redireccionamiento OAuth"*. Para nuestro proyecto en la computadora debes poner:
> - **Meta:** `http://localhost:8000/api/auth/meta/callback`
> - **TikTok:** `http://localhost:8000/api/auth/tiktok/callback`

---

## 3. Preguntas Frecuentes (FAQ)

**¿Debo crear una App de Meta nueva por cada Marca/Cliente que agregue?**

**¡NO!** G-MKT AI fue programada como una plataforma *SaaS multi-marca*. 
Esto significa que solo necesitas registrar **una única App** bajo tu portal de Meta Developers. Toda tu plataforma usará ese único `META_CLIENT_ID` y `META_CLIENT_SECRET`.

Cuando tus clientes (u otras marcas tuyas) entran a G-MKT AI y desean conectar su fan page, tu App maestra les solicita permisos. Una vez que aceptan, Meta te devuelve automáticamente un "Access Token" individual para gestionar exclusivamente a esa marca.

*(Nota: Para que terceras personas puedan iniciar sesión y confiar en tu aplicación, Meta te pedirá que pases por un proceso estándar llamado "Business Verification" y "App Review" desde su misma plataforma).*
