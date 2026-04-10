# Manual de Onboarding (Alta de Nuevos Clientes en G-MKT)

Este documento es una **Guía Operativa (SOP)** diseñada para la administración de G-MKT. Sigue estos pasos exactos cada vez que vayas a subir una nueva empresa/marca a la plataforma para garantizar que su motor de inteligencia artificial y su pauta automatizada en Meta Ads funcionen a la perfección.

---

## FASE 1: Alta en Business Manager (Estructura de Negocio)

G-MKT corre bajo el respaldo de tu cuenta empresarial central (`gscode`). Antes de tocar ningún código, la estructura de la marca debe existir aquí.

1. **Reclamo de Activos:**
   Ve a [business.facebook.com/settings](https://business.facebook.com/settings) y asegúrate de añadir la *Fanpage de Facebook* y la *Cuenta de Instagram* del cliente en la sección de "Páginas" o "Cuentas".
2. **Creación / Enlace de la Cuenta Publicitaria (Ad Account):**
   - Ve a *Cuentas -> Cuentas Publicitarias* (Ad Accounts).
   - Crea una cuenta nueva específica para el cliente asegurando la moneda (USD/CRC) y la zona horaria (esto no se puede cambiar luego).
   - Copia el **Número de Identificador de la Cuenta (ID)**; lo necesitarás en la Fase 3.
3. **El Engranaje Maestro (System User):**
   - Ve a *Usuarios -> Usuarios del Sistema*.
   - Selecciona a tu desarrollador robot (ej. `gscode`).
   - Da click en **Asignar Activos (Assign Assets)** y agrégale a este robot accesos de "Control Total" a tres cosas: La App desarrollada ("GMKT"), la Fanpage del nuevo cliente y la Cuenta Publicitaria nueva.
   - *(Nota: Si omites conectar al cliente a este usuario de sistema, nuestro Token global del `.env` será bloqueado por Meta).*

---

## FASE 2: Configuración en Meta For Developers (La App)

Aunque el control de pagos vive en el Business Manager, las políticas de Meta Ads requieren que revisemos que todo esté en regla en la plataforma de desarrollo.

1. Entra a [developers.facebook.com](https://developers.facebook.com/).
2. Selecciona la App de **GMKT**.
3. Revisa la sección **App Roles -> Roles**:
   Asegúrate de que la aplicación goce de acceso por parte de tu cuenta primaria.
4. Revisa la sección **Use Cases -> Create & manage ads with Marketing API**:
   - Da click en *Edit/Customize*.
   - Confirma que tienes los permisos base en modo `Ready for testing` o aprobados para producción (`ads_management`, `ads_read`, `pages_manage_ads`).
   - **Nota crucial para nuevos desarrollos:** Si un cliente requiere promocionar directamente un contenido propio desde su misma página, obligatoriamente debemos tener activo el permiso `pages_manage_ads`. De lo contrario el robot no tendrá autoridad legal para presionar el botón "Boost" de sus publicaciones de su fanpage.

---

## FASE 3: Inserción en la Arquitectura G-MKT (Base de Datos)

El código del servidor ya está listo, lo que separa a tu cliente del uso diario es el ingreso a la base de PostgreSQL de tu software.

Necesitas recopilar 4 datos clave:
- **`Nombre Comercial`**: (Ej. Zapaterías El Sol)
- **`Brand Voice & Target`**: Prompts e idioma corporativo para regalarle a la IA.
- **`Facebook Page ID`**: Obtenido desde la pestaña "Acerca de" de la página de FB nativa.
- **`Ad Account ID`**: El identificador bancario extraído del paso 1.2.

**Ubicaciones en la Base de Datos:**
1. Crea el componente **`Brand`** (Tabla `brands`) y defínele las configuraciones y paletas visuales de la marca.
2. Genera un **`SocialAccount`** con `platform: 'facebook'` y pon el Facebook Page ID en la celda `provider_account_id`.
3. Genera un **`AdAccount`** ligado al Brand de arriba y pega el Ad Account ID larguísimo y ponle la plataforma como `facebook`. 

> [!TIP]
> **No es necesario meter tokens por cliente:** El código de `ads_manager.py` extraerá de la base de datos a qué cuenta enviarle la orden publicitaria de cobro, pero **usará automáticamente la llave maestra (`META_SYSTEM_TOKEN`) de tu archivo global `.env`** para autorizarse.

---

## FASE 4: Smoke Test (Validación)

Para asegurar que todo el Onboarding fluyó correctamente:
1. Ve al Studio (Frontend) de G-MKT y genera un carrusel o post.
2. Dale Aprobar y vigila que se publique en su muro orgánico (Prueba los accesos de Page Management).
3. Entra al menú lateral Ads, asígnale 1 dólar y presiona el botón naranja "Impulsar". 
4. Si la consola del servidor te reporta `Campaign successfully pushed (Camp+AdSet+Ad)`, levanta tu copa. Tu cliente está adentro y su dinero corre orgánicamente.
