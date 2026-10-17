# Cambios de Sanpi Market — 28 de septiembre de 2026

Fuente: `D:\Codex\PROYECTOS\Documents\Codex\SANPI MARTKET\sanpi-market.zip`. Se conservaron la configuración `apphosting.yaml` y el identificador de Analytics del archivo adjunto, y se incorporaron las mejoras de contabilidad, órdenes y estados de entrega del proyecto de trabajo anterior.

## Administración y portada

- `sanpimarketplace@gmail.com` obtiene el panel de administrador al iniciar sesión con Google. El acceso por correo escrito sin autenticación de Google no sirve para esta cuenta. Las reglas de Firestore reconocen el token de Google con ese correo verificado. Para asignar además el custom claim `role=admin` de Firebase Auth, usar el script de aprovisionamiento en un entorno administrador con credenciales de servicio: `node scripts/set-role-claim.mjs sanpimarketplace@gmail.com admin`. Este script no se ejecutó en producción.
- El menú de administrador incluye **Publicidad Destacada**. Allí se seleccionan exactamente cuatro artículos publicados con inventario y se define un costo publicitario positivo en RD$ para cada uno. La portada muestra los cuatro en el orden elegido.
- La tarifa de publicidad queda en `featured_placements/homepage`, legible solo por administradores; el documento público `featured_public/homepage` contiene solo los IDs de los artículos. La publicación usa un lote de Firestore para actualizar ambos documentos juntos. Configurar una tarifa no realiza ningún cobro automático.

## Contabilidad y entregas

- El módulo Contabilidad sigue disponible para los roles distintos de cliente: costo y precio de venta, resumen, gastos, ingresos y categorías separadas por usuario.
- Las cuentas autenticadas con Google guardan categorías e ingresos en Firestore por UID. Las cuentas heredadas que solo usan el acceso local por correo guardan categorías e ingresos por usuario en este dispositivo; todavía necesitan una migración a Firebase Auth para sincronizar entre dispositivos. Los gastos siguen el flujo existente de Firestore.
- Checkout crea `transactions` y `deliveries/{trackingNumber}` en un lote. Los estados exactos, campos de cobro, prueba de entrega, roles y migración están descritos en `LEEME-CONTABILIDAD.md`.
- El resumen de administradores y transportistas incluye fletes facturados, pagos a repartidores, efectivo COD cobrado y efectivo pendiente de entregar a oficina. Estos conceptos se muestran separados del resultado de venta de artículos.
- La validación impide quitar el repartidor de una orden en tránsito o borrar la evidencia de una entrega finalizada mediante una actualización sin cambio de estado. También rechaza pagos de repartidor negativos o no numéricos. Las reglas de creación verifican el total COD y los valores iniciales de caja; requieren un despliegue independiente.
- Firebase omite campos opcionales sin valor al escribir documentos. El arranque anónimo espera la recuperación de la sesión y solo crea una sesión anónima si no existe una cuenta autenticada; conserva la sesión Google del administrador al recargar.
- La actualización desde el panel de reparto guarda entrega y estado final de la transacción en un lote. Solo confirma el éxito después del guardado real; un rechazo de permisos o conexión no se presenta como una actualización exitosa.

## Publicación en App Hosting

Subir el ZIP de **código fuente**, no el ZIP estático: en Firebase App Hosting > backend `dododo` > Create rollout > Upload a zip, con App root directory `/`. El proyecto compila el cliente Vite y el servidor Express (`/api`). El despliegue de código no instala las reglas `firestore.rules`, no asigna custom claims y no migra entregas históricas. Estos pasos requieren revisión y despliegue independientes. Ningún dato de producción se modificó durante este trabajo.
