import type { AuditFilters } from './financialAudit';
import { financialAudit } from './financialAudit';

type Report = ReturnType<typeof financialAudit>;
const filename = () => `sanpi-balance-operativo-${new Date().toISOString().slice(0, 10)}`;
const rows = (report: Report) => report.delivered.map(row => ({
  Guía: row.delivery.trackingNumber,
  Fecha: row.deliveredAt.slice(0, 10),
  Tienda: row.store?.name || row.delivery.storeId,
  Repartidor: row.delivery.deliveryPersonName || row.delivery.deliveryPersonId || '',
  'Mercancía RD$': row.productAmount,
  'Flete RD$': row.shippingAmount,
  'Pago repartidor RD$': row.delivery.deliveryPayment || 0,
  'Comisión Sanpi RD$': row.hasConfirmedCommission ? row.commissionAmount : 0,
  'A tienda RD$': row.storePayable,
  'Liquidada a tienda': row.delivery.storePaidAt ? 'Sí' : 'No',
}));

export async function exportFinancialAuditExcel(report: Report) {
  const XLSX = await import('xlsx');
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows(report)), 'Entregas');
  XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet([
    { Concepto: 'Fletes cobrados', 'Monto RD$': report.freight },
    { Concepto: 'Ingresos logísticos independientes', 'Monto RD$': report.logisticsIncome },
    { Concepto: 'Pago repartidores', 'Monto RD$': -report.drivers },
    { Concepto: 'Gastos logísticos', 'Monto RD$': -report.logisticsExpenses },
    { Concepto: 'Utilidad logística', 'Monto RD$': report.logisticsNet },
    { Concepto: 'Comisiones marketplace', 'Monto RD$': report.commissions },
    { Concepto: 'Ingresos marketplace', 'Monto RD$': report.marketplaceIncome },
    { Concepto: 'Gastos marketplace', 'Monto RD$': -report.marketplaceExpenses },
    { Concepto: 'Utilidad marketplace', 'Monto RD$': report.marketplaceNet },
    { Concepto: 'Ingresos generales', 'Monto RD$': report.generalIncome },
    { Concepto: 'Gastos generales', 'Monto RD$': -report.generalExpenses },
    { Concepto: 'Resultado neto', 'Monto RD$': report.net },
  ]), 'Balance');
  XLSX.writeFile(book, `${filename()}.xlsx`);
}

export async function exportFinancialAuditPdf(report: Report, filters: AuditFilters) {
  const { default: jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'landscape' });
  const money = (value: number) => `RD$ ${value.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(17);
  pdf.text('SANPI · BALANCE OPERATIVO', 14, 18);
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9);
  pdf.text(`Periodo: ${filters.from || 'inicio'} a ${filters.to || 'hoy'}  ·  Entregas: ${report.delivered.length}`, 14, 25);
  const summary = [
    `Fletes: ${money(report.freight)}  |  Repartidores: ${money(report.drivers)}  |  Gastos logísticos: ${money(report.logisticsExpenses)}`,
    `Utilidad logística: ${money(report.logisticsNet)}  |  Marketplace: ${money(report.marketplaceNet)}  |  General: ${money(report.generalNet)}`,
    `RESULTADO NETO: ${money(report.net)}  |  Efectivo pendiente en oficina: ${money(report.cashToOffice)}`,
  ];
  summary.forEach((line, index) => pdf.text(line, 14, 33 + index * 6));
  let y = 60;
  const header = () => { pdf.setFont('helvetica', 'bold'); pdf.text('Guía', 14, y); pdf.text('Tienda', 88, y); pdf.text('Flete', 165, y); pdf.text('Repartidor', 205, y); pdf.text('Comisión', 248, y); pdf.line(14, y + 2, 282, y + 2); y += 8; pdf.setFont('helvetica', 'normal'); };
  header();
  for (const row of report.delivered) {
    if (y > 190) { pdf.addPage(); y = 17; header(); }
    pdf.text((row.delivery.trackingNumber || '').slice(0, 34), 14, y);
    pdf.text((row.store?.name || row.delivery.storeId).slice(0, 34), 88, y);
    pdf.text(money(row.shippingAmount), 165, y);
    pdf.text(money(row.delivery.deliveryPayment || 0), 205, y);
    pdf.text(row.hasConfirmedCommission ? money(row.commissionAmount) : 'Por revisar', 248, y);
    y += 7;
  }
  pdf.save(`${filename()}.pdf`);
}
