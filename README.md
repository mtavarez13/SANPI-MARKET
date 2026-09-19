# Sanpi Marketplace - Preparado para Firebase App Hosting

Este proyecto está optimizado y preparado para ejecutarse y desplegarse en **Firebase App Hosting** o **Google Cloud Run**.

## Contenido del Archivo ZIP

- Código fuente completo en React 19 + TypeScript + Tailwind CSS
- Servidor backend en Express (`server.ts`) con integración a pasarelas logísticas
- Configuración de Firebase App Hosting (`apphosting.yaml`)
- Configuración y reglas de base de datos (`firestore.rules`, `firebase-blueprint.json`, `firebase-applet-config.json`)

## Pasos para Desplegar en Firebase App Hosting

### Opción 1: Mediante Repositorio de GitHub (Recomendado por Firebase)
1. Descomprime este archivo `.zip` en tu computadora.
2. Inicializa un repositorio Git y súbelo a GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Sanpi Marketplace"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/sanpi-marketplace.git
   git push -u origin main
   ```
3. Dirígete a la [Consola de Firebase](https://console.firebase.google.com/) en tu proyecto `sanpi-market`.
4. En el menú lateral, selecciona **App Hosting** (o Hosting de aplicaciones).
5. Haz clic en **Comenzar** y conecta tu repositorio de GitHub.
6. Firebase App Hosting detectará automáticamente el archivo `apphosting.yaml` y compilará la aplicación utilizando Node.js.

### Opción 2: Ejecución Local
1. Instala las dependencias:
   ```bash
   npm install
   ```
2. Ejecuta el entorno de desarrollo:
   ```bash
   npm run dev
   ```
3. Para compilar y probar en modo producción:
   ```bash
   npm run build
   npm start
   ```
   La aplicación se iniciará en `http://localhost:3000`.

## Variables de Entorno
Consulta el archivo `.env.example` para configurar las variables requeridas (como `GEMINI_API_KEY`, etc.).
