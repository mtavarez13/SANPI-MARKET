import { Article, Delivery, Expense, MarketplaceSubscription, Store, Transaction, LandingPageConfig, DropshipItem, StoreReferralRecord, SanpiPlan, CarrierUser } from '../types';

export const INITIAL_STORES: Store[] = [
  {
    id: 'store_1',
    ownerId: 'owner_carlos_rosario',
    name: 'TechZone Quisqueya',
    slug: 'techzone-quisqueya',
    description: 'Distribuidor mayorista oficial de electrónica de alta gama, laptops, smartwatches y accesorios gaming con garantía nacional en República Dominicana.',
    logoUrl: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=200&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1400&auto=format&fit=crop&q=80',
    coverImageUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1400&auto=format&fit=crop&q=80',
    theme: {
      primaryColor: '#2563eb', // Tech Blue
      secondaryColor: '#0f172a',
      fontFamily: 'Inter'
    },
    rating: 4.9,
    totalReviews: 342,
    contact: {
      phone: '809-555-0192',
      whatsapp: '8095550192',
      email: 'ventas@techzone.do'
    },
    isActive: true,
    isMarketplace: true,
    marketplaceCommission: 0.10, // Plan Pro 10%
    ownerEmail: 'ventas@techzone.do',
    ownerName: 'Carlos Rosario',
    phone: '809-555-0192',
    province: 'Distrito Nacional',
    status: 'approved',
    plan: 'pro',
    sachaPackStoreId: 'sxOzEivG9GP9SvaVuF1nVpQZCOu1',
    referralCode: 'SANPI-TECHZONE',
    referralDiscountPercent: 15,
    referralDiscountStatus: 'activo',
    referralDiscountNote: 'Descuento especial del 15% aplicado por referir 3 tiendas en Santo Domingo',
    totalReferredStoresCount: 2,
    totalReferralSavings: 4500,
    referralProgramActive: true,
    createdAt: '2026-01-15T10:00:00Z'
  },
  {
    id: 'store_2',
    ownerId: 'owner_laura_peralta',
    name: 'Moda Caribe Santo Domingo',
    slug: 'moda-caribe',
    description: 'Ropa de tendencia urbana y playa confeccionada y seleccionada para el clima caribeño. Moda premium y calzado unisex de alta durabilidad.',
    logoUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=1400&auto=format&fit=crop&q=80',
    coverImageUrl: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=1400&auto=format&fit=crop&q=80',
    theme: {
      primaryColor: '#9333ea', // Royal Purple
      secondaryColor: '#1e1b4b',
      fontFamily: 'Plus Jakarta Sans'
    },
    rating: 4.8,
    totalReviews: 215,
    contact: {
      phone: '829-555-8832',
      whatsapp: '8295558832',
      email: 'contacto@modacaribe.do'
    },
    isActive: true,
    isMarketplace: true,
    marketplaceCommission: 0.08, // Plan Elite / Full 8%
    ownerEmail: 'contacto@modacaribe.do',
    ownerName: 'Laura Peralta',
    phone: '829-555-8832',
    province: 'Santo Domingo',
    status: 'approved',
    plan: 'elite',
    sachaPackStoreId: 'sxOzEivG9GP9SvaVuF1nVpQZCOu1',
    referralCode: 'SANPI-MODACARIBE',
    referredByStoreId: 'store_1',
    referredByStoreName: 'TechZone Quisqueya',
    referredByCode: 'SANPI-TECHZONE',
    referralDiscountPercent: 10,
    referralDiscountStatus: 'activo',
    referralDiscountNote: '10% de descuento aplicado por registro vía referido',
    totalReferredStoresCount: 1,
    totalReferralSavings: 3000,
    referralProgramActive: true,
    createdAt: '2026-02-01T14:30:00Z'
  },
  {
    id: 'store_3',
    ownerId: 'owner_jose_martinez',
    name: 'AutoRepuestos El Cibao',
    slug: 'autorepuestos-cibao',
    description: 'Especialistas en luces LED turbo, kits de mantenimiento preventivo y accesorios automotrices multimarca para Santiago y todo el Cibao.',
    logoUrl: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=200&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1400&auto=format&fit=crop&q=80',
    coverImageUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1400&auto=format&fit=crop&q=80',
    theme: {
      primaryColor: '#ea580c', // Orange Amber
      secondaryColor: '#18181b',
      fontFamily: 'Inter'
    },
    rating: 4.7,
    totalReviews: 128,
    contact: {
      phone: '809-555-3341',
      whatsapp: '8095553341',
      email: 'ventas@repuestoscibao.do'
    },
    isActive: true,
    isMarketplace: true,
    marketplaceCommission: 0.15, // Plan Básico 15%
    ownerEmail: 'ventas@repuestoscibao.do',
    ownerName: 'José Manuel Martínez',
    phone: '809-555-3341',
    province: 'Santiago',
    status: 'approved',
    plan: 'basic',
    sachaPackStoreId: 'sxOzEivG9GP9SvaVuF1nVpQZCOu1',
    referralCode: 'SANPI-AUTOCIB',
    referralDiscountPercent: 20,
    referralDiscountStatus: 'activo',
    referralDiscountNote: '20% de descuento asignado por Admin por expansión en región Cibao',
    totalReferredStoresCount: 1,
    totalReferralSavings: 1500,
    referralProgramActive: true,
    createdAt: '2026-02-10T11:15:00Z'
  },
  {
    id: 'store_4',
    ownerId: 'owner_anabel_gomez',
    name: 'Hogar & Confort Punta Cana',
    slug: 'hogar-confort',
    description: 'Artículos innovadores para el hogar, organizadores inteligentes, gadgets de cocina y electrodomésticos portátiles para la vida moderna.',
    logoUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=200&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1400&auto=format&fit=crop&q=80',
    coverImageUrl: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1400&auto=format&fit=crop&q=80',
    theme: {
      primaryColor: '#059669', // Emerald Green
      secondaryColor: '#064e3b',
      fontFamily: 'Inter'
    },
    rating: 4.9,
    totalReviews: 189,
    contact: {
      phone: '829-555-4921',
      whatsapp: '8295554921',
      email: 'info@hogarconfort.do'
    },
    isActive: true,
    isMarketplace: true,
    marketplaceCommission: 0.10, // Plan Pro 10%
    ownerEmail: 'info@hogarconfort.do',
    ownerName: 'Anabel Gómez',
    phone: '829-555-4921',
    province: 'La Altagracia',
    status: 'approved',
    plan: 'pro',
    sachaPackStoreId: 'sxOzEivG9GP9SvaVuF1nVpQZCOu1',
    referralCode: 'SANPI-HOGARPC',
    referredByStoreId: 'store_1',
    referredByStoreName: 'TechZone Quisqueya',
    referredByCode: 'SANPI-TECHZONE',
    referralDiscountPercent: 12,
    referralDiscountStatus: 'activo',
    referralDiscountNote: '12% de descuento por registro referido desde Punta Cana',
    totalReferredStoresCount: 0,
    totalReferralSavings: 2400,
    referralProgramActive: true,
    createdAt: '2026-03-01T09:00:00Z'
  },
  {
    id: 'store_5',
    ownerId: 'owner_victor_santos',
    name: 'Vsantos Logistics & Store',
    slug: 'vsantos-store',
    description: 'Tienda Oficial de la red Sacha Pack y Socio Maestro Sanpi. Hub logístico con stock verificado y despacho express prioritario en 24 horas.',
    logoUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=200&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=1400&auto=format&fit=crop&q=80',
    coverImageUrl: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=1400&auto=format&fit=crop&q=80',
    theme: {
      primaryColor: '#0284c7', // Sky Cyan
      secondaryColor: '#082f49',
      fontFamily: 'Inter'
    },
    rating: 5.0,
    totalReviews: 480,
    contact: {
      phone: '809-555-9000',
      whatsapp: '8095559000',
      email: 'vsantos.dominicana@gmail.com'
    },
    isActive: true,
    isMarketplace: true,
    marketplaceCommission: 0.08, // Socio Maestro 8%
    ownerEmail: 'vsantos.dominicana@gmail.com',
    ownerName: 'Víctor Santos',
    phone: '809-555-9000',
    province: 'Distrito Nacional',
    status: 'approved',
    plan: 'elite',
    sachaPackStoreId: 'sxOzEivG9GP9SvaVuF1nVpQZCOu1',
    createdAt: '2026-01-01T08:00:00Z'
  }
];

export const INITIAL_ARTICLES: Article[] = [
  {
    id: 'art_1',
    storeId: 'store_1',
    storeName: 'TechZone Quisqueya',
    title: 'Audífonos Bluetooth Sanpi Pro Active Noise Cancelling',
    name: 'Audífonos Bluetooth Sanpi Pro Active Noise Cancelling',
    slug: 'audifonos-bluetooth-sanpi-pro-anc',
    description: 'Audífonos inalámbricos circumaurales con cancelación activa de ruido híbrida (ANC) de hasta 35dB, transductores de 40mm de titanio, 30 horas de autonomía, carga rápida USB-C y micrófono HD para llamadas cristalinas.',
    category: 'Tecnología & Gadgets',
    subcategory: 'Audio & Auriculares',
    price: 1850,
    compareAtPrice: 2450,
    costPerItem: 1100,
    wholesalePrice: 1100,
    barcode_imei: '1234567890',
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop&q=80'
    ],
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop&q=80'
    ],
    variants: [
      { name: 'Color', options: ['Negro Mate', 'Blanco Ártico', 'Azul Marino'] },
      { name: 'Edición', options: ['Estándar', 'Pro Gaming Edition'] }
    ],
    inventory: 45,
    stock: 45,
    rating: 4.9,
    reviewCount: 78,
    isFeatured: true,
    specifications: {
      'Conectividad': 'Bluetooth 5.3 + Jack 3.5mm',
      'Cancelación de Ruido': 'ANC Activa -35dB con modo transparencia',
      'Batería': '30 horas continuas (650 mAh)',
      'Puerto': 'USB Tipo-C Carga Rápida (10 min = 3 hrs)',
      'Compatibilidad': 'iOS, Android, Windows, Mac',
      'Garantía': '6 meses directa en RD'
    },
    reviews: [
      {
        id: 'rev_1',
        authorName: 'Carlos M. Tavares',
        authorLocation: 'Santo Domingo Norte',
        rating: 5,
        title: 'Excelente cancelación de ruido y bajos potentes',
        comment: 'Llegaron en 24 horas a mi trabajo en Bella Vista con Sacha Pack. Pagué al recibir con el repartidor. La calidad del sonido supera a marcas de triple costo.',
        date: '2026-07-25',
        verifiedPurchase: true,
        helpfulCount: 14
      },
      {
        id: 'rev_2',
        authorName: 'Daniela Santana',
        authorLocation: 'Santiago de los Caballeros',
        rating: 5,
        title: 'Muy cómodos para trabajar todo el día',
        comment: 'Las almohadillas viscoelásticas no molestan con los lentes puestos. La batería me dura casi toda la semana.',
        date: '2026-07-28',
        verifiedPurchase: true,
        helpfulCount: 9
      }
    ],
    status: 'aprobado',
    isPublic: true,
    isDropshipping: true,
    views: 1420,
    createdAt: '2026-02-01T10:00:00Z'
  },
  {
    id: 'art_2',
    storeId: 'store_1',
    storeName: 'TechZone Quisqueya',
    title: 'Smartwatch Sanpi Ultra AMOLED GPS + SpO2 & Llamadas Bluetooth',
    name: 'Smartwatch Sanpi Ultra Amoled GPS + SpO2',
    slug: 'smartwatch-sanpi-ultra-amoled-gps',
    description: 'Reloj inteligente premium con pantalla AMOLED Ultra HD de 1.96 pulgadas Always-On, monitor biométrico 24/7 (ritmo cardíaco, presión arterial y oxígeno SpO2), más de 120 modos deportivos, altavoz y micrófono para llamadas Bluetooth.',
    category: 'Tecnología & Gadgets',
    subcategory: 'Smartwatches & Wearables',
    price: 2650,
    compareAtPrice: 3500,
    costPerItem: 1650,
    wholesalePrice: 1650,
    barcode_imei: '849201928374',
    images: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&auto=format&fit=crop&q=80'
    ],
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&auto=format&fit=crop&q=80'
    ],
    variants: [
      { name: 'Color de Caja', options: ['Titanio Naranja', 'Negro Midnight', 'Plata Estelar'] },
      { name: 'Correa Extra', options: ['Correa Ocean de Silicona', 'Correa Trail Loop Tela'] }
    ],
    inventory: 28,
    stock: 28,
    rating: 4.8,
    reviewCount: 52,
    isFeatured: true,
    specifications: {
      'Pantalla': '1.96" AMOLED HD 410x502 px Always-On',
      'Sensores': 'Cardíaco PPG, SpO2, Podómetro, Monitor de Sueño',
      'Llamadas': 'Micrófono + Altavoz HD integrado',
      'Resistencia': 'IP68 Sumergible 5ATM',
      'Batería': '7 a 10 días de uso típico (450 mAh)',
      'Compatibilidad': 'Da Fit / Sanpi Fit App (iOS y Android)'
    },
    reviews: [
      {
        id: 'rev_3',
        authorName: 'Kelvin Ruiz',
        authorLocation: 'La Romana',
        rating: 5,
        title: 'La pantalla AMOLED se ve nítida bajo el sol',
        comment: 'Excelente construcción metálica. Responde llamadas muy claro y las notificaciones de WhatsApp llegan completas.',
        date: '2026-08-01',
        verifiedPurchase: true,
        helpfulCount: 11
      }
    ],
    status: 'aprobado',
    isPublic: true,
    isDropshipping: true,
    views: 980,
    createdAt: '2026-02-05T12:30:00Z'
  },
  {
    id: 'art_3',
    storeId: 'store_2',
    storeName: 'Moda Caribe Santo Domingo',
    title: 'Tenis Sneakers Sanpi Street Flex Unisex Ergonómicos',
    name: 'Tenis Sneakers Sanpi Street Flex Unisex',
    slug: 'tenis-sneakers-sanpi-street-flex-unisex',
    description: 'Calzado deportivo ergonómico de alto impacto con cámara de aire comprimido 360°, tejido transpirable FlyKnit antihumedad y suela antideslizante de caucho vulcanizado.',
    category: 'Moda & Calzado',
    subcategory: 'Calzado Deportivo',
    price: 2200,
    compareAtPrice: 2950,
    costPerItem: 1350,
    wholesalePrice: 1350,
    barcode_imei: '746102938475',
    images: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&auto=format&fit=crop&q=80'
    ],
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&auto=format&fit=crop&q=80'
    ],
    variants: [
      { name: 'Color', options: ['Rojo Carmesí', 'Negro Stealth', 'Blanco Puro'] },
      { name: 'Talla (US)', options: ['7.5', '8.0', '8.5', '9.0', '9.5', '10.0', '10.5', '11.0'] }
    ],
    inventory: 60,
    stock: 60,
    rating: 4.9,
    reviewCount: 94,
    isFeatured: true,
    specifications: {
      'Material Exterior': 'Malla técnica FlyKnit transpirable',
      'Amortiguación': 'Cápsula de aire comprimido ZoomTech',
      'Plantilla': 'Espuma viscoelástica Memory Foam antibacterial',
      'Uso Recomendado': 'Running, Gym, Caminata urbana y diario'
    },
    reviews: [
      {
        id: 'rev_4',
        authorName: 'Yomaira F.',
        authorLocation: 'Santiago',
        rating: 5,
        title: 'Súper cómodos y la talla viene exacta',
        comment: 'Pedí mi talla 8.5 y me quedó perfecta. Muy suaves para caminar todo el día en el trabajo.',
        date: '2026-08-04',
        verifiedPurchase: true,
        helpfulCount: 7
      }
    ],
    status: 'aprobado',
    isPublic: true,
    isDropshipping: true,
    views: 1850,
    createdAt: '2026-02-10T16:00:00Z'
  },
  {
    id: 'art_4',
    storeId: 'store_3',
    storeName: 'AutoRepuestos El Cibao',
    title: 'Kit de Luces LED H7/H4 Sanpi Turbo Vision 20,000 LM Canbus',
    name: 'Kit Luces LED H7/H4 Sanpi Turbo Vision 20,000 LM',
    slug: 'kit-luces-led-turbo-vision-20000-lm',
    description: 'Juego de bombillos LED automotrices de ultra potencia con chips CSP de grado aeronáutico, 20,000 lúmenes por par, tono blanco diamante 6000K, microventilador de cobre puro y decodificador Canbus antirruido.',
    category: 'Repuestos & Autopartes',
    subcategory: 'Iluminación & Faros',
    price: 1950,
    compareAtPrice: 2600,
    costPerItem: 1200,
    wholesalePrice: 1200,
    barcode_imei: '992817263541',
    images: [
      'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=800&auto=format&fit=crop&q=80'
    ],
    image: 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=800&auto=format&fit=crop&q=80'
    ],
    variants: [
      { name: 'Conector', options: ['H7 (Luz Baja)', 'H4 (Alta/Baja)', 'H11 (Antiniebla)', '9005/HB3'] }
    ],
    inventory: 35,
    stock: 35,
    rating: 4.7,
    reviewCount: 36,
    isFeatured: false,
    specifications: {
      'Potencia Lumínica': '20,000 LM / Par (100W)',
      'Temperatura Color': '6000K Blanco Frío Diamante',
      'Voltaje Operativo': '9V - 32V (Compatible 12V y 24V)',
      'Vida Útil': '> 50,000 Horas',
      'Refrigeración': 'Disipador térmico + ventilador 12,000 RPM'
    },
    reviews: [
      {
        id: 'rev_5',
        authorName: 'Marcos Peña',
        authorLocation: 'Moca, Espaillat',
        rating: 5,
        title: 'Alumbra como si fuera de día en la autopista',
        comment: 'La instalación tomó 5 minutos en mi Honda Civic. No arrojó error en el tablero. Muy recomendados.',
        date: '2026-08-10',
        verifiedPurchase: true,
        helpfulCount: 5
      }
    ],
    status: 'aprobado',
    isPublic: true,
    isDropshipping: true,
    views: 640,
    createdAt: '2026-02-15T11:00:00Z'
  },
  {
    id: 'art_5',
    storeId: 'store_4',
    storeName: 'Hogar & Confort Punta Cana',
    title: 'Licuadora Portátil Recargable USB-C Sanpi Fresh Mix 6 Hojas',
    name: 'Licuadora Portátil Recargable USB Sanpi Fresh Mix',
    slug: 'licuadora-portatil-recargable-fresh-mix',
    description: 'Mini licuadora y extractor individual con vaso de Tritan libre de BPA, 6 cuchillas de acero quirúrgico 304, batería dual de 4000mAh y mecanismo de seguridad magnético.',
    category: 'Hogar & Cocina',
    subcategory: 'Electrodomésticos Pequeños',
    price: 1450,
    compareAtPrice: 1950,
    costPerItem: 850,
    wholesalePrice: 850,
    barcode_imei: '556172839401',
    images: [
      'https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=800&auto=format&fit=crop&q=80'
    ],
    image: 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=800&auto=format&fit=crop&q=80'
    ],
    variants: [
      { name: 'Color', options: ['Verde Menta', 'Rosa Pastel', 'Azul Cielo', 'Blanco Perla'] }
    ],
    inventory: 50,
    stock: 50,
    rating: 4.8,
    reviewCount: 44,
    isFeatured: false,
    specifications: {
      'Capacidad': '450 ml (15 oz)',
      'Batería': '4000 mAh (15 a 20 batidos por carga)',
      'Material': 'Tritan grado alimentario libre de BPA',
      'Potencia Motor': '22,000 RPM con protección anti-bloqueo'
    },
    reviews: [],
    status: 'aprobado',
    isPublic: true,
    isDropshipping: true,
    views: 1120,
    createdAt: '2026-03-02T14:00:00Z'
  },
  {
    id: 'art_6',
    storeId: 'store_2',
    storeName: 'Moda Caribe Santo Domingo',
    title: 'Gafas de Sol Polarizadas UV400 Sanpi Luxury Wave',
    name: 'Gafas de Sol Polarizadas UV400 Sanpi Luxury Wave',
    slug: 'gafas-sol-polarizadas-uv400-sanpi-luxury',
    description: 'Lentes de sol de diseño contemporáneo con montura ultraligera de policarbonato reforzado, cristales TAC polarizados de alta definición con filtro UV400 antirreflejo.',
    category: 'Moda & Calzado',
    subcategory: 'Accesorios & Lentes',
    price: 1250,
    compareAtPrice: 1750,
    costPerItem: 700,
    wholesalePrice: 700,
    barcode_imei: '334902187654',
    images: [
      'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&auto=format&fit=crop&q=80'
    ],
    image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&auto=format&fit=crop&q=80'
    ],
    variants: [
      { name: 'Montura', options: ['Negro Brillante / Lente Polarizado Humo', 'Carey Habana / Lente Bronce', 'Transparente / Espejado Azul'] }
    ],
    inventory: 40,
    stock: 40,
    rating: 4.6,
    reviewCount: 22,
    isFeatured: false,
    specifications: {
      'Protección': '100% UV400 Categoría 3',
      'Tecnología Lente': 'TAC Polarizado Antirrayas',
      'Incluye': 'Estuche rígido con cierre + Paño de microfibra'
    },
    reviews: [],
    status: 'aprobado',
    isPublic: true,
    isDropshipping: true,
    views: 750,
    createdAt: '2026-03-05T09:30:00Z'
  },
  {
    id: 'art_7',
    storeId: 'store_1',
    storeName: 'TechZone Quisqueya',
    title: 'iPhone 15 Pro Max 256GB Titanio Natural (Garantía Apple Directa)',
    name: 'iPhone 15 Pro Max 256GB Titanio Natural',
    slug: 'iphone-15-pro-max-256gb-titanio-natural',
    description: 'Equipo original sellado en caja con garantía directa de Apple y factura con valor fiscal (NCF). Exclusivo para venta directa en tienda autorizada TechZone Quisqueya.',
    category: 'Tecnología & Gadgets',
    subcategory: 'Smartphones & Teléfonos',
    price: 68500,
    compareAtPrice: 74900,
    barcode_imei: '019283746591028',
    images: [
      'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800&auto=format&fit=crop&q=80'
    ],
    image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&auto=format&fit=crop&q=80'
    ],
    variants: [
      { name: 'Color', options: ['Titanio Natural', 'Titanio Azul', 'Titanio Negro'] },
      { name: 'Almacenamiento', options: ['256GB', '512GB', '1TB'] }
    ],
    inventory: 8,
    stock: 8,
    rating: 5.0,
    reviewCount: 18,
    isFeatured: true,
    specifications: {
      'Procesador': 'Apple A17 Pro (3nm)',
      'Cámara': 'Sistema Pro 48MP con teleobjetivo 5x',
      'Chasis': 'Titanio de grado aeroespacial',
      'Garantía': '1 Año Apple Care Oficial en RD'
    },
    reviews: [],
    status: 'aprobado',
    isPublic: true,
    isDropshipping: false, // EXCLUSIVO DE TIENDA - NO DROPSHIPPING
    views: 3120,
    createdAt: '2026-03-10T10:00:00Z'
  },
  {
    id: 'art_8',
    storeId: 'store_3',
    storeName: 'AutoRepuestos El Cibao',
    title: 'Batería de Gel Automotriz 12V 75Ah Libre de Mantenimiento',
    name: 'Batería de Gel Automotriz 12V 75Ah',
    slug: 'bateria-gel-automotriz-12v-75ah',
    description: 'Batería automotriz de alta durabilidad con tecnología GEL para vehículos de trabajo pesado y alta demanda eléctrica. Venta exclusiva de AutoRepuestos El Cibao con instalación en taller.',
    category: 'Repuestos & Autopartes',
    subcategory: 'Baterías & Electricidad',
    price: 6200,
    compareAtPrice: 7100,
    barcode_imei: '882019283719',
    images: [
      'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&auto=format&fit=crop&q=80'
    ],
    image: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&auto=format&fit=crop&q=80'
    ],
    variants: [
      { name: 'Borne', options: ['Poste Estándar Superior', 'Lateral'] }
    ],
    inventory: 15,
    stock: 15,
    rating: 4.8,
    reviewCount: 14,
    isFeatured: false,
    specifications: {
      'Capacidad': '75 Amperios/Hora (CCA 650A)',
      'Tecnología': 'GEL / AGM Sellada sin fugas',
      'Garantía': '2 Años de garantía directa'
    },
    reviews: [],
    status: 'aprobado',
    isPublic: true,
    isDropshipping: false, // EXCLUSIVO DE TIENDA - NO DROPSHIPPING
    views: 480,
    createdAt: '2026-03-12T14:00:00Z'
  },
  // --- ARTÍCULOS DE PROVEEDORES MAYORISTAS (Ocultos en e-commerce público, visibles solo para Dropshippers a precio base) ---
  {
    id: 'art_prov_1',
    storeId: 'store_prov_1',
    storeName: 'Importadora Mayorista del Caribe SRL',
    title: 'Proyector Inteligente Portátil Mini Cinema 4K Android WiFi + Parlante HiFi',
    name: 'Proyector Inteligente Mini Cinema 4K Android',
    slug: 'proyector-mini-cinema-4k-android',
    description: 'Proyector portátil de alta luminosidad 8500 lúmenes con sistema Android 11 integrado, Netflix y YouTube nativo, resolución decodificada 4K, ajuste trapezoidal automático y conectividad WiFi dual 5G/2.4G. Producto top en tendencia.',
    category: 'Tecnología & Gadgets',
    subcategory: 'Proyectores & Video',
    price: 1850, // PRECIO BASE MAYORISTA
    wholesalePrice: 1850,
    baseCost: 1850,
    suggestedRetailPrice: 3800,
    compareAtPrice: 4200,
    costPerItem: 1850,
    barcode_imei: '772910293819',
    images: [
      'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1461151304267-38535e780c79?w=800&auto=format&fit=crop&q=80'
    ],
    image: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&auto=format&fit=crop&q=80'
    ],
    variants: [
      { name: 'Color', options: ['Blanco Polar', 'Negro Mate'] }
    ],
    inventory: 140,
    stock: 140,
    rating: 4.9,
    reviewCount: 38,
    isFeatured: true,
    specifications: {
      'Resolución': 'Nativo 1080p FHD (Decodifica 4K)',
      'Luminosidad': '8500 Lúmenes ANSI',
      'Sistema': 'Android 11 con Play Store preinstalado',
      'Audio': 'Parlante HiFi estéreo 5W Dolby',
      'Garantía Mayorista': '6 meses directa en almacén Santo Domingo'
    },
    reviews: [],
    status: 'aprobado',
    isPublic: false, // OCULTO EN TIENDA GENERAL
    visibility: 'dropshippers_only', // SOLO PARA DROPSHIPPERS
    isProviderProduct: true,
    isDropshipping: true,
    supplierId: 'prov_importadora_caribe',
    supplierName: 'Importadora Mayorista del Caribe SRL',
    supplierEmail: 'importadoracaribe@mayoristas.do',
    addedToStoreSlugs: [],
    views: 890,
    createdAt: '2026-03-01T08:00:00Z'
  },
  {
    id: 'art_prov_2',
    storeId: 'store_prov_2',
    storeName: 'Distribuidora Quisqueya Tech',
    title: 'Cámara de Seguridad Solar 360° WiFi 4G para Exteriores FHD con Visión Nocturna Color',
    name: 'Cámara de Seguridad Solar 360° WiFi FHD',
    slug: 'camara-seguridad-solar-360-wifi',
    description: 'Cámara domo PTZ 100% inalámbrica alimentada por panel solar de silicio monocristalino y batería de litio recargable. Detección humana PIR con sirena disuasoria, audio bidireccional y visión nocturna a todo color.',
    category: 'Seguridad & Vigilancia',
    subcategory: 'Cámaras Solares',
    price: 1250, // PRECIO BASE PROVEEDOR
    wholesalePrice: 1250,
    baseCost: 1250,
    suggestedRetailPrice: 2850,
    compareAtPrice: 3200,
    costPerItem: 1250,
    barcode_imei: '661928374819',
    images: [
      'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1520697830682-bbb6e85e2b0b?w=800&auto=format&fit=crop&q=80'
    ],
    image: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=800&auto=format&fit=crop&q=80'
    ],
    variants: [
      { name: 'Conectividad', options: ['WiFi 2.4GHz', 'Ranura SIM 4G LTE'] }
    ],
    inventory: 95,
    stock: 95,
    rating: 4.8,
    reviewCount: 27,
    isFeatured: true,
    specifications: {
      'Resolución': '3 Megapíxeles 2K Full HD',
      'Alimentación': 'Panel Solar 8W + Batería 12,000mAh',
      'Rotación': '355° Horizontal, 90° Vertical',
      'Resistencia': 'Certificación IP66 Intemperie',
      'App Móvil': 'iCSee / Tuya Smart compatible en RD'
    },
    reviews: [],
    status: 'aprobado',
    isPublic: false,
    visibility: 'dropshippers_only',
    isProviderProduct: true,
    isDropshipping: true,
    supplierId: 'prov_quisqueya_tech',
    supplierName: 'Distribuidora Quisqueya Tech',
    supplierEmail: 'ventas@quisqueyatech.do',
    addedToStoreSlugs: [],
    views: 640,
    createdAt: '2026-03-02T10:00:00Z'
  },
  {
    id: 'art_prov_3',
    storeId: 'store_prov_3',
    storeName: 'Almacenes Mayoristas Santo Domingo',
    title: 'Aspiradora Inalámbrica Multifunción de Auto y Hogar 120W Ciclónica Turbo Portátil',
    name: 'Aspiradora Inalámbrica 120W Portátil',
    slug: 'aspiradora-inalambrica-120w-portatil',
    description: 'Potente aspiradora de mano sin cables con succión de 9000Pa, filtro HEPA lavable, batería de larga duración con carga Tipo-C y set completo de boquillas y cepillos para limpiar autos, sofás y teclados.',
    category: 'Hogar & Confort',
    subcategory: 'Limpieza Inteligente',
    price: 650, // PRECIO BASE PROVEEDOR
    wholesalePrice: 650,
    baseCost: 650,
    suggestedRetailPrice: 1650,
    compareAtPrice: 1950,
    costPerItem: 650,
    barcode_imei: '551829384918',
    images: [
      'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=800&auto=format&fit=crop&q=80'
    ],
    image: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=800&auto=format&fit=crop&q=80'
    ],
    variants: [
      { name: 'Color', options: ['Negro Obsidian', 'Verde Militar'] }
    ],
    inventory: 310,
    stock: 310,
    rating: 4.7,
    reviewCount: 45,
    isFeatured: false,
    specifications: {
      'Potencia': 'Motor Turbo Ciclónico 120 Watts',
      'Succión': '9000 Pa fuerza de arrastre',
      'Filtro': 'HEPA lavable reutilizable',
      'Carga': 'Puerto USB Tipo-C (2.5 horas)'
    },
    reviews: [],
    status: 'aprobado',
    isPublic: false,
    visibility: 'dropshippers_only',
    isProviderProduct: true,
    isDropshipping: true,
    supplierId: 'prov_almacenes_sd',
    supplierName: 'Almacenes Mayoristas Santo Domingo',
    supplierEmail: 'pedidos@mayoristasrd.do',
    addedToStoreSlugs: [],
    views: 1120,
    createdAt: '2026-03-03T11:00:00Z'
  },
  {
    id: 'art_prov_4',
    storeId: 'store_prov_4',
    storeName: 'Global Import Dominicana',
    title: 'Pistola Masajeadora Muscular de Percusión Pro 6 Velocidades + 4 Cabezales Terapéuticos',
    name: 'Pistola Masajeadora Muscular Pro 6 Velocidades',
    slug: 'pistola-masajeadora-muscular-pro',
    description: 'Pistola de masaje de percusión profunda para alivio del dolor muscular, fatiga y recuperación atlética. Motor brushless silencioso de alto torque, 6 niveles de intensidad y 4 cabezales intercambiables.',
    category: 'Salud & Belleza',
    subcategory: 'Terapia Muscular',
    price: 790, // PRECIO BASE PROVEEDOR
    wholesalePrice: 790,
    baseCost: 790,
    suggestedRetailPrice: 1950,
    compareAtPrice: 2400,
    costPerItem: 790,
    barcode_imei: '441928374619',
    images: [
      'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&auto=format&fit=crop&q=80'
    ],
    image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&auto=format&fit=crop&q=80'
    ],
    variants: [
      { name: 'Color', options: ['Gris Titanio', 'Rojo Ferrari'] }
    ],
    inventory: 180,
    stock: 180,
    rating: 4.9,
    reviewCount: 52,
    isFeatured: true,
    specifications: {
      'Velocidades': '6 Niveles (1800 a 3200 RPM)',
      'Cabezales': '4 (Esférico, Bala, Plano, Horquilla)',
      'Nivel de Ruido': '< 45 dB ultra silencioso',
      'Batería': '2000 mAh (hasta 4 horas de uso)'
    },
    reviews: [],
    status: 'aprobado',
    isPublic: false,
    visibility: 'dropshippers_only',
    isProviderProduct: true,
    isDropshipping: true,
    supplierId: 'prov_global_import',
    supplierName: 'Global Import Dominicana',
    supplierEmail: 'contacto@globalimport.do',
    addedToStoreSlugs: [],
    views: 940,
    createdAt: '2026-03-04T12:00:00Z'
  }
];

export const INITIAL_DELIVERIES: Delivery[] = [
  {
    id: 'del_101',
    trackingNumber: 'SANPI-COD-9021',
    externalOrderId: 'ORD-9021',
    customerName: 'Manuel Alejandro Pichardo',
    customerPhone: '809-881-2233',
    customerEmail: 'manuel.pichardo@gmail.com',
    province: 'Distrito Nacional',
    city: 'Santo Domingo',
    municipality: 'Distrito Nacional (Piantini)',
    address: 'Av. Winston Churchill #105, Piantini',
    notes: 'Llamar antes de entregar en la recepción de la torre',
    paymentMethod: 'contra entrega',
    barcode_imei: '1234567890',
    totalCodAmount: 2200, // 1850 + 350
    totalToCollect: 2200,
    basePrice: 1850,
    shippingFee: 350,
    storeId: 'store_1',
    articleId: 'art_1',
    articleName: 'Audífonos Bluetooth Sanpi Pro Active Noise Cancelling',
    status: 'entregado',
    deliveryPersonId: 'driver_sacha_01',
    deliveryPersonName: 'Carlos M. Henríquez (Sacha Pack)',
    deliveryPersonPhone: '809-555-8821',
    isMarketplaceOrder: true,
    sachaPackStatus: 'enviado',
    sachaPackDispatchedAt: '2026-07-28T14:20:05Z',
    sachaPackPayload: {
      storeId: 'sxOzEivG9GP9SvaVuF1nVpQZCOu1',
      externalOrderId: 'ORD-9021',
      items: [{ barcode_imei: '1234567890', quantity: 1, price: 1850 }],
      customer: {
        name: 'Manuel Alejandro Pichardo',
        email: 'manuel.pichardo@gmail.com',
        phone: '809-881-2233',
        address: 'Av. Winston Churchill #105, Piantini',
        province: 'Distrito Nacional',
        municipality: 'Distrito Nacional (Piantini)'
      },
      paymentMethod: 'contra entrega'
    },
    createdAt: '2026-07-28T14:20:00Z',
    history: [
      { status: 'pendiente', date: '2026-07-28T14:20:00Z', note: 'Orden creada en Sanpi Marketplace COD' },
      { status: 'en_transito', date: '2026-07-29T09:00:00Z', note: 'Despachado a Sacha Pack Webhook (200 OK)' },
      { status: 'entregado', date: '2026-07-29T16:45:00Z', note: 'Cobro COD RD$ 2,200 completado' }
    ]
  },
  {
    id: 'del_102',
    trackingNumber: 'SANPI-COD-9022',
    externalOrderId: 'ORD-9022',
    customerName: 'Yomaira Fernández',
    customerPhone: '829-440-9988',
    customerEmail: 'yomaira.f@outlook.com',
    province: 'Santiago',
    city: 'Santiago de los Caballeros',
    municipality: 'Santiago Centro',
    address: 'Calle Del Sol #42, Los Jardines Metropolitanos',
    notes: 'Entregar en horario de oficina',
    paymentMethod: 'contra entrega',
    barcode_imei: '849201928374',
    totalCodAmount: 3000, // 2650 + 350
    totalToCollect: 3000,
    basePrice: 2650,
    shippingFee: 350,
    storeId: 'store_1',
    articleId: 'art_2',
    articleName: 'Smartwatch Sanpi Ultra Amoled GPS + SpO2',
    status: 'en_transito',
    deliveryPersonId: 'driver_sacha_02',
    deliveryPersonName: 'Junior Almonte (Sacha Pack Santiago)',
    deliveryPersonPhone: '829-555-1234',
    lastLocation: {
      lat: 19.4517,
      lng: -70.6970,
      updatedAt: '2026-08-23T15:30:00Z',
      speed: 42,
      heading: 135,
      address: 'Autopista Duarte Km 4.5, Entrada Santiago'
    },
    isMarketplaceOrder: true,
    sachaPackStatus: 'enviado',
    sachaPackDispatchedAt: '2026-07-29T11:00:04Z',
    sachaPackPayload: {
      storeId: 'sxOzEivG9GP9SvaVuF1nVpQZCOu1',
      externalOrderId: 'ORD-9022',
      items: [{ barcode_imei: '849201928374', quantity: 1, price: 2650 }],
      customer: {
        name: 'Yomaira Fernández',
        email: 'yomaira.f@outlook.com',
        phone: '829-440-9988',
        address: 'Calle Del Sol #42, Los Jardines Metropolitanos',
        province: 'Santiago',
        municipality: 'Santiago Centro'
      },
      paymentMethod: 'contra entrega'
    },
    createdAt: '2026-07-29T11:00:00Z',
    history: [
      { status: 'pendiente', date: '2026-07-29T11:00:00Z', note: 'Orden registrada en sistema Sanpi' },
      { status: 'en_transito', date: '2026-07-30T08:30:00Z', note: 'En ruta de transporte Cibao Exprés - Sacha Pack' }
    ]
  },
  {
    id: 'del_103',
    trackingNumber: 'SANPI-COD-9023',
    externalOrderId: 'ORD-12345',
    customerName: 'Juan Perez',
    customerPhone: '809-555-0000',
    customerEmail: 'juan@ejemplo.com',
    province: 'Santo Domingo',
    city: 'Santo Domingo Este',
    municipality: 'Santo Domingo Este',
    address: 'Calle Principal #10, Los Minas',
    notes: 'Cobro en efectivo RD$ 1,850',
    paymentMethod: 'contra entrega',
    barcode_imei: '1234567890',
    totalCodAmount: 1850, // 1500 + 350
    basePrice: 1500,
    shippingFee: 350,
    storeId: 'store_2',
    articleId: 'art_3',
    articleName: 'Tenis Sneakers Sanpi Street Flex Unisex',
    status: 'entregado',
    isMarketplaceOrder: true,
    sachaPackStatus: 'enviado',
    sachaPackDispatchedAt: '2026-07-27T16:10:05Z',
    sachaPackPayload: {
      storeId: 'sxOzEivG9GP9SvaVuF1nVpQZCOu1',
      externalOrderId: 'ORD-12345',
      items: [{ barcode_imei: '1234567890', quantity: 1, price: 1500 }],
      customer: {
        name: 'Juan Perez',
        email: 'juan@ejemplo.com',
        phone: '809-555-0000',
        address: 'Calle Principal #10, Los Minas',
        province: 'Santo Domingo',
        municipality: 'Santo Domingo Este'
      },
      paymentMethod: 'contra entrega'
    },
    createdAt: '2026-07-27T16:10:00Z',
    history: [
      { status: 'pendiente', date: '2026-07-27T16:10:00Z', note: 'Orden recibida en plataforma' },
      { status: 'en_transito', date: '2026-07-28T07:15:00Z', note: 'Despachado a Sacha Pack Webhook (200 OK)' },
      { status: 'entregado', date: '2026-07-28T18:00:00Z', note: 'Cliente pagó RD$ 1,850 en efectivo' }
    ]
  },
  {
    id: 'del_104',
    trackingNumber: 'SANPI-COD-9024',
    externalOrderId: 'ORD-9024',
    customerName: 'Claribel Tavárez',
    customerPhone: '809-332-9911',
    customerEmail: 'claribel.t@gmail.com',
    province: 'Puerto Plata',
    city: 'San Felipe de Puerto Plata',
    municipality: 'Puerto Plata Centro',
    address: 'Calle Beller #18, Centro Ciudad',
    notes: 'Dejar en recepción',
    paymentMethod: 'contra entrega',
    barcode_imei: '992817263541',
    totalCodAmount: 2300, // 1950 + 350
    basePrice: 1950,
    shippingFee: 350,
    storeId: 'store_3',
    articleId: 'art_4',
    articleName: 'Kit Luces LED H7/H4 Sanpi Turbo Vision 20,000 LM',
    status: 'pendiente',
    isMarketplaceOrder: true,
    sachaPackStatus: 'pendiente',
    sachaPackPayload: {
      storeId: 'sxOzEivG9GP9SvaVuF1nVpQZCOu1',
      externalOrderId: 'ORD-9024',
      items: [{ barcode_imei: '992817263541', quantity: 1, price: 1950 }],
      customer: {
        name: 'Claribel Tavárez',
        email: 'claribel.t@gmail.com',
        phone: '809-332-9911',
        address: 'Calle Beller #18, Centro Ciudad',
        province: 'Puerto Plata',
        municipality: 'Puerto Plata Centro'
      },
      paymentMethod: 'contra entrega'
    },
    createdAt: '2026-07-30T10:15:00Z',
    history: [
      { status: 'pendiente', date: '2026-07-30T10:15:00Z', note: 'Esperando recolecta del vendedor en Santiago' }
    ]
  },
  {
    id: 'del_105',
    trackingNumber: 'SANPI-COD-9025',
    externalOrderId: 'ORD-9025',
    customerName: 'Ramón Emilio Vargas',
    customerPhone: '829-910-4455',
    customerEmail: 'ramon.vargas@yahoo.com',
    province: 'San Cristóbal',
    city: 'San Cristóbal',
    municipality: 'San Cristóbal (Madre Vieja)',
    address: 'Av. Constitución #88, Madre Vieja Sur',
    paymentMethod: 'contra entrega',
    barcode_imei: '556172839401',
    totalCodAmount: 1800, // 1450 + 350
    basePrice: 1450,
    shippingFee: 350,
    storeId: 'store_4',
    articleId: 'art_5',
    articleName: 'Licuadora Portátil Recargable USB Sanpi Fresh Mix',
    status: 'entregado',
    isMarketplaceOrder: true,
    sachaPackStatus: 'enviado',
    sachaPackDispatchedAt: '2026-07-26T09:00:04Z',
    sachaPackPayload: {
      storeId: 'sxOzEivG9GP9SvaVuF1nVpQZCOu1',
      externalOrderId: 'ORD-9025',
      items: [{ barcode_imei: '556172839401', quantity: 1, price: 1450 }],
      customer: {
        name: 'Ramón Emilio Vargas',
        email: 'ramon.vargas@yahoo.com',
        phone: '829-910-4455',
        address: 'Av. Constitución #88, Madre Vieja Sur',
        province: 'San Cristóbal',
        municipality: 'San Cristóbal (Madre Vieja)'
      },
      paymentMethod: 'contra entrega'
    },
    createdAt: '2026-07-26T09:00:00Z',
    history: [
      { status: 'pendiente', date: '2026-07-26T09:00:00Z', note: 'Orden registrada' },
      { status: 'entregado', date: '2026-07-27T12:30:00Z', note: 'Paquete entregado y abonado' }
    ]
  }
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx_1',
    trackingNumber: 'SANPI-COD-9021',
    storeId: 'store_1',
    articleId: 'art_1',
    productName: 'Audífonos Bluetooth Sanpi Pro Active Noise Cancelling',
    quantity: 1,
    basePrice: 1850,
    shippingFee: 350,
    total: 2200,
    commissionRate: 0.10, // 10%
    commissionAmount: 185, // 1850 * 0.10
    paymentMethod: 'COD',
    status: 'entregado',
    isMarketplaceOrder: true,
    createdAt: '2026-07-28T14:20:00Z'
  },
  {
    id: 'tx_2',
    trackingNumber: 'SANPI-COD-9022',
    storeId: 'store_1',
    articleId: 'art_2',
    productName: 'Smartwatch Sanpi Ultra Amoled GPS + SpO2',
    quantity: 1,
    basePrice: 2650,
    shippingFee: 350,
    total: 3000,
    commissionRate: 0.10,
    commissionAmount: 265,
    paymentMethod: 'COD',
    status: 'pendiente',
    isMarketplaceOrder: true,
    createdAt: '2026-07-29T11:00:00Z'
  },
  {
    id: 'tx_3',
    trackingNumber: 'SANPI-COD-9023',
    storeId: 'store_2',
    articleId: 'art_3',
    productName: 'Tenis Sneakers Sanpi Street Flex Unisex',
    quantity: 1,
    basePrice: 2200,
    shippingFee: 350,
    total: 2550,
    commissionRate: 0.15, // 15%
    commissionAmount: 330, // 2200 * 0.15
    paymentMethod: 'COD',
    status: 'entregado',
    isMarketplaceOrder: true,
    createdAt: '2026-07-27T16:10:00Z'
  },
  {
    id: 'tx_4',
    trackingNumber: 'SANPI-COD-9025',
    storeId: 'store_4',
    articleId: 'art_5',
    productName: 'Licuadora Portátil Recargable USB Sanpi Fresh Mix',
    quantity: 1,
    basePrice: 1450,
    shippingFee: 350,
    total: 1800,
    commissionRate: 0.10,
    commissionAmount: 145,
    paymentMethod: 'COD',
    status: 'entregado',
    isMarketplaceOrder: true,
    createdAt: '2026-07-26T09:00:00Z'
  }
];

export const INITIAL_SUBSCRIPTIONS: MarketplaceSubscription[] = [
  {
    id: 'sub_1',
    storeName: 'ElectroHogar Dominicana',
    ownerName: 'Rafael Contreras',
    email: 'r.contreras@electrohogar.do',
    phone: '809-555-7722',
    province: 'La Vega',
    plan: 'pro',
    monthlyFee: 3000,
    status: 'pendiente',
    requestedAt: '2026-07-29T15:00:00Z'
  },
  {
    id: 'sub_2',
    storeName: 'Natura Beauty RD',
    ownerName: 'Mónica Tejada',
    email: 'monica@naturabeauty.do',
    phone: '829-555-0011',
    province: 'Espaillat',
    plan: 'elite',
    monthlyFee: 5000,
    status: 'pendiente',
    requestedAt: '2026-07-30T08:20:00Z'
  },
  {
    id: 'sub_3',
    storeName: 'Distribuidora Quisqueya',
    ownerName: 'Gaston Santana',
    email: 'gaston@quisqueyadist.do',
    phone: '809-555-9922',
    province: 'San Pedro de Macorís',
    plan: 'basic',
    monthlyFee: 1500,
    status: 'aprobado',
    requestedAt: '2026-07-20T10:00:00Z'
  }
];

export const INITIAL_EXPENSES: Expense[] = [
  {
    id: 'exp_1',
    title: 'Infraestructura Cloud Server Sanpi & Realtime API',
    category: 'servidores',
    amount: 12500,
    date: '2026-07-01',
    createdAt: '2026-07-01T00:00:00Z'
  },
  {
    id: 'exp_2',
    title: 'Campaña Publicitaria Meta & Google Ads Dropshipping RD',
    category: 'marketing',
    amount: 28000,
    date: '2026-07-10',
    createdAt: '2026-07-10T00:00:00Z'
  },
  {
    id: 'exp_3',
    title: 'Nómina Operativa de Verificación de Guías COD & Soporte',
    category: 'nomina',
    amount: 45000,
    date: '2026-07-15',
    createdAt: '2026-07-15T00:00:00Z'
  },
  {
    id: 'exp_4',
    title: 'Seguros de Carga & Materiales de Empaque Sanpi Morado',
    category: 'logistica',
    amount: 18500,
    date: '2026-07-20',
    createdAt: '2026-07-20T00:00:00Z'
  }
];

export const INITIAL_LANDING_PAGES: LandingPageConfig[] = [
  {
    id: 'lp_1',
    slug: 'smartwatch-ultra-sacha',
    title: 'Smartwatch Sanpi Ultra AMOLED - Edición Limitada',
    heroHeadline: 'El Reloj Inteligente Más Avanzado con Pantalla AMOLED y GPS',
    heroSubheadline: 'Monitorea tu salud 24/7, responde llamadas Bluetooth y sincroniza con iOS/Android. ¡Paga en efectivo al recibir en la puerta de tu casa!',
    ownerId: 'drop_1',
    ownerName: 'Marcos Peña (Revendedor Pro)',
    ownerEmail: 'marcos.dropship@gmail.com',
    ownerType: 'dropshipper',
    productId: 'art_2',
    productName: 'Smartwatch Sanpi Ultra Amoled GPS + SpO2',
    productImage: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1000&auto=format&fit=crop&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=1000&auto=format&fit=crop&q=80'
    ],
    originalStoreId: 'store_1',
    wholesalePrice: 1650,
    customSellingPrice: 2850,
    profitMargin: 1200, // Margen neto por venta para el revendedor
    originalComparePrice: 4200,
    urgencyTimerMinutes: 45,
    stockCount: 14,
    whatsappNumber: '809-555-8822',
    features: [
      {
        icon: 'Flame',
        title: 'Pantalla AMOLED Ultra HD',
        desc: 'Colores vibrantes y visibilidad cristalina incluso bajo el sol caribeño con modo Always-on display.'
      },
      {
        icon: 'Heart',
        title: 'Monitor de Salud 24/7',
        desc: 'Sensor óptico de grado médico para ritmo cardíaco, oxímetro SpO2, presión arterial y seguimiento del sueño.'
      },
      {
        icon: 'PhoneCall',
        title: 'Llamadas Bluetooth y Notificaciones',
        desc: 'Micrófono y altavoz HD integrados para responder llamadas y leer mensajes de WhatsApp al instante.'
      },
      {
        icon: 'ShieldCheck',
        title: 'Resistencia al Agua IP68 & Batería 7 Días',
        desc: 'Carga magnética rápida y batería de larga duración para acompañarte en tus entrenamientos sin límites.'
      }
    ],
    testimonials: [
      {
        id: 'test_1',
        name: 'Ing. Alejandro Matos',
        city: 'Santo Domingo Este',
        comment: 'Me llegó al día siguiente con Sacha Pack. Pagué los RD$ 3,200 (con el flete de 350) al delivery en efectivo. La pantalla es increíble.',
        rating: 5,
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        verified: true
      },
      {
        id: 'test_2',
        name: 'Carolina Valdez',
        city: 'Santiago de los Caballeros',
        comment: 'Excelente producto. Respondo WhatsApp y las llamadas mientras voy manejando. La batería me dura casi la semana completa.',
        rating: 5,
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        verified: true
      }
    ],
    views: 890,
    ordersCount: 42,
    active: true,
    createdAt: '2026-07-25T10:00:00Z'
  },
  {
    id: 'lp_2',
    slug: 'audifonos-pro-anc',
    title: 'Audífonos Inalámbricos Sanpi Pro ANC - Cancelación Activa de Ruido',
    heroHeadline: 'Sumérgete en tu Música con Cancelación de Ruido Activa de Nivel Profesional',
    heroSubheadline: 'Audio de alta resolución, graves profundos, micrófono dual para llamadas nítidas y estuche con carga rápida. Envío seguro a todo el país.',
    ownerId: 'store_1',
    ownerName: 'TechZone Quisqueya (Merchant)',
    ownerEmail: 'ventas@techzone.do',
    ownerType: 'merchant',
    productId: 'art_1',
    productName: 'Audífonos Bluetooth Sanpi Pro Active Noise Cancelling',
    productImage: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1000&auto=format&fit=crop&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=1000&auto=format&fit=crop&q=80'
    ],
    originalStoreId: 'store_1',
    wholesalePrice: 1100,
    customSellingPrice: 1850,
    profitMargin: 750,
    originalComparePrice: 3100,
    urgencyTimerMinutes: 30,
    stockCount: 22,
    whatsappNumber: '809-555-0192',
    features: [
      {
        icon: 'Volume2',
        title: 'Cancelación Activa de Ruido (ANC)',
        desc: 'Bloquea el ruido ambiental del tránsito y la oficina con solo tocar un botón.'
      },
      {
        icon: 'BatteryCharging',
        title: '30 Horas de Reproducción Total',
        desc: 'Hasta 7 horas continuas de música y 23 horas adicionales con el estuche de carga rápida USB-C.'
      },
      {
        icon: 'Sparkles',
        title: 'Sonido Hi-Fi Extra Bass',
        desc: 'Drivers de neodimio de 12mm calibrados para ofrecer bajos potentes y agudos ultra cristalinos.'
      }
    ],
    testimonials: [
      {
        id: 'test_3',
        name: 'Manuel Abreu',
        city: 'La Vega',
        comment: 'Brutales para el gym y para trabajar. La cancelación de ruido no tiene nada que envidiarle a marcas de 15 mil pesos.',
        rating: 5,
        avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
        verified: true
      }
    ],
    views: 620,
    ordersCount: 31,
    active: true,
    createdAt: '2026-07-28T14:00:00Z'
  },
  {
    id: 'lp_3',
    slug: 'sneakers-street-flex',
    title: 'Sneakers Sanpi Street Flex Unisex - Máxima Comodidad',
    heroHeadline: 'La Combinación Perfecta de Estilo Urbano y Confort para Todo el Día',
    heroSubheadline: 'Suela de aire comprimido anatómica y tejido transpirable. Camina ligero sin fatiga.',
    ownerId: 'drop_2',
    ownerName: 'Yomaira Gómez (Dropshipper)',
    ownerEmail: 'yomi.style@gmail.com',
    ownerType: 'dropshipper',
    productId: 'art_3',
    productName: 'Tenis Sneakers Sanpi Street Flex Unisex',
    productImage: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1000&auto=format&fit=crop&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1000&auto=format&fit=crop&q=80'
    ],
    originalStoreId: 'store_2',
    wholesalePrice: 1350,
    customSellingPrice: 2450,
    profitMargin: 1100,
    originalComparePrice: 3800,
    urgencyTimerMinutes: 60,
    stockCount: 18,
    whatsappNumber: '829-555-7733',
    features: [
      {
        icon: 'ShieldCheck',
        title: 'Cámara de Aire Antimpacto',
        desc: 'Reduce el impacto en las rodillas y talón en un 65% al caminar o correr.'
      },
      {
        icon: 'Sparkles',
        title: 'Malla Fresh-Air Transpirable',
        desc: 'Mantiene tus pies secos, frescos y sin malos olores durante todo el día.'
      }
    ],
    testimonials: [
      {
        id: 'test_4',
        name: 'Dilenia Cruz',
        city: 'Puerto Plata',
        comment: 'Súper cómodos, la talla exacta y la calidad se siente de primera. Llegaron en 24 horas a Puerto Plata.',
        rating: 5,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        verified: true
      }
    ],
    views: 450,
    ordersCount: 19,
    active: true,
    createdAt: '2026-08-01T12:00:00Z'
  }
];

export const INITIAL_DROPSHIP_ITEMS: DropshipItem[] = [
  {
    id: 'ds_1',
    dropshipperId: 'drop_1',
    dropshipperName: 'Marcos Peña',
    dropshipperEmail: 'marcos.dropship@gmail.com',
    productId: 'art_2',
    originalStoreId: 'store_1',
    wholesalePrice: 1650,
    customSellingPrice: 2850,
    profitMargin: 1200,
    landingPageSlug: 'smartwatch-ultra-sacha',
    status: 'active',
    createdAt: '2026-07-25T10:00:00Z'
  },
  {
    id: 'ds_2',
    dropshipperId: 'drop_2',
    dropshipperName: 'Yomaira Gómez',
    dropshipperEmail: 'yomi.style@gmail.com',
    productId: 'art_3',
    originalStoreId: 'store_2',
    wholesalePrice: 1350,
    customSellingPrice: 2450,
    profitMargin: 1100,
    landingPageSlug: 'sneakers-street-flex',
    status: 'active',
    createdAt: '2026-08-01T12:00:00Z'
  }
];

export const INITIAL_STORE_REFERRALS: StoreReferralRecord[] = [
  {
    id: 'ref_1',
    referrerStoreId: 'store_1',
    referrerStoreName: 'TechZone Quisqueya',
    referrerOwnerName: 'Carlos Rosario',
    referrerEmail: 'ventas@techzone.do',
    referredStoreId: 'store_2',
    referredStoreName: 'Moda Caribe Santo Domingo',
    referredOwnerName: 'Laura Peralta',
    referredEmail: 'contacto@modacaribe.do',
    referralCode: 'SANPI-TECHZONE',
    discountPercentApplied: 10,
    discountStatus: 'activo',
    adminNotes: '10% de descuento en comisión aplicado por invitación directa del programa de socios',
    createdAt: '2026-02-01T14:30:00Z',
    appliedByAdminAt: '2026-02-02T10:00:00Z'
  },
  {
    id: 'ref_2',
    referrerStoreId: 'store_1',
    referrerStoreName: 'TechZone Quisqueya',
    referrerOwnerName: 'Carlos Rosario',
    referrerEmail: 'ventas@techzone.do',
    referredStoreId: 'store_4',
    referredStoreName: 'Hogar & Confort Punta Cana',
    referredOwnerName: 'Anabel Gómez',
    referredEmail: 'info@hogarconfort.do',
    referralCode: 'SANPI-TECHZONE',
    discountPercentApplied: 12,
    discountStatus: 'activo',
    adminNotes: '12% de descuento aprobado por expansión de categoría hogar',
    createdAt: '2026-03-01T09:00:00Z',
    appliedByAdminAt: '2026-03-01T11:20:00Z'
  },
  {
    id: 'ref_3',
    referrerStoreId: 'store_3',
    referrerStoreName: 'AutoRepuestos El Cibao',
    referrerOwnerName: 'José Manuel Martínez',
    referrerEmail: 'ventas@repuestoscibao.do',
    referredStoreId: 'store_5',
    referredStoreName: 'Vsantos Logistics & Store',
    referredOwnerName: 'Víctor Santos',
    referredEmail: 'vsantos.dominicana@gmail.com',
    referralCode: 'SANPI-AUTOCIB',
    discountPercentApplied: 15,
    discountStatus: 'activo',
    adminNotes: '15% de descuento por alianza logística estratégica',
    createdAt: '2026-03-15T15:00:00Z',
    appliedByAdminAt: '2026-03-15T16:00:00Z'
  }
];

export const DEFAULT_SANPI_PLANS: SanpiPlan[] = [
  {
    id: 'basic',
    name: 'Básico',
    tagline: 'Tienda Emprendedora',
    description: 'Para negocios y emprendedores que inician sus ventas en el e-commerce dominicano con cobro contra entrega.',
    monthlyFee: 600,
    commissionPercent: 15,
    commissionRate: 0.15,
    maxProducts: 50,
    features: [
      'Hasta 50 productos en catálogo oficial',
      '15% de comisión por venta entregada',
      'Logística Sacha Pack COD integrada en todo el país',
      'Tarifa fija nacional de flete RD$ 350',
      'Cobro Contra Entrega (COD) con liquidación en cuenta',
      'Soporte técnico y comercial vía ticket'
    ],
    popular: false,
    isActive: true,
    colorScheme: 'slate',
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'Tiendas Consolidadas',
    description: 'Para comercios y marcas en crecimiento con catálogo medio y ventas frecuentes.',
    monthlyFee: 1500,
    commissionPercent: 10,
    commissionRate: 0.10,
    maxProducts: 300,
    features: [
      'Hasta 300 productos en catálogo oficial',
      '10% de comisión por venta entregada',
      'Habilitación automática para red nacional de Dropshippers',
      'Acceso a generador de Landing Pages de alta conversión',
      'Panel avanzado de métricas y liquidaciones bancarias',
      'Soporte prioritario directo vía WhatsApp'
    ],
    popular: true,
    badge: 'Más Popular',
    isActive: true,
    colorScheme: 'blue',
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'full',
    name: 'Full',
    tagline: 'Mayoristas & Marcas Líderes',
    description: 'Para importadores, distribuidores mayoristas y marcas de alto volumen de facturación.',
    monthlyFee: 2000,
    commissionPercent: 8,
    commissionRate: 0.08,
    maxProducts: 'Ilimitados',
    features: [
      'Catálogo ilimitado de productos y categorías',
      '8% de comisión mínima por venta (Máxima Rentabilidad)',
      'Posicionamiento VIP en página de inicio y catálogo nacional',
      'Liquidación express de fondos de flete y recaudaciones COD',
      'Red de revendedores y dropshippers ilimitada',
      'Ejecutivo de cuenta y soporte estratégico dedicado'
    ],
    popular: false,
    badge: 'Mayoristas & Marcas',
    isActive: true,
    colorScheme: 'purple',
    createdAt: '2026-01-01T00:00:00Z'
  }
];

export const INITIAL_CARRIER_USERS: CarrierUser[] = [
  {
    id: 'carrier_sacha_pack',
    name: 'Sacha Pack Express RD',
    companyName: 'Sacha Pack Courier & Cargo SRL',
    email: 'operaciones@sachapack.com.do',
    phone: '809-555-7224',
    rnc: '1-32-49821-3',
    province: 'Distrito Nacional',
    apiKey: 'sanpi_live_sacha_9824kx9182la',
    webhookUrl: 'https://api.sachapack.com.do/v1/webhooks/sanpi',
    coverageProvinces: [
      'Distrito Nacional',
      'Santo Domingo',
      'Santiago',
      'San Cristóbal',
      'La Vega',
      'Puerto Plata',
      'San Pedro de Macorís',
      'La Romana',
      'La Altagracia'
    ],
    isActive: true,
    totalOrdersHandled: 1420,
    totalCodCollected: 3450000,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'carrier_metro_pac',
    name: 'Metro Pac Cargo Express',
    companyName: 'Metro Servicios Turísticos & Carga SA',
    email: 'logistica@metropac.com.do',
    phone: '809-227-0101',
    rnc: '1-01-04982-1',
    province: 'Distrito Nacional',
    apiKey: 'sanpi_live_metropac_3391az0912kp',
    webhookUrl: 'https://api.metropac.com.do/sanpi-dispatch',
    coverageProvinces: ['Todas las 32 Provincias'],
    isActive: true,
    totalOrdersHandled: 890,
    totalCodCollected: 2150000,
    createdAt: '2026-02-01T00:00:00Z'
  },
  {
    id: 'carrier_caribe_pack',
    name: 'Caribe Pack Envíos',
    companyName: 'Caribe Tours Logística y Envíos Express',
    email: 'envios@caribepack.com.do',
    phone: '809-221-4422',
    rnc: '1-02-18734-5',
    province: 'Santo Domingo',
    apiKey: 'sanpi_live_caribepack_7720qq8129vv',
    webhookUrl: 'https://caribepack.com.do/api/v2/orders',
    coverageProvinces: ['Todas las 32 Provincias'],
    isActive: true,
    totalOrdersHandled: 1105,
    totalCodCollected: 2890000,
    createdAt: '2026-02-15T00:00:00Z'
  }
];



