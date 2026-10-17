# SANPI Market

Código de la aplicación publicada en [sanpi.com.do](https://sanpi.com.do/) mediante Firebase App Hosting (proyecto `sanpi-market`, backend `sanpi`). La rama de despliegue es `sanpi`.

## Desarrollo local

Se requiere Node.js 22 y npm 10.

```bash
npm ci
npm run dev
```

## Verificación y producción

```bash
npm run lint
node --import tsx --test tests/*.test.mjs
npm run build
npm start
```

El servidor Express está en `server.ts`. La compilación genera `dist/` y `server.cjs`; Firebase App Hosting ejecuta `npm run build` y `npm start`. Las variables y credenciales privadas se configuran en el entorno de despliegue y no se guardan en Git.

Las reglas de Firestore están en `firestore.rules`; subir cambios a GitHub no las publica automáticamente. Cuando se modifiquen, hay que desplegarlas por separado con Firebase CLI.
