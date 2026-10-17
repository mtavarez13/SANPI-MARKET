import type { ReconciledSale } from './accountingReconciliation';

const records = (rows: ReconciledSale[]) => rows.map(row => ({
  Guía: row.delivery.trackingNumber,
  Tienda: row.store?.name || row.delivery.storeId,
  Fecha: row.deliveredAt,
  Artículo: row.delivery.articleName,
  'Venta RD$': row.productAmount,
  'Flete RD$': row.shippingAmount,
  'Comisión RD$': row.commissionAmount,
  'Pimdrop RD$': row.dropshipperAmount,
  'A tienda RD$': row.storePayable,
  'Pago tienda': row.delivery.storePaidAt ? 'Pagado' : 'Pendiente',
  'Referencia de pago': row.delivery.storePaymentReference || '',
  'Transacción vinculada': row.transaction?.id || 'Falta transacción histórica',
}));

export async function exportSettlementsExcel(rows: ReconciledSale[]) {
  const XLSX = await import('xlsx');
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(records(rows)), 'Liquidaciones');
  XLSX.writeFile(book, `sanpi-liquidaciones-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function exportSettlementsPdf(rows: ReconciledSale[]) {
  const { default: jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'landscape' });
  const money = (value: number) => `RD$ ${value.toLocaleString('es-DO', { maximumFractionDigits: 2 })}`;
  const total = rows.reduce((sum, row) => sum + row.storePayable, 0);
  const paid = rows.filter(row => row.delivery.storePaidAt).reduce((sum, row) => sum + (row.delivery.storePaidAmount ?? row.storePayable), 0);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(17);
  pdf.text('SANPI MARKET · LIQUIDACIONES', 14, 18);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(`Emitido: ${new Date().toLocaleString('es-DO')}     Órdenes entregadas: ${rows.length}     A tiendas: ${money(total)}     Pendiente: ${money(Math.max(0, total - paid))}`, 14, 26);
  let y = 37;
  const header = () => {
    pdf.setFont('helvetica', 'bold');
    pdf.text('Guía', 14, y); pdf.text('Tienda', 76, y); pdf.text('Venta', 145, y); pdf.text('Comisión', 178, y); pdf.text('A tienda', 215, y); pdf.text('Estado', 253, y);
    pdf.line(14, y + 2, 282, y + 2);
    y += 9;
    pdf.setFont('helvetica', 'normal');
  };
  header();
  for (const row of rows) {
    if (y > 190) { pdf.addPage(); y = 16; header(); }
    pdf.text((row.delivery.trackingNumber || '').slice(0, 31), 14, y);
    pdf.text((row.store?.name || row.delivery.storeId).slice(0, 29), 76, y);
    pdf.text(money(row.productAmount), 145, y);
    pdf.text(row.hasConfirmedCommission ? money(row.commissionAmount) : 'Sin confirmar', 178, y);
    pdf.text(money(row.storePayable), 215, y);
    pdf.text(row.delivery.storePaidAt ? 'Pagado' : 'Pendiente', 253, y);
    y += 8;
  }
  pdf.save(`sanpi-liquidaciones-${new Date().toISOString().slice(0, 10)}.pdf`);
}
