# Sanpi en Hostinger

Este paquete usa npm exclusivamente. No contiene locks de pnpm o Bun.

Configuración de hPanel para sanpi.connectchat.tech:
- Framework: Express
- Node: 22.x
- Directorio raíz: ./
- Gestor de paquetes: npm
- Archivo de entrada: server.cjs
- Build: npm run build (si se muestra ese campo)
- NODE_ENV: production

El script build genera el frontend y dist/server.cjs. El archivo server.cjs en la raíz inicia el servidor Express mediante require(), compatible con LiteSpeed, usando el puerto PORT asignado por Hostinger. No configurar un PORT fijo. Conservar la ruta /api; no usar el preajuste de frontend estático Vite.

El despliegue fallido anterior no alcanzó a instalar dependencias: Hostinger no encontró su ejecutable pnpm. Este paquete evita esa detección y agrega un archivo de entrada estable.

Firebase y las reglas se gestionan por separado. Para iniciar sesión con Google, el dominio final debe estar autorizado en Firebase Authentication.
