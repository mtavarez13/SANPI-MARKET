import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { Delivery, CarrierUser } from '../types';

/**
 * Export carrier orders to an Excel spreadsheet (.xlsx) with financial and tracking details
 */
export function exportCarrierOrdersToExcel(
  deliveries: Delivery[],
  carrierName: string = 'Transporte y Courier RD',
  filterLabel: string = 'Todos los Estados'
) {
  const rows = deliveries.map((d, index) => {
    const formattedDate = d.createdAt
      ? new Date(d.createdAt).toLocaleDateString('es-DO', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
      : 'N/A';

    const baseCost = d.basePrice || 0;
    const shippingFee = d.shippingFee || 350;
    const totalCod = d.totalCodAmount || (baseCost + shippingFee);

    return {
      '#': index + 1,
      'No. Guía / Tracking': d.trackingNumber || d.id,
      'Fecha Creación': formattedDate,
      'Estado': (d.status || 'pendiente').toUpperCase().replace('_', ' '),
      'Destinatario': d.customerName || 'Cliente',
      'Teléfono / WhatsApp': d.customerPhone || 'N/A',
      'Provincia': d.province || 'Distrito Nacional',
      'Municipio / Sector': d.municipality || d.city || '',
      'Dirección de Entrega': d.address || '',
      'Artículo / Contenido': d.articleName || 'Paquete Ecommerce',
      'Método de Pago': (d.paymentMethod || 'contra entrega').toUpperCase(),
      'Monto Mercancía (RD$)': baseCost,
      'Flete Envío (RD$)': shippingFee,
      'Total COD a Recaudar (RD$)': totalCod,
      'Chofer Asignado': d.driverName || d.deliveryPersonName || 'Por asignar',
      'Teléfono Chofer': d.driverPhone || d.deliveryPersonPhone || '',
      'Fecha Cobro / Entrega': d.collectedAt ? new Date(d.collectedAt).toLocaleDateString('es-DO') : 'Pendiente',
      'Notas / Observaciones': d.notes || d.carrierNotes || ''
    };
  });

  // Calculate totals
  const totalCodSum = deliveries.reduce((acc, d) => acc + (d.totalCodAmount || ((d.basePrice || 0) + (d.shippingFee || 350))), 0);
  const totalShippingSum = deliveries.reduce((acc, d) => acc + (d.shippingFee || 350), 0);
  const totalBaseSum = deliveries.reduce((acc, d) => acc + (d.basePrice || 0), 0);

  // Add Summary Total Row
  rows.push({
    '#': '' as any,
    'No. Guía / Tracking': 'TOTAL GENERAL',
    'Fecha Creación': `${deliveries.length} Envíos`,
    'Estado': filterLabel,
    'Destinatario': '',
    'Teléfono / WhatsApp': '',
    'Provincia': '',
    'Municipio / Sector': '',
    'Dirección de Entrega': '',
    'Artículo / Contenido': '',
    'Método de Pago': 'RECAUDACIÓN COD',
    'Monto Mercancía (RD$)': totalBaseSum,
    'Flete Envío (RD$)': totalShippingSum,
    'Total COD a Recaudar (RD$)': totalCodSum,
    'Chofer Asignado': '',
    'Teléfono Chofer': '',
    'Fecha Cobro / Entrega': '',
    'Notas / Observaciones': 'Manifiesto de Despacho Sanpi Market'
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set column widths for clean readability
  worksheet['!cols'] = [
    { wch: 4 },  // #
    { wch: 22 }, // No. Guía
    { wch: 18 }, // Fecha Creación
    { wch: 15 }, // Estado
    { wch: 26 }, // Destinatario
    { wch: 18 }, // Teléfono
    { wch: 20 }, // Provincia
    { wch: 20 }, // Municipio
    { wch: 35 }, // Dirección
    { wch: 30 }, // Artículo
    { wch: 16 }, // Método
    { wch: 20 }, // Monto Mercancía
    { wch: 16 }, // Flete
    { wch: 24 }, // Total COD
    { wch: 22 }, // Chofer
    { wch: 16 }, // Tel Chofer
    { wch: 20 }, // Fecha Cobro
    { wch: 35 }  // Notas
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Manifiesto_Despachos');

  const cleanCarrier = carrierName.replace(/[^a-zA-Z0-9]/g, '_');
  const nowStr = new Date().toISOString().slice(0, 10);
  const filename = `SanPi_Manifiesto_${cleanCarrier}_${nowStr}.xlsx`;

  XLSX.writeFile(workbook, filename);
}

/**
 * Export professional Carrier Manifest & COD Settlement PDF Report
 */
export function exportCarrierOrdersToPdf(
  deliveries: Delivery[],
  carrierName: string = 'Transporte y Courier RD',
  carrierUser?: CarrierUser | null,
  statusFilter: string = 'Todos'
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const navyBlue = [15, 23, 42]; // Slate-900
  const vibrantBlue = [37, 99, 235]; // Blue-600
  const emerald = [5, 150, 105]; // Emerald-600

  // 1. Header Banner
  doc.setFillColor(navyBlue[0], navyBlue[1], navyBlue[2]);
  doc.rect(0, 0, 210, 36, 'F');

  doc.setFillColor(vibrantBlue[0], vibrantBlue[1], vibrantBlue[2]);
  doc.rect(0, 36, 210, 3, 'F');

  // Header Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('SANPI LOGISTICS & COURIER MANIFEST', 14, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Plataforma Nacional de Despachos COD • República Dominicana', 14, 23);
  doc.text(`Operador / Courier: ${carrierName.toUpperCase()} ${carrierUser?.rnc ? `(RNC: ${carrierUser.rnc})` : ''}`, 14, 29);

  const issueDate = new Date().toLocaleDateString('es-DO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  doc.text(`Fecha de Emisión: ${issueDate}`, 120, 29);

  // 2. Metrics Summary
  const totalPackages = deliveries.length;
  const deliveredCount = deliveries.filter(d => d.status === 'entregado').length;
  const inTransitCount = deliveries.filter(d => d.status === 'en_transito').length;
  const pendingCount = deliveries.filter(d => d.status === 'pendiente').length;
  const failedCount = deliveries.filter(d => d.status === 'intento_fallido' || d.status === 'cancelado').length;

  const totalCodToCollect = deliveries.reduce((acc, d) => acc + (d.totalCodAmount || ((d.basePrice || 0) + (d.shippingFee || 350))), 0);
  const totalCodCollected = deliveries
    .filter(d => d.status === 'entregado')
    .reduce((acc, d) => acc + (d.totalCodAmount || ((d.basePrice || 0) + (d.shippingFee || 350))), 0);

  let currentY = 46;

  doc.setTextColor(navyBlue[0], navyBlue[1], navyBlue[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`RESUMEN OPERATIVO Y RECAUDACIÓN COD (Filtro: ${statusFilter})`, 14, currentY);

  currentY += 6;

  // Draw 4 Metric Cards
  const cardWidth = 44;
  const cardHeight = 18;
  const cardGap = 4;
  let startX = 14;

  const cards = [
    { label: 'Total Envíos', val: `${totalPackages}`, color: [30, 41, 59] },
    { label: 'Entregados', val: `${deliveredCount}`, color: emerald },
    { label: 'En Tránsito', val: `${inTransitCount}`, color: vibrantBlue },
    { label: 'Total COD Recaudar', val: `RD$ ${totalCodToCollect.toLocaleString()}`, color: [147, 51, 234] }
  ];

  cards.forEach((card) => {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(startX, currentY, cardWidth, cardHeight, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(startX, currentY, cardWidth, cardHeight, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(card.label.toUpperCase(), startX + 4, currentY + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(card.color[0], card.color[1], card.color[2]);
    doc.text(card.val, startX + 4, currentY + 13);

    startX += cardWidth + cardGap;
  });

  currentY += cardHeight + 8;

  // 3. Deliveries Table
  doc.setTextColor(navyBlue[0], navyBlue[1], navyBlue[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('DETALLE DE ÓRDENES Y PAQUETES ASIGNADOS', 14, currentY);

  currentY += 4;

  // Table Header
  doc.setFillColor(vibrantBlue[0], vibrantBlue[1], vibrantBlue[2]);
  doc.rect(14, currentY, 182, 8, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('No. Guía', 16, currentY + 5.5);
  doc.text('Destinatario & Teléfono', 52, currentY + 5.5);
  doc.text('Provincia / Dirección', 98, currentY + 5.5);
  doc.text('Estado', 148, currentY + 5.5);
  doc.text('COD Cobro', 174, currentY + 5.5);

  currentY += 8;

  // Table Rows (Slice to top 20 on first page, or handle page breaks cleanly)
  const maxRowsPerPage = 18;
  const itemsToPrint = deliveries.slice(0, 32);

  itemsToPrint.forEach((del, i) => {
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;

      // Repeat Table Header
      doc.setFillColor(vibrantBlue[0], vibrantBlue[1], vibrantBlue[2]);
      doc.rect(14, currentY, 182, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('No. Guía', 16, currentY + 5.5);
      doc.text('Destinatario & Teléfono', 52, currentY + 5.5);
      doc.text('Provincia / Dirección', 98, currentY + 5.5);
      doc.text('Estado', 148, currentY + 5.5);
      doc.text('COD Cobro', 174, currentY + 5.5);
      currentY += 8;
    }

    const isEven = i % 2 === 0;
    doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    doc.rect(14, currentY, 182, 7.5, 'F');

    doc.setDrawColor(241, 245, 249);
    doc.line(14, currentY + 7.5, 196, currentY + 7.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);

    // Guide
    const trackingTxt = (del.trackingNumber || del.id).slice(0, 16);
    doc.text(trackingTxt, 16, currentY + 5);

    // Customer
    const custTxt = `${del.customerName.slice(0, 18)} (${del.customerPhone.slice(0, 12)})`;
    doc.text(custTxt, 52, currentY + 5);

    // Address
    const addrTxt = `${(del.province || 'RD').slice(0, 14)} - ${(del.address || '').slice(0, 20)}`;
    doc.text(addrTxt, 98, currentY + 5);

    // Status
    const st = del.status === 'entregado' ? 'ENTREGADO' : del.status === 'en_transito' ? 'EN CAMINO' : (del.status || 'PENDIENTE').toUpperCase();
    if (del.status === 'entregado') doc.setTextColor(emerald[0], emerald[1], emerald[2]);
    else if (del.status === 'en_transito') doc.setTextColor(vibrantBlue[0], vibrantBlue[1], vibrantBlue[2]);
    else doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.text(st, 148, currentY + 5);

    // Amount
    doc.setTextColor(15, 23, 42);
    const amount = `RD$ ${(del.totalCodAmount || ((del.basePrice || 0) + (del.shippingFee || 350))).toLocaleString()}`;
    doc.text(amount, 174, currentY + 5);

    currentY += 7.5;
  });

  // 4. Sign-off and Settlement Section
  if (currentY > 230) {
    doc.addPage();
    currentY = 25;
  } else {
    currentY += 12;
  }

  doc.setDrawColor(203, 213, 225);
  doc.line(14, currentY, 196, currentY);
  currentY += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(navyBlue[0], navyBlue[1], navyBlue[2]);
  doc.text('CONFORMIDAD Y LIQUIDACIÓN DE FONDOS RECAUDADOS', 14, currentY);

  currentY += 16;

  // Sign lines
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.5);
  doc.line(20, currentY, 80, currentY);
  doc.line(120, currentY, 180, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Despachador / SanPi Marketplace RD', 22, currentY + 5);
  doc.text(`Receptor / ${carrierName.slice(0, 24)}`, 122, currentY + 5);

  const cleanCarrier = carrierName.replace(/[^a-zA-Z0-9]/g, '_');
  const nowStr = new Date().toISOString().slice(0, 10);
  doc.save(`SanPi_Manifiesto_${cleanCarrier}_${nowStr}.pdf`);
}
