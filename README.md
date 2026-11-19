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

Las reglas de Firestore están en `firestore.rules` y `firebase.rules.json` apunta a la base de datos nombrada que utiliza la aplicación. Subir cambios a GitHub no publica las reglas. Para desplegarlas por separado:

```bash
firebase deploy --only firestore:ai-studio-sanpimarket-0d7cf290-2e17-4f87-b9cf-2fc45925699f --config firebase.rules.json --project sanpi-market
```
