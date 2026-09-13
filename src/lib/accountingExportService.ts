import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { UserAccountingReport } from './accountingService';

/**
 * Exports user accounting balance to a multi-sheet Microsoft Excel (.xlsx) file
 */
export function exportAccountingToExcel(report: UserAccountingReport) {
  const wb = XLSX.utils.book_new();

  const cleanName = (report.user.displayName || 'Usuario').replace(/[^a-zA-Z0-9_-]/g, '_');
  const nowStr = new Date().toISOString().slice(0, 10);

  // --- SHEET 1: RESUMEN EJECUTIVO ---
  const summaryAoa: any[][] = [
    ['SANPI MARKETPLACE REPÚBLICA DOMINICANA - SISTEMA CONTABLE INTEGRAL'],
    ['INFORME FINANCIERO DE BENEFICIOS, GASTOS Y RESULTADOS'],
    [''],
    ['DATOS DEL TITULAR / USUARIO'],
    ['Nombre / Razón Social:', report.user.displayName],
    ['Correo Electrónico:', report.user.email],
    ['Rol en la Plataforma:', report.user.role.toUpperCase()],
    ['Tienda / Empresa:', report.user.storeName || report.user.companyName || 'No Aplica'],
    ['Provincia / Región:', report.user.province || 'República Dominicana'],
    ['Teléfono Contacto:', report.user.phone || 'N/D'],
    ['RNC / Cédula:', report.user.rnc || 'N/D'],
    ['Plan de Membresía:', (report.user.plan || 'pro').toUpperCase()],
    ['Período del Reporte:', report.period],
    ['Fecha y Hora de Emisión:', new Date().toLocaleString('es-DO')],
    [''],
    ['INDICADORES CLAVE DE RENDIMIENTO (KPIs)'],
    ['Concepto Financiero', 'Monto en Pesos Dominicanos (DOP)', 'Notas'],
    ['Ingresos / Ventas Brutas Totales', report.metrics.grossRevenue, 'Total transaccionado en el período'],
    ['Comisiones de Plataforma Deducidas', report.metrics.totalPlatformCommissions, 'Tarifas del marketplace (8% - 15%)'],
    ['Fletes de Envío Recaudados', report.metrics.totalShippingRevenue, 'Tarifa logística COD'],
    ['Gastos Operativos & Deducciones', report.metrics.totalExpenses, 'Gastos manuales + membresías'],
    ['BENEFICIO NETO (UTILIDAD REAL)', report.metrics.netProfit, report.metrics.status === 'rentable' ? 'Rentabilidad Positiva' : 'Pérdida / Déficit'],
    ['Margen de Rentabilidad (%)', `${report.metrics.profitMargin}%`, 'Porcentaje sobre ventas brutas'],
    ['Total de Órdenes Procesadas', report.metrics.ordersCount, `${report.metrics.deliveredCount} entregadas exitosamente (${report.metrics.fulfillmentRate}% éxito)`],
    [''],
    ['DISTRIBUCIÓN DE GASTOS POR CATEGORÍA'],
    ['Categoría', 'Gasto Total (DOP)', '% del Total'],
  ];

  const totalExp = report.metrics.totalExpenses || 1;
  Object.entries(report.expensesByCategory).forEach(([cat, amount]) => {
    const pct = ((amount / totalExp) * 100).toFixed(1);
    summaryAoa.push([cat.toUpperCase(), amount, `${pct}%`]);
  });

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryAoa);
  wsSummary['!cols'] = [{ wch: 35 }, { wch: 25 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen Ejecutivo');

  // --- SHEET 2: DETALLE DE INGRESOS ---
  const incomesData = report.incomes.map(inc => ({
    'Fecha': inc.date,
    'Referencia / Guía': inc.referenceId,
    'Tipo': inc.type.toUpperCase().replace('_', ' '),
    'Descripción / Producto': inc.title,
    'Cliente / Destino': inc.customerName || 'Cliente',
    'Ubicación': inc.customerLocation || 'RD',
    'Monto Bruto (DOP)': inc.grossAmount,
    'Comisión Plataforma (DOP)': inc.platformFee,
    'Flete Logística (DOP)': inc.shippingFee,
    'Ingreso Neto Ganado (DOP)': inc.netIncome,
    'Estado Operación': inc.status.toUpperCase()
  }));

  const wsIncomes = XLSX.utils.json_to_sheet(incomesData.length > 0 ? incomesData : [{ 'Mensaje': 'No se encontraron ingresos en este período' }]);
  wsIncomes['!cols'] = [
    { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 32 }, { wch: 22 }, { wch: 20 },
    { wch: 16 }, { wch: 18 }, { wch: 16 }, { wch: 18 }, { wch: 14 }
  ];
  XLSX.utils.book_append_sheet(wb, wsIncomes, 'Detalle de Ingresos');

  // --- SHEET 3: DETALLE DE GASTOS ---
  const expensesData = report.expenses.map(exp => ({
    'Fecha': exp.date,
    'Concepto del Gasto': exp.title,
    'Categoría': exp.category.toUpperCase(),
    'Monto (DOP)': exp.amount,
    'Comprobante / NCF': exp.reference || 'N/D',
    'Tipo Gasto': exp.isAutomaticFee ? 'Deducción Automática de Plan' : 'Gasto Operativo Directo',
    'Asignado a': exp.userName || report.user.displayName,
    'Notas / Justificante': exp.notes || ''
  }));

  const wsExpenses = XLSX.utils.json_to_sheet(expensesData.length > 0 ? expensesData : [{ 'Mensaje': 'No se registraron gastos en este período' }]);
  wsExpenses['!cols'] = [
    { wch: 12 }, { wch: 32 }, { wch: 18 }, { wch: 16 }, { wch: 18 }, { wch: 24 }, { wch: 22 }, { wch: 30 }
  ];
  XLSX.utils.book_append_sheet(wb, wsExpenses, 'Detalle de Gastos');

  // --- SHEET 4: ESTADO DE RESULTADOS (P&L) ---
  const plAoa: any[][] = [
    ['ESTADO DE RESULTADOS INTEGRAL (P&L)'],
    [`Titular: ${report.user.displayName} | Período: ${report.period}`],
    ['Moneda: Pesos Dominicanos (DOP)'],
    [''],
    ['Línea Contable', 'Subtotal (DOP)', 'Total (DOP)'],
    ['(+) INGRESOS OPERACIONALES BRUTOS', '', report.metrics.grossRevenue],
    ['   Ventas de Productos / Servicios COD', report.metrics.grossRevenue - report.metrics.totalShippingRevenue, ''],
    ['   Recaudación por Servicios de Flete', report.metrics.totalShippingRevenue, ''],
    [''],
    ['(-) DEDUCCIONES Y COSTOS DE PLATAFORMA', '', -(report.metrics.totalPlatformCommissions + report.metrics.subscriptionCost)],
    ['   Comisiones de Plataforma (Marketplace)', -report.metrics.totalPlatformCommissions, ''],
    ['   Cuotas de Membresía / Plan', -report.metrics.subscriptionCost, ''],
    [''],
    ['(=) MARGEN BRUTO OPERATIVO', '', report.metrics.grossRevenue - (report.metrics.totalPlatformCommissions + report.metrics.subscriptionCost)],
    [''],
    ['(-) GASTOS OPERATIVOS GENERALES', '', -(report.metrics.directOperatingExpenses - report.metrics.subscriptionCost)],
    ['   Marketing y Publicidad (Meta/TikTok/Google)', -(report.expensesByCategory['marketing'] || 0), ''],
    ['   Logística, Empaques y Despachos', -(report.expensesByCategory['logistica'] || 0), ''],
    ['   Servidores y Tecnologías Cloud', -(report.expensesByCategory['servidores'] || 0), ''],
    ['   Nómina y Mano de Obra', -(report.expensesByCategory['nomina'] || 0), ''],
    ['   Inventario y Compras Mayoristas', -(report.expensesByCategory['inventario'] || 0), ''],
    ['   Otros Gastos Varios', -(report.expensesByCategory['otros'] || 0), ''],
    [''],
    ['(=) BENEFICIO NETO CONTABLE (UTILIDAD NETA)', '', report.metrics.netProfit],
    ['Margen Operativo Neto (%)', '', `${report.metrics.profitMargin}%`],
    [''],
    ['Certificado por Auditoría Financiera de Sanpi Marketplace Dominicano'],
  ];

  const wsPl = XLSX.utils.aoa_to_sheet(plAoa);
  wsPl['!cols'] = [{ wch: 45 }, { wch: 20 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsPl, 'Estado de Resultados');

  // Trigger download
  XLSX.writeFile(wb, `Sanpi_Contabilidad_${cleanName}_${nowStr}.xlsx`);
}

/**
 * Exports user accounting report to an executive formatted PDF document
 */
export function exportAccountingToPdf(report: UserAccountingReport) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const primaryPurple = [124, 58, 237]; // #7c3aed
  const darkNavy = [15, 23, 42]; // #0f172a
  const emeraldGreen = [16, 185, 129];
  const crimsonRed = [225, 29, 72];
  const cardGray = [248, 250, 252];

  // Top header banner
  doc.setFillColor(primaryPurple[0], primaryPurple[1], primaryPurple[2]);
  doc.rect(0, 0, 210, 36, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('SANPI MARKETPLACE - ESTADO CONTABLE', 14, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text('Módulo Oficial de Contabilidad, Beneficios y Gastos Operativos', 14, 24);
  doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString('es-DO', { year: 'numeric', month: 'short', day: 'numeric' })} | Período: ${report.period}`, 14, 30);

  // User Profile Box
  let y = 42;
  doc.setFillColor(cardGray[0], cardGray[1], cardGray[2]);
  doc.roundedRect(14, y, 182, 22, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, 182, 22, 2, 2, 'S');

  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Titular: ${report.user.displayName}`, 18, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Rol: ${report.user.role.toUpperCase()} | Email: ${report.user.email}`, 18, y + 13);
  doc.text(`Tienda/Empresa: ${report.user.storeName || report.user.companyName || 'Sanpi Ecosistema'} | RNC/Cédula: ${report.user.rnc || 'N/D'} | Plan: ${(report.user.plan || 'pro').toUpperCase()}`, 18, y + 18);

  // 4 KPI Cards
  y = 70;
  const colW = 42.5;
  const gap = 4;

  // Card 1: Ingresos Brutos
  doc.setFillColor(cardGray[0], cardGray[1], cardGray[2]);
  doc.roundedRect(14, y, colW, 24, 2, 2, 'F');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('INGRESOS BRUTOS', 17, y + 7);
  doc.setFontSize(10.5);
  doc.setTextColor(primaryPurple[0], primaryPurple[1], primaryPurple[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(`RD$ ${report.metrics.grossRevenue.toLocaleString()}`, 17, y + 15);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`${report.metrics.ordersCount} operaciones`, 17, y + 20);

  // Card 2: Gastos Totales
  const x2 = 14 + colW + gap;
  doc.setFillColor(cardGray[0], cardGray[1], cardGray[2]);
  doc.roundedRect(x2, y, colW, 24, 2, 2, 'F');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('GASTOS TOTALES', x2 + 3, y + 7);
  doc.setFontSize(10.5);
  doc.setTextColor(crimsonRed[0], crimsonRed[1], crimsonRed[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(`- RD$ ${report.metrics.totalExpenses.toLocaleString()}`, x2 + 3, y + 15);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`${report.expenses.length} conceptos`, x2 + 3, y + 20);

  // Card 3: Beneficio Neto
  const x3 = x2 + colW + gap;
  doc.setFillColor(cardGray[0], cardGray[1], cardGray[2]);
  doc.roundedRect(x3, y, colW, 24, 2, 2, 'F');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('BENEFICIO NETO REAL', x3 + 3, y + 7);
  doc.setFontSize(10.5);
  doc.setTextColor(report.metrics.netProfit >= 0 ? emeraldGreen[0] : crimsonRed[0], report.metrics.netProfit >= 0 ? emeraldGreen[1] : crimsonRed[1], report.metrics.netProfit >= 0 ? emeraldGreen[2] : crimsonRed[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(`RD$ ${report.metrics.netProfit.toLocaleString()}`, x3 + 3, y + 15);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(report.metrics.netProfit >= 0 ? emeraldGreen[0] : crimsonRed[0], report.metrics.netProfit >= 0 ? emeraldGreen[1] : crimsonRed[1], report.metrics.netProfit >= 0 ? emeraldGreen[2] : crimsonRed[2]);
  doc.text(report.metrics.status === 'rentable' ? 'Rentabilidad Positiva' : 'Déficit Operativo', x3 + 3, y + 20);

  // Card 4: Margen Operativo
  const x4 = x3 + colW + gap;
  doc.setFillColor(cardGray[0], cardGray[1], cardGray[2]);
  doc.roundedRect(x4, y, colW, 24, 2, 2, 'F');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('MARGEN NETO %', x4 + 3, y + 7);
  doc.setFontSize(10.5);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(`${report.metrics.profitMargin}%`, x4 + 3, y + 15);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`${report.metrics.fulfillmentRate}% entregas COD`, x4 + 3, y + 20);

  // Section 1: Incomes Table
  y = 102;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text('1. Detalle de Beneficios e Ingresos del Período', 14, y);

  y += 4;
  doc.setFillColor(primaryPurple[0], primaryPurple[1], primaryPurple[2]);
  doc.rect(14, y, 182, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.text('FECHA', 16, y + 4.2);
  doc.text('GUÍA / REF', 35, y + 4.2);
  doc.text('CONCEPTO / PRODUCTO', 65, y + 4.2);
  doc.text('BRUTO (DOP)', 132, y + 4.2);
  doc.text('FEE / DEDUC', 156, y + 4.2);
  doc.text('NETO (DOP)', 177, y + 4.2);

  y += 6;
  const sampleIncomes = report.incomes.slice(0, 9);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);

  if (sampleIncomes.length === 0) {
    doc.text('No se encontraron registros de ingresos en este período contable.', 18, y + 5);
    y += 8;
  } else {
    sampleIncomes.forEach((inc, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y, 182, 6, 'F');
      }
      doc.text(inc.date, 16, y + 4.2);
      doc.text((inc.referenceId || '').substring(0, 12), 35, y + 4.2);
      doc.text((inc.title || '').substring(0, 38), 65, y + 4.2);
      doc.text(`RD$ ${inc.grossAmount.toLocaleString()}`, 132, y + 4.2);
      doc.text(`- RD$ ${inc.platformFee.toLocaleString()}`, 156, y + 4.2);
      doc.setFont('helvetica', 'bold');
      doc.text(`RD$ ${inc.netIncome.toLocaleString()}`, 177, y + 4.2);
      doc.setFont('helvetica', 'normal');
      y += 6;
    });

    if (report.incomes.length > 9) {
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`... y ${report.incomes.length - 9} operaciones más registradas (Consulte Excel para lista completa).`, 16, y + 4);
      y += 6;
    }
  }

  // Section 2: Expenses Table
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text('2. Detalle de Gastos Operativos y Deducciones', 14, y);

  y += 4;
  doc.setFillColor(100, 116, 139);
  doc.rect(14, y, 182, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.text('FECHA', 16, y + 4.2);
  doc.text('CONCEPTO', 35, y + 4.2);
  doc.text('CATEGORÍA', 115, y + 4.2);
  doc.text('COMPROBANTE', 148, y + 4.2);
  doc.text('MONTO (DOP)', 175, y + 4.2);

  y += 6;
  const sampleExpenses = report.expenses.slice(0, 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);

  if (sampleExpenses.length === 0) {
    doc.text('No hay gastos operativos registrados para este usuario en este período.', 18, y + 5);
    y += 8;
  } else {
    sampleExpenses.forEach((exp, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y, 182, 6, 'F');
      }
      doc.text(exp.date, 16, y + 4.2);
      doc.text((exp.title || '').substring(0, 45), 35, y + 4.2);
      doc.text((exp.category || '').toUpperCase(), 115, y + 4.2);
      doc.text((exp.reference || 'N/D').substring(0, 14), 148, y + 4.2);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(crimsonRed[0], crimsonRed[1], crimsonRed[2]);
      doc.text(`- RD$ ${exp.amount.toLocaleString()}`, 175, y + 4.2);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
      y += 6;
    });

    if (report.expenses.length > 8) {
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`... y ${report.expenses.length - 8} gastos adicionales registrados (Consulte Excel para desglose total).`, 16, y + 4);
      y += 6;
    }
  }

  // Footer & Official Certification
  y = 265;
  doc.setDrawColor(226, 232, 240);
  doc.line(14, y, 196, y);

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Documento Contable Oficial expedido por el Sistema de Finanzas de Sanpi Marketplace Dominicano.', 14, y + 5);
  doc.text(`Hash de Seguridad: SANPI-ACCT-${report.user.uid.slice(0, 8).toUpperCase()}-${new Date().getTime().toString(36).toUpperCase()} | Verificado con soporte oficial WhatsApp 809-676-6690`, 14, y + 9);

  const cleanName = (report.user.displayName || 'Usuario').replace(/[^a-zA-Z0-9_-]/g, '_');
  const nowStr = new Date().toISOString().slice(0, 10);
  doc.save(`Sanpi_Reporte_Contable_${cleanName}_${nowStr}.pdf`);
}
