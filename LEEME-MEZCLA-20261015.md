# Mezcla Sanpi Market + paquete portable de SACHA

Origen: `SANPI-codigo-landing-contabilidad-portable-20261015.zip`. Destino: aplicación existente Sanpi Market (React/Vite/Express). No se sustituyó la aplicación por el proyecto Next.js del paquete.

## Contabilidad integrada

- `src/lib/accountingReconciliation.ts` adapta la conciliación por guía del paquete: cada entrega genera una fila única; una transacción histórica faltante se señala sin ocultar la venta.
- Los estados históricos (`delivered`, `completed`, `entregada`, etc.) se normalizan solo para lectura y reportes. Las escrituras nuevas siguen los ocho valores exactos del contrato de `deliveries.status`.
- La pestaña **Liquidaciones** separa producto, flete, comisión real registrada, ganancia Pimdrop, importe a tienda y pago al repartidor. Exporta PDF y Excel.
- Un administrador puede registrar un pago ya realizado con su referencia. La operación usa una transacción Firestore, impide marcar dos veces la misma guía y actualiza la transacción de venta vinculada cuando existe. Registrar el pago no transfiere dinero.
- `firestore.rules` reserva los nuevos campos de liquidación para administradores. Estas reglas deben revisarse y desplegarse por separado; incluirlas en el ZIP de Hostinger no las publica en Firebase.

## Landing pages integradas

- La portada suma una sección de servicios, con el recorrido de fulfillment, última milla y marketplace del paquete, conservando el buscador de guías, los productos destacados y el catálogo existentes.
- La landing de cada producto muestra existencias del artículo real, impide pedir cantidades superiores al stock y deja de crear productos sustitutos si el artículo ya no existe.
- Se retiraron el contador de oferta y los avisos de compras recientes generados sin datos de ventas. Las landing nuevas ya no incluyen testimonios inventados ni precios comparativos calculados artificialmente.

## Alcance técnico

El paquete de origen es una aplicación Next.js con providers, API y modelos propios de SACHA. Se trasladaron las funciones pertinentes a la arquitectura actual de Sanpi. Sus rutas y componentes Next.js no se copiaron literalmente; la integración API y el despliegue Firebase/Hostinger quedan separados de esta mezcla de contabilidad y landing pages.

Validación local: `node --import tsx --test tests/*.test.mjs`, `npx tsc --noEmit`, `npm run build`.
