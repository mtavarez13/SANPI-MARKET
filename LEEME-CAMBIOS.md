# Sanpi Market — panel de órdenes y diseño marketplace

## Cambios incluidos

- Acceso «Todas las órdenes» para administradores y «Mis órdenes» para tiendas y dropshippers, desde el menú lateral y el menú de usuario.
- Panel `/orders` con resumen de órdenes, entregas en tránsito, entregadas y valor entregado (no equivale a liquidaciones cobradas).
- Seis estados: pendiente, en tránsito, entregado, cancelado, reprogramado e intento fallido.
- Búsqueda por orden, seguimiento, cliente, producto, tienda y nombre de dropshipper; filtros por tienda, canal y rango de fechas; paginación de 12 órdenes.
- Detalle desplegable: producto, importes, cliente, dirección, transportista y cronología.
- Portada renovada con productos del catálogo, estilo más sobrio, tarjetas y controles adaptables a móviles. Se conserva el nombre, eslogan, subtítulo y video configurados.

## Asociación de las órdenes

Administradores: todas las órdenes cargadas por el sistema existente.
Tiendas: órdenes cuyo `storeId` pertenezca a una tienda de la cuenta. La asociación utiliza `ownerId` y, para tiendas antiguas creadas desde una suscripción, coincidencia exacta de `ownerEmail`.
Dropshippers: ventas de sus tiendas y órdenes con su `dropshipperId`. Para órdenes antiguas sin ese ID, se admite `landingPageSlug` si la página tiene el mismo `ownerId` del usuario. Un ID explícito de otro dropshipper no se reemplaza por una coincidencia de página.
Nunca se otorga visibilidad por nombre de tienda, nombre de persona o coincidencias parciales de correo. Las cuentas sin asociaciones válidas muestran un panel vacío.
Los resúmenes reflejan los filtros seleccionados; los contadores de los botones de estado muestran el total de la cuenta.

## Ejecución

Requiere Node.js 22.6+; preferible Node.js 22 LTS actualizado.

```sh
npm install
npm run dev
```

O usar pnpm con el archivo de bloqueo incluido:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Para verificar:

```sh
npm run test:orders
npm run lint
npm run build
```

La configuración de Firebase y las integraciones existentes se conserva. No se han publicado cambios, modificado reglas remotas ni enviado pedidos de prueba.

## Limitación de seguridad heredada — resolver antes de producción

Este cambio filtra lo que presenta el nuevo panel. **No constituye autorización de servidor.** El proyecto recibido permite lectura y escritura públicas en `firestore.rules`, incluidas las órdenes y una regla general. Además, carga todas las órdenes en `storeManager` y las guarda en el navegador; sus perfiles y algunos inicios de sesión se manejan localmente. Por ello una persona puede acceder a datos fuera del nuevo panel mediante las interfaces existentes.

Para garantizar aislamiento real entre tiendas se necesita migrar esas sesiones a identidades Firebase verificadas, asignar roles desde un entorno confiable, restringir lecturas y escrituras con reglas de Firestore, adaptar consultas/suscripciones por propietario y proteger el flujo público de creación y seguimiento de pedidos. También deben separarse las credenciales logísticas de los documentos accesibles al cliente. Cambiar solo la regla de `deliveries` no basta: la regla general permisiva la anularía.

No se activan reglas restrictivas incompletas que interrumpan las compras, seguimiento o logística actuales. El panel nuevo es de consulta; conserva las herramientas existentes para actualizar estados. El ZIP es una actualización del código, no una publicación en la página en producción.

## Verificación técnica

- 12 pruebas automatizadas de asociación y visibilidad: aprobadas.
- Revisión TypeScript del proyecto: aprobada.
- Compilación de la interfaz con Vite: aprobada. Se utilizó `vite build --configLoader runner` por restricciones del ejecutable nativo en este entorno de Windows.
- El servidor existente se transpila correctamente; sus servicios externos no se probaron ni modificaron.
- Vite advierte que el archivo principal supera 500 kB; el proyecto existente carga muchos paneles e integraciones en un solo paquete.

Los archivos de imagen que acompañan la entrega usan cuentas y pedidos ficticios para mostrar las nuevas vistas.

Pruebas de navegador aprobadas: administrador, tienda, dropshipper, bloqueo de clientes, menú, navegación atrás, paginación, filtros de estado/búsqueda/canal, detalle desplegable y ancho móvil de 390 px. Se bloquearon las conexiones a autenticación, base de datos y logística durante las pruebas.
