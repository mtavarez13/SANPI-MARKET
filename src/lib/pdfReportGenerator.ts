import jsPDF from 'jspdf';
import { sanpiManager } from './storeManager';

export function generateSanpiExecutivePdfReport() {
  const fin = sanpiManager.getFinancialSummary();
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const primaryPurple = [147, 51, 234]; // #9333ea Morado Sanpi
  const darkSlate = [15, 23, 42]; // #0f172a Slate-900
  const lightGray = [248, 250, 252];

  // Header Banner
  doc.setFillColor(primaryPurple[0], primaryPurple[1], primaryPurple[2]);
  doc.rect(0, 0, 210, 42, 'F');

  // Header Text
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('SANPI MARKETPLACE', 14, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Plataforma Nacional de Ecommerce COD & Dropshipping República Dominicana', 14, 28);
  doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`, 14, 35);

  // Subtitle / Title
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('REPORTE EJECUTIVO Y BALANCE DE RENTABILIDAD NETA', 14, 52);

  // Decorative Accent Line
  doc.setDrawColor(primaryPurple[0], primaryPurple[1], primaryPurple[2]);
  doc.setLineWidth(1);
  doc.line(14, 55, 196, 55);

  // Summary KPI Cards Box
  let y = 62;

  // Box 1: MRR
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.roundedRect(14, y, 56, 26, 3, 3, 'F');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('MRR (Suscripciones)', 18, y + 8);
  doc.setFontSize(13);
  doc.setTextColor(primaryPurple[0], primaryPurple[1], primaryPurple[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(`RD$ ${fin.mrr.toLocaleString()}`, 18, y + 18);

  // Box 2: Comisiones por Ventas
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.roundedRect(77, y, 56, 26, 3, 3, 'F');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('Comisiones Cobradas', 81, y + 8);
  doc.setFontSize(13);
  doc.setTextColor(primaryPurple[0], primaryPurple[1], primaryPurple[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(`RD$ ${fin.totalCommissions.toLocaleString()}`, 81, y + 18);

  // Box 3: Gastos Operativos
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.roundedRect(140, y, 56, 26, 3, 3, 'F');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('Gastos Operativos', 144, y + 8);
  doc.setFontSize(13);
  doc.setTextColor(225, 29, 72); // Red accent for expenses
  doc.setFont('helvetica', 'bold');
  doc.text(`RD$ ${fin.totalExpenses.toLocaleString()}`, 144, y + 18);

  // Net Profit Highlight Box (Morado deep)
  y += 32;
  doc.setFillColor(243, 232, 255); // Purple tint
  doc.setDrawColor(primaryPurple[0], primaryPurple[1], primaryPurple[2]);
  doc.roundedRect(14, y, 182, 24, 4, 4, 'FD');

  doc.setTextColor(88, 28, 135);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('UTILIDAD NETA TOTAL SANPI:', 20, y + 14);

  doc.setFontSize(16);
  doc.text(`RD$ ${fin.netProfit.toLocaleString()}`, 120, y + 15);

  // Financial Breakdown Table
  y += 34;
  doc.setFontSize(12);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text('Desglose Financiero y Logístico', 14, y);

  y += 6;
  doc.setFillColor(primaryPurple[0], primaryPurple[1], primaryPurple[2]);
  doc.rect(14, y, 182, 8, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('CONCEPTO', 18, y + 5.5);
  doc.text('TIPO / DETALLE', 90, y + 5.5);
  doc.text('MONTO (DOP)', 155, y + 5.5);

  const rows = [
    { concept: 'Suscripciones Activas de Socios (MRR)', detail: `${sanpiManager.stores.length} Tiendas Registradas`, amount: `+ RD$ ${fin.mrr.toLocaleString()}` },
    { concept: 'Comisiones de Ventas Entregadas', detail: `${fin.deliveredOrdersCount} Guías Entregadas`, amount: `+ RD$ ${fin.totalCommissions.toLocaleString()}` },
    { concept: 'Fletes Nacionales Recaudados (RD$ 350 COD)', detail: `${fin.deliveredOrdersCount} Envíos COD Procesados`, amount: `RD$ ${fin.totalShippingCollected.toLocaleString()}` },
    { concept: 'Gastos Operativos (Logística, Ads, Servidores)', detail: `${sanpiManager.expenses.length} Gastos Registrados`, amount: `- RD$ ${fin.totalExpenses.toLocaleString()}` },
  ];

  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);

  rows.forEach((row, i) => {
    if (i % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, 182, 8, 'F');
    }
    doc.text(row.concept, 18, y + 5.5);
    doc.text(row.detail, 90, y + 5.5);
    doc.text(row.amount, 155, y + 5.5);
    y += 8;
  });

  // Recent Expenses Section
  y += 8;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Registro de Gastos Operativos Recientes', 14, y);

  y += 6;
  doc.setFillColor(100, 116, 139);
  doc.rect(14, y, 182, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.text('DESCRIPCIÓN', 18, y + 4.5);
  doc.text('CATEGORÍA', 100, y + 4.5);
  doc.text('FECHA', 140, y + 4.5);
  doc.text('MONTO', 170, y + 4.5);

  y += 7;
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  sanpiManager.expenses.slice(0, 5).forEach((exp, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, 182, 7, 'F');
    }
    doc.text(exp.title.substring(0, 45), 18, y + 4.5);
    doc.text((exp.category || '').toUpperCase(), 100, y + 4.5);
    doc.text(exp.date, 140, y + 4.5);
    doc.text(`RD$ ${exp.amount.toLocaleString()}`, 170, y + 4.5);
    y += 7;
  });

  // Footer / Signature
  y = 265;
  doc.setDrawColor(203, 213, 225);
  doc.line(14, y, 196, y);

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Sanpi Marketplace & Dropshipping República Dominicana | Documento Oficial de Balance Financiero', 14, y + 6);
  doc.text('Master Security Approved - Clave SACHA2025 | sanpimarket.do', 14, y + 10);

  // Download PDF
  doc.save(`Sanpi_Reporte_Ejecutivo_${new Date().toISOString().split('T')[0]}.pdf`);
}
