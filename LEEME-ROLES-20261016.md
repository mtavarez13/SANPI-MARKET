# Roles y colores de panel

Los cambios de rol y la creación de usuarios desde el panel administrativo se guardan en Firestore junto con el perfil en una sola operación. Un error de permisos o conexión se muestra al administrador y no deja un rol aparentemente guardado solo en su navegador.

Al iniciar sesión, Sanpi consulta la asignación más reciente por UID o correo. Una sesión abierta escucha cambios del administrador y actualiza el menú y la vista sin exigir que el usuario cierre sesión. Las reglas locales impiden que el propietario de un perfil modifique sus propios campos de rol, plan y credenciales administrativas.

Cada panel operativo tiene un color: administración violeta, tienda verde, Pimdrop fucsia, proveedor índigo y transportista azul. Los clientes siguen con la vista pública y Mis compras, sin panel operativo.

La compilación, la comprobación de tipos y las pruebas automatizadas se ejecutaron localmente. Los cambios en `firestore.rules` deben publicarse en Firebase por separado; incluirlos en el ZIP de Hostinger no los activa.
