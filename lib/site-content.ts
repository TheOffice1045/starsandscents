// Editable storefront content ("Site Content" in the admin).
//
// Each section is one row in public.site_content (id = section key, content =
// jsonb). The admin editor is generated from SECTIONS, and pages render
// `withDefaults(...)`, so a section that was never saved (or a missing table)
// shows the original copy instead of blank space.
//
// Shared by server and client code: no server-only imports here.

export type FieldDef =
  | { name: string; label: string; type: 'text' | 'textarea' | 'url' | 'image' | 'product'; help?: string }
  | { name: string; label: string; type: 'list'; help?: string }
  | {
      name: string;
      label: string;
      type: 'items';
      count: number;
      itemLabel: string;
      fields: { name: string; label: string; type: 'text' | 'textarea' | 'image' }[];
      help?: string;
    };

export interface SectionDef {
  key: SectionKey;
  page: PageKey;
  title: string;
  description?: string;
  fields: FieldDef[];
  defaults: Record<string, any>;
}

export type PageKey = 'home' | 'about' | 'contact' | 'shipping' | 'returns';

export const PAGES: { key: PageKey; label: string; path: string }[] = [
  { key: 'home', label: 'Home', path: '/' },
  { key: 'about', label: 'About', path: '/about' },
  { key: 'contact', label: 'Contact', path: '/contact' },
  { key: 'shipping', label: 'Shipping', path: '/shipping' },
  { key: 'returns', label: 'Returns & Exchanges', path: '/returns' },
];

export const SECTIONS: SectionDef[] = [
  {
    key: 'home.hero',
    page: 'home',
    title: 'Hero banner',
    description: 'The large image at the top of the home page. Store name and slogan come from Settings → General.',
    fields: [
      { name: 'image', label: 'Background image', type: 'image' },
      { name: 'title', label: 'Headline', type: 'text' },
      { name: 'buttonText', label: 'Button text', type: 'text' },
      { name: 'buttonLink', label: 'Button link', type: 'url', help: 'e.g. /shop' },
    ],
    defaults: {
      image: '/images/hero-candle.jpg',
      title: 'TLC Candles',
      buttonText: 'SHOP NOW',
      buttonLink: '/shop',
    },
  },
  {
    key: 'home.headings',
    page: 'home',
    title: 'Product section headings',
    fields: [
      { name: 'bestSellers', label: 'Best sellers heading', type: 'text' },
      { name: 'newArrivals', label: 'New arrivals heading', type: 'text' },
    ],
    defaults: { bestSellers: 'Best Sellers', newArrivals: 'New Arrivals' },
  },
  {
    key: 'home.feature',
    page: 'home',
    title: 'Fragrance banner',
    description: 'The wide picture banner between Best Sellers and New Arrivals.',
    fields: [
      { name: 'image', label: 'Background image', type: 'image' },
      { name: 'heading', label: 'Heading', type: 'text' },
      { name: 'text', label: 'Text under the heading', type: 'textarea', help: 'Leave empty to hide.' },
      { name: 'buttonText', label: 'Button text', type: 'text' },
      { name: 'buttonLink', label: 'Button link', type: 'url' },
    ],
    defaults: {
      image: '/images/feature-background.jpg',
      heading: 'Fragrances for Every Occasion',
      text: '',
      buttonText: 'SHOP NOW',
      buttonLink: '/shop',
    },
  },
  {
    key: 'home.featured',
    page: 'home',
    title: 'Featured candle',
    description: 'Spotlight one product on the home page (e.g. the Lavender candle). Choose "None" to hide the section.',
    fields: [
      { name: 'productId', label: 'Product', type: 'product' },
      { name: 'heading', label: 'Heading', type: 'text', help: 'Leave empty to use the product name.' },
      { name: 'text', label: 'Text', type: 'textarea', help: 'Leave empty to use the product description.' },
      { name: 'image', label: 'Image', type: 'image', help: "Leave empty to use the product's first photo." },
      { name: 'buttonText', label: 'Button text', type: 'text' },
    ],
    defaults: { productId: '', heading: '', text: '', image: '', buttonText: 'SHOP NOW' },
  },
  {
    key: 'about.page',
    page: 'about',
    title: 'About page',
    fields: [
      { name: 'bannerImage', label: 'Banner image', type: 'image' },
      { name: 'bannerTitle', label: 'Banner title', type: 'text' },
      { name: 'storyHeading', label: 'Story heading', type: 'text' },
      { name: 'storySubheading', label: 'Story subheading', type: 'text' },
      { name: 'storyText', label: 'Story text', type: 'textarea', help: 'Leave a blank line between paragraphs.' },
      { name: 'storyImage', label: 'Story image', type: 'image' },
      {
        name: 'gallery',
        label: 'Photo row',
        type: 'items',
        count: 3,
        itemLabel: 'Photo',
        fields: [
          { name: 'image', label: 'Image', type: 'image' },
          { name: 'title', label: 'Title', type: 'text' },
          { name: 'caption', label: 'Caption', type: 'text' },
        ],
        help: 'A photo with no image and no title is hidden.',
      },
      {
        name: 'values',
        label: 'Values',
        type: 'items',
        count: 3,
        itemLabel: 'Value',
        fields: [
          { name: 'title', label: 'Title', type: 'text' },
          { name: 'text', label: 'Text', type: 'textarea' },
        ],
      },
      { name: 'brandHeading', label: '"Behind the brand" heading', type: 'text' },
      { name: 'brandText', label: '"Behind the brand" text', type: 'textarea' },
    ],
    defaults: {
      bannerImage: '/images/about-banner.jpg',
      bannerTitle: 'About Us',
      storyHeading: 'Our Story',
      storySubheading: 'Discover our journey and passion',
      storyText: [
        'Our business started with a $200 birthday gift and challenge.',
        'For her 10th birthday in 2022, our founder was gifted $200 by her mom and challenged to start a business of her own. Instead of choosing something simple, she decided to learn how to make candles—and turned that idea into a real brand.',
        "She's been running the business ever since, and has even teamed up with her brother. Together they proudly co-own and operate the business.",
        'Every candle we make represents creativity, hard work, and the belief that age is never a limit. Thanks for being part of our journey.',
      ].join('\n\n'),
      storyImage: '/images/About/1.png',
      gallery: [
        { image: '/images/About/2.png', title: 'Award Winner', caption: 'Recognized for Young Entrepreneurship' },
        { image: '/images/About/3.png', title: 'Business Fair', caption: 'Sharing Our Products with the Community' },
        { image: '/images/About/4.png', title: 'Customer Connections', caption: 'Building Relationships One Candle at a Time' },
      ],
      values: [
        { title: 'Creativity', text: 'What started as a birthday challenge became a real brand. We bring imagination and fresh ideas to every candle we create.' },
        { title: 'Hard Work', text: 'From learning the craft to running a business, we put dedication into everything we do. Every candle is handmade with care and attention.' },
        { title: 'Family', text: 'A sister-brother team proudly co-owning and operating this business together. We believe age is never a limit when you have passion and support.' },
      ],
      brandHeading: 'Behind The Brand',
      brandText:
        "Stars And Scents was born from a $200 birthday gift and a challenge to dream big. Our founder started this journey at just 10 years old in 2022, learning to make candles from scratch and turning that skill into a real business. Now joined by her brother, together they run every part of the operation—from crafting each candle by hand to connecting with customers. We're proof that with creativity, hard work, and a little family support, anything is possible.",
    },
  },
  {
    key: 'contact.page',
    page: 'contact',
    title: 'Contact page',
    fields: [
      { name: 'bannerImage', label: 'Banner image', type: 'image' },
      { name: 'bannerTitle', label: 'Banner title', type: 'text' },
      { name: 'heading', label: 'Heading', type: 'text' },
      { name: 'intro', label: 'Intro text', type: 'textarea' },
      { name: 'email', label: 'Email', type: 'text', help: 'Leave empty to hide.' },
      { name: 'phone', label: 'Phone', type: 'text', help: 'Leave empty to hide.' },
      { name: 'hours', label: 'Hours', type: 'textarea', help: 'Leave empty to hide.' },
    ],
    defaults: {
      bannerImage: '/images/contact-banner.jpg',
      bannerTitle: 'Contact Us',
      heading: 'Get in Touch',
      intro: "Have questions about our products or need assistance? We're here to help!",
      email: 'thestarsandscents@gmail.com',
      phone: '',
      hours: 'Monday - Friday: 9am - 5pm PST',
    },
  },
  {
    key: 'shipping.page',
    page: 'shipping',
    title: 'Shipping page',
    description: 'Shipping methods and prices are filled in automatically from Settings → Shipping.',
    fields: [
      { name: 'title', label: 'Page title', type: 'text' },
      { name: 'intro', label: 'Intro text', type: 'textarea', help: 'Leave empty to hide.' },
      { name: 'policyHeading', label: 'Policy heading', type: 'text' },
      { name: 'policyItems', label: 'Policy points', type: 'list', help: 'One point per line.' },
      { name: 'internationalHeading', label: 'International heading', type: 'text' },
      { name: 'internationalText', label: 'International text', type: 'textarea', help: 'Leave empty to hide the section.' },
    ],
    defaults: {
      title: 'Shipping Information',
      intro: '',
      policyHeading: 'Shipping Policy',
      policyItems: [
        'Orders are processed within 1-2 business days',
        'Shipping is available within the continental United States',
        'Tracking information will be provided via email',
        'Signature may be required for orders over $100',
      ],
      internationalHeading: 'International Shipping',
      internationalText:
        'Currently, we only ship within the continental United States. We plan to expand our shipping options to international destinations in the future.',
    },
  },
  {
    key: 'returns.page',
    page: 'returns',
    title: 'Returns & Exchanges page',
    fields: [
      { name: 'title', label: 'Page title', type: 'text' },
      { name: 'returnHeading', label: 'Return policy heading', type: 'text' },
      { name: 'returnText', label: 'Return policy text', type: 'textarea' },
      { name: 'requirementsHeading', label: 'Requirements heading', type: 'text' },
      { name: 'requirements', label: 'Requirements', type: 'list', help: 'One per line.' },
      { name: 'refundHeading', label: 'Refund process heading', type: 'text' },
      {
        name: 'refundSteps',
        label: 'Refund steps',
        type: 'list',
        help: 'One step per line. Text before a colon is shown in bold, e.g. "Package Item: Pack it carefully".',
      },
      { name: 'exchangeHeading', label: 'Exchanges heading', type: 'text' },
      { name: 'exchangeText', label: 'Exchanges text', type: 'textarea', help: 'Leave empty to hide the section.' },
      { name: 'damagedHeading', label: 'Damaged items heading', type: 'text' },
      { name: 'damagedText', label: 'Damaged items text', type: 'textarea', help: 'Leave empty to hide the section.' },
    ],
    defaults: {
      title: 'Returns & Refunds',
      returnHeading: 'Return Policy',
      returnText:
        "We want you to be completely satisfied with your purchase. If you're not happy with your order, we accept returns within 30 days of delivery.",
      requirementsHeading: 'Return Requirements',
      requirements: [
        'Items must be unused and in original packaging',
        'Include original receipt or proof of purchase',
        'Products must not show signs of burning or damage',
        'Limited edition items are final sale',
      ],
      refundHeading: 'Refund Process',
      refundSteps: [
        'Initiate Return: Contact our customer service team to receive a return authorization',
        'Package Item: Carefully package the item in its original packaging',
        'Ship Return: Send the package to our returns center',
        'Refund Processing: Refunds are processed within 5-7 business days of receiving the return',
      ],
      exchangeHeading: 'Exchanges',
      exchangeText: '',
      damagedHeading: 'Damaged Items',
      damagedText:
        "If you receive a damaged item, please contact us within 48 hours of delivery. We'll contact you to refund or replace the item.",
    },
  },
];

export type SectionKey =
  | 'home.hero'
  | 'home.headings'
  | 'home.feature'
  | 'home.featured'
  | 'about.page'
  | 'contact.page'
  | 'shipping.page'
  | 'returns.page';

export function getSection(key: string): SectionDef | undefined {
  return SECTIONS.find((s) => s.key === key);
}

/** Saved values over defaults. Unknown keys are dropped; wrong types fall back. */
export function withDefaults<T extends Record<string, any>>(key: SectionKey, saved: unknown): T {
  const section = getSection(key)!;
  const out: Record<string, any> = structuredClone(section.defaults);
  if (!saved || typeof saved !== 'object') return out as T;
  const values = saved as Record<string, any>;
  for (const field of section.fields) {
    if (!(field.name in values)) continue;
    const clean = cleanField(field, values[field.name]);
    if (clean !== undefined) out[field.name] = clean;
  }
  return out as T;
}

const MAX_TEXT = 5000;

function cleanString(v: unknown): string | undefined {
  return typeof v === 'string' ? v.slice(0, MAX_TEXT) : undefined;
}

function cleanUrl(v: unknown): string | undefined {
  const s = cleanString(v)?.trim();
  if (s === undefined) return undefined;
  // Site paths or http(s) only: blocks javascript: and data: links.
  if (s === '' || s.startsWith('/') || /^https?:\/\//i.test(s)) return s;
  return undefined;
}

function cleanField(field: FieldDef, v: unknown): any {
  switch (field.type) {
    case 'text':
    case 'textarea':
    case 'product':
      return cleanString(v);
    case 'url':
    case 'image':
      return cleanUrl(v);
    case 'list':
      return Array.isArray(v)
        ? v
            .filter((x): x is string => typeof x === 'string' && x.trim() !== '')
            .map((x) => x.trim().slice(0, MAX_TEXT))
            .slice(0, 50)
        : undefined;
    case 'items': {
      if (!Array.isArray(v)) return undefined;
      return Array.from({ length: field.count }, (_, i) => {
        const item = v[i] && typeof v[i] === 'object' ? v[i] : {};
        const out: Record<string, string> = {};
        for (const sub of field.fields) {
          const val = sub.type === 'image' ? cleanUrl(item[sub.name]) : cleanString(item[sub.name]);
          out[sub.name] = val ?? '';
        }
        return out;
      });
    }
  }
}

/** Validate an admin save: returns only known, well-typed fields. */
export function sanitizeSection(key: string, input: unknown): Record<string, any> | null {
  const section = getSection(key);
  if (!section || !input || typeof input !== 'object') return null;
  const values = input as Record<string, any>;
  const out: Record<string, any> = {};
  for (const field of section.fields) {
    const clean = cleanField(field, values[field.name]);
    if (clean !== undefined) out[field.name] = clean;
  }
  return out;
}

/** Split textarea text into paragraphs on blank lines. */
export function paragraphs(text: string | undefined): string[] {
  return (text ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** CSS url() value for an image path, safe against quote/paren breakout. */
export function cssUrl(src: string): string {
  const escaped = src.replace(/["'()\\\s]/g, (c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'));
  return `url("${escaped}")`;
}
