# Publicar este proyecto en Firebase App Hosting

Sitio publicado: https://dododo--sanpi-market.us-east4.hosted.app/
Proyecto indicado por la configuración local: `sanpi-market`. Backend indicado por el dominio: `dododo`.

El archivo para **App Hosting > Create rollout > Upload a zip** es `sanpi-market-apphosting-fuente.zip` (o su alternativa `.tgz`). Contiene el código fuente, `package.json`, `server.ts` y `src` en la raíz. No suba el ZIP de sitio estático: App Hosting construye la aplicación y ejecuta su servidor Express.

En la consola de Firebase:

1. Abra **App Hosting**, el backend **dododo**, y seleccione **Create rollout**.
2. Elija **Upload a zip** y seleccione el archivo fuente desde la carpeta **Descargas** de este equipo. Si el navegador muestra que está vacío, pruebe el `.tgz` o arrastre el archivo desde el Explorador de Windows; compruebe que el tamaño mostrado sea mayor que 0 bytes.
3. Indique `/` como **App root directory**; `package.json` está directamente en la raíz del archivo.
4. Revise la compilación y el rollout antes de considerar la versión publicada.

La aplicación usa la base Firestore `ai-studio-sanpimarket-0d7cf290-2e17-4f87-b9cf-2fc45925699f` y rutas `/api` del servidor Express. Subir el frontend compilado por separado no conserva esas rutas. El despliegue de `firestore.rules` debe dirigirse a **esa base**, no a la base predeterminada si existe. Las reglas, las custom claims y la migración de entregas son pasos independientes descritos en `LEEME-CONTABILIDAD.md`; este archivo de fuente no modifica la base de datos por sí solo.

Verificación local del código: 27 pruebas, `tsc --noEmit` y compilaciones Vite/Express correctas. El ZIP/TGZ se verificó y contiene archivos; el sitio publicado todavía usa una compilación anterior.
