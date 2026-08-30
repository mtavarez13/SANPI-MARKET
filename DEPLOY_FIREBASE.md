# 🚀 Guía de Despliegue en Firebase Hosting & Firestore
## Sanpi Market Dominicana

Este proyecto está 100% configurado y listo para desplegar en Firebase Hosting y Firestore.

---

### 📦 Requisitos Previos
1. Tener instalado [Node.js](https://nodejs.org/) (versión 18 o superior).
2. Tener instalado Firebase CLI. Si no lo tienes, instálalo con:
   ```bash
   npm install -g firebase-tools
   ```

---

### 🛠️ Pasos para Desplegar

#### 1. Iniciar sesión en Firebase
Abre una terminal en la carpeta del proyecto y ejecuta:
```bash
firebase login
```

#### 2. Instalar dependencias del proyecto
```bash
npm install
```

#### 3. Construir la aplicación para producción
Genera la carpeta `dist/` optimizada:
```bash
npm run build
```

#### 4. Desplegar en Firebase (Hosting y Reglas de Firestore)
Ejecuta el comando de despliegue:
```bash
firebase deploy
```

Si deseas desplegar únicamente el Hosting web:
```bash
firebase deploy --only hosting
```

Si deseas desplegar únicamente las reglas de seguridad de Firestore:
```bash
firebase deploy --only firestore:rules
```

---

### 📁 Estructura de Configuración de Firebase
- `firebase.json`: Configuración de Firebase Hosting apuntando a la carpeta `dist/` con soporte SPA (Single Page Application) y Firestore rules.
- `.firebaserc`: Define el proyecto de Firebase (`sanpi-market`).
- `firestore.rules`: Reglas de seguridad para Firestore Database.
- `firebase-applet-config.json`: Credenciales de conexión del cliente con Firebase.
