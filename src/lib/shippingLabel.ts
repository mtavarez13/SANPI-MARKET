import type { Delivery, SiteThemeConfig, Store } from '../types';
import { carrierGuideFor } from './trackingAliases';

export const THERMAL_LABEL_MM = { width: 101.6, height: 152.4 } as const;

const clean = (value: unknown) => String(value ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').trim();
const money = (value: number) => `RD$ ${new Intl.NumberFormat('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;

export function shippingLabelData(delivery: Delivery, store?: Store) {
  const guide = clean(delivery.trackingNumber || delivery.id);
  if (!guide) throw new Error('La orden no tiene un número de guía para la etiqueta.');
  const provider = clean(delivery.carrierName || delivery.logisticsProviderName);
  const sacha = !provider || /sacha/i.test(provider) || /sacha/i.test(delivery.logisticsProviderId || '');
  const isCod = delivery.paymentMethod !== 'transferencia';
  const date = new Date(delivery.createdAt);
  const carrierGuide = clean(carrierGuideFor(delivery));
  return {
    guide,
    carrierGuide,
    scanGuide: guide,
    routeLetter: clean(delivery.province).charAt(0).toUpperCase() || 'RD',
    carrier: sacha ? 'SACHA PACK' : provider.toUpperCase(),
    payment: isCod ? 'CONTRA ENTREGA' : 'PAGADO / TRANSFERENCIA',
    collect: money(isCod ? Math.max(0, Number(delivery.totalToCollect ?? delivery.totalCodAmount) || 0) : 0),
    createdAt: Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('es-DO', { dateStyle: 'short', timeStyle: 'short' }).format(date),
    senderName: clean(delivery.senderName || store?.name || 'Tienda Sanpi'),
    senderContact: clean(delivery.senderContactName || store?.ownerName),
    senderPhone: clean(delivery.senderPhone || store?.contact?.phone || store?.phone),
    senderProvince: clean(delivery.senderProvince || store?.province),
    senderAddress: clean(delivery.senderAddress || store?.pickupAddress),
    recipientName: clean(delivery.customerName),
    recipientPhone: clean(delivery.customerPhone),
    recipientAddress: clean(delivery.address),
    recipientCity: clean(delivery.municipality || delivery.city),
    recipientProvince: clean(delivery.province),
    notes: clean(delivery.notes),
    product: clean(delivery.articleName),
    quantity: Math.max(1, Math.floor(Number(delivery.quantity) || 1)),
  };
}

type LabelData = ReturnType<typeof shippingLabelData>;

export type LabelCodeRenderer = (bcid: 'qrcode' | 'code128', value: string) => Promise<string | Uint8Array>;

async function browserCodeImage(bcid: 'qrcode' | 'code128', value: string): Promise<string> {
  const { default: bwipjs } = await import('bwip-js/browser');
  const options = { bcid, text: value, scale: 3, height: 9, paddingwidth: 0, paddingheight: 0, includetext: false };
  const canvas = document.createElement('canvas');
  bwipjs.toCanvas(canvas, options);
  return canvas.toDataURL('image/png');
}

type LabelBranding = Pick<SiteThemeConfig, 'labelSanpiLogoUrl' | 'labelSachaLogoUrl'>;

export async function createShippingLabelPdf(delivery: Delivery, store?: Store, renderCode: LabelCodeRenderer = browserCodeImage, branding?: LabelBranding) {
  const data = shippingLabelData(delivery, store);
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [THERMAL_LABEL_MM.width, THERMAL_LABEL_MM.height], compress: true });
  const W = THERMAL_LABEL_MM.width;
  const line = (y: number) => { doc.setLineWidth(0.35); doc.line(3.5, y, W - 3.5, y); };
  const label = (value: string, x: number, y: number) => { doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.text(value.toUpperCase(), x, y); };
  const value = (text: string, x: number, y: number, width: number, lines = 1, size = 8, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    const wrapped = doc.splitTextToSize(text || '-', width) as string[];
    const shown = wrapped.slice(0, lines);
    if (wrapped.length > lines && shown.length) shown[shown.length - 1] = `${shown[shown.length - 1].slice(0, -2)}...`;
    doc.text(shown, x, y, { lineHeightFactor: 1.12 });
  };
  const drawLogo = (source: string | undefined, x: number, y: number, width: number, height: number): boolean => {
    if (!source || !/^data:image\/(?:png|jpeg);base64,/i.test(source)) return false;
    try {
      const image = doc.getImageProperties(source);
      const ratio = Math.min(width / image.width, height / image.height);
      doc.addImage(source, image.fileType, x + (width - image.width * ratio) / 2, y + (height - image.height * ratio) / 2, image.width * ratio, image.height * ratio);
      return true;
    } catch {
      return false;
    }
  };

  doc.setDrawColor(0);
  doc.setTextColor(0);
  doc.setLineWidth(0.45);
  doc.rect(3.5, 3.5, W - 7, THERMAL_LABEL_MM.height - 7);
  line(29); line(45); line(68); line(104); line(125);
  doc.line(27, 3.5, 27, 29);
  doc.line(74, 3.5, 74, 29);
  doc.line(56, 29, 56, 45);

  doc.setFont('helvetica', 'bold'); doc.setFontSize(27);
  doc.text(data.routeLetter, 7, 17);
  value(data.recipientProvince, 6, 23, 19, 2, 6, true);
  if (!drawLogo(branding?.labelSanpiLogoUrl, 30, 5, 42, 7)) {
    doc.setFontSize(13); doc.text('SANPI', 30, 11);
  }
  label('ETIQUETA DE ENVÍO', 30, 15);
  value(data.payment, 30, 21, 42, 1, 9, true);
  value(data.createdAt, 30, 26, 42, 1, 6);
  doc.addImage(await renderCode('qrcode', data.scanGuide), 'PNG', 77, 5.5, 19, 19);
  label('TRANSPORTADORA', 6, 34);
  if (!(data.carrier === 'SACHA PACK' && drawLogo(branding?.labelSachaLogoUrl, 6, 35.5, 48, 7))) {
    value(data.carrier, 6, 41, 48, 1, 12, true);
  }
  label('GESTIONADO POR', 59, 34);
  if (!drawLogo(branding?.labelSanpiLogoUrl, 59, 35.5, 35, 7)) {
    value('SANPI MARKET', 59, 41, 35, 1, 9, true);
  }

  label('REMITENTE / ORIGEN', 6, 50);
  value(data.senderName, 6, 56, 87, 1, 9, true);
  value([data.senderContact, data.senderPhone].filter(Boolean).join('  ·  '), 6, 61, 87, 1, 7);
  const senderLocation = data.senderAddress && data.senderProvince && data.senderAddress.toLocaleLowerCase('es').includes(data.senderProvince.toLocaleLowerCase('es'))
    ? data.senderAddress : [data.senderAddress, data.senderProvince].filter(Boolean).join(', ');
  value(senderLocation, 6, 65.5, 87, 1, 6.5);

  label('DATOS DEL DESTINATARIO', 6, 73);
  value(data.recipientName, 6, 80, 86, 1, 12, true);
  label('TELÉFONO', 6, 85);
  value(data.recipientPhone, 28, 85, 64, 1, 9, true);
  label('DIRECCIÓN', 6, 90);
  value(data.recipientAddress, 28, 90, 64, 2, 7.5);
  label('DESTINO', 6, 98);
  value([data.recipientCity, data.recipientProvince].filter(Boolean).join(', '), 28, 98, 64, 1, 7.5, true);
  if (data.notes) value(`NOTA: ${data.notes}`, 6, 102, 87, 1, 6);

  label('MERCANCÍA', 6, 109);
  label('CANT.', 82, 109);
  value(data.product, 6, 115, 73, 2, 7.5, true);
  value(String(data.quantity), 83, 115, 10, 1, 8, true);
  label('COBRO AL ENTREGAR', 6, 122);
  value(data.collect, 51, 122, 42, 1, 10, true);

  const barcode = await renderCode('code128', data.scanGuide);
  doc.addImage(barcode, 'PNG', 8, 127.5, 85, 11);
  value(data.scanGuide, 5, 143, 91, 1, 6.5, true);
  if (data.carrierGuide && data.carrierGuide !== data.guide) value(`GUÍA TRANSPORTISTA: ${data.carrierGuide}`, 5, 147, 91, 1, 5.5);
  return doc;
}

export async function downloadShippingLabel(delivery: Delivery, store?: Store, branding?: LabelBranding) {
  const pdf = await createShippingLabelPdf(delivery, store, browserCodeImage, branding);
  const safeGuide = shippingLabelData(delivery, store).guide.replace(/[^a-z0-9-]/gi, '_');
  pdf.save(`etiqueta-sanpi-${safeGuide}.pdf`);
}
