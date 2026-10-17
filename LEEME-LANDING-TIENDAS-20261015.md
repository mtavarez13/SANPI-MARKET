# Landing de registro de tiendas

Se adaptó la landing de `SANPI-landing-pages-colores-atributos-20261015.zip` a Sanpi Market en `/sanpimarketplace`. La página reproduce el encabezado morado, las tarjetas de planes y el formulario responsive del paquete, con los estilos existentes de React/Vite.

Los planes muestran los precios y comisiones activos configurados por el administrador, en RD$. El formulario registra la solicitud en la colección existente `marketplace_subscriptions` para que el administrador la apruebe o rechace. La identidad se verifica con Google antes de enviar; el correo asociado a la solicitud es el de esa cuenta. Se conserva el campo de descripción del negocio, sin pedir ni guardar contraseñas en la landing. Las reglas locales incluyen lectura pública de `membership_plans` para mostrar los planes actualizados a visitantes y reservan su escritura a administradores. Estas reglas requieren despliegue independiente en Firebase.

El resto del catálogo, las landing de productos, la contabilidad y el checkout permanecen en Sanpi Market. No se copiaron la configuración Firebase, las reglas ni las rutas Next.js del ZIP de origen. Esta integración es código local: requiere publicación por separado para aparecer en el dominio.

Validación: pruebas automatizadas, comprobación de tipos y compilación de producción.
