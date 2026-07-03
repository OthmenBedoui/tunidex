
import React, { useState, useEffect, useLayoutEffect } from 'react';
import { Package, TrendingUp, DollarSign, Plus, Loader2, Zap, Users, Shield, Trash2, Edit, LayoutGrid, Save, X, User as UserIcon, Clock, History } from 'lucide-react';
import { User, Order, OrderStatus, Listing, UserRole, Category, SubCategory, ProductType, LoginCredential, SiteConfig, HeroSlide, HeroPromoBanner, FloatingBrandCard, DiscountType, ProductVariant, StoreSectionConfig, CustomFont, ClientNotification } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { generateListingDescription } from '../services/geminiService';
import { api, SeoAnalytics } from '../services/api';
import * as LucideIcons from 'lucide-react';
import { AdminErrorState, AdminPremiumLoader } from '../components/admin/AdminSurfaceState';
import AdminCategoriesSection from './admin/sections/AdminCategoriesSection';
import AdminListingsSection from './admin/sections/AdminListingsSection';
import AdminOrdersSection from './admin/sections/AdminOrdersSection';
import AdminUsersSection from './admin/sections/AdminUsersSection';
import { ImageInput } from '../components/shared/ImageInput';
import { RichTextEditor } from '../components/shared/RichTextEditor';
import { ListingImage } from '../components/store-client/ListingImage';
import { AdminEmptyState, AdminPanelCard, AdminStickyActionBar } from '../components/admin/AdminWorkspace';
import { getListingDiscountLabel, getListingFinalPrice, getPackageOriginalTotal, getPackageSavings, hasListingDiscount } from '../utils/pricing';
import { richTextToPlainText, sanitizeRichText } from '../utils/richText';
import { getMergedStoreSections, STORE_SECTION_DEFINITIONS } from '../utils/storeSections';
import { AdminTab } from './admin/adminRouteConfig';

interface AdminDashboardProps {
  orders: Order[];
  listings: Listing[];
  categories: Category[];
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
  onAdminOrderAction: (action: 'approvePayment' | 'rejectPayment' | 'createDelivery' | 'sendDelivery' | 'resendDelivery', orderId: string, payload?: any) => Promise<void>;
  onCreateListing: (listing: Partial<Listing>) => Promise<void>;
  onUpdateListing: (listingId: string, listing: Partial<Listing>) => Promise<void>;
  onDeleteListing: (listingId: string) => Promise<void>;
  onRefreshCategories: () => void;
  user: User;
  siteConfig: SiteConfig;
  onUpdateSiteConfig: (config: Partial<SiteConfig>) => void;
  onResendOrderInvoiceEmail: (orderId: string) => Promise<void>;
  navigateTo: (page: string, slug?: string) => void;
  routeTab: AdminTab;
  focusOrderId?: string | null;
  onFocusOrderHandled?: () => void;
  onActiveTabChange?: (tab: AdminTab) => void;
}

const isImageIconValue = (value?: string) => {
  const normalized = value?.trim() || '';
  return /^(https?:\/\/|data:image\/|blob:|\/)/i.test(normalized);
};

const slugifyProductPreview = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

// Helper for Icon Preview with robust lookup
const DynamicIcon = ({ name, className }: { name: string, className?: string }) => {
  if (isImageIconValue(name)) {
    return <img src={name} alt="" className={`${className || 'w-6 h-6'} object-contain`} referrerPolicy="no-referrer" />;
  }

  const icons: Record<string, React.ComponentType<{ size?: number; className?: string }>> = LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string }>>;
  const IconComponent = icons[name] || icons[name.trim()] || icons.HelpCircle;
  return <IconComponent size={24} className={className} />;
};

const GRADIENT_PRESETS = [
    { name: 'Dark', class: 'bg-gradient-to-r from-slate-700 to-slate-900' },
    { name: 'Red', class: 'bg-gradient-to-r from-red-600 to-rose-700' },
    { name: 'Blue', class: 'bg-gradient-to-r from-blue-600 to-indigo-700' },
    { name: 'Purple', class: 'bg-gradient-to-r from-violet-600 to-purple-700' },
    { name: 'Gold', class: 'bg-gradient-to-r from-yellow-500 to-amber-600' },
    { name: 'Green', class: 'bg-gradient-to-r from-emerald-500 to-green-700' },
    { name: 'Cyan', class: 'bg-gradient-to-r from-cyan-500 to-blue-600' },
];

const PREMIUM_COLOR_PALETTES = [
  {
    name: 'Obsidian Gold',
    description: 'Luxe sombre, idéal marketplace premium',
    accentColor: '#d4af37',
    accentHoverColor: '#b88916',
    accentSoftColor: '#fff7d6',
    accentTextColor: '#6f4e00',
  },
  {
    name: 'Royal Sapphire',
    description: 'Bleu profond, fiable et corporate',
    accentColor: '#1d4ed8',
    accentHoverColor: '#1e3a8a',
    accentSoftColor: '#dbeafe',
    accentTextColor: '#1e3a8a',
  },
  {
    name: 'Emerald Vault',
    description: 'Fintech, sécurité et conversion',
    accentColor: '#047857',
    accentHoverColor: '#065f46',
    accentSoftColor: '#d1fae5',
    accentTextColor: '#064e3b',
  },
  {
    name: 'Crimson Elite',
    description: 'Impact fort pour offres et gaming',
    accentColor: '#dc2626',
    accentHoverColor: '#991b1b',
    accentSoftColor: '#fee2e2',
    accentTextColor: '#7f1d1d',
  },
  {
    name: 'Cyber Mint',
    description: 'Tech moderne, lumineux et net',
    accentColor: '#0891b2',
    accentHoverColor: '#0e7490',
    accentSoftColor: '#cffafe',
    accentTextColor: '#155e75',
  },
  {
    name: 'Amethyst Pro',
    description: 'Premium créatif, IA et digital',
    accentColor: '#7c3aed',
    accentHoverColor: '#5b21b6',
    accentSoftColor: '#ede9fe',
    accentTextColor: '#4c1d95',
  },
  {
    name: 'Graphite Lime',
    description: 'Contraste sportif et très visible',
    accentColor: '#65a30d',
    accentHoverColor: '#3f6212',
    accentSoftColor: '#ecfccb',
    accentTextColor: '#365314',
  },
  {
    name: 'Rose Noir',
    description: 'Boutique premium, chaud et élégant',
    accentColor: '#be185d',
    accentHoverColor: '#9d174d',
    accentSoftColor: '#fce7f3',
    accentTextColor: '#831843',
  },
];

const LUCIDE_ICON_OPTIONS = [
  'Gamepad2', 'Package', 'MonitorPlay', 'Bot', 'Sparkles', 'Crown', 'Shield', 'Zap',
  'Star', 'Gem', 'ShoppingBag', 'Store', 'BadgeDollarSign', 'Wallet', 'CreditCard', 'Coins',
  'Smartphone', 'Laptop', 'Tv', 'Headphones', 'Music4', 'Film', 'BookOpen', 'GraduationCap',
  'Code2', 'Cloud', 'Globe', 'Mail', 'MessageSquare', 'Users', 'UserRound', 'FolderTree',
  'LayoutGrid', 'Boxes', 'KeyRound', 'Lock', 'Rocket', 'Flame', 'Gift', 'Ticket'
];

const SLIDE_MEDIA_RULES = {
  recommended: '1920 x 640 px',
  minWidth: 1280,
  minHeight: 420,
  imageMaxBytes: 4 * 1024 * 1024,
  gifMaxBytes: 8 * 1024 * 1024,
  videoMaxBytes: 18 * 1024 * 1024,
  videoMaxDuration: 20,
  accept: 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm'
};

const isVideoSlideMedia = (src?: string, mediaType?: HeroSlide['mediaType']) => {
  if (mediaType === 'video') return true;
  if (!src) return false;
  return src.startsWith('data:video/') || /\.(mp4|webm)(\?|#|$)/i.test(src);
};

const inferSlideMediaType = (src: string): HeroSlide['mediaType'] => (
  isVideoSlideMedia(src) ? 'video' : 'image'
);

const formatBytes = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;

const SYSTEM_PLATFORM_OPTIONS = [
  'Windows',
  'Windows / macOS',
  'Windows / Linux',
  'macOS',
  'Linux',
  'SteamOS'
];

const DEFAULT_SITE_FONT =
  '"Albeit Grotesk Caps", "Albeit Grotesk", "Arial Narrow", Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const FONT_OPTIONS = [
  { label: 'Albeit Grotesk Caps', value: DEFAULT_SITE_FONT },
  { label: 'Inter / System', value: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  { label: 'Apple System', value: '-apple-system, BlinkMacSystemFont, "Segoe UI", ui-sans-serif, system-ui, sans-serif' },
  { label: 'Arial Narrow', value: '"Arial Narrow", Arial, ui-sans-serif, system-ui, sans-serif' },
  { label: 'Georgia', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Mono', value: '"JetBrains Mono", "SFMono-Regular", Consolas, monospace' }
];

const DEFAULT_EMAIL_TEMPLATES: Record<string, { label: string; subject: string; html: string; variables: string[] }> = {
  registrationOtp: {
    label: 'OTP inscription',
    subject: 'Code de verification TuniBots',
    html: '<h2>Confirmez votre inscription</h2><p>Bonjour {{username}},</p><p>Votre code OTP est :</p><h1>{{otpCode}}</h1><p>Ce code expire dans {{otpExpiryMinutes}} minutes.</p>',
    variables: ['username', 'otpCode', 'otpExpiryMinutes']
  },
  orderInvoice: {
    label: 'Facture commande',
    subject: 'Facture TuniBots {{orderNumber}}',
    html: '<h1>Votre commande est en cours</h1><p>Bonjour {{customerName}}, votre facture TuniBots est générée.</p><p>Commande: {{orderNumber}}</p><p>Facture: {{invoiceNumber}}</p><p>Total: {{totalAmount}}</p><p>Email: {{customerEmail}}</p><p>Téléphone: {{customerPhone}}</p><table>{{itemsRows}}</table><p>Notre support vous guidera dans votre commande.</p>',
    variables: ['orderNumber', 'invoiceNumber', 'invoiceDate', 'customerName', 'customerEmail', 'customerPhone', 'paymentMethod', 'totalAmount', 'amount', 'currency', 'itemsRows']
  },
  testEmail: {
    label: 'Test SMTP',
    subject: 'Test email TuniBots',
    html: '<h1>Configuration email valide</h1><p>Ce message confirme que le SMTP configuré peut envoyer des emails.</p>',
    variables: []
  }
};

const GLOBAL_REGION_OPTION = 'Global';

const PRODUCT_COUNTRY_OPTIONS = [
  'Tunisia',
  'Algeria',
  'Morocco',
  'Libya',
  'Egypt',
  'Mauritania',
  'Senegal',
  'Ivory Coast',
  'Nigeria',
  'South Africa',
  'France',
  'Germany',
  'Italy',
  'Spain',
  'United Kingdom',
  'Ireland',
  'Portugal',
  'Belgium',
  'Netherlands',
  'Switzerland',
  'Austria',
  'Sweden',
  'Norway',
  'Denmark',
  'Finland',
  'Poland',
  'Romania',
  'Greece',
  'United States',
  'Canada',
  'Mexico',
  'Turkey',
  'Saudi Arabia',
  'United Arab Emirates',
  'Qatar',
  'Kuwait',
  'Bahrain',
  'Oman',
  'Jordan',
  'Lebanon',
  'Iraq',
  'Israel',
  'Brazil',
  'Argentina',
  'Chile',
  'Colombia',
  'Peru',
  'India',
  'Pakistan',
  'China',
  'Japan',
  'South Korea',
  'Singapore',
  'Malaysia',
  'Indonesia',
  'Thailand',
  'Philippines',
  'Vietnam',
  'Australia'
];

const PRODUCT_REGION_OPTIONS = [GLOBAL_REGION_OPTION, ...PRODUCT_COUNTRY_OPTIONS];

const SYSTEM_OS_OPTIONS = [
  'Windows 11 (64-BIT Required)',
  'Windows 10 (64-BIT Required)',
  'Windows 10 / 11 (64-BIT Required)',
  'Windows 8.1 (64-BIT Required)',
  'Windows 7 SP1 (64-BIT Required)',
  'macOS 14 Sonoma',
  'macOS 13 Ventura',
  'macOS 12 Monterey',
  'Ubuntu 22.04 LTS (64-BIT)',
  'Ubuntu 20.04 LTS (64-BIT)',
  'SteamOS 3.0'
];

const SYSTEM_MEMORY_OPTIONS = [
  '2 GB RAM',
  '4 GB RAM',
  '6 GB RAM',
  '8 GB RAM',
  '12 GB RAM',
  '16 GB RAM',
  '24 GB RAM',
  '32 GB RAM'
];

const SYSTEM_STORAGE_OPTIONS = [
  '1 GB available space',
  '2 GB available space',
  '4 GB available space',
  '8 GB available space',
  '16 GB available space',
  '20 GB available space',
  '25 GB available space',
  '30 GB available space',
  '40 GB available space',
  '50 GB available space',
  '60 GB available space',
  '80 GB available space',
  '100 GB available space',
  '150 GB available space'
];

const SYSTEM_PROCESSOR_OPTIONS = [
  'Intel Core i3-6100 or AMD FX-6300',
  'Intel Core i5-2500K or AMD FX-8350',
  'Intel Core i5-4460 or AMD Ryzen 3 1200',
  'Intel Core i5-6600K or AMD Ryzen 5 1600',
  'Intel Core i7-4790K or AMD Ryzen 5 1500X',
  'Intel Core i7-7700 or AMD Ryzen 5 2600',
  'Intel Core i5-10400 or AMD Ryzen 5 3600',
  'Intel Core i7-9700K or AMD Ryzen 7 3700X',
  'Intel Core i5-12600K or AMD Ryzen 5 5600X',
  'Intel Core i7-12700K or AMD Ryzen 7 5800X',
  'Intel Core i5-13600K or AMD Ryzen 5 7600'
];

const SYSTEM_GRAPHICS_OPTIONS = [
  'Intel HD Graphics 4000',
  'NVIDIA GeForce GTX 750 Ti or AMD Radeon R7 260X',
  'NVIDIA GeForce GTX 960 or AMD Radeon R9 380',
  'NVIDIA GeForce GTX 1050 Ti or AMD Radeon RX 470',
  'NVIDIA GeForce GTX 1060 6GB or AMD Radeon RX 580',
  'NVIDIA GeForce GTX 1660 or AMD Radeon RX 5600 XT',
  'NVIDIA GeForce RTX 2060 or AMD Radeon RX 6600XT',
  'NVIDIA GeForce RTX 3060 or AMD Radeon RX 6700 XT',
  'NVIDIA GeForce RTX 3070 or AMD Radeon RX 6800',
  'NVIDIA GeForce RTX 4060 or AMD Radeon RX 7600',
  'NVIDIA GeForce RTX 4070 or AMD Radeon RX 7800 XT'
];

const RequirementSelect = ({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) => {
  const normalizedOptions = value && !options.includes(value) ? [value, ...options] : options;

  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</span>
      <select
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Non spécifié</option>
        {normalizedOptions.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
};

const RegionSelect = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
  return (
    <select className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700" value={value} onChange={(e) => onChange(e.target.value)}>
      {value && !PRODUCT_REGION_OPTIONS.includes(value) && <option value={value}>{value}</option>}
      <option value={GLOBAL_REGION_OPTION}>{GLOBAL_REGION_OPTION}</option>
      <optgroup label="Pays">
        {PRODUCT_COUNTRY_OPTIONS.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </optgroup>
    </select>
  );
};

const CountrySelect = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
  <select className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700" value={value} onChange={(e) => onChange(e.target.value)}>
    {value && !PRODUCT_COUNTRY_OPTIONS.includes(value) && <option value={value}>{value}</option>}
    {PRODUCT_COUNTRY_OPTIONS.map((option) => (
      <option key={option} value={option}>{option}</option>
    ))}
  </select>
);

const IconPicker = ({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => (
  <div className="space-y-3">
    <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">{label}</label>
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm text-indigo-600">
        <DynamicIcon name={value} className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-bold text-slate-900 truncate">{value}</div>
        <div className="text-[11px] text-slate-500">Choisis une icône Lucide ou saisis un nom custom.</div>
      </div>
    </div>
    <input
      className="w-full border border-slate-200 p-3 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
      placeholder="ex: MonitorPlay"
      value={value}
      onChange={e => onChange(e.target.value)}
    />
    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
      {LUCIDE_ICON_OPTIONS.map((iconName) => (
        <button
          key={iconName}
          type="button"
          onClick={() => onChange(iconName)}
          title={iconName}
          className={`flex h-12 items-center justify-center rounded-xl border transition-all ${
            value === iconName
              ? 'border-indigo-600 bg-indigo-600 text-white shadow-md'
              : 'border-slate-200 bg-white text-slate-500 hover:border-indigo-300 hover:text-indigo-600'
          }`}
        >
          <DynamicIcon name={iconName} className="w-5 h-5" />
        </button>
      ))}
    </div>
    <a href="https://lucide.dev/icons" target="_blank" rel="noreferrer" className="text-[10px] text-indigo-500 hover:underline block">
      Voir toute la bibliothèque Lucide
    </a>
  </div>
);

const SubCategoryIconPicker = ({
  value,
  onChange
}: {
  value: string;
  onChange: (value: string) => void;
}) => (
  <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
    <IconPicker label="Icône Lucide" value={isImageIconValue(value) ? 'Package' : value} onChange={onChange} />
    <div className="border-t border-slate-100 pt-4">
      <ImageInput
        label="Icône image"
        value={isImageIconValue(value) ? value : ''}
        onChange={onChange}
        placeholder="https://..."
        uploadPreset="icon"
      />
    </div>
  </div>
);

const ORDER_STATUS_STEPS: { status: OrderStatus; label: string; description: string }[] = [
  { status: OrderStatus.PAYMENT_UNDER_REVIEW, label: 'Paiement en revue', description: 'Commande reçue, paiement soumis et en validation manuelle.' },
  { status: OrderStatus.PAYMENT_APPROVED, label: 'Paiement approuvé', description: 'Paiement validé, livraison en préparation.' },
  { status: OrderStatus.IN_DELIVERY, label: 'En livraison', description: 'Contenu digital préparé par un agent.' },
  { status: OrderStatus.DELIVERED, label: 'Livré', description: 'Commande livrée au client et clôturée.' }
];

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.DRAFT_CART]: 'Panier',
  [OrderStatus.IN_PROGRESS]: 'En cours',
  [OrderStatus.DELIVERED]: 'Livré',
  [OrderStatus.REGISTERED]: 'En cours',
  [OrderStatus.PENDING_PAYMENT]: 'Paiement attendu',
  [OrderStatus.PAYMENT_UNDER_REVIEW]: 'Paiement en revue',
  [OrderStatus.PAYMENT_APPROVED]: 'Paiement approuvé',
  [OrderStatus.PAYMENT_REJECTED]: 'Paiement rejeté',
  [OrderStatus.IN_DELIVERY]: 'En livraison',
  [OrderStatus.PAYMENT_RECEIVED]: 'Paiement reçu',
  [OrderStatus.COMPLETED]: 'Livré',
  [OrderStatus.CANCELLED]: 'Annulée',
  [OrderStatus.REFUNDED]: 'Remboursée'
};

const getOrderStepIndex = (status: OrderStatus) => {
  if ([OrderStatus.REGISTERED, OrderStatus.PENDING_PAYMENT, OrderStatus.PAYMENT_UNDER_REVIEW, OrderStatus.IN_PROGRESS].includes(status)) return 0;
  if ([OrderStatus.PAYMENT_RECEIVED, OrderStatus.PAYMENT_APPROVED].includes(status)) return 1;
  if (status === OrderStatus.IN_DELIVERY) return 2;
  if (status === OrderStatus.COMPLETED) return 3;
  const index = ORDER_STATUS_STEPS.findIndex((step) => step.status === status);
  return index === -1 ? -1 : index;
};

const getOrderStatusClasses = (status: OrderStatus) => {
  if (status === OrderStatus.DELIVERED || status === OrderStatus.COMPLETED) return 'bg-green-100 text-green-700';
  if (status === OrderStatus.CANCELLED || status === OrderStatus.PAYMENT_REJECTED || status === OrderStatus.REFUNDED) return 'bg-red-100 text-red-700';
  if (status === OrderStatus.PAYMENT_APPROVED || status === OrderStatus.IN_DELIVERY) return 'bg-blue-100 text-blue-700';
  return 'bg-amber-100 text-amber-700';
};

const getListingStateClasses = (listing: Listing) => {
  if (listing.isArchived) return 'bg-slate-200 text-slate-700';
  if (listing.stock > 0) return 'bg-green-100 text-green-700';
  return 'bg-red-100 text-red-700';
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ orders, listings, categories, onUpdateStatus, onAdminOrderAction, onCreateListing, onUpdateListing, onDeleteListing, onRefreshCategories, user, siteConfig, onUpdateSiteConfig, onResendOrderInvoiceEmail, navigateTo, routeTab, focusOrderId, onFocusOrderHandled, onActiveTabChange }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>(routeTab);
  const requestAdminTab = (tab: AdminTab) => {
    setActiveTab(tab);
    onActiveTabChange?.(tab);
  };
  const [notificationAdminTab, setNotificationAdminTab] = useState<'orders' | 'client'>('orders');
  const [notificationUsers, setNotificationUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<{name: string, sales: number, orders: number}[]>([]);
  const [summary, setSummary] = useState({ totalSales: 0, totalOrders: 0, totalUsers: 0 });
  const [topProducts, setTopProducts] = useState<Listing[]>([]);
  const [isOverviewLoading, setIsOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [overviewReloadNonce, setOverviewReloadNonce] = useState(0);
  const [listingPendingDelete, setListingPendingDelete] = useState<Listing | null>(null);
  const [isDeletingListing, setIsDeletingListing] = useState(false);
  const [orderFilter, setOrderFilter] = useState<'all' | OrderStatus>('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderSort, setOrderSort] = useState<'newest' | 'oldest' | 'amount-desc' | 'amount-asc'>('newest');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [deliveryDrafts, setDeliveryDrafts] = useState<Record<string, { orderItemId: string; deliveryType: string; deliveryContent: string; activationGuide: string; restrictions: string; region: string }>>({});
  const [adminToast, setAdminToast] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);
  const [adminConfirmation, setAdminConfirmation] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => Promise<void> | void;
  } | null>(null);
  const [dataActionStatus, setDataActionStatus] = useState('');
  const [dataActionError, setDataActionError] = useState('');
  const [slideMediaError, setSlideMediaError] = useState('');
  const [dataImportFile, setDataImportFile] = useState<File | null>(null);
  const [cleanTarget, setCleanTarget] = useState('products');
  const [cleanConfirmation, setCleanConfirmation] = useState('');
  const [isDataActionLoading, setIsDataActionLoading] = useState(false);
  
  // --- Category Management State ---
  const [newCatName, setNewCatName] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Gamepad2');
  const [newCatImage, setNewCatImage] = useState('');
  const [newCatGradient, setNewCatGradient] = useState(GRADIENT_PRESETS[0].class);
  const [newCatOrder, setNewCatOrder] = useState('0');
  
  // --- SubCategory Management State ---
  const [newSubCatName, setNewSubCatName] = useState('');
  const [newSubCatSlug, setNewSubCatSlug] = useState('');
  const [newSubCatIcon, setNewSubCatIcon] = useState('Package');
  const [newSubCatDesc, setNewSubCatDesc] = useState('');
  const [newSubCatOrder, setNewSubCatOrder] = useState('0');
  
  // --- User Management State ---
  const [selectedCatForSub, setSelectedCatForSub] = useState('');

  // --- Listing Create State ---
  const [newListingGame, setNewListingGame] = useState('');
  const [newListingTitle, setNewListingTitle] = useState('');
  const [newListingPrice, setNewListingPrice] = useState('');
  const [newListingDiscountType, setNewListingDiscountType] = useState<DiscountType>(DiscountType.NONE);
  const [newListingDiscount, setNewListingDiscount] = useState('0');
  const [newListingCatId, setNewListingCatId] = useState('');
  const [newListingSubCatId, setNewListingSubCatId] = useState('');
  const [newListingImageUrl, setNewListingImageUrl] = useState('');
  const [newListingLogoUrl, setNewListingLogoUrl] = useState('');
  const [newListingGallery, setNewListingGallery] = useState(''); 
  const [newListingIsInstant, setNewListingIsInstant] = useState(true);
  const [newListingPrepTime, setNewListingPrepTime] = useState('');
  const [newListingPlatform, setNewListingPlatform] = useState('');
  const [newListingRegion, setNewListingRegion] = useState('Global');
  const [newListingActivationCountry, setNewListingActivationCountry] = useState('Tunisia');
  const [newListingSource, setNewListingSource] = useState('');
  const [newListingActivationGuideTitle, setNewListingActivationGuideTitle] = useState('Activation Guide');
  const [newListingActivationGuideContent, setNewListingActivationGuideContent] = useState('');
  const [newListingRestrictionsTitle, setNewListingRestrictionsTitle] = useState('Check Restrictions');
  const [newListingRestrictionsContent, setNewListingRestrictionsContent] = useState('');
  const [newListingRegionTitle, setNewListingRegionTitle] = useState('Region');
  const [newListingRegionContent, setNewListingRegionContent] = useState('');
  const [newListingSystemRequirementsEnabled, setNewListingSystemRequirementsEnabled] = useState(false);
  const [newListingSystemRequirementsPlatform, setNewListingSystemRequirementsPlatform] = useState('Windows');
  const [newListingMinimumOs, setNewListingMinimumOs] = useState('');
  const [newListingMinimumMemory, setNewListingMinimumMemory] = useState('');
  const [newListingMinimumStorage, setNewListingMinimumStorage] = useState('');
  const [newListingMinimumProcessor, setNewListingMinimumProcessor] = useState('');
  const [newListingMinimumGraphics, setNewListingMinimumGraphics] = useState('');
  const [newListingRecommendedOs, setNewListingRecommendedOs] = useState('');
  const [newListingRecommendedMemory, setNewListingRecommendedMemory] = useState('');
  const [newListingRecommendedStorage, setNewListingRecommendedStorage] = useState('');
  const [newListingRecommendedProcessor, setNewListingRecommendedProcessor] = useState('');
  const [newListingRecommendedGraphics, setNewListingRecommendedGraphics] = useState('');
  const [newListingMetaTitle, setNewListingMetaTitle] = useState('');
  const [newListingMetaDesc, setNewListingMetaDesc] = useState('');
  const [newListingKeywords, setNewListingKeywords] = useState('');
  const [newListingProductType, setNewListingProductType] = useState<ProductType>(ProductType.STANDARD);
  const [newListingCredentials, setNewListingCredentials] = useState<{username: string, password?: string}[]>([]);
  const [newListingStaticKey, setNewListingStaticKey] = useState('');
  const [newListingIsPackage, setNewListingIsPackage] = useState(false);
  const [newListingPackageItems, setNewListingPackageItems] = useState<Array<{ includedListingId: string; quantity: number }>>([]);
  const [newListingVariantLabel, setNewListingVariantLabel] = useState('');
  const [newListingVariants, setNewListingVariants] = useState<ProductVariant[]>([]);
  const [generatedDescription, setGeneratedDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);

  // --- Auto-slug Generation ---
  useEffect(() => {
    setNewCatSlug(newCatName.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, ''));
  }, [newCatName]);

  useEffect(() => {
    setNewSubCatSlug(newSubCatName.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, ''));
  }, [newSubCatName]);

  useEffect(() => {
    if (newListingTitle) {
        setNewListingMetaTitle(`${newListingTitle} | TuniBots`);
        setNewListingMetaDesc(`Achetez ${newListingTitle} au meilleur prix sur TuniBots. Livraison rapide et sécurisée.`);
    }
  }, [newListingTitle]);

  // --- Editing State ---
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editCatImage, setEditCatImage] = useState('');
  const [editCatGradient, setEditCatGradient] = useState('');
  const [editCatIcon, setEditCatIcon] = useState('');
  const [editCatName, setEditCatName] = useState('');
  const [editCatSlug, setEditCatSlug] = useState('');
  const [editCatOrder, setEditCatOrder] = useState('0');

  const [editingSubCategory, setEditingSubCategory] = useState<SubCategory | null>(null);
  const [editSubName, setEditSubName] = useState('');
  const [editSubSlug, setEditSubSlug] = useState('');
  const [editSubIcon, setEditSubIcon] = useState('');
  const [editSubDesc, setEditSubDesc] = useState('');
  const [editSubOrder, setEditSubOrder] = useState('0');
  const [editSubCatId, setEditSubCatId] = useState('');
  
  // --- Site Config State ---
  const [siteLogo, setSiteLogo] = useState(siteConfig.logoUrl);
  const [siteName, setSiteName] = useState(siteConfig.siteName);
  const [logoSize, setLogoSize] = useState(siteConfig.logoSize || 32);
  const [siteFavicon, setSiteFavicon] = useState(siteConfig.faviconUrl || '');
  const [startupLoaderEnabled, setStartupLoaderEnabled] = useState(siteConfig.startupLoaderEnabled ?? false);
  const [startupLoaderImageUrl, setStartupLoaderImageUrl] = useState(siteConfig.startupLoaderImageUrl || '');
  const [startupLoaderBackground, setStartupLoaderBackground] = useState(siteConfig.startupLoaderBackground || '#020617');
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>(siteConfig.heroSlides || []);
  const [heroPromoBanners, setHeroPromoBanners] = useState<HeroPromoBanner[]>(siteConfig.heroPromoBanners || []);
  const [floatingBrandCards, setFloatingBrandCards] = useState<FloatingBrandCard[]>(siteConfig.floatingBrandCards || []);
  const [heroSlideHeight, setHeroSlideHeight] = useState(siteConfig.heroSlideHeight || 440);
  const [coverBackgroundUrl, setCoverBackgroundUrl] = useState(siteConfig.coverBackgroundUrl || '');
  const [coverListingIds, setCoverListingIds] = useState<string[]>(siteConfig.coverListingIds || []);
  const [storeSections, setStoreSections] = useState<StoreSectionConfig[]>(getMergedStoreSections(siteConfig));
  const [customizationSection, setCustomizationSection] = useState<'hero' | 'floating-cards' | 'store-cover' | 'loader' | 'colors' | 'font' | 'layout'>('hero');
  const [accentColor, setAccentColor] = useState(siteConfig.accentColor || '#4f46e5');
  const [accentHoverColor, setAccentHoverColor] = useState(siteConfig.accentHoverColor || '#4338ca');
  const [accentSoftColor, setAccentSoftColor] = useState(siteConfig.accentSoftColor || '#e0e7ff');
  const [accentTextColor, setAccentTextColor] = useState(siteConfig.accentTextColor || '#312e81');
  const [fontFamily, setFontFamily] = useState(siteConfig.fontFamily || DEFAULT_SITE_FONT);
  const [customFonts, setCustomFonts] = useState<CustomFont[]>(siteConfig.customFonts || []);
  const [fontUploadError, setFontUploadError] = useState('');
  const [headerAnnouncement, setHeaderAnnouncement] = useState(siteConfig.headerAnnouncement || 'Bienvenue sur la première plateforme digitale en Tunisie !');
  const [headerSearchPlaceholder, setHeaderSearchPlaceholder] = useState(siteConfig.headerSearchPlaceholder || 'Rechercher jeux, items, comptes...');
  const [headerCtaLabel, setHeaderCtaLabel] = useState(siteConfig.headerCtaLabel || "S'inscrire");
  const [footerTagline, setFooterTagline] = useState(siteConfig.footerTagline || 'Marketplace digitale premium');
  const [footerDescription, setFooterDescription] = useState(siteConfig.footerDescription || 'La destination premium pour vos comptes, licences, abonnements, outils IA et services digitaux en Tunisie.');
  const [footerEmail, setFooterEmail] = useState(siteConfig.footerEmail || 'support@tunibots.tn');
  const [footerPhone, setFooterPhone] = useState(siteConfig.footerPhone || '+216 00 000 000');
  const [footerWhatsapp, setFooterWhatsapp] = useState(siteConfig.footerWhatsapp || '+216 00 000 000');
  const [footerAddress, setFooterAddress] = useState(siteConfig.footerAddress || 'Tunis, Tunisie');
  const [footerCopyright, setFooterCopyright] = useState(siteConfig.footerCopyright || 'Tous droits réservés.');
  const [seoTitle, setSeoTitle] = useState(siteConfig.seoTitle || '');
  const [seoDescription, setSeoDescription] = useState(siteConfig.seoDescription || '');
  const [seoKeywords, setSeoKeywords] = useState(siteConfig.seoKeywords || '');
  const [seoCanonicalUrl, setSeoCanonicalUrl] = useState(siteConfig.seoCanonicalUrl || '');
  const [seoOgImageUrl, setSeoOgImageUrl] = useState(siteConfig.seoOgImageUrl || '');
  const [seoRobots, setSeoRobots] = useState(siteConfig.seoRobots || 'index,follow');
  const [seoSitemapEnabled, setSeoSitemapEnabled] = useState(siteConfig.seoSitemapEnabled ?? true);
  const [seoOrganizationName, setSeoOrganizationName] = useState(siteConfig.seoOrganizationName || '');
  const [seoGoogleAnalyticsId, setSeoGoogleAnalyticsId] = useState(siteConfig.seoGoogleAnalyticsId || '');
  const [seoGoogleAdsConversionId, setSeoGoogleAdsConversionId] = useState(siteConfig.seoGoogleAdsConversionId || '');
  const [seoFacebookPixelId, setSeoFacebookPixelId] = useState(siteConfig.seoFacebookPixelId || '');
  const [seoAnalytics, setSeoAnalytics] = useState<SeoAnalytics>({ totalVisits: 0, uniqueVisitors: 0, dailyVisits: [], topCategories: [], topProducts: [] });
  const [isSeoAnalyticsLoading, setIsSeoAnalyticsLoading] = useState(false);
  const selectedPremiumPalette = PREMIUM_COLOR_PALETTES.find((palette) =>
    palette.accentColor.toLowerCase() === accentColor.toLowerCase() &&
    palette.accentHoverColor.toLowerCase() === accentHoverColor.toLowerCase() &&
    palette.accentSoftColor.toLowerCase() === accentSoftColor.toLowerCase() &&
    palette.accentTextColor.toLowerCase() === accentTextColor.toLowerCase()
  );

  const applyPremiumPalette = (palette: typeof PREMIUM_COLOR_PALETTES[number]) => {
    setAccentColor(palette.accentColor);
    setAccentHoverColor(palette.accentHoverColor);
    setAccentSoftColor(palette.accentSoftColor);
    setAccentTextColor(palette.accentTextColor);
  };
  
  // --- SMTP Config State ---
  const [smtpMailerName, setSmtpMailerName] = useState(siteConfig.smtpMailerName || '');
  const [smtpHost, setSmtpHost] = useState(siteConfig.smtpHost || '');
  const [smtpDriver, setSmtpDriver] = useState(siteConfig.smtpDriver || '');
  const [smtpPort, setSmtpPort] = useState(siteConfig.smtpPort || '');
  const [smtpUsername, setSmtpUsername] = useState(siteConfig.smtpUsername || '');
  const [smtpEmailId, setSmtpEmailId] = useState(siteConfig.smtpEmailId || '');
  const [smtpEncryption, setSmtpEncryption] = useState(siteConfig.smtpEncryption || '');
  const [smtpPassword, setSmtpPassword] = useState(siteConfig.smtpPassword || '');
  const [testEmailTo, setTestEmailTo] = useState(siteConfig.smtpEmailId || user.email || '');
  const [emailTestState, setEmailTestState] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [selectedEmailTemplate, setSelectedEmailTemplate] = useState('orderInvoice');
  const [emailTemplates, setEmailTemplates] = useState<Record<string, { subject: string; html: string }>>(
    Object.fromEntries(
      Object.entries(DEFAULT_EMAIL_TEMPLATES).map(([key, template]) => [
        key,
        {
          subject: siteConfig.emailTemplates?.[key]?.subject || template.subject,
          html: siteConfig.emailTemplates?.[key]?.html || template.html
        }
      ])
    )
  );
  const [emailTemplateEditMode, setEmailTemplateEditMode] = useState<'visual' | 'html'>('visual');

  // --- Click2pay Config State ---
  const [click2payEnabled, setClick2payEnabled] = useState(siteConfig.click2payEnabled || false);
  const [click2payMerchantId, setClick2payMerchantId] = useState(siteConfig.click2payMerchantId || '');
  const [click2payApiKey, setClick2payApiKey] = useState(siteConfig.click2payApiKey || '');
  const [adminNotificationsEnabled, setAdminNotificationsEnabled] = useState(siteConfig.adminNotificationsEnabled ?? true);
  const [adminNotificationSound, setAdminNotificationSound] = useState(siteConfig.adminNotificationSound ?? true);
  const [adminNotificationPollSeconds, setAdminNotificationPollSeconds] = useState(siteConfig.adminNotificationPollSeconds || 15);
  const [whatsappNotificationsEnabled, setWhatsappNotificationsEnabled] = useState(siteConfig.whatsappNotificationsEnabled || false);
  const [whatsappNotificationWebhookUrl, setWhatsappNotificationWebhookUrl] = useState(siteConfig.whatsappNotificationWebhookUrl || '');
  const [telegramNotificationsEnabled, setTelegramNotificationsEnabled] = useState(siteConfig.telegramNotificationsEnabled || false);
  const [telegramBotToken, setTelegramBotToken] = useState(siteConfig.telegramBotToken || '');
  const [telegramChatId, setTelegramChatId] = useState(siteConfig.telegramChatId || '');
  const [messengerNotificationsEnabled, setMessengerNotificationsEnabled] = useState(siteConfig.messengerNotificationsEnabled || false);
  const [messengerNotificationWebhookUrl, setMessengerNotificationWebhookUrl] = useState(siteConfig.messengerNotificationWebhookUrl || '');
  const [clientNotificationTitle, setClientNotificationTitle] = useState('');
  const [clientNotificationMessage, setClientNotificationMessage] = useState('');
  const [clientNotificationTargetMode, setClientNotificationTargetMode] = useState<'all' | 'selected'>('all');
  const [clientNotificationTargetUserId, setClientNotificationTargetUserId] = useState('');
  const [isSendingClientNotification, setIsSendingClientNotification] = useState(false);

  const showAdminToast = (toast: { type: 'success' | 'error'; title: string; message: string }) => {
    setAdminToast(toast);
  };

  useEffect(() => {
    if (!adminToast || adminToast.type !== 'success') return;
    const timeout = window.setTimeout(() => setAdminToast(null), 1500);
    return () => window.clearTimeout(timeout);
  }, [adminToast]);

  useEffect(() => {
    setSiteLogo(siteConfig.logoUrl);
    setSiteName(siteConfig.siteName);
    setLogoSize(siteConfig.logoSize || 32);
    setSiteFavicon(siteConfig.faviconUrl || '');
    setStartupLoaderEnabled(siteConfig.startupLoaderEnabled ?? false);
    setStartupLoaderImageUrl(siteConfig.startupLoaderImageUrl || '');
    setStartupLoaderBackground(siteConfig.startupLoaderBackground || '#020617');
    setHeroSlides(siteConfig.heroSlides || []);
    setHeroPromoBanners(siteConfig.heroPromoBanners || []);
    setFloatingBrandCards(siteConfig.floatingBrandCards || []);
    setHeroSlideHeight(siteConfig.heroSlideHeight || 440);
    setCoverBackgroundUrl(siteConfig.coverBackgroundUrl || '');
    setCoverListingIds(siteConfig.coverListingIds || []);
    setStoreSections(getMergedStoreSections(siteConfig));
    setAccentColor(siteConfig.accentColor || '#4f46e5');
    setAccentHoverColor(siteConfig.accentHoverColor || '#4338ca');
    setAccentSoftColor(siteConfig.accentSoftColor || '#e0e7ff');
    setAccentTextColor(siteConfig.accentTextColor || '#312e81');
    setFontFamily(siteConfig.fontFamily || DEFAULT_SITE_FONT);
    setCustomFonts(siteConfig.customFonts || []);
    setHeaderAnnouncement(siteConfig.headerAnnouncement || 'Bienvenue sur la première plateforme digitale en Tunisie !');
    setHeaderSearchPlaceholder(siteConfig.headerSearchPlaceholder || 'Rechercher jeux, items, comptes...');
    setHeaderCtaLabel(siteConfig.headerCtaLabel || "S'inscrire");
    setFooterTagline(siteConfig.footerTagline || 'Marketplace digitale premium');
    setFooterDescription(siteConfig.footerDescription || 'La destination premium pour vos comptes, licences, abonnements, outils IA et services digitaux en Tunisie.');
    setFooterEmail(siteConfig.footerEmail || 'support@tunibots.tn');
    setFooterPhone(siteConfig.footerPhone || '+216 00 000 000');
    setFooterWhatsapp(siteConfig.footerWhatsapp || '+216 00 000 000');
    setFooterAddress(siteConfig.footerAddress || 'Tunis, Tunisie');
    setFooterCopyright(siteConfig.footerCopyright || 'Tous droits réservés.');
    setSeoTitle(siteConfig.seoTitle || '');
    setSeoDescription(siteConfig.seoDescription || '');
    setSeoKeywords(siteConfig.seoKeywords || '');
    setSeoCanonicalUrl(siteConfig.seoCanonicalUrl || '');
    setSeoOgImageUrl(siteConfig.seoOgImageUrl || '');
    setSeoRobots(siteConfig.seoRobots || 'index,follow');
    setSeoSitemapEnabled(siteConfig.seoSitemapEnabled ?? true);
    setSeoOrganizationName(siteConfig.seoOrganizationName || '');
    setSeoGoogleAnalyticsId(siteConfig.seoGoogleAnalyticsId || '');
    setSeoGoogleAdsConversionId(siteConfig.seoGoogleAdsConversionId || '');
    setSeoFacebookPixelId(siteConfig.seoFacebookPixelId || '');
    setSmtpMailerName(siteConfig.smtpMailerName || '');
    setSmtpHost(siteConfig.smtpHost || '');
    setSmtpDriver(siteConfig.smtpDriver || '');
    setSmtpPort(siteConfig.smtpPort || '');
    setSmtpUsername(siteConfig.smtpUsername || '');
    setSmtpEmailId(siteConfig.smtpEmailId || '');
    setSmtpEncryption(siteConfig.smtpEncryption || '');
    setSmtpPassword(siteConfig.smtpPassword || '');
    setEmailTemplates(Object.fromEntries(
      Object.entries(DEFAULT_EMAIL_TEMPLATES).map(([key, template]) => [
        key,
        {
          subject: siteConfig.emailTemplates?.[key]?.subject || template.subject,
          html: siteConfig.emailTemplates?.[key]?.html || template.html
        }
      ])
    ));
    setClick2payEnabled(siteConfig.click2payEnabled || false);
    setClick2payMerchantId(siteConfig.click2payMerchantId || '');
    setClick2payApiKey(siteConfig.click2payApiKey || '');
    setAdminNotificationsEnabled(siteConfig.adminNotificationsEnabled ?? true);
    setAdminNotificationSound(siteConfig.adminNotificationSound ?? true);
    setAdminNotificationPollSeconds(siteConfig.adminNotificationPollSeconds || 15);
    setWhatsappNotificationsEnabled(siteConfig.whatsappNotificationsEnabled || false);
    setWhatsappNotificationWebhookUrl(siteConfig.whatsappNotificationWebhookUrl || '');
    setTelegramNotificationsEnabled(siteConfig.telegramNotificationsEnabled || false);
    setTelegramBotToken(siteConfig.telegramBotToken || '');
    setTelegramChatId(siteConfig.telegramChatId || '');
    setMessengerNotificationsEnabled(siteConfig.messengerNotificationsEnabled || false);
    setMessengerNotificationWebhookUrl(siteConfig.messengerNotificationWebhookUrl || '');
  }, [siteConfig]);

  const addHeroSlide = () => {
    setHeroSlides((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2, 10),
        imageUrl: '',
        mediaType: 'image',
        badge: 'Dernière offre',
        title: '',
        subtitle: '',
        ctaLabel: 'Voir l’offre',
        linkType: 'listing',
        linkTarget: ''
      }
    ]);
  };

  const updateHeroSlide = (id: string, patch: Partial<HeroSlide>) => {
    setHeroSlides((prev) => prev.map((slide) => (slide.id === id ? { ...slide, ...patch } : slide)));
  };

  const removeHeroSlide = (id: string) => {
    setHeroSlides((prev) => prev.filter((slide) => slide.id !== id));
  };

  const addHeroPromoBanner = () => {
    setHeroPromoBanners((prev) => {
      if (prev.length >= 5) return prev;
      return [
        ...prev,
        {
          id: Math.random().toString(36).slice(2, 10),
          imageUrl: '',
          alt: '',
          linkType: 'listing',
          linkTarget: ''
        }
      ];
    });
  };

  const updateHeroPromoBanner = (id: string, patch: Partial<HeroPromoBanner>) => {
    setHeroPromoBanners((prev) => prev.map((banner) => (banner.id === id ? { ...banner, ...patch } : banner)));
  };

  const removeHeroPromoBanner = (id: string) => {
    setHeroPromoBanners((prev) => prev.filter((banner) => banner.id !== id));
  };

  const addFloatingBrandCard = () => {
    setFloatingBrandCards((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2, 10),
        name: '',
        imageUrl: '',
        linkType: 'url',
        linkTarget: ''
      }
    ]);
  };

  const updateFloatingBrandCard = (id: string, patch: Partial<FloatingBrandCard>) => {
    setFloatingBrandCards((prev) => prev.map((card) => (card.id === id ? { ...card, ...patch } : card)));
  };

  const removeFloatingBrandCard = (id: string) => {
    setFloatingBrandCards((prev) => prev.filter((card) => card.id !== id));
  };

  const updateStoreSection = (sectionId: string, patch: Partial<StoreSectionConfig>) => {
    setStoreSections((prev) => {
      const merged = prev.length > 0 ? prev : getMergedStoreSections(siteConfig);
      return merged.map((section) => (section.id === sectionId ? { ...section, ...patch } : section));
    });
  };

  const saveEmailConfig = () => {
    onUpdateSiteConfig({
      smtpMailerName,
      smtpHost,
      smtpDriver: smtpDriver || 'smtp',
      smtpPort,
      smtpUsername,
      smtpEmailId,
      smtpEncryption: smtpEncryption || 'tls',
      smtpPassword,
      emailTemplates
    });
  };

  const updateSelectedEmailTemplate = (patch: Partial<{ subject: string; html: string }>) => {
    setEmailTemplates((current) => ({
      ...current,
      [selectedEmailTemplate]: {
        ...(current[selectedEmailTemplate] || { subject: '', html: '' }),
        ...patch
      }
    }));
  };

  const resetSelectedEmailTemplate = () => {
    const fallback = DEFAULT_EMAIL_TEMPLATES[selectedEmailTemplate];
    if (!fallback) return;
    setEmailTemplates((current) => ({
      ...current,
      [selectedEmailTemplate]: { subject: fallback.subject, html: fallback.html }
    }));
  };

  const insertEmailVariable = (variable: string) => {
    updateSelectedEmailTemplate({
      html: `${emailTemplates[selectedEmailTemplate]?.html || ''} <strong>{{${variable}}}</strong>`
    });
  };

  const getEmailTemplatePreview = () => {
    const sampleValues: Record<string, string> = {
      username: 'Client TuniBots',
      otpCode: '123456',
      otpExpiryMinutes: '10',
      orderNumber: 'CMD-2026-000123',
      invoiceNumber: 'FAC-2026-000123',
      invoiceDate: new Date().toLocaleDateString('fr-FR'),
      customerName: 'Client TuniBots',
      customerEmail: 'client@example.com',
      customerPhone: '+216 XX XXX XXX',
      paymentMethod: 'Flouci',
      totalAmount: '99.00 TND',
      amount: '99.00',
      currency: 'TND',
      itemsRows: '<tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">Produit exemple<div style="color:#64748b;font-size:12px;">Quantité: 1</div></td><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;text-align:right;">99.00 TND</td></tr>'
    };
    return (emailTemplates[selectedEmailTemplate]?.html || '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key) => sampleValues[key] || '');
  };

  const handleTestEmail = async () => {
    setEmailTestState(null);
    setIsTestingEmail(true);
    try {
      await onUpdateSiteConfig({
        smtpMailerName,
        smtpHost,
        smtpDriver: smtpDriver || 'smtp',
        smtpPort,
        smtpUsername,
        smtpEmailId,
        smtpEncryption: smtpEncryption || 'tls',
        smtpPassword,
        emailTemplates
      });
      const result = await api.testEmailConfig(testEmailTo);
      setEmailTestState({ type: 'success', message: result.message || 'Email de test envoyé.' });
    } catch (error) {
      setEmailTestState({
        type: 'error',
        message: error instanceof Error ? error.message : "Impossible d'envoyer l'email de test."
      });
    } finally {
      setIsTestingEmail(false);
    }
  };

  const saveNotificationConfig = () => {
    onUpdateSiteConfig({
      adminNotificationsEnabled,
      adminNotificationSound,
      adminNotificationPollSeconds: Number(adminNotificationPollSeconds) || 15,
      whatsappNotificationsEnabled,
      whatsappNotificationWebhookUrl,
      telegramNotificationsEnabled,
      telegramBotToken,
      telegramChatId,
      messengerNotificationsEnabled,
      messengerNotificationWebhookUrl
    });
  };

  const handleSendClientNotification = async () => {
    const title = clientNotificationTitle.trim();
    const message = clientNotificationMessage.trim();
    const targetUserIds = clientNotificationTargetMode === 'selected' && clientNotificationTargetUserId
      ? [clientNotificationTargetUserId]
      : [];

    if (!title) {
      showAdminToast({
        type: 'error',
        title: 'Titre requis',
        message: 'Ajoutez un titre avant d envoyer la notification client.'
      });
      return;
    }

    if (!message) {
      showAdminToast({
        type: 'error',
        title: 'Message requis',
        message: 'Ajoutez un message avant d envoyer la notification client.'
      });
      return;
    }

    if (clientNotificationTargetMode === 'selected' && !clientNotificationTargetUserId) {
      showAdminToast({
        type: 'error',
        title: 'Client requis',
        message: 'Selectionnez un client destinataire.'
      });
      return;
    }

    try {
      setIsSendingClientNotification(true);
      const result = await api.sendClientNotification({ title, message, targetUserIds });
      setClientNotificationTitle('');
      setClientNotificationMessage('');
      setClientNotificationTargetMode('all');
      setClientNotificationTargetUserId('');
      showAdminToast({
        type: 'success',
        title: 'Notification envoyee',
        message: result.message
      });
    } catch (error) {
      showAdminToast({
        type: 'error',
        title: 'Envoi impossible',
        message: error instanceof Error ? error.message : "La notification client n'a pas pu etre envoyee."
      });
    } finally {
      setIsSendingClientNotification(false);
    }
  };

  const saveSeoConfig = () => {
    onUpdateSiteConfig({
      seoTitle,
      seoDescription,
      seoKeywords,
      seoCanonicalUrl,
      seoOgImageUrl,
      seoRobots,
      seoSitemapEnabled,
      seoOrganizationName,
      seoGoogleAnalyticsId,
      seoGoogleAdsConversionId,
      seoFacebookPixelId
    });
  };

  const getFontDisplayName = (value: string) => {
    const defaultOption = FONT_OPTIONS.find((option) => option.value === value);
    if (defaultOption) return defaultOption.label;
    return customFonts.find((font) => font.family === value)?.name || value.replace(/^"|"$/g, '');
  };

  const readFontFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Impossible de lire le fichier font.'));
      reader.readAsDataURL(file);
    });

  const handleFontUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    if (!['ttf', 'otf', 'woff', 'woff2'].includes(extension)) {
      setFontUploadError('Format accepté: .ttf, .otf, .woff ou .woff2');
      return;
    }

    if (file.size > 2_000_000) {
      setFontUploadError('Le fichier font doit rester sous 2 MB pour garder le site rapide.');
      return;
    }

    try {
      setFontUploadError('');
      const dataUrl = await readFontFileAsDataUrl(file);
      const cleanName = file.name.replace(/\.(ttf|otf|woff2?)$/i, '').replace(/[_-]+/g, ' ').trim() || 'Police personnalisée';
      const family = `TuniBots Custom ${Date.now()}`;
      const nextFont: CustomFont = {
        id: Math.random().toString(36).slice(2, 10),
        name: cleanName,
        family,
        dataUrl,
        format: extension
      };
      setCustomFonts((current) => [...current, nextFont]);
      setFontFamily(`"${family}"`);
      event.target.value = '';
    } catch (error) {
      setFontUploadError(error instanceof Error ? error.message : 'Upload font impossible.');
    }
  };

  const removeCustomFont = (fontId: string) => {
    setCustomFonts((current) => {
      const removed = current.find((font) => font.id === fontId);
      const next = current.filter((font) => font.id !== fontId);
      if (removed && fontFamily === `"${removed.family}"`) {
        setFontFamily(DEFAULT_SITE_FONT);
      }
      return next;
    });
  };

  const saveFontConfig = () => {
    onUpdateSiteConfig({
      fontFamily,
      customFonts
    });
  };

  const moveStoreSection = (sectionId: string, direction: 'up' | 'down') => {
    setStoreSections((prev) => {
      const ordered = [...(prev.length > 0 ? prev : getMergedStoreSections(siteConfig))].sort((a, b) => (a.order || 0) - (b.order || 0));
      const index = ordered.findIndex((section) => section.id === sectionId);
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) return prev;

      const next = [...ordered];
      const currentOrder = next[index].order;
      next[index] = { ...next[index], order: next[targetIndex].order };
      next[targetIndex] = { ...next[targetIndex], order: currentOrder };
      return next.sort((a, b) => (a.order || 0) - (b.order || 0));
    });
  };

  useLayoutEffect(() => {
    if (routeTab !== activeTab) {
      setActiveTab(routeTab);
    }
  }, [activeTab, routeTab]);

  useLayoutEffect(() => {
    if (!focusOrderId) return;
    setActiveTab('orders');
    setExpandedOrderId(focusOrderId);
    onFocusOrderHandled?.();
  }, [focusOrderId, onFocusOrderHandled]);

  useEffect(() => {
    let isCancelled = false;

    if (activeTab === 'notification-config' && user.role === UserRole.ADMIN) {
        api.getAllUsers()
          .then((users) => {
            if (!isCancelled) {
              setNotificationUsers(users);
            }
          })
          .catch((error) => {
            console.warn('Unable to load users for notification center.', error);
          });
    }
    if (activeTab === 'overview') {
        const fetchStats = async () => {
            setIsOverviewLoading(true);
            setOverviewError(null);
            try {
                const data = await api.getDailyStats();
                if (isCancelled) return;
                const formatted = (Array.isArray(data.dailyStats) ? data.dailyStats : []).map((s: {date: string, sales: number, orders: number}) => ({
                    name: new Date(s.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
                    sales: s.sales,
                    orders: s.orders
                }));
                setStats(formatted);
                setSummary({
                    totalSales: data.totalSales || 0,
                    totalOrders: data.totalOrders || 0,
                    totalUsers: data.totalUsers || 0
                });
                setTopProducts(Array.isArray(data.topProducts) ? data.topProducts : []);
            } catch (err) {
                if (!isCancelled) {
                  console.warn('Failed to fetch admin dashboard stats.', err);
                  setOverviewError(err instanceof Error ? err.message : "Impossible de charger le dashboard.");
                }
            } finally {
                if (!isCancelled) {
                  setIsOverviewLoading(false);
                }
            }
        };
        void fetchStats();
    }
    if (activeTab === 'seo') {
      const fetchSeoAnalytics = async () => {
        setIsSeoAnalyticsLoading(true);
        try {
          const analytics = await api.getSeoAnalytics();
          if (!isCancelled) {
            setSeoAnalytics(analytics);
          }
        } catch (err) {
          if (!isCancelled) {
            console.warn('Failed to fetch SEO analytics.', err);
          }
        } finally {
          if (!isCancelled) {
            setIsSeoAnalyticsLoading(false);
          }
        }
      };
      void fetchSeoAnalytics();
    }

    return () => {
      isCancelled = true;
    };
  }, [activeTab, overviewReloadNonce, user.role]);

  // Categories Handlers
  const handleCreateCategory = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!newCatName || !newCatSlug) {
          showAdminToast({
            type: 'error',
            title: 'Informations manquantes',
            message: 'Veuillez renseigner le nom de la catégorie.'
          });
          return;
      }
      try {
          await api.createCategory({ name: newCatName, slug: newCatSlug, icon: newCatIcon, imageUrl: newCatImage, gradient: newCatGradient, order: parseInt(newCatOrder, 10) || 0 });
          setNewCatName(''); setNewCatSlug(''); setNewCatImage(''); setNewCatOrder('0');
          onRefreshCategories();
          showAdminToast({
            type: 'success',
            title: 'Catégorie créée',
            message: 'La nouvelle catégorie est prête dans le catalogue.'
          });
      } catch {
          showAdminToast({
            type: 'error',
            title: 'Création impossible',
            message: "La catégorie n'a pas pu être créée. Vérifiez les champs puis réessayez."
          });
      }
  };

  const toggleCoverListing = (listingId: string) => {
    setCoverListingIds((current) => {
      if (current.includes(listingId)) return current.filter((id) => id !== listingId);
      return [...current, listingId].slice(0, 5);
    });
  };

  const handleDeleteCategory = async (id: string) => {
      setAdminConfirmation({
        title: 'Supprimer cette catégorie ?',
        message: 'Cette action supprimera aussi ses sous-catégories et ses produits associés.',
        confirmLabel: 'Supprimer',
        onConfirm: async () => {
          try {
              await api.deleteCategory(id);
              onRefreshCategories();
              showAdminToast({
                type: 'success',
                title: 'Catégorie supprimée',
                message: 'La catégorie a été retirée du catalogue.'
              });
          } catch {
              showAdminToast({
                type: 'error',
                title: 'Suppression impossible',
                message: "La catégorie n'a pas pu être supprimée."
              });
          }
        }
      });
  };

  const handleMoveCategory = async (categoryId: string, direction: 'up' | 'down') => {
      const ordered = [...categories].sort((a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name));
      const currentIndex = ordered.findIndex((category) => category.id === categoryId);
      const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

      if (currentIndex === -1 || nextIndex < 0 || nextIndex >= ordered.length) return;

      const reordered = [...ordered];
      const [movedCategory] = reordered.splice(currentIndex, 1);
      reordered.splice(nextIndex, 0, movedCategory);

      try {
          await Promise.all(reordered.map((category, index) => api.updateCategory(category.id, { order: index + 1 })));
          onRefreshCategories();
          showAdminToast({
            type: 'success',
            title: 'Ordre des catégories mis à jour',
            message: 'La nouvelle position sera appliquée dans le header, la home et les pages catégorie.'
          });
      } catch {
          showAdminToast({
            type: 'error',
            title: 'Réorganisation impossible',
            message: "L'ordre des catégories n'a pas pu être sauvegardé."
          });
      }
  };

  const startEditingSubCategory = (sub: SubCategory) => {
    setEditingSubCategory(sub);
    setEditSubName(sub.name);
    setEditSubSlug(sub.slug);
    setEditSubIcon(sub.icon || '');
    setEditSubDesc(sub.description || '');
    setEditSubOrder((sub.order || 0).toString());
    setEditSubCatId(sub.categoryId);
  };

  const handleUpdateSubCategory = async () => {
    if (!editingSubCategory) return;
    try {
        await api.updateSubCategory(editingSubCategory.id, {
            name: editSubName,
            slug: editSubSlug,
            icon: editSubIcon,
            description: editSubDesc,
            order: parseInt(editSubOrder),
            categoryId: editSubCatId
        });
        setEditingSubCategory(null);
        onRefreshCategories();
        showAdminToast({
          type: 'success',
          title: 'Sous-catégorie mise à jour',
          message: 'Les informations de la sous-catégorie ont été enregistrées.'
        });
    } catch (err) {
        console.error('Update subcat fail:', err);
        showAdminToast({
          type: 'error',
          title: 'Mise à jour impossible',
          message: 'Erreur lors de la mise à jour de la sous-catégorie.'
        });
    }
  };

  const handleCreateSubCategory = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!selectedCatForSub || !newSubCatName) {
          showAdminToast({
            type: 'error',
            title: 'Informations manquantes',
            message: 'Veuillez remplir le nom et sélectionner une catégorie parente.'
          });
          return;
      }
      try {
          await api.createSubCategory({ 
              name: newSubCatName, 
              slug: newSubCatSlug, 
              categoryId: selectedCatForSub,
              icon: newSubCatIcon,
              description: newSubCatDesc,
              order: parseInt(newSubCatOrder)
          });
          setNewSubCatName(''); setNewSubCatSlug(''); setNewSubCatDesc('');
          onRefreshCategories();
          showAdminToast({
            type: 'success',
            title: 'Sous-catégorie créée',
            message: 'La nouvelle sous-catégorie est disponible.'
          });
      } catch (err) {
          console.error('Create subcat fail:', err);
          showAdminToast({
            type: 'error',
            title: 'Création impossible',
            message: 'Erreur lors de la création de la sous-catégorie.'
          });
      }
  };

  const handleMoveSubCategory = async (categoryId: string, subCategoryId: string, direction: 'up' | 'down') => {
      const parentCategory = categories.find((category) => category.id === categoryId);
      const ordered = [...(parentCategory?.subCategories || [])].sort((a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name));
      const currentIndex = ordered.findIndex((subCategory) => subCategory.id === subCategoryId);
      const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

      if (currentIndex === -1 || nextIndex < 0 || nextIndex >= ordered.length) return;

      const reordered = [...ordered];
      const [movedSubCategory] = reordered.splice(currentIndex, 1);
      reordered.splice(nextIndex, 0, movedSubCategory);

      try {
          await Promise.all(reordered.map((subCategory, index) => api.updateSubCategory(subCategory.id, {
            name: subCategory.name,
            slug: subCategory.slug,
            icon: subCategory.icon || 'Package',
            description: subCategory.description || '',
            order: index + 1
          })));
          onRefreshCategories();
          showAdminToast({
            type: 'success',
            title: 'Ordre des sous-catégories mis à jour',
            message: 'La nouvelle position sera appliquée dans la page catégorie.'
          });
      } catch {
          showAdminToast({
            type: 'error',
            title: 'Réorganisation impossible',
            message: "L'ordre des sous-catégories n'a pas pu être sauvegardé."
          });
      }
  };

  const handleDeleteSubCategory = async (id: string) => {
      setAdminConfirmation({
        title: 'Supprimer cette sous-catégorie ?',
        message: 'Les produits liés peuvent être affectés par cette suppression.',
        confirmLabel: 'Supprimer',
        onConfirm: async () => {
          try {
              await api.deleteSubCategory(id);
              onRefreshCategories();
              showAdminToast({
                type: 'success',
                title: 'Sous-catégorie supprimée',
                message: 'La sous-catégorie a été retirée.'
              });
          } catch {
              showAdminToast({
                type: 'error',
                title: 'Suppression impossible',
                message: "La sous-catégorie n'a pas pu être supprimée."
              });
          }
        }
      });
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!editingCategory) return;
      try {
          await api.updateCategory(editingCategory.id, { 
              name: editCatName,
              slug: editCatSlug,
              icon: editCatIcon,
              imageUrl: editCatImage, 
              gradient: editCatGradient,
              order: parseInt(editCatOrder, 10) || 0
          });
          setEditingCategory(null);
          onRefreshCategories();
          showAdminToast({
            type: 'success',
            title: 'Catégorie mise à jour',
            message: 'La photo et les informations de la catégorie ont été enregistrées avec succès.'
          });
      } catch {
          showAdminToast({
            type: 'error',
            title: 'Mise à jour impossible',
            message: "La catégorie n'a pas pu être enregistrée. Vérifiez l'image ou réessayez."
          });
      }
  };

  const startEditingCategory = (cat: Category) => {
      setEditingCategory(cat);
      setEditCatName(cat.name);
      setEditCatSlug(cat.slug);
      setEditCatIcon(cat.icon);
      setEditCatImage(cat.imageUrl || '');
      setEditCatGradient(cat.gradient || GRADIENT_PRESETS[0].class);
      setEditCatOrder((cat.order || 0).toString());
  };

  // Product Key Management Helpers
  const addCredentialField = () => {
    setNewListingCredentials([...newListingCredentials, { username: '', password: '' }]);
  };

  const removeCredentialField = (index: number) => {
    setNewListingCredentials(newListingCredentials.filter((_, i) => i !== index));
  };

  const updateCredentialField = (index: number, field: 'username' | 'password', value: string) => {
    const updated = [...newListingCredentials];
    updated[index] = { ...updated[index], [field]: value };
    setNewListingCredentials(updated);
  };

  const togglePackageItem = (includedListingId: string) => {
    setNewListingPackageItems((prev) => {
      const exists = prev.some((item) => item.includedListingId === includedListingId);
      if (exists) {
        return prev.filter((item) => item.includedListingId !== includedListingId);
      }
      return [...prev, { includedListingId, quantity: 1 }];
    });
  };

  const updatePackageItemQuantity = (includedListingId: string, quantity: number) => {
    setNewListingPackageItems((prev) => prev.map((item) => (
      item.includedListingId === includedListingId
        ? { ...item, quantity: Math.max(1, Math.floor(quantity) || 1) }
        : item
    )));
  };

  const addListingVariant = () => {
    setNewListingVariants((prev) => [...prev, { name: '', price: 0, order: prev.length + 1 }]);
  };

  const updateListingVariant = (index: number, patch: Partial<ProductVariant>) => {
    setNewListingVariants((prev) => prev.map((variant, variantIndex) => (
      variantIndex === index ? { ...variant, ...patch } : variant
    )));
  };

  const removeListingVariant = (index: number) => {
    setNewListingVariants((prev) => prev.filter((_, variantIndex) => variantIndex !== index));
  };

  const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const getImageSize = (src: string) => new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("Impossible de lire les dimensions de l'image."));
    image.src = src;
  });

  const getVideoMeta = (src: string) => new Promise<{ width: number; height: number; duration: number }>((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      resolve({ width: video.videoWidth, height: video.videoHeight, duration: video.duration });
    };
    video.onerror = () => reject(new Error('Impossible de lire les informations de la vidéo.'));
    video.src = src;
  });

  const handleSlideMediaFile = async (slideId: string, file: File) => {
    try {
      setSlideMediaError('');
      const isImage = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type);
      const isVideo = ['video/mp4', 'video/webm'].includes(file.type);

      if (!isImage && !isVideo) {
        throw new Error('Format refusé. Utilisez JPG, PNG, WebP, GIF, MP4 ou WebM.');
      }

      const maxBytes = file.type === 'image/gif'
        ? SLIDE_MEDIA_RULES.gifMaxBytes
        : isVideo
          ? SLIDE_MEDIA_RULES.videoMaxBytes
          : SLIDE_MEDIA_RULES.imageMaxBytes;

      if (file.size > maxBytes) {
        throw new Error(`Fichier trop lourd. Maximum autorisé: ${formatBytes(maxBytes)}.`);
      }

      const objectUrl = URL.createObjectURL(file);
      const meta = isVideo ? await getVideoMeta(objectUrl) : await getImageSize(objectUrl);
      URL.revokeObjectURL(objectUrl);

      if (meta.width < SLIDE_MEDIA_RULES.minWidth || meta.height < SLIDE_MEDIA_RULES.minHeight) {
        throw new Error(`Dimensions insuffisantes. Minimum: ${SLIDE_MEDIA_RULES.minWidth} x ${SLIDE_MEDIA_RULES.minHeight}px.`);
      }

      const videoDuration = isVideo && 'duration' in meta ? Number(meta.duration) : 0;
      if (isVideo && Number.isFinite(videoDuration) && videoDuration > SLIDE_MEDIA_RULES.videoMaxDuration) {
        throw new Error(`Vidéo trop longue. Maximum: ${SLIDE_MEDIA_RULES.videoMaxDuration}s.`);
      }

      const mediaUrl = await readFileAsDataUrl(file);
      updateHeroSlide(slideId, { imageUrl: mediaUrl, mediaType: isVideo ? 'video' : 'image' });
    } catch (error) {
      setSlideMediaError(error instanceof Error ? error.message : 'Fichier média invalide.');
    }
  };

  const handleExportSiteData = async () => {
    try {
      setIsDataActionLoading(true);
      setDataActionError('');
      setDataActionStatus('');
      const blob = await api.exportSiteData();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tunibots-data-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setDataActionStatus('Export Excel généré.');
    } catch (error) {
      setDataActionError(error instanceof Error ? error.message : "Impossible d'exporter les données.");
    } finally {
      setIsDataActionLoading(false);
    }
  };

  const handleImportSiteData = async () => {
    if (!dataImportFile) {
      setDataActionError('Choisissez un fichier Excel avant import.');
      return;
    }

    try {
      setIsDataActionLoading(true);
      setDataActionError('');
      setDataActionStatus('');
      const fileBase64 = await readFileAsDataUrl(dataImportFile);
      const result = await api.importSiteData(fileBase64);
      setDataActionStatus(`Import terminé: ${result.categoriesImported} catégories, ${result.subCategoriesImported} sous-catégories, ${result.productsImported} produits.`);
    } catch (error) {
      setDataActionError(error instanceof Error ? error.message : "Impossible d'importer le fichier.");
    } finally {
      setIsDataActionLoading(false);
    }
  };

  const handleCleanSiteData = async () => {
    try {
      setIsDataActionLoading(true);
      setDataActionError('');
      setDataActionStatus('');
      const result = await api.cleanSiteData(cleanTarget, cleanConfirmation);
      setDataActionStatus(`Nettoyage ${result.table} terminé. Produits: ${result.before.products} -> ${result.after.products}, catégories: ${result.before.categories} -> ${result.after.categories}, commandes: ${result.before.orders} -> ${result.after.orders}.`);
      setCleanConfirmation('');
    } catch (error) {
      setDataActionError(error instanceof Error ? error.message : 'Nettoyage impossible.');
    } finally {
      setIsDataActionLoading(false);
    }
  };

  const resetListingForm = () => {
    setNewListingGame('');
    setNewListingTitle('');
    setNewListingPrice('');
    setNewListingDiscountType(DiscountType.NONE);
    setNewListingDiscount('0');
    setNewListingCatId('');
    setNewListingSubCatId('');
    setNewListingImageUrl('');
    setNewListingLogoUrl('');
    setNewListingGallery('');
    setNewListingIsInstant(true);
    setNewListingPrepTime('');
    setNewListingPlatform('');
    setNewListingRegion('Global');
    setNewListingActivationCountry('Tunisia');
    setNewListingSource('');
    setNewListingActivationGuideTitle('Activation Guide');
    setNewListingActivationGuideContent('');
    setNewListingRestrictionsTitle('Check Restrictions');
    setNewListingRestrictionsContent('');
    setNewListingRegionTitle('Region');
    setNewListingRegionContent('');
    setNewListingSystemRequirementsEnabled(false);
    setNewListingSystemRequirementsPlatform('Windows');
    setNewListingMinimumOs('');
    setNewListingMinimumMemory('');
    setNewListingMinimumStorage('');
    setNewListingMinimumProcessor('');
    setNewListingMinimumGraphics('');
    setNewListingRecommendedOs('');
    setNewListingRecommendedMemory('');
    setNewListingRecommendedStorage('');
    setNewListingRecommendedProcessor('');
    setNewListingRecommendedGraphics('');
    setNewListingMetaTitle('');
    setNewListingMetaDesc('');
    setNewListingKeywords('');
    setGeneratedDescription('');
    setNewListingProductType(ProductType.STANDARD);
    setNewListingCredentials([]);
    setNewListingStaticKey('');
    setNewListingIsPackage(false);
    setNewListingPackageItems([]);
    setNewListingVariantLabel('');
    setNewListingVariants([]);
    setEditingListing(null);
  };

  const startEditingListing = (listing: Listing) => {
    setEditingListing(listing);
    setNewListingGame(listing.game || '');
    setNewListingTitle(listing.title);
    setNewListingPrice(listing.price.toString());
    setNewListingDiscountType(listing.discountType || ((listing.discountPercent || 0) > 0 ? DiscountType.PERCENT : DiscountType.NONE));
    setNewListingDiscount(((listing.discountValue ?? listing.discountPercent) || 0).toString());
    setNewListingCatId(listing.categoryId);
    setNewListingSubCatId(listing.subCategoryId || '');
    setNewListingImageUrl(listing.imageUrl || '');
    setNewListingLogoUrl(listing.logoUrl || '');
    setNewListingGallery(Array.isArray(listing.gallery) ? listing.gallery.join(', ') : '');
    setNewListingIsInstant(listing.isInstant);
    setNewListingPrepTime(listing.preparationTime || '');
    setNewListingPlatform(listing.platform || '');
    setNewListingRegion(listing.region || 'Global');
    setNewListingActivationCountry(listing.activationCountry || 'Tunisia');
    setNewListingSource(listing.source || '');
    setNewListingActivationGuideTitle(listing.activationGuideTitle || 'Activation Guide');
    setNewListingActivationGuideContent(listing.activationGuideContent || '');
    setNewListingRestrictionsTitle(listing.restrictionsTitle || 'Check Restrictions');
    setNewListingRestrictionsContent(listing.restrictionsContent || '');
    setNewListingRegionTitle(listing.regionTitle || 'Region');
    setNewListingRegionContent(listing.regionContent || '');
    setNewListingSystemRequirementsEnabled(Boolean(listing.systemRequirementsEnabled));
    setNewListingSystemRequirementsPlatform(listing.systemRequirementsPlatform || 'Windows');
    setNewListingMinimumOs(listing.minimumOs || '');
    setNewListingMinimumMemory(listing.minimumMemory || '');
    setNewListingMinimumStorage(listing.minimumStorage || '');
    setNewListingMinimumProcessor(listing.minimumProcessor || '');
    setNewListingMinimumGraphics(listing.minimumGraphics || '');
    setNewListingRecommendedOs(listing.recommendedOs || '');
    setNewListingRecommendedMemory(listing.recommendedMemory || '');
    setNewListingRecommendedStorage(listing.recommendedStorage || '');
    setNewListingRecommendedProcessor(listing.recommendedProcessor || '');
    setNewListingRecommendedGraphics(listing.recommendedGraphics || '');
    setNewListingMetaTitle(listing.metaTitle || '');
    setNewListingMetaDesc(listing.metaDesc || '');
    setNewListingKeywords(listing.keywords || '');
    setGeneratedDescription(listing.description);
    setNewListingProductType(listing.productType || ProductType.STANDARD);
    setNewListingCredentials(
      Array.isArray(listing.credentials)
        ? listing.credentials.map((cred) => ({ username: cred.username, password: cred.password || '' }))
        : []
    );
    setNewListingStaticKey(listing.staticKey || '');
    setNewListingIsPackage(Boolean(listing.isPackage));
    setNewListingVariantLabel(listing.variantLabel || '');
    setNewListingPackageItems(
      Array.isArray(listing.packageItems)
        ? listing.packageItems.map((item) => ({
            includedListingId: item.includedListingId,
            quantity: item.quantity
          }))
        : []
    );
    setNewListingVariants(
      Array.isArray(listing.variants)
        ? listing.variants.map((variant, index) => ({
            id: variant.id,
            listingId: variant.listingId,
            name: variant.name,
            price: Number(variant.price),
            order: variant.order ?? index + 1
          }))
        : []
    );
    requestAdminTab('create');
  };

  // Listing Handlers
  const handleGenerateDescription = async () => {
    setIsGenerating(true);
    const desc = await generateListingDescription(newListingGame, "Produit", "High quality, fast delivery");
    setGeneratedDescription(sanitizeRichText(desc));
    setIsGenerating(false);
  };

  const handleSubmitListing = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDescription = sanitizeRichText(generatedDescription);
    if (!richTextToPlainText(cleanDescription)) {
      showAdminToast({
        type: 'error',
        title: 'Description requise',
        message: 'Ajoutez une description produit avant de continuer.'
      });
      return;
    }
    if (newListingIsPackage && newListingPackageItems.length === 0) {
      showAdminToast({
        type: 'error',
        title: 'Package incomplet',
        message: 'Ajoutez au moins un produit au package.'
      });
      return;
    }
    if (!newListingIsPackage && !newListingImageUrl.trim()) {
      showAdminToast({
        type: 'error',
        title: 'Image requise',
        message: 'Ajoutez une image principale pour les produits simples.'
      });
      return;
    }
    const cleanVariants = newListingVariants
      .map((variant, index) => ({
        name: variant.name.trim(),
        price: Number(variant.price),
        order: variant.order || index + 1
      }))
      .filter((variant) => variant.name && Number.isFinite(variant.price) && variant.price >= 0);
    const galleryArray = newListingGallery.split(',').map(s => s.trim()).filter(s => s.length > 0);
    
    const credentials: LoginCredential[] = newListingCredentials.map(c => ({
        id: Math.random().toString(36).substr(2, 9),
        username: c.username,
        password: c.password,
        isUsed: false,
        createdAt: new Date().toISOString()
    }));

    const listingPayload: Partial<Listing> = {
        game: newListingGame,
        title: newListingTitle,
        categoryId: newListingCatId,
        subCategoryId: newListingSubCatId || undefined,
        description: cleanDescription,
        price: parseFloat(newListingPrice),
        isPackage: newListingIsPackage,
        discountType: newListingDiscountType,
        discountValue: newListingDiscountType === DiscountType.NONE ? 0 : parseFloat(newListingDiscount) || 0,
        discountPercent: newListingDiscountType === DiscountType.PERCENT ? parseInt(newListingDiscount, 10) || 0 : 0,
        imageUrl: newListingImageUrl.trim(),
        logoUrl: newListingLogoUrl,
        cardTemplate: 'default',
        gallery: galleryArray,
        stock: newListingIsPackage ? 0 : (newListingProductType === ProductType.LOGIN_CREDENTIALS ? credentials.length : (newListingProductType === ProductType.KEY ? 999 : 1)),
        deliveryTimeHours: 24,
        isInstant: newListingIsInstant,
        preparationTime: newListingIsInstant ? 'Immédiat' : newListingPrepTime,
        platform: newListingPlatform,
        region: newListingRegion,
        source: user.role === UserRole.ADMIN ? newListingSource.trim() || undefined : undefined,
        activationCountry: newListingActivationCountry,
        activationGuideTitle: newListingActivationGuideTitle,
        activationGuideContent: sanitizeRichText(newListingActivationGuideContent),
        restrictionsTitle: newListingRestrictionsTitle,
        restrictionsContent: sanitizeRichText(newListingRestrictionsContent),
        regionTitle: newListingRegionTitle,
        regionContent: sanitizeRichText(newListingRegionContent),
        systemRequirementsEnabled: newListingSystemRequirementsEnabled,
        systemRequirementsPlatform: newListingSystemRequirementsPlatform,
        minimumOs: newListingMinimumOs,
        minimumMemory: newListingMinimumMemory,
        minimumStorage: newListingMinimumStorage,
        minimumProcessor: newListingMinimumProcessor,
        minimumGraphics: newListingMinimumGraphics,
        recommendedOs: newListingRecommendedOs,
        recommendedMemory: newListingRecommendedMemory,
        recommendedStorage: newListingRecommendedStorage,
        recommendedProcessor: newListingRecommendedProcessor,
        recommendedGraphics: newListingRecommendedGraphics,
        metaTitle: newListingMetaTitle,
        metaDesc: newListingMetaDesc,
        keywords: newListingKeywords,
        productType: newListingIsPackage ? ProductType.STANDARD : newListingProductType,
        credentials: !newListingIsPackage && newListingProductType === ProductType.LOGIN_CREDENTIALS ? credentials : [],
        staticKey: !newListingIsPackage && newListingProductType === ProductType.KEY ? newListingStaticKey : undefined,
        packageItems: newListingIsPackage ? newListingPackageItems : [],
        variantLabel: !newListingIsPackage && cleanVariants.length > 0 ? (newListingVariantLabel.trim() || 'Variante') : undefined,
        variants: newListingIsPackage ? [] : cleanVariants,
    };

    if (editingListing) {
      await onUpdateListing(editingListing.id, listingPayload);
    } else {
      await onCreateListing(listingPayload);
    }

    resetListingForm();
    requestAdminTab('listings');
  };

  const handleDeleteListingClick = (listing: Listing) => {
    setListingPendingDelete(listing);
  };

  const confirmDeleteListing = async () => {
    if (!listingPendingDelete) return;
    try {
      setIsDeletingListing(true);
      await onDeleteListing(listingPendingDelete.id);
      setListingPendingDelete(null);
    } finally {
      setIsDeletingListing(false);
    }
  };

  const selectedCategoryObj = categories.find(c => c.id === newListingCatId);
  const orderedCategories = [...categories].sort((a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name));
  const availablePackageListings = listings.filter((listing) => !listing.isArchived && !listing.isPackage && listing.id !== editingListing?.id);
  const selectedPackageListings = newListingPackageItems
    .map((item) => {
      const includedListing = listings.find((listing) => listing.id === item.includedListingId);
      return includedListing ? { ...item, includedListing } : null;
    })
    .filter((item): item is { includedListingId: string; quantity: number; includedListing: Listing } => Boolean(item));
  const packageOriginalTotal = getPackageOriginalTotal({
    packageItems: selectedPackageListings.map((item, index) => ({
      id: `${item.includedListingId}-${index}`,
      packageListingId: editingListing?.id || 'draft-package',
      includedListingId: item.includedListingId,
      quantity: item.quantity,
      includedListing: item.includedListing
    }))
  });
  const draftPackagePrice = parseFloat(newListingPrice) || 0;
  const packageSavings = Math.max(0, packageOriginalTotal - draftPackagePrice);
  const selectedCategoryName = categories.find((category) => category.id === newListingCatId)?.name || 'Non classé';
  const shouldShowOverviewBootLoader =
    activeTab === 'overview' &&
    isOverviewLoading &&
    stats.length === 0 &&
    topProducts.length === 0 &&
    summary.totalSales === 0 &&
    summary.totalOrders === 0 &&
    summary.totalUsers === 0;
  const draftListingPreview = {
    title: newListingTitle.trim() || 'Produit en brouillon',
    subtitle: newListingGame.trim() || 'Marketplace digitale',
    imageUrl: newListingImageUrl.trim(),
    price: parseFloat(newListingPrice) || 0,
    discountType: newListingDiscountType,
    discountValue: parseFloat(newListingDiscount) || 0,
    isInstant: newListingIsInstant,
    isPackage: newListingIsPackage
  };
  const draftProductSlug = slugifyProductPreview(newListingTitle) || (editingListing?.slug || 'product');

  const openDraftPreview = () => {
    document.getElementById('listing-live-preview')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const requestOrderStatusChange = (orderId: string, currentStatus: OrderStatus, nextStatus: OrderStatus) => {
    if (currentStatus === nextStatus) return;
    setAdminConfirmation({
      title: 'Modifier le statut de cette commande ?',
      message: `Le statut passera de "${ORDER_STATUS_LABELS[currentStatus] || currentStatus}" à "${ORDER_STATUS_LABELS[nextStatus] || nextStatus}".`,
      confirmLabel: 'Confirmer le statut',
      onConfirm: () => onUpdateStatus(orderId, nextStatus)
    });
  };

  return (
    <>
    {adminToast && (
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm animate-in fade-in duration-200">
        <div className={`w-full max-w-md overflow-hidden rounded-3xl border bg-white shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-3 duration-300 ${
          adminToast.type === 'success' ? 'border-emerald-100' : 'border-red-100'
        }`}>
          <div className={`h-1.5 ${adminToast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} />
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
                adminToast.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
              }`}>
                {adminToast.type === 'success' ? <LucideIcons.CheckCircle2 size={28} className="animate-[notification-check_450ms_ease-out]" /> : <LucideIcons.AlertCircle size={28} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-lg font-black text-slate-900">{adminToast.title}</div>
                <div className="mt-1 text-sm leading-6 text-slate-600">{adminToast.message}</div>
              </div>
              {adminToast.type === 'error' && (
                <button
                  type="button"
                  onClick={() => setAdminToast(null)}
                  className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Fermer la notification"
                >
                  <LucideIcons.X size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )}
    {adminConfirmation && (
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="w-full max-w-md overflow-hidden rounded-3xl border border-amber-100 bg-white shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-3 duration-300">
          <div className="h-1.5 bg-amber-500" />
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                <LucideIcons.AlertTriangle size={28} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-lg font-black text-slate-900">{adminConfirmation.title}</div>
                <div className="mt-1 text-sm leading-6 text-slate-600">{adminConfirmation.message}</div>
              </div>
              <button
                type="button"
                onClick={() => setAdminConfirmation(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Fermer la confirmation"
              >
                <LucideIcons.X size={18} />
              </button>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setAdminConfirmation(null)}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={async () => {
                  const action = adminConfirmation.onConfirm;
                  setAdminConfirmation(null);
                  await action();
                }}
                className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700"
              >
                {adminConfirmation.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
      <div className="space-y-6 pb-12">
        {isOverviewLoading && activeTab === 'overview' && !shouldShowOverviewBootLoader && (
            <div className="sticky top-0 z-20 flex justify-end">
                <div className="inline-flex items-center gap-3 rounded-2xl border border-indigo-100 bg-white/95 px-4 py-3 text-sm font-semibold text-slate-700 shadow-lg backdrop-blur">
                    <Loader2 size={18} className="animate-spin text-indigo-600" />
                    Actualisation du dashboard...
                </div>
            </div>
        )}
        {shouldShowOverviewBootLoader && (
          <AdminPremiumLoader
            siteName={siteConfig.siteName}
            logoUrl={siteConfig.logoUrl}
            title="Admin dashboard"
            compact
            showSkeleton
          />
        )}
        {activeTab === 'overview' && overviewError && !isOverviewLoading && (
          <AdminErrorState
            title="Le dashboard n’a pas pu se synchroniser"
            message={overviewError}
            onRetry={() => setOverviewReloadNonce((current) => current + 1)}
            onBack={() => navigateTo('admin-dashboard')}
          />
        )}
         {activeTab === 'data' && user.role === UserRole.ADMIN && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Gestion des données</h2>
              <p className="mt-1 text-sm text-slate-500">Exporter, importer ou nettoyer les données principales du site.</p>
            </div>

            {(dataActionStatus || dataActionError) && (
              <div className={`rounded-xl border px-4 py-3 text-sm font-bold ${dataActionError ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                {dataActionError || dataActionStatus}
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600"><LucideIcons.Download size={22} /></div>
                  <div>
                    <h3 className="font-black text-slate-900">Exporter Excel</h3>
                    <p className="text-sm text-slate-500">Produits, catégories et sous-catégories.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleExportSiteData}
                  disabled={isDataActionLoading}
                  className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Exporter .xlsx
                </button>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600"><LucideIcons.Upload size={22} /></div>
                  <div>
                    <h3 className="font-black text-slate-900">Importer Excel</h3>
                    <p className="text-sm text-slate-500">Format identique à l’export.</p>
                  </div>
                </div>
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={(event) => setDataImportFile(event.target.files?.[0] || null)}
                  className="mb-4 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={handleImportSiteData}
                  disabled={isDataActionLoading}
                  className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Importer le fichier
                </button>
              </section>

              <section className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-xl bg-white p-3 text-red-600"><LucideIcons.Trash2 size={22} /></div>
                  <div>
                    <h3 className="font-black text-red-900">Nettoyage base</h3>
                    <p className="text-sm text-red-700">Action irréversible après confirmation.</p>
                  </div>
                </div>
                <select
                  value={cleanTarget}
                  onChange={(event) => setCleanTarget(event.target.value)}
                  className="mb-3 w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="products">Clean produits</option>
                  <option value="categories">Clean catégories + produits</option>
                  <option value="orders">Clean commandes</option>
                  <option value="users">Clean utilisateurs non-admin</option>
                  <option value="all">Clean all data</option>
                </select>
                <input
                  type="text"
                  value={cleanConfirmation}
                  onChange={(event) => setCleanConfirmation(event.target.value)}
                  placeholder="Tapez CONFIRM CLEAN"
                  className="mb-4 w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={handleCleanSiteData}
                  disabled={isDataActionLoading || cleanConfirmation !== 'CONFIRM CLEAN'}
                  className="w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Exécuter nettoyage
                </button>
              </section>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
              <div className="font-bold text-slate-900">Notes de sécurité</div>
              <p className="mt-2">`Clean all` conserve les comptes admin/staff et la configuration du site. Les exports contiennent les identifiants techniques, ce qui permet de modifier puis réimporter les mêmes lignes.</p>
            </div>
          </div>
        )}

        {activeTab === 'store-config' && user.role === UserRole.ADMIN && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                      <LucideIcons.Store size={24} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">Store config</h2>
                      <p className="mt-1 text-sm text-slate-500">Active ou désactive les sections visibles dans la home du store.</p>
                    </div>
                  </div>
                  <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm leading-6 text-indigo-900">
                    Cette page devient le centre de contrôle du visuel store. Chaque section possède un ID stable, un ordre et un état de visibilité, donc les prochaines sections comme Top Products ou Gift Cards peuvent être pilotées ici.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const normalizedSections = getMergedStoreSections({ storeSections }).map((section) => ({
                      id: section.id,
                      enabled: section.enabled,
                      order: section.order
                    }));
                    setStoreSections(normalizedSections);
                    onUpdateSiteConfig({ storeSections: normalizedSections });
                    showAdminToast({
                      type: 'success',
                      title: 'Store config sauvegardée',
                      message: 'La visibilité des sections du store a été mise à jour.'
                    });
                  }}
                  className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700"
                >
                  <LucideIcons.Save size={18} className="mr-2" />
                  Sauvegarder
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {[...storeSections].sort((a, b) => (a.order || 0) - (b.order || 0)).map((section, index, orderedSections) => {
                const definition = STORE_SECTION_DEFINITIONS.find((item) => item.id === section.id);
                const label = definition?.label || section.id;
                const description = definition?.description || 'Section personnalisée du store.';
                const icon = definition?.icon || 'PanelTop';
                const isEnabled = section.enabled;

                return (
                  <div key={section.id} className={`rounded-2xl border bg-white p-5 shadow-sm transition-all ${isEnabled ? 'border-slate-200' : 'border-slate-200 opacity-70'}`}>
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${isEnabled ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>
                          <DynamicIcon name={icon} className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-black text-slate-900">{label}</h3>
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500">{section.id}</span>
                            {definition?.phase === 'ready' && (
                              <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-amber-700">prêt extension</span>
                            )}
                          </div>
                          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 md:justify-end">
                        <button
                          type="button"
                          onClick={() => moveStoreSection(section.id, 'up')}
                          disabled={index === 0}
                          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-indigo-200 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-30"
                          title="Monter la section"
                        >
                          <LucideIcons.ChevronUp size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveStoreSection(section.id, 'down')}
                          disabled={index === orderedSections.length - 1}
                          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-indigo-200 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-30"
                          title="Descendre la section"
                        >
                          <LucideIcons.ChevronDown size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStoreSection(section.id, { enabled: !isEnabled })}
                          className={`relative h-8 w-14 rounded-full transition ${isEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                          aria-label={isEnabled ? `Désactiver ${label}` : `Activer ${label}`}
                        >
                          <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${isEnabled ? 'left-7' : 'left-1'}`} />
                        </button>
                        <span className={`w-16 text-xs font-black uppercase tracking-wider ${isEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {isEnabled ? 'Visible' : 'Off'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'email-config' && user.role === UserRole.ADMIN && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-indigo-700">
                    <LucideIcons.Mail size={14} />
                    Email config
                  </div>
                  <h2 className="mt-4 text-2xl font-black text-slate-900">Gestion mailing TuniBots</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    Configurez le SMTP, testez l'envoi et gardez une vue claire sur les templates utilisés par la plateforme.
                  </p>
                </div>
                <div className={`rounded-2xl border px-4 py-3 text-sm font-bold ${smtpHost && smtpPort && smtpEmailId ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                  {smtpHost && smtpPort && smtpEmailId ? 'SMTP configuré' : 'SMTP incomplet'}
                </div>
              </div>
            </div>

            <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-6 py-4">
                  <h3 className="text-lg font-black text-slate-900">SMTP</h3>
                  <p className="mt-1 text-sm text-slate-500">Ces paramètres sont utilisés pour les OTP, les factures et les emails système.</p>
                </div>
                <div className="grid gap-5 p-6 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Nom expéditeur</label>
                    <input className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-4 py-3 outline-none focus:border-indigo-500" value={smtpMailerName} onChange={(e) => setSmtpMailerName(e.target.value)} placeholder="TuniBots Support" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Email expéditeur</label>
                    <input type="email" className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-4 py-3 outline-none focus:border-indigo-500" value={smtpEmailId} onChange={(e) => setSmtpEmailId(e.target.value)} placeholder="support@tunibots.com" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Hôte SMTP</label>
                    <input className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-4 py-3 outline-none focus:border-indigo-500" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.gmail.com" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Port</label>
                      <input className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-4 py-3 outline-none focus:border-indigo-500" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} placeholder="587" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Cryptage</label>
                      <select className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-4 py-3 outline-none focus:border-indigo-500" value={smtpEncryption || 'tls'} onChange={(e) => setSmtpEncryption(e.target.value)}>
                        <option value="tls">TLS</option>
                        <option value="ssl">SSL</option>
                        <option value="none">Aucun</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Utilisateur SMTP</label>
                    <input className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-4 py-3 outline-none focus:border-indigo-500" value={smtpUsername} onChange={(e) => setSmtpUsername(e.target.value)} placeholder="souvent identique à l'email" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Mot de passe / App password</label>
                    <input type="password" className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-4 py-3 outline-none focus:border-indigo-500" value={smtpPassword} onChange={(e) => setSmtpPassword(e.target.value)} placeholder="••••••••••••" />
                  </div>
                </div>
                <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-5 sm:flex-row sm:justify-end">
                  <button type="button" onClick={saveEmailConfig} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">
                    Sauvegarder SMTP
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-6 py-4">
                  <h3 className="text-lg font-black text-slate-900">Test d'envoi</h3>
                  <p className="mt-1 text-sm text-slate-500">Sauvegarde la config puis envoie un email de test.</p>
                </div>
                <div className="space-y-4 p-6">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Email destinataire</label>
                    <input type="email" className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-4 py-3 outline-none focus:border-indigo-500" value={testEmailTo} onChange={(e) => setTestEmailTo(e.target.value)} placeholder="votre@email.com" />
                  </div>
                  {emailTestState && (
                    <div className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${emailTestState.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
                      {emailTestState.message}
                    </div>
                  )}
                  <button type="button" onClick={handleTestEmail} disabled={isTestingEmail} className="flex w-full items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-indigo-600 disabled:opacity-60">
                    {isTestingEmail ? <Loader2 size={18} className="mr-2 animate-spin" /> : <LucideIcons.Send size={18} className="mr-2" />}
                    Tester l'envoi
                  </button>
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800">
                    Si vous ne recevez rien, vérifiez l'hôte, le port, le cryptage et utilisez un mot de passe d'application pour Gmail/Outlook.
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Templates email éditables</h3>
                    <p className="mt-1 text-sm text-slate-500">Modifiez le sujet et le HTML utilisés lors des envois réels.</p>
                  </div>
                  <button type="button" onClick={resetSelectedEmailTemplate} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-600 hover:bg-slate-50">
                    Réinitialiser ce template
                  </button>
                </div>
              </div>
              <div className="grid gap-6 p-6 xl:grid-cols-[280px_1fr]">
                <div className="space-y-3">
                  {Object.entries(DEFAULT_EMAIL_TEMPLATES).map(([key, template]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedEmailTemplate(key)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${selectedEmailTemplate === key ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'}`}
                    >
                      <div className="text-xs font-black uppercase tracking-[0.16em]">{template.label}</div>
                      <div className="mt-2 text-xs leading-5 opacity-80">
                        {key === 'registrationOtp' && 'Création de compte client'}
                        {key === 'orderInvoice' && 'Validation du paiement panier'}
                        {key === 'testEmail' && "Bouton tester l'envoi"}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Sujet</label>
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-4 py-3 outline-none focus:border-indigo-500"
                      value={emailTemplates[selectedEmailTemplate]?.subject || ''}
                      onChange={(e) => updateSelectedEmailTemplate({ subject: e.target.value })}
                    />
                  </div>
                  <div>
                    <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Contenu du template</label>
                      <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                        <button
                          type="button"
                          onClick={() => setEmailTemplateEditMode('visual')}
                          className={`rounded-lg px-3 py-1.5 text-xs font-black ${emailTemplateEditMode === 'visual' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}
                        >
                          Visuel
                        </button>
                        <button
                          type="button"
                          onClick={() => setEmailTemplateEditMode('html')}
                          className={`rounded-lg px-3 py-1.5 text-xs font-black ${emailTemplateEditMode === 'html' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}
                        >
                          HTML avancé
                        </button>
                      </div>
                    </div>
                    {emailTemplateEditMode === 'visual' ? (
                      <RichTextEditor
                        label=""
                        value={emailTemplates[selectedEmailTemplate]?.html || ''}
                        onChange={(value) => updateSelectedEmailTemplate({ html: value })}
                      />
                    ) : (
                      <textarea
                        className="min-h-[320px] w-full rounded-xl border border-slate-200 bg-slate-950 px-4 py-3 font-mono text-xs leading-5 text-slate-100 outline-none focus:border-indigo-500"
                        value={emailTemplates[selectedEmailTemplate]?.html || ''}
                        onChange={(e) => updateSelectedEmailTemplate({ html: e.target.value })}
                      />
                    )}
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Variables disponibles</div>
                    <div className="flex flex-wrap gap-2">
                      {DEFAULT_EMAIL_TEMPLATES[selectedEmailTemplate]?.variables.length ? DEFAULT_EMAIL_TEMPLATES[selectedEmailTemplate].variables.map((variable) => (
                        <button
                          key={variable}
                          type="button"
                          onClick={() => insertEmailVariable(variable)}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs font-bold text-slate-600 hover:border-indigo-300 hover:text-indigo-700"
                        >
                          + {`{{${variable}}}`}
                        </button>
                      )) : (
                        <span className="text-sm text-slate-500">Aucune variable requise pour ce template.</span>
                      )}
                    </div>
                    <div className="mt-3 text-xs leading-5 text-slate-500">
                      Cliquez sur une variable pour l'ajouter au contenu. Les variables seront remplacées automatiquement à l'envoi.
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Aperçu avec données exemple</div>
                    <div
                      className="email-preview max-h-[360px] overflow-auto rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm leading-6 text-slate-700"
                      dangerouslySetInnerHTML={{ __html: sanitizeRichText(getEmailTemplatePreview()) }}
                    />
                  </div>
                  <div className="flex justify-end">
                    <button type="button" onClick={saveEmailConfig} className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-black text-white hover:bg-indigo-700">
                      Sauvegarder les templates
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notification-config' && user.role === UserRole.ADMIN && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-amber-700">
                    <LucideIcons.BellRing size={14} />
                    Notifications commandes
                  </div>
                  <h2 className="mt-4 text-2xl font-black text-slate-900">Alertes nouvelles commandes</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    Activez les notifications dashboard, le son, et les bots externes pour recevoir chaque commande à traiter.
                  </p>
                </div>
                <button type="button" onClick={saveNotificationConfig} className="rounded-xl bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-indigo-600">
                  Sauvegarder
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setNotificationAdminTab('orders')}
                className={`rounded-full px-5 py-2 text-sm font-black ${notificationAdminTab === 'orders' ? 'bg-slate-950 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}
              >
                Commandes
              </button>
              <button
                type="button"
                onClick={() => setNotificationAdminTab('client')}
                className={`rounded-full px-5 py-2 text-sm font-black ${notificationAdminTab === 'client' ? 'bg-indigo-600 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}
              >
                Notification client
              </button>
            </div>

            {notificationAdminTab === 'orders' && (
              <div className="grid gap-6 xl:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-black text-slate-900">Dashboard admin</h3>
                  <p className="mt-1 text-sm text-slate-500">Notification interne dès qu'une nouvelle commande arrive.</p>
                  <div className="mt-6 space-y-4">
                    <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <span className="font-bold text-slate-800">Activer les notifications dashboard</span>
                      <input type="checkbox" className="h-5 w-5 accent-indigo-600" checked={adminNotificationsEnabled} onChange={(e) => setAdminNotificationsEnabled(e.target.checked)} />
                    </label>
                    <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <span className="font-bold text-slate-800">Notification sonore</span>
                      <input type="checkbox" className="h-5 w-5 accent-indigo-600" checked={adminNotificationSound} onChange={(e) => setAdminNotificationSound(e.target.checked)} />
                    </label>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Fréquence de vérification</label>
                      <input type="number" min={5} max={120} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3" value={adminNotificationPollSeconds} onChange={(e) => setAdminNotificationPollSeconds(Number(e.target.value))} />
                      <p className="mt-2 text-xs text-slate-500">Minimum conseillé: 5 secondes.</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-black text-slate-900">Telegram bot</h3>
                  <p className="mt-1 text-sm text-slate-500">Utilise l'API Telegram officielle via bot token + chat id.</p>
                  <div className="mt-6 space-y-4">
                    <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <span className="font-bold text-slate-800">Activer Telegram</span>
                      <input type="checkbox" className="h-5 w-5 accent-indigo-600" checked={telegramNotificationsEnabled} onChange={(e) => setTelegramNotificationsEnabled(e.target.checked)} />
                    </label>
                    <input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3" value={telegramBotToken} onChange={(e) => setTelegramBotToken(e.target.value)} placeholder="Bot token" />
                    <input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3" value={telegramChatId} onChange={(e) => setTelegramChatId(e.target.value)} placeholder="Chat ID" />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-black text-slate-900">WhatsApp bot</h3>
                  <p className="mt-1 text-sm text-slate-500">Votre bot doit exposer un webhook qui accepte un JSON.</p>
                  <div className="mt-6 space-y-4">
                    <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <span className="font-bold text-slate-800">Activer WhatsApp</span>
                      <input type="checkbox" className="h-5 w-5 accent-indigo-600" checked={whatsappNotificationsEnabled} onChange={(e) => setWhatsappNotificationsEnabled(e.target.checked)} />
                    </label>
                    <input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3" value={whatsappNotificationWebhookUrl} onChange={(e) => setWhatsappNotificationWebhookUrl(e.target.value)} placeholder="https://votre-bot/webhook/order" />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-black text-slate-900">Messenger bot</h3>
                  <p className="mt-1 text-sm text-slate-500">Votre bot Messenger doit exposer un webhook qui accepte un JSON.</p>
                  <div className="mt-6 space-y-4">
                    <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <span className="font-bold text-slate-800">Activer Messenger</span>
                      <input type="checkbox" className="h-5 w-5 accent-indigo-600" checked={messengerNotificationsEnabled} onChange={(e) => setMessengerNotificationsEnabled(e.target.checked)} />
                    </label>
                    <input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3" value={messengerNotificationWebhookUrl} onChange={(e) => setMessengerNotificationWebhookUrl(e.target.value)} placeholder="https://votre-bot/webhook/order" />
                  </div>
                </div>
              </div>
            )}

            {notificationAdminTab === 'client' && (
              <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-black text-slate-900">Envoyer une notification client</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Diffusez les dernières informations, nouveautés ou alertes directement dans l espace notification des clients.
                  </p>
                  <div className="mt-6 space-y-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Titre</label>
                      <input
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                        value={clientNotificationTitle}
                        onChange={(e) => setClientNotificationTitle(e.target.value)}
                        placeholder="Ex: Nouvelle mise a jour du service"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Message</label>
                      <textarea
                        className="min-h-[180px] w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                        value={clientNotificationMessage}
                        onChange={(e) => setClientNotificationMessage(e.target.value)}
                        placeholder="Ecrivez ici les dernières informations que vos clients doivent voir."
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Audience</label>
                        <select
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                          value={clientNotificationTargetMode}
                          onChange={(e) => setClientNotificationTargetMode(e.target.value as 'all' | 'selected')}
                        >
                          <option value="all">Tous les clients</option>
                          <option value="selected">Client specifique</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Destinataire</label>
                        <select
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 disabled:opacity-60"
                          value={clientNotificationTargetUserId}
                          onChange={(e) => setClientNotificationTargetUserId(e.target.value)}
                          disabled={clientNotificationTargetMode !== 'selected'}
                        >
                          <option value="">Selectionner un client</option>
                          {notificationUsers.filter((account) => account.role === UserRole.CLIENT).map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.fullName || account.username} - {account.email}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleSendClientNotification}
                        disabled={isSendingClientNotification}
                        className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-60"
                      >
                        {isSendingClientNotification ? 'Envoi en cours...' : 'Envoyer aux clients'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="text-lg font-black text-slate-900">Aperçu client</h3>
                    <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-black text-slate-900">{clientNotificationTitle || 'Titre de notification'}</div>
                          <div className="mt-1 text-sm leading-6 text-slate-600">{clientNotificationMessage || 'Le message saisi apparaitra ici dans l espace client.'}</div>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase text-indigo-700">Nouveau</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="text-lg font-black text-slate-900">Portee de l envoi</h3>
                    <div className="mt-4 space-y-3">
                      <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        {clientNotificationTargetMode === 'all'
                          ? `${notificationUsers.filter((account) => account.role === UserRole.CLIENT).length} clients recevront cette notification.`
                          : clientNotificationTargetUserId
                            ? '1 client recevra cette notification.'
                            : 'Selectionnez un client pour finaliser cet envoi.'}
                      </div>
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800">
                        Utilisez cet onglet pour partager vos dernières updates, informations importantes, maintenance, promos ou changements de delai.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'seo' && user.role === UserRole.ADMIN && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                    <LucideIcons.SearchCheck size={14} />
                    SEO & marketing
                  </div>
                  <h2 className="mt-4 text-2xl font-black text-slate-900">Référencement, Ads et visites</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    Suivez les pages consultées, identifiez les produits et catégories qui attirent l'attention, puis configurez les balises utiles au SEO et aux campagnes marketing.
                  </p>
                </div>
                <button type="button" onClick={saveSeoConfig} className="rounded-xl bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-emerald-600">
                  Sauvegarder SEO
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              {[
                ['Visites 30 jours', seoAnalytics.totalVisits, 'Pages vues'],
                ['Visiteurs uniques', seoAnalytics.uniqueVisitors, 'Navigateurs reconnus'],
                ['Catégories vues', seoAnalytics.topCategories.reduce((sum, item) => sum + item.views, 0), 'Consultations catégorie'],
                ['Produits vus', seoAnalytics.topProducts.reduce((sum, item) => sum + item.views, 0), 'Consultations produit']
              ].map(([label, value, hint]) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</div>
                  <div className="mt-2 text-2xl font-black text-slate-900">{value}</div>
                  <div className="mt-1 text-xs text-slate-500">{hint}</div>
                </div>
              ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Historique des visites</h3>
                    <p className="mt-1 text-sm text-slate-500">Visites, produits et catégories consultés sur les 30 derniers jours.</p>
                  </div>
                  {isSeoAnalyticsLoading && <Loader2 size={18} className="animate-spin text-slate-400" />}
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={seoAnalytics.dailyVisits.map((item) => ({ ...item, name: new Date(item.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) }))}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="visits" name="Visites" fill="#0f172a" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="productViews" name="Produits" fill="#10b981" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="categoryViews" name="Catégories" fill="#6366f1" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-black text-slate-900">Catégories les plus consultées</h3>
                  <div className="mt-4 space-y-3">
                    {seoAnalytics.topCategories.map((category, index) => (
                      <div key={`${category.id}-${index}`} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                        <div>
                          <div className="font-bold text-slate-900">{category.name}</div>
                          <div className="text-xs text-slate-500">{category.slug || 'sans slug'}</div>
                        </div>
                        <div className="text-sm font-black text-emerald-700">{category.views}</div>
                      </div>
                    ))}
                    {seoAnalytics.topCategories.length === 0 && <div className="text-sm text-slate-400">Aucune visite catégorie enregistrée.</div>}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-black text-slate-900">Produits les plus consultés</h3>
                  <div className="mt-4 space-y-3">
                    {seoAnalytics.topProducts.map((product, index) => (
                      <div key={`${product.id}-${index}`} className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
                        {product.imageUrl && <img src={product.imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover" referrerPolicy="no-referrer" />}
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-bold text-slate-900">{product.title}</div>
                          <div className="text-xs text-slate-500">{product.categoryName || 'Sans catégorie'}</div>
                        </div>
                        <div className="text-sm font-black text-indigo-700">{product.views}</div>
                      </div>
                    ))}
                    {seoAnalytics.topProducts.length === 0 && <div className="text-sm text-slate-400">Aucune visite produit enregistrée.</div>}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-black text-slate-900">Balises SEO globales</h3>
                <div className="mt-5 space-y-4">
                  <input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="Titre SEO du site" />
                  <textarea className="min-h-[110px] w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3" value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} placeholder="Meta description principale" />
                  <textarea className="min-h-[90px] w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3" value={seoKeywords} onChange={(e) => setSeoKeywords(e.target.value)} placeholder="Mots-clés séparés par des virgules" />
                  <input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3" value={seoCanonicalUrl} onChange={(e) => setSeoCanonicalUrl(e.target.value)} placeholder="URL canonique, ex: https://votre-domaine.com" />
                  <ImageInput label="Image Open Graph" value={seoOgImageUrl} onChange={setSeoOgImageUrl} placeholder="Image de partage social" uploadPreset="default" />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-black text-slate-900">Ads, robots et tracking</h3>
                <div className="mt-5 space-y-4">
                  <input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3" value={seoOrganizationName} onChange={(e) => setSeoOrganizationName(e.target.value)} placeholder="Nom organisation pour Schema.org" />
                  <select className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3" value={seoRobots} onChange={(e) => setSeoRobots(e.target.value)}>
                    <option value="index,follow">index, follow</option>
                    <option value="noindex,follow">noindex, follow</option>
                    <option value="noindex,nofollow">noindex, nofollow</option>
                  </select>
                  <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <span className="font-bold text-slate-800">Sitemap activé</span>
                    <input type="checkbox" className="h-5 w-5 accent-emerald-600" checked={seoSitemapEnabled} onChange={(e) => setSeoSitemapEnabled(e.target.checked)} />
                  </label>
                  <input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3" value={seoGoogleAnalyticsId} onChange={(e) => setSeoGoogleAnalyticsId(e.target.value)} placeholder="Google Analytics ID, ex: G-XXXXXXXXXX" />
                  <input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3" value={seoGoogleAdsConversionId} onChange={(e) => setSeoGoogleAdsConversionId(e.target.value)} placeholder="Google Ads conversion ID, ex: AW-XXXXXXXXX" />
                  <input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3" value={seoFacebookPixelId} onChange={(e) => setSeoFacebookPixelId(e.target.value)} placeholder="Meta/Facebook Pixel ID" />
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800">
                    Le tracking Ads est sauvegardé ici pour centraliser la configuration. Les scripts peuvent ensuite être activés proprement selon votre politique cookies.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

         {activeTab === 'settings' && user.role === UserRole.ADMIN && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Section 1: Logo & Icone du Site */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center space-x-2">
                            <div className="p-2 bg-indigo-100 rounded-lg">
                                <LucideIcons.Layout className="text-indigo-600" size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 leading-tight">Logo & Icone du Site</h2>
                                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Identité visuelle et branding</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider flex items-center">
                                    <LucideIcons.Type size={14} className="mr-1.5 text-slate-400" /> Nom du Site
                                </label>
                                <input 
                                    type="text" 
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition bg-slate-50/30 font-medium"
                                    value={siteName}
                                    onChange={(e) => setSiteName(e.target.value)}
                                    placeholder="TuniBots"
                                />
                            </div>
                            <div className="grid grid-cols-1 gap-6">
                                <ImageInput 
                                    label="Logo Principal"
                                    value={siteLogo}
                                    onChange={setSiteLogo}
                                    placeholder="URL du logo ou upload"
                                    uploadPreset="siteLogo"
                                />
                                <div>
                                    <div className="mb-2 flex items-center justify-between">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center">
                                            <LucideIcons.Maximize2 size={14} className="mr-1.5 text-slate-400" /> Taille du logo
                                        </label>
                                        <span className="text-xs font-black text-slate-700">{logoSize}px</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="24"
                                        max="80"
                                        step="1"
                                        value={logoSize}
                                        onChange={(e) => setLogoSize(Number(e.target.value))}
                                        className="w-full accent-indigo-600"
                                    />
                                    <div className="mt-1 flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        <span>Petit</span>
                                        <span>Grand</span>
                                    </div>
                                </div>
                                <ImageInput 
                                    label="Favicon (Icône de l'onglet)"
                                    value={siteFavicon}
                                    onChange={setSiteFavicon}
                                    placeholder="URL de l'icône (16x16 ou 32x32)"
                                    uploadPreset="favicon"
                                />
                            </div>
                        </div>
                        
                        <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 relative overflow-hidden group">
                            <div className="absolute top-4 left-4 flex items-center space-x-1.5">
                                <div className="w-2 h-2 rounded-full bg-red-400"></div>
                                <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                                <div className="w-2 h-2 rounded-full bg-green-400"></div>
                            </div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase mb-8 tracking-widest">Aperçu en temps réel</div>
                            
                            {/* Browser Tab Preview */}
                            <div className="w-full max-w-sm bg-white rounded-t-xl border border-slate-200 shadow-sm mb-4 overflow-hidden">
                                <div className="bg-slate-100 px-3 py-1.5 flex items-center space-x-2 border-b border-slate-200">
                                    <div className="bg-white px-3 py-1 rounded-t-md border-x border-t border-slate-200 flex items-center space-x-2 max-w-[150px]">
                                        {siteFavicon ? (
                                            <img src={siteFavicon} alt="Favicon" className="w-3.5 h-3.5 object-contain" referrerPolicy="no-referrer" />
                                        ) : (
                                            <LucideIcons.Globe size={12} className="text-slate-400" />
                                        )}
                                        <span className="text-[10px] font-medium text-slate-600 truncate">{siteName}</span>
                                        <LucideIcons.X size={10} className="text-slate-400" />
                                    </div>
                                </div>
                            </div>

                            {/* Header Preview */}
                            <div className="bg-white p-5 rounded-xl shadow-xl border border-slate-100 flex items-center justify-between w-full max-w-sm group-hover:scale-105 transition-transform duration-500">
                                <div className="flex items-center space-x-4">
                                    {siteLogo ? (
                                        <img src={siteLogo} alt="Logo Preview" className="w-auto object-contain" style={{ height: `${logoSize}px` }} referrerPolicy="no-referrer" />
                                    ) : (
                                        <div className="bg-indigo-600 text-white rounded-lg font-black text-2xl flex items-center justify-center shadow-lg shadow-indigo-200" style={{ height: `${logoSize}px`, width: `${logoSize}px` }}>
                                            {siteName.charAt(0)}
                                        </div>
                                    )}
                                </div>
                                <div className="flex space-x-2">
                                    <div className="w-8 h-2 bg-slate-100 rounded-full"></div>
                                    <div className="w-12 h-2 bg-slate-100 rounded-full"></div>
                                </div>
                            </div>
                            
                            <p className="text-[10px] text-slate-400 mt-8 italic max-w-[240px] text-center leading-relaxed">
                                Voici comment votre marque apparaîtra dans l'onglet du navigateur et dans l'en-tête de votre site.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Section 2: Configuration SMTP */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center space-x-2">
                            <div className="p-2 bg-indigo-100 rounded-lg">
                                <LucideIcons.Mail className="text-indigo-600" size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 leading-tight">Serveur de Messagerie (SMTP)</h2>
                                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Envoi d'emails et facturation</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center">
                                <LucideIcons.CheckCircle2 size={12} className="mr-1" /> Automatisé
                            </div>
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Nom de l'expéditeur</label>
                                    <input 
                                        type="text" 
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50/30 transition-all"
                                        value={smtpMailerName}
                                        onChange={(e) => setSmtpMailerName(e.target.value)}
                                        placeholder="TuniBots Support"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Driver</label>
                                    <select 
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50/30 transition-all font-medium"
                                        value={smtpDriver}
                                        onChange={(e) => setSmtpDriver(e.target.value)}
                                    >
                                        <option value="smtp">SMTP</option>
                                        <option value="mailgun">Mailgun</option>
                                        <option value="sendgrid">SendGrid</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Hôte SMTP</label>
                                    <input 
                                        type="text" 
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50/30 transition-all"
                                        value={smtpHost}
                                        onChange={(e) => setSmtpHost(e.target.value)}
                                        placeholder="smtp.gmail.com"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Port</label>
                                        <input 
                                            type="text" 
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50/30 transition-all"
                                            value={smtpPort}
                                            onChange={(e) => setSmtpPort(e.target.value)}
                                            placeholder="587"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Cryptage</label>
                                        <select 
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50/30 transition-all font-medium"
                                            value={smtpEncryption}
                                            onChange={(e) => setSmtpEncryption(e.target.value)}
                                        >
                                            <option value="tls">TLS</option>
                                            <option value="ssl">SSL</option>
                                            <option value="none">Aucun</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Email ID (Expéditeur)</label>
                                    <input 
                                        type="email" 
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50/30 transition-all"
                                        value={smtpEmailId}
                                        onChange={(e) => setSmtpEmailId(e.target.value)}
                                        placeholder="contact@votre-site.com"
                                    />
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="relative">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Utilisateur / Mot de passe</label>
                                        <div className="flex space-x-2">
                                            <input 
                                                type="text" 
                                                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50/30 transition-all text-sm"
                                                value={smtpUsername}
                                                onChange={(e) => setSmtpUsername(e.target.value)}
                                                placeholder="User"
                                            />
                                            <input 
                                                type="password" 
                                                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50/30 transition-all text-sm"
                                                value={smtpPassword}
                                                onChange={(e) => setSmtpPassword(e.target.value)}
                                                placeholder="Pass"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="mt-8 p-5 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-start space-x-4">
                            <div className="p-2 bg-white rounded-full shadow-sm">
                                <LucideIcons.Info size={18} className="text-indigo-600" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-indigo-900 mb-1">Automatisation de la Facturation</h4>
                                <p className="text-xs text-indigo-700 leading-relaxed opacity-80">
                                    Une fois configuré, le système générera automatiquement des factures PDF professionnelles pour chaque commande et les enverra à vos clients. Assurez-vous que vos identifiants SMTP sont valides pour éviter les échecs d'envoi.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 3: Configuration Click2pay */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden opacity-90 hover:opacity-100 transition-opacity">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center space-x-2">
                            <div className="p-2 bg-indigo-100 rounded-lg">
                                <LucideIcons.CreditCard className="text-indigo-600" size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 leading-tight">Passerelle de Paiement</h2>
                                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Click2pay Tunisie</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={click2payEnabled}
                                onChange={(e) => setClick2payEnabled(e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            <span className="ml-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">{click2payEnabled ? 'Activé' : 'Désactivé'}</span>
                        </label>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Merchant ID</label>
                                <input 
                                    type="text" 
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50/30 transition-all"
                                    value={click2payMerchantId}
                                    onChange={(e) => setClick2payMerchantId(e.target.value)}
                                    placeholder="Votre ID Marchand"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Clé API (Secret)</label>
                                <input 
                                    type="password" 
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50/30 transition-all"
                                    value={click2payApiKey}
                                    onChange={(e) => setClick2payApiKey(e.target.value)}
                                    placeholder="••••••••••••••••"
                                />
                            </div>
                        </div>
                        <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-start space-x-3">
                            <LucideIcons.ShieldCheck size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
                            <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                                <strong>Sécurité Click2pay :</strong> Vos identifiants sont chiffrés et utilisés uniquement pour traiter les transactions sécurisées via la plateforme Click2pay Tunisie.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-6 sticky bottom-0 bg-slate-50/80 backdrop-blur-md p-4 -mx-4 rounded-t-3xl border-t border-slate-200 z-10">
                    <button 
                        onClick={() => onUpdateSiteConfig({ 
                            siteName, 
                            logoUrl: siteLogo, 
                            logoSize,
                            faviconUrl: siteFavicon,
                            smtpMailerName,
                            smtpHost,
                            smtpDriver,
                            smtpPort,
                            smtpUsername,
                            smtpEmailId,
                            smtpEncryption,
                            smtpPassword,
                            click2payEnabled,
                            click2payMerchantId,
                            click2payApiKey
                        })}
                        className="bg-indigo-600 text-white font-black py-4 px-16 rounded-2xl hover:bg-indigo-700 transition shadow-2xl shadow-indigo-300 flex items-center justify-center transform hover:-translate-y-1 active:scale-95 group"
                    >
                        <LucideIcons.Save size={20} className="mr-3 group-hover:rotate-12 transition-transform" /> 
                        <span className="uppercase tracking-widest text-sm">Sauvegarder tout</span>
                    </button>
                </div>
            </div>
        )}
        {activeTab === 'customization' && user.role === UserRole.ADMIN && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => setCustomizationSection('hero')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${customizationSection === 'hero' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'}`}
                    >
                        Hero carousel
                    </button>
                    <button
                        onClick={() => setCustomizationSection('store-cover')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${customizationSection === 'store-cover' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'}`}
                    >
                        Store cover
                    </button>
                    <button
                        onClick={() => setCustomizationSection('loader')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${customizationSection === 'loader' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'}`}
                    >
                        Loader store
                    </button>
                    <button
                        onClick={() => setCustomizationSection('floating-cards')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${customizationSection === 'floating-cards' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'}`}
                    >
                        card flottant
                    </button>
                    <button
                        onClick={() => setCustomizationSection('colors')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${customizationSection === 'colors' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'}`}
                    >
                        Couleurs
                    </button>
                    <button
                        onClick={() => setCustomizationSection('font')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${customizationSection === 'font' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'}`}
                    >
                        Font
                    </button>
                    <button
                        onClick={() => setCustomizationSection('layout')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${customizationSection === 'layout' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'}`}
                    >
                        Header & Footer
                    </button>
                </div>

                {customizationSection === 'hero' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center space-x-2">
                            <div className="p-2 bg-indigo-100 rounded-lg">
                                <LucideIcons.Images className="text-indigo-600" size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 leading-tight">Hero carousel</h2>
                                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Slides du carousel + 5 cartes promo configurables</p>
                            </div>
                        </div>
                        <button onClick={addHeroSlide} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700">
                            Ajouter un slide
                        </button>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-900">
                            <div className="flex items-start gap-3">
                                <LucideIcons.Info size={20} className="mt-0.5 shrink-0 text-blue-600" />
                                <div>
                                    <div className="font-black">Normes média pour les slides</div>
                                    <p className="mt-1 leading-relaxed">
                                        Utilisez le même format visuel pour tous les slides afin de garder une bannière stable: ratio conseillé 3:1, dimensions recommandées {SLIDE_MEDIA_RULES.recommended}, minimum {SLIDE_MEDIA_RULES.minWidth} x {SLIDE_MEDIA_RULES.minHeight}px. Formats acceptés: JPG, PNG, WebP, GIF animé, MP4, WebM. Taille max: image {formatBytes(SLIDE_MEDIA_RULES.imageMaxBytes)}, GIF {formatBytes(SLIDE_MEDIA_RULES.gifMaxBytes)}, vidéo {formatBytes(SLIDE_MEDIA_RULES.videoMaxBytes)}. Vidéo: {SLIDE_MEDIA_RULES.videoMaxDuration}s max, muette/loop, compression web H.264 MP4 ou WebM.
                                    </p>
                                </div>
                            </div>
                        </div>
                        {slideMediaError && (
                            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                                {slideMediaError}
                            </div>
                        )}
                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <div className="text-xs uppercase tracking-widest text-slate-400 font-bold">Cartes promo autour du carousel</div>
                                    <div className="mt-1 text-sm text-slate-600">5 emplacements fixes: grande carte droite, deux petites cartes droites, puis deux cartes sous le carousel. L'admin modifie seulement les images et les liens.</div>
                                </div>
                                <button type="button" onClick={addHeroPromoBanner} disabled={heroPromoBanners.length >= 5} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">
                                    Ajouter une carte
                                </button>
                            </div>

                            {heroPromoBanners.length === 0 && (
                                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                                    Aucune carte promo. Ajoute des cartes pour reproduire le layout marketplace à droite du carousel.
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                                {heroPromoBanners.map((banner, index) => (
                                    <div key={banner.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                                        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
                                            <div>
                                                <div className="text-xs font-black uppercase tracking-widest text-slate-400">Carte {index + 1}</div>
                                                <div className="text-sm font-bold text-slate-900">{banner.alt || 'Carte promo'}</div>
                                            </div>
                                            <button type="button" onClick={() => removeHeroPromoBanner(banner.id)} className="text-slate-400 hover:text-red-600">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-[1fr_1.1fr]">
                                            <div className="space-y-4">
                                                <ImageInput
                                                    label="Image carte"
                                                    value={banner.imageUrl}
                                                    onChange={(value) => updateHeroPromoBanner(banner.id, { imageUrl: value })}
                                                    placeholder="URL image ou upload"
                                                    uploadPreset="default"
                                                />
                                                <div>
                                                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Nom / Alt</label>
                                                    <input
                                                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3"
                                                        value={banner.alt || ''}
                                                        onChange={(e) => updateHeroPromoBanner(banner.id, { alt: e.target.value })}
                                                        placeholder="Ex: Forza Horizon 6"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="relative min-h-36 overflow-hidden rounded-2xl bg-slate-900">
                                                    {banner.imageUrl ? (
                                                        <img src={banner.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                                                    ) : (
                                                        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold uppercase tracking-widest text-slate-500">Aperçu carte</div>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                    <div>
                                                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Type de lien</label>
                                                        <select
                                                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3"
                                                            value={banner.linkType || 'listing'}
                                                            onChange={(e) => updateHeroPromoBanner(banner.id, { linkType: e.target.value as HeroPromoBanner['linkType'], linkTarget: '' })}
                                                        >
                                                            <option value="listing">Offre produit</option>
                                                            <option value="category">Catégorie</option>
                                                            <option value="url">URL externe</option>
                                                            <option value="collections">Scroll catalogue</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Cible</label>
                                                        {banner.linkType === 'listing' ? (
                                                            <select className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3" value={banner.linkTarget || ''} onChange={(e) => updateHeroPromoBanner(banner.id, { linkTarget: e.target.value })}>
                                                                <option value="">Sélectionner une offre</option>
                                                                {listings.map((listing) => <option key={listing.id} value={listing.id}>{listing.title}</option>)}
                                                            </select>
                                                        ) : banner.linkType === 'category' ? (
                                                            <select className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3" value={banner.linkTarget || ''} onChange={(e) => updateHeroPromoBanner(banner.id, { linkTarget: e.target.value })}>
                                                                <option value="">Sélectionner une catégorie</option>
                                                                {categories.map((category) => <option key={category.id} value={category.slug}>{category.name}</option>)}
                                                            </select>
                                                        ) : banner.linkType === 'url' ? (
                                                            <input className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3" value={banner.linkTarget || ''} onChange={(e) => updateHeroPromoBanner(banner.id, { linkTarget: e.target.value })} placeholder="https://..." />
                                                        ) : (
                                                            <div className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-500">Scroll catalogue</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {heroSlides.length === 0 && (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                                Aucun slide configuré. Ajoute un slide pour remplacer la bannière fixe par un carousel d'offres.
                            </div>
                        )}
                        {heroSlides.map((slide, index) => (
                            <div key={slide.id} className="rounded-2xl border border-slate-200 overflow-hidden">
                                <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                    <div>
                                        <div className="text-xs uppercase tracking-widest text-slate-400 font-bold">Slide {index + 1}</div>
                                        <div className="font-bold text-slate-900">{slide.title || 'Nouveau slide'}</div>
                                    </div>
                                    <button onClick={() => removeHeroSlide(slide.id)} className="text-slate-400 hover:text-red-600">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <div className="p-5 grid grid-cols-1 xl:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between gap-3">
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Média du slide</label>
                                                <select
                                                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600"
                                                    value={slide.mediaType || inferSlideMediaType(slide.imageUrl)}
                                                    onChange={(e) => updateHeroSlide(slide.id, { mediaType: e.target.value as HeroSlide['mediaType'] })}
                                                >
                                                    <option value="image">Image / GIF</option>
                                                    <option value="video">Vidéo</option>
                                                </select>
                                            </div>
                                            <input
                                                type="text"
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/30"
                                                value={slide.imageUrl.startsWith('data:') ? '' : slide.imageUrl}
                                                onChange={(e) => updateHeroSlide(slide.id, { imageUrl: e.target.value, mediaType: inferSlideMediaType(e.target.value) })}
                                                placeholder="URL image, GIF, MP4 ou WebM"
                                            />
                                            <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-4">
                                                <input
                                                    type="file"
                                                    accept={SLIDE_MEDIA_RULES.accept}
                                                    onChange={(event) => {
                                                        const file = event.target.files?.[0];
                                                        if (file) handleSlideMediaFile(slide.id, file);
                                                        event.currentTarget.value = '';
                                                    }}
                                                    className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-indigo-700"
                                                />
                                                <div className="mt-2 text-[11px] leading-relaxed text-slate-500">
                                                    Upload validé selon les normes ci-dessus. Les vidéos et GIFs sont gardés dans leur format pour préserver l’animation.
                                                </div>
                                            </div>
                                            {slide.imageUrl && (
                                                <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-900">
                                                    {isVideoSlideMedia(slide.imageUrl, slide.mediaType) ? (
                                                        <video src={slide.imageUrl} className="h-32 w-full object-cover" muted loop playsInline controls />
                                                    ) : (
                                                        <img src={slide.imageUrl} className="h-32 w-full object-cover" alt="Aperçu média slide" />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Badge</label>
                                                <input className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/30" value={slide.badge || ''} onChange={(e) => updateHeroSlide(slide.id, { badge: e.target.value })} placeholder="Dernière offre" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Bouton CTA</label>
                                                <input className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/30" value={slide.ctaLabel || ''} onChange={(e) => updateHeroSlide(slide.id, { ctaLabel: e.target.value })} placeholder="Voir l’offre" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Titre</label>
                                            <textarea className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/30 h-24" value={slide.title || ''} onChange={(e) => updateHeroSlide(slide.id, { title: e.target.value })} placeholder="Ex: Dernières offres ChatGPT Plus et Claude Pro" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Sous-titre</label>
                                            <textarea className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/30 h-24" value={slide.subtitle || ''} onChange={(e) => updateHeroSlide(slide.id, { subtitle: e.target.value })} placeholder="Description optionnelle du slide" />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Type de lien</label>
                                                <select className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/30" value={slide.linkType || 'listing'} onChange={(e) => updateHeroSlide(slide.id, { linkType: e.target.value as HeroSlide['linkType'], linkTarget: '' })}>
                                                    <option value="listing">Offre produit</option>
                                                    <option value="category">Catégorie</option>
                                                    <option value="url">URL externe</option>
                                                    <option value="collections">Scroll catalogue</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Cible</label>
                                                {slide.linkType === 'listing' ? (
                                                    <select className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/30" value={slide.linkTarget || ''} onChange={(e) => updateHeroSlide(slide.id, { linkTarget: e.target.value })}>
                                                        <option value="">Sélectionner une offre</option>
                                                        {listings.map((listing) => <option key={listing.id} value={listing.id}>{listing.title}</option>)}
                                                    </select>
                                                ) : slide.linkType === 'category' ? (
                                                    <select className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/30" value={slide.linkTarget || ''} onChange={(e) => updateHeroSlide(slide.id, { linkTarget: e.target.value })}>
                                                        <option value="">Sélectionner une catégorie</option>
                                                        {categories.map((category) => <option key={category.id} value={category.slug}>{category.name}</option>)}
                                                    </select>
                                                ) : slide.linkType === 'url' ? (
                                                    <input className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/30" value={slide.linkTarget || ''} onChange={(e) => updateHeroSlide(slide.id, { linkTarget: e.target.value })} placeholder="https://..." />
                                                ) : (
                                                    <div className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-100 text-sm text-slate-500">
                                                        Scroll vers le catalogue d’accueil
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="rounded-3xl overflow-hidden bg-slate-900 shadow-xl relative" style={{ height: `${Math.max(300, heroSlideHeight - 80)}px` }}>
                                        {isVideoSlideMedia(slide.imageUrl, slide.mediaType) ? (
                                            <video src={slide.imageUrl} className="absolute inset-0 h-full w-full object-cover" muted loop playsInline autoPlay />
                                        ) : (
                                            <img src={slide.imageUrl || 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80'} className="absolute inset-0 h-full w-full object-cover" alt="" />
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/5"></div>
                                        <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 rounded-full bg-black/60 px-2 py-1.5">
                                            {heroSlides.slice(0, 5).map((dotSlide) => (
                                                <span key={dotSlide.id} className={`mx-1 h-2.5 w-2.5 rounded-full bg-white ${dotSlide.id === slide.id ? 'opacity-90' : 'opacity-30'}`} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                )}

                {customizationSection === 'floating-cards' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center space-x-2">
                            <div className="p-2 bg-indigo-100 rounded-lg">
                                <LucideIcons.Badge className="text-indigo-600" size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 leading-tight">card flottant</h2>
                                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Marques partenaires affichées sous le hero slider</p>
                            </div>
                        </div>
                        <button type="button" onClick={addFloatingBrandCard} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700">
                            Ajouter une carte
                        </button>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 backdrop-blur-xl">
                            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                                <div>
                                    <div className="text-xs font-black uppercase tracking-widest text-slate-400">Aperçu</div>
                                    <div className="mt-1 text-sm text-slate-500">Le fond est automatique selon le thème. Les cartes restent uniquement des images.</div>
                                </div>
                            </div>
                            <div className="rounded-2xl border border-slate-200/60 bg-white/55 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/55">
                                <div className="flex gap-3 overflow-hidden">
                                    {floatingBrandCards.filter((card) => card.imageUrl).map((card) => (
                                        <div key={card.id} className="h-[82px] w-[150px] shrink-0 overflow-hidden rounded-[10px]">
                                            <img src={card.imageUrl} alt="" className="h-full w-full object-cover" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {floatingBrandCards.length === 0 && (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                                Aucune carte flottante. Ajoute une marque partenaire pour afficher la section sous le hero slider.
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                            {floatingBrandCards.map((card, index) => (
                                <div key={card.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                                    <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
                                        <div>
                                            <div className="text-xs font-black uppercase tracking-widest text-slate-400">Carte flottante {index + 1}</div>
                                            <div className="text-sm font-bold text-slate-900">{card.name || 'Marque partenaire'}</div>
                                        </div>
                                        <button type="button" onClick={() => removeFloatingBrandCard(card.id)} className="text-slate-400 hover:text-red-600">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-[1fr_1.1fr]">
                                        <div className="space-y-4">
                                            <ImageInput
                                                label="Logo / image marque"
                                                value={card.imageUrl}
                                                onChange={(value) => updateFloatingBrandCard(card.id, { imageUrl: value })}
                                                placeholder="URL logo ou upload"
                                                uploadPreset="default"
                                            />
                                            <div>
                                                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Nom</label>
                                                <input
                                                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3"
                                                    value={card.name}
                                                    onChange={(e) => updateFloatingBrandCard(card.id, { name: e.target.value })}
                                                    placeholder="Ex: Steam"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="h-[118px] overflow-hidden rounded-2xl bg-slate-200">
                                                {card.imageUrl ? (
                                                    <img src={card.imageUrl} alt="" className="h-full w-full object-cover" />
                                                ) : (
                                                    <div className="flex h-full items-center justify-center text-xs font-bold uppercase tracking-widest text-slate-400">Aperçu</div>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                <div>
                                                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Type de lien</label>
                                                    <select
                                                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3"
                                                        value={card.linkType || 'url'}
                                                        onChange={(e) => updateFloatingBrandCard(card.id, { linkType: e.target.value as FloatingBrandCard['linkType'], linkTarget: '' })}
                                                    >
                                                        <option value="listing">Offre produit</option>
                                                        <option value="category">Catégorie</option>
                                                        <option value="url">URL externe</option>
                                                        <option value="collections">Scroll catalogue</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Cible</label>
                                                    {card.linkType === 'listing' ? (
                                                        <select className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3" value={card.linkTarget || ''} onChange={(e) => updateFloatingBrandCard(card.id, { linkTarget: e.target.value })}>
                                                            <option value="">Sélectionner une offre</option>
                                                            {listings.map((listing) => <option key={listing.id} value={listing.id}>{listing.title}</option>)}
                                                        </select>
                                                    ) : card.linkType === 'category' ? (
                                                        <select className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3" value={card.linkTarget || ''} onChange={(e) => updateFloatingBrandCard(card.id, { linkTarget: e.target.value })}>
                                                            <option value="">Sélectionner une catégorie</option>
                                                            {categories.map((category) => <option key={category.id} value={category.slug}>{category.name}</option>)}
                                                        </select>
                                                    ) : card.linkType === 'url' ? (
                                                        <input className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3" value={card.linkTarget || ''} onChange={(e) => updateFloatingBrandCard(card.id, { linkTarget: e.target.value })} placeholder="https://..." />
                                                    ) : (
                                                        <div className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-500">Scroll catalogue</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                )}

                {customizationSection === 'store-cover' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center space-x-2">
                            <div className="p-2 bg-indigo-100 rounded-lg">
                                <LucideIcons.PanelTop className="text-indigo-600" size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 leading-tight">Store cover</h2>
                                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Background et produits de la cover sous le menu</p>
                            </div>
                        </div>
                        <div className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 border border-slate-200">
                            {coverListingIds.length}/5 sélectionnés
                        </div>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                            <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.2fr]">
                                <ImageInput
                                    label="Background de la cover"
                                    value={coverBackgroundUrl}
                                    onChange={setCoverBackgroundUrl}
                                    placeholder="URL image ou upload"
                                />
                                <div className="relative min-h-44 overflow-hidden rounded-2xl border border-slate-200 bg-slate-900">
                                    <img
                                        src={coverBackgroundUrl || 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80'}
                                        alt=""
                                        className="absolute inset-0 h-full w-full object-cover opacity-45"
                                    />
                                    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(88,52,146,0.72),rgba(244,89,94,0.68),rgba(246,160,64,0.72))]" />
                                    <div className="relative flex h-full min-h-44 items-center justify-center px-6 text-center text-white">
                                        <div>
                                            <div className="text-xs font-black uppercase tracking-widest text-white/70">Aperçu cover</div>
                                            <div className="mt-2 text-2xl font-black">Produits sélectionnés</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">Produits affichés dans la cover</div>
                            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                                {listings.filter((listing) => !listing.isArchived).map((listing) => {
                                    const isSelected = coverListingIds.includes(listing.id);
                                    return (
                                        <button
                                            key={listing.id}
                                            type="button"
                                            onClick={() => toggleCoverListing(listing.id)}
                                            className={`min-w-[220px] rounded-2xl border bg-white p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
                                                isSelected ? 'border-indigo-600 ring-2 ring-indigo-600/10' : 'border-slate-200'
                                            }`}
                                        >
                                            <div className="flex gap-3">
                                                <div className="h-14 w-14 overflow-hidden rounded-xl bg-slate-100">
                                                  <ListingImage listing={listing} alt="" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="line-clamp-2 text-xs font-black text-slate-900">{listing.title}</div>
                                                    <div className="mt-1 truncate text-[10px] font-bold text-slate-400">{listing.game || 'Produit'}</div>
                                                    <div className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-black ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                        {isSelected ? 'Affiché' : 'Ajouter'}
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
                )}

                {customizationSection === 'loader' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center space-x-2">
                            <div className="p-2 bg-indigo-100 rounded-lg">
                                <Loader2 className="text-indigo-600" size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 leading-tight">Loader du store</h2>
                                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Image ou GIF affiché au premier chargement du site</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={startupLoaderEnabled}
                                onChange={(e) => setStartupLoaderEnabled(e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            <span className="ml-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">{startupLoaderEnabled ? 'Activé' : 'Désactivé'}</span>
                        </label>
                    </div>
                    <div className="p-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                        <div className="space-y-5">
                            <ImageInput
                                label="Image ou GIF du loader"
                                value={startupLoaderImageUrl}
                                onChange={setStartupLoaderImageUrl}
                                placeholder="https://... ou upload GIF/logo"
                            />
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Fond du loader</label>
                                <input
                                    type="text"
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                                    value={startupLoaderBackground}
                                    onChange={(e) => setStartupLoaderBackground(e.target.value)}
                                    placeholder="#020617 ou linear-gradient(...)"
                                />
                                <p className="mt-2 text-xs text-slate-500">
                                    Utilise une couleur simple comme <code>#020617</code> ou un dégradé CSS.
                                </p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                                Le loader s’affiche côté store pendant le bootstrap initial: catalogue, catégories, configuration du site et session client.
                            </div>
                        </div>
                        <div
                            className="relative overflow-hidden rounded-[2rem] border border-slate-200 min-h-[360px] flex items-center justify-center"
                            style={{ background: startupLoaderBackground || '#020617' }}
                        >
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.28),transparent_35%),radial-gradient(circle_at_bottom,rgba(14,165,233,0.18),transparent_30%)]" />
                            <div className="relative flex w-full max-w-xs flex-col items-center px-6 text-center text-white">
                                <div className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl backdrop-blur-md">
                                    {startupLoaderEnabled && startupLoaderImageUrl ? (
                                        <img src={startupLoaderImageUrl} alt="Preview loader" className="h-full w-full object-contain" />
                                    ) : siteLogo ? (
                                        <img src={siteLogo} alt={siteName} className="h-24 w-24 object-contain" />
                                    ) : (
                                        <div className="text-4xl font-black uppercase tracking-[0.24em]">{(siteName || 'TB').slice(0, 2)}</div>
                                    )}
                                </div>
                                <div className="mt-6 text-xs font-black uppercase tracking-[0.35em] text-white/60">Store Loading</div>
                                <div className="mt-3 text-2xl font-black">{siteName || 'TuniBots'}</div>
                                <p className="mt-3 text-sm leading-7 text-white/75">Le store s’affichera dès que les données critiques seront prêtes.</p>
                            </div>
                        </div>
                    </div>
                </div>
                )}

                {customizationSection === 'colors' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                        <h2 className="text-lg font-bold text-slate-900 leading-tight">Couleurs globales</h2>
                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Boutons, login, accents, surfaces</p>
                    </div>
                    <div className="p-6 grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-8">
                        <div className="space-y-5">
                            <div>
                                <div className="flex items-end justify-between gap-3 mb-3">
                                    <div>
                                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Palettes premium</h3>
                                        <p className="text-xs text-slate-500 mt-1">Clique sur une palette pour appliquer les 4 couleurs du thème.</p>
                                    </div>
                                    {selectedPremiumPalette && (
                                        <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700 border border-emerald-100">
                                            {selectedPremiumPalette.name}
                                        </span>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {PREMIUM_COLOR_PALETTES.map((palette) => {
                                        const isSelected = selectedPremiumPalette?.name === palette.name;

                                        return (
                                            <button
                                                key={palette.name}
                                                type="button"
                                                onClick={() => applyPremiumPalette(palette)}
                                                className={`group text-left rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                                                    isSelected
                                                        ? 'border-slate-900 bg-slate-900 text-white shadow-xl shadow-slate-200'
                                                        : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <div className="font-black truncate">{palette.name}</div>
                                                        <div className={`text-xs mt-1 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>{palette.description}</div>
                                                    </div>
                                                    {isSelected && <LucideIcons.Check size={18} className="shrink-0" />}
                                                </div>
                                                <div className="mt-4 grid grid-cols-4 gap-1.5">
                                                    {[palette.accentColor, palette.accentHoverColor, palette.accentSoftColor, palette.accentTextColor].map((color) => (
                                                        <span
                                                            key={color}
                                                            className="h-8 rounded-xl border border-white/40 shadow-inner"
                                                            style={{ backgroundColor: color }}
                                                            title={color}
                                                        />
                                                    ))}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="h-px bg-slate-100" />

                            {[
                                { label: 'Couleur principale', value: accentColor, setter: setAccentColor },
                                { label: 'Couleur hover', value: accentHoverColor, setter: setAccentHoverColor },
                                { label: 'Surface douce', value: accentSoftColor, setter: setAccentSoftColor },
                                { label: 'Texte accent', value: accentTextColor, setter: setAccentTextColor },
                            ].map((item) => (
                                <div key={item.label}>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">{item.label}</label>
                                    <div className="flex items-center gap-3">
                                        <input type="color" value={item.value} onChange={(e) => item.setter(e.target.value)} className="h-12 w-16 rounded-xl border border-slate-200 bg-white" />
                                        <input value={item.value} onChange={(e) => item.setter(e.target.value)} className="theme-focus flex-1 rounded-xl border border-slate-200 bg-slate-50/30 px-4 py-3 font-medium text-slate-700" />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="space-y-5">
                            <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-6">
                                <div className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-4">Aperçu rapide</div>
                                <div className="flex flex-wrap gap-3 mb-5">
                                    <button type="button" className="px-5 py-3 rounded-xl font-bold text-white" style={{ backgroundColor: accentColor }}>Bouton principal</button>
                                    <button type="button" className="px-5 py-3 rounded-xl font-bold" style={{ backgroundColor: accentSoftColor, color: accentTextColor }}>Bouton secondaire</button>
                                </div>
                                <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-2xl flex items-center justify-center text-white font-black" style={{ backgroundColor: accentColor }}>T</div>
                                            <div>
                                                <div className="font-bold text-slate-900">TuniBots Theme</div>
                                                <div className="text-sm text-slate-500">Header, boutons, login, logout</div>
                                            </div>
                                        </div>
                                        <button type="button" className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: accentColor }}>Connexion</button>
                                    </div>
                                    <div className="mt-5 rounded-2xl p-4" style={{ backgroundColor: accentSoftColor }}>
                                        <div className="font-bold" style={{ color: accentTextColor }}>Surface premium</div>
                                        <div className="text-sm text-slate-600 mt-1">Cette teinte habille les surfaces douces du thème.</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                )}

                {customizationSection === 'font' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                        <h2 className="text-lg font-bold text-slate-900 leading-tight">Font du site</h2>
                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Police globale, upload TTF/OTF/WOFF et aperçu immédiat</p>
                    </div>
                    <div className="grid grid-cols-1 gap-8 p-6 xl:grid-cols-[0.85fr_1.15fr]">
                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Police active</label>
                                <select
                                    className="theme-focus w-full rounded-xl border border-slate-200 bg-slate-50/30 px-4 py-3 font-medium text-slate-700"
                                    value={fontFamily}
                                    onChange={(event) => setFontFamily(event.target.value)}
                                >
                                    {FONT_OPTIONS.map((option) => (
                                        <option key={option.label} value={option.value}>{option.label}</option>
                                    ))}
                                    {customFonts.length > 0 && <option disabled>──────── Polices ajoutées ────────</option>}
                                    {customFonts.map((font) => (
                                        <option key={font.id} value={`"${font.family}"`}>{font.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 tracking-wider">Ajouter un fichier font</label>
                                <input
                                    type="file"
                                    accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2"
                                    onChange={handleFontUpload}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700"
                                />
                                <p className="mt-3 text-xs leading-5 text-slate-500">
                                    Formats acceptés: TTF, OTF, WOFF, WOFF2. Taille max: 2 MB. Après upload, la police est ajoutée à la liste et sélectionnée automatiquement.
                                </p>
                                {fontUploadError && <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">{fontUploadError}</div>}
                            </div>

                            {customFonts.length > 0 && (
                                <div className="space-y-3">
                                    <div className="text-xs font-black uppercase tracking-widest text-slate-400">Polices personnalisées</div>
                                    {customFonts.map((font) => (
                                        <div key={font.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                            <div className="min-w-0">
                                                <div className="truncate text-sm font-black text-slate-900">{font.name}</div>
                                                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{font.format}</div>
                                            </div>
                                            <button type="button" onClick={() => removeCustomFont(font.id)} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-red-600 hover:bg-red-50">
                                                Supprimer
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <button type="button" onClick={saveFontConfig} className="w-full rounded-xl bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-indigo-600">
                                Sauvegarder le font
                            </button>
                        </div>

                        <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-6">
                            <div className="mb-4 text-xs font-black uppercase tracking-widest text-slate-400">Aperçu typographique</div>
                            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm" style={{ fontFamily }}>
                                <div className="text-xs font-black uppercase tracking-[0.25em] text-indigo-600">{getFontDisplayName(fontFamily)}</div>
                                <h3 className="mt-4 text-4xl font-black leading-tight text-slate-950">TuniBots Marketplace</h3>
                                <p className="mt-4 max-w-xl text-base font-semibold leading-7 text-slate-600">
                                    Achetez des comptes, licences, abonnements et services digitaux avec une interface premium, rapide et lisible.
                                </p>
                                <div className="mt-6 flex flex-wrap gap-3">
                                    <button type="button" className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white">Bouton principal</button>
                                    <button type="button" className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700">Bouton secondaire</button>
                                </div>
                                <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                                    <div className="rounded-xl bg-slate-50 p-4">
                                        <div className="text-xs font-black uppercase text-slate-400">Produit</div>
                                        <div className="mt-1 text-lg font-black text-slate-900">Pack Premium</div>
                                    </div>
                                    <div className="rounded-xl bg-indigo-50 p-4">
                                        <div className="text-xs font-black uppercase text-indigo-500">Prix</div>
                                        <div className="mt-1 text-lg font-black text-slate-900">99.00 TND</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                )}

                {customizationSection === 'layout' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <h2 className="text-lg font-bold text-slate-900 leading-tight">Header public</h2>
                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Barre d'annonce, recherche et bouton d'inscription</p>
                        </div>
                        <div className="p-6 grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-8">
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Texte de la barre haute</label>
                                    <input value={headerAnnouncement} onChange={(e) => setHeaderAnnouncement(e.target.value)} className="theme-focus w-full rounded-xl border border-slate-200 bg-slate-50/30 px-4 py-3 font-medium text-slate-700" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Placeholder recherche</label>
                                    <input value={headerSearchPlaceholder} onChange={(e) => setHeaderSearchPlaceholder(e.target.value)} className="theme-focus w-full rounded-xl border border-slate-200 bg-slate-50/30 px-4 py-3 font-medium text-slate-700" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Label bouton CTA</label>
                                    <input value={headerCtaLabel} onChange={(e) => setHeaderCtaLabel(e.target.value)} className="theme-focus w-full rounded-xl border border-slate-200 bg-slate-50/30 px-4 py-3 font-medium text-slate-700" />
                                </div>
                            </div>
                            <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                                <div className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-4">Aperçu header</div>
                                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                    <div className="px-4 py-2 text-center text-xs font-black text-white" style={{ backgroundColor: accentColor }}>
                                        {headerAnnouncement || 'Bienvenue sur la plateforme'}
                                    </div>
                                    <div className="flex items-center justify-between gap-4 px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-black" style={{ backgroundColor: accentColor }}>{siteName.charAt(0) || 'T'}</div>
                                            <div className="font-black text-slate-900">{siteName || 'TuniBots'}</div>
                                        </div>
                                        <div className="hidden sm:flex flex-1 max-w-xs rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400">
                                            {headerSearchPlaceholder || 'Rechercher...'}
                                        </div>
                                        <button type="button" className="rounded-xl px-4 py-2 text-sm font-bold text-white" style={{ backgroundColor: accentColor }}>{headerCtaLabel || "S'inscrire"}</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <h2 className="text-lg font-bold text-slate-900 leading-tight">Footer premium</h2>
                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Texte de marque, contact, confiance et copyright</p>
                        </div>
                        <div className="p-6 grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-8">
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Tagline</label>
                                    <input value={footerTagline} onChange={(e) => setFooterTagline(e.target.value)} className="theme-focus w-full rounded-xl border border-slate-200 bg-slate-50/30 px-4 py-3 font-medium text-slate-700" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Description</label>
                                    <textarea value={footerDescription} onChange={(e) => setFooterDescription(e.target.value)} className="theme-focus h-28 w-full rounded-xl border border-slate-200 bg-slate-50/30 px-4 py-3 font-medium text-slate-700" />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Email</label>
                                        <input value={footerEmail} onChange={(e) => setFooterEmail(e.target.value)} className="theme-focus w-full rounded-xl border border-slate-200 bg-slate-50/30 px-4 py-3 font-medium text-slate-700" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Téléphone</label>
                                        <input value={footerPhone} onChange={(e) => setFooterPhone(e.target.value)} className="theme-focus w-full rounded-xl border border-slate-200 bg-slate-50/30 px-4 py-3 font-medium text-slate-700" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">WhatsApp</label>
                                        <input value={footerWhatsapp} onChange={(e) => setFooterWhatsapp(e.target.value)} className="theme-focus w-full rounded-xl border border-slate-200 bg-slate-50/30 px-4 py-3 font-medium text-slate-700" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Adresse</label>
                                        <input value={footerAddress} onChange={(e) => setFooterAddress(e.target.value)} className="theme-focus w-full rounded-xl border border-slate-200 bg-slate-50/30 px-4 py-3 font-medium text-slate-700" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Copyright</label>
                                    <input value={footerCopyright} onChange={(e) => setFooterCopyright(e.target.value)} className="theme-focus w-full rounded-xl border border-slate-200 bg-slate-50/30 px-4 py-3 font-medium text-slate-700" />
                                </div>
                            </div>
                            <div className="relative overflow-hidden rounded-[28px] border border-slate-800 bg-slate-950 p-6 text-white shadow-xl">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.28),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.2),transparent_32%)]" />
                                <div className="relative">
                                    <div className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-6">Aperçu footer</div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div>
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="h-11 w-11 rounded-2xl flex items-center justify-center text-white font-black" style={{ backgroundColor: accentColor }}>{siteName.charAt(0) || 'T'}</div>
                                                <div>
                                                    <div className="text-xl font-black">{siteName || 'TuniBots'}</div>
                                                    <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">{footerTagline}</div>
                                                </div>
                                            </div>
                                            <p className="text-sm leading-7 text-slate-300">{footerDescription}</p>
                                        </div>
                                        <div className="space-y-3 text-sm text-slate-300">
                                            <div className="font-black uppercase tracking-widest text-white text-xs">Contact</div>
                                            <div>{footerEmail}</div>
                                            <div>{footerPhone}</div>
                                            <div>WhatsApp: {footerWhatsapp}</div>
                                            <div>{footerAddress}</div>
                                        </div>
                                    </div>
                                    <div className="mt-8 border-t border-white/10 pt-4 text-xs text-slate-500">
                                        © {new Date().getFullYear()} {siteName || 'TuniBots'}. {footerCopyright}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                )}

                <div className="flex justify-end pt-6 sticky bottom-0 bg-slate-50/80 backdrop-blur-md p-4 -mx-4 rounded-t-3xl border-t border-slate-200 z-10">
                    <button
                        onClick={() => onUpdateSiteConfig({
                          heroSlides,
                          heroPromoBanners,
                          floatingBrandCards,
                          heroSlideHeight,
                          coverBackgroundUrl,
                          coverListingIds,
                          startupLoaderEnabled,
                          startupLoaderImageUrl,
                          startupLoaderBackground,
                          accentColor,
                          accentHoverColor,
                          accentSoftColor,
                          accentTextColor,
                          fontFamily,
                          customFonts,
                          headerAnnouncement,
                          headerSearchPlaceholder,
                          headerCtaLabel,
                          footerTagline,
                          footerDescription,
                          footerEmail,
                          footerPhone,
                          footerWhatsapp,
                          footerAddress,
                          footerCopyright
                        })}
                        className="bg-indigo-600 text-white font-black py-4 px-16 rounded-2xl hover:bg-indigo-700 transition shadow-2xl shadow-indigo-300 flex items-center justify-center transform hover:-translate-y-1 active:scale-95 group"
                    >
                        <LucideIcons.Save size={20} className="mr-3 group-hover:rotate-12 transition-transform" />
                        Enregistrer la customisation
                    </button>
                </div>
            </div>
        )}
        {activeTab === 'overview' && !overviewError && !shouldShowOverviewBootLoader && (
             <div className="space-y-6">
               {/* KPI Cards */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-500 text-sm font-medium">Ventes Totales</span>
                      <div className="p-2 bg-green-50 text-green-600 rounded-lg"><DollarSign size={20} /></div>
                    </div>
                    <div className="text-2xl font-black text-slate-900">{summary.totalSales.toFixed(2)} TND</div>
                    <div className="text-xs text-green-600 mt-1 font-medium">+12% vs mois dernier</div>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-500 text-sm font-medium">Commandes</span>
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Package size={20} /></div>
                    </div>
                    <div className="text-2xl font-black text-slate-900">{summary.totalOrders}</div>
                    <div className="text-xs text-blue-600 mt-1 font-medium">+5% vs mois dernier</div>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-500 text-sm font-medium">Clients</span>
                      <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Users size={20} /></div>
                    </div>
                    <div className="text-2xl font-black text-slate-900">{summary.totalUsers}</div>
                    <div className="text-xs text-purple-600 mt-1 font-medium">+8 nouveaux aujourd'hui</div>
                  </div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                   <div className="flex items-center justify-between mb-6">
                     <h3 className="font-bold text-slate-900">Ventes (30 jours)</h3>
                     <TrendingUp size={18} className="text-slate-400" />
                   </div>
                   <div className="h-64">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            cursor={{ fill: '#f8fafc' }}
                          />
                          <Bar dataKey="sales" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={20} />
                        </BarChart>
                     </ResponsiveContainer>
                   </div>
                 </div>

                 <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                   <h3 className="font-bold text-slate-900 mb-6">Produits les plus vendus</h3>
                   <div className="space-y-4">
                     {topProducts.length > 0 ? topProducts.map((p, i) => (
                       <div key={p.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors">
                         <div className="flex items-center space-x-3">
                           <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center font-bold text-slate-500 text-xs">{i+1}</div>
                           <div>
                             <div className="font-bold text-sm text-slate-900">{p.title}</div>
                             <div className="text-[10px] text-slate-500 uppercase font-bold">{p.game}</div>
                           </div>
                         </div>
                         <div className="text-right">
                           <div className="font-bold text-sm text-slate-900">{(p.salesCount || 0)} ventes</div>
                           <div className="text-[10px] text-green-600 font-bold">{(p.price * (p.salesCount || 0)).toFixed(2)} TND</div>
                         </div>
                       </div>
                     )) : (
                       <div className="text-center py-12 text-slate-400 italic text-sm">Aucune donnée disponible</div>
                     )}
                   </div>
                 </div>
               </div>
             </div>
        )}

        {activeTab === 'categories' && (
          <AdminCategoriesSection
            categories={categories}
            orderedCategories={orderedCategories}
            editingCategory={editingCategory}
            editingSubCategory={editingSubCategory}
            editCatName={editCatName}
            editCatSlug={editCatSlug}
            editCatIcon={editCatIcon}
            editCatImage={editCatImage}
            editCatGradient={editCatGradient}
            editCatOrder={editCatOrder}
            editSubName={editSubName}
            editSubSlug={editSubSlug}
            editSubIcon={editSubIcon}
            editSubDesc={editSubDesc}
            editSubOrder={editSubOrder}
            editSubCatId={editSubCatId}
            newCatName={newCatName}
            newCatSlug={newCatSlug}
            newCatIcon={newCatIcon}
            newCatImage={newCatImage}
            newCatGradient={newCatGradient}
            newCatOrder={newCatOrder}
            selectedCatForSub={selectedCatForSub}
            newSubCatName={newSubCatName}
            newSubCatSlug={newSubCatSlug}
            newSubCatIcon={newSubCatIcon}
            newSubCatDesc={newSubCatDesc}
            newSubCatOrder={newSubCatOrder}
            GRADIENT_PRESETS={GRADIENT_PRESETS}
            DynamicIcon={DynamicIcon}
            IconPicker={IconPicker}
            SubCategoryIconPicker={SubCategoryIconPicker}
            ImageInput={ImageInput}
            setEditingCategory={setEditingCategory}
            setEditingSubCategory={setEditingSubCategory}
            setEditCatName={setEditCatName}
            setEditCatSlug={setEditCatSlug}
            setEditCatIcon={setEditCatIcon}
            setEditCatImage={setEditCatImage}
            setEditCatGradient={setEditCatGradient}
            setEditCatOrder={setEditCatOrder}
            setEditSubName={setEditSubName}
            setEditSubSlug={setEditSubSlug}
            setEditSubIcon={setEditSubIcon}
            setEditSubDesc={setEditSubDesc}
            setEditSubOrder={setEditSubOrder}
            setEditSubCatId={setEditSubCatId}
            setNewCatName={setNewCatName}
            setNewCatSlug={setNewCatSlug}
            setNewCatIcon={setNewCatIcon}
            setNewCatImage={setNewCatImage}
            setNewCatGradient={setNewCatGradient}
            setNewCatOrder={setNewCatOrder}
            setSelectedCatForSub={setSelectedCatForSub}
            setNewSubCatName={setNewSubCatName}
            setNewSubCatSlug={setNewSubCatSlug}
            setNewSubCatIcon={setNewSubCatIcon}
            setNewSubCatDesc={setNewSubCatDesc}
            setNewSubCatOrder={setNewSubCatOrder}
            handleUpdateCategory={handleUpdateCategory}
            handleUpdateSubCategory={handleUpdateSubCategory}
            handleCreateCategory={handleCreateCategory}
            handleCreateSubCategory={handleCreateSubCategory}
            startEditingCategory={startEditingCategory}
            startEditingSubCategory={startEditingSubCategory}
            handleMoveCategory={handleMoveCategory}
            handleMoveSubCategory={handleMoveSubCategory}
            handleDeleteCategory={handleDeleteCategory}
            handleDeleteSubCategory={handleDeleteSubCategory}
          />
        )}
        {activeTab === 'users' && (
          <AdminUsersSection
            currentUserRole={user.role}
            onNotify={showAdminToast}
          />
        )}
        {activeTab === 'orders' && (
          <AdminOrdersSection
            orders={orders}
            orderFilter={orderFilter}
            orderSearch={orderSearch}
            orderSort={orderSort}
            expandedOrderId={expandedOrderId}
            deliveryDrafts={deliveryDrafts}
            setExpandedOrderId={setExpandedOrderId}
            setOrderFilter={setOrderFilter}
            setOrderSearch={setOrderSearch}
            setOrderSort={setOrderSort}
            setDeliveryDrafts={setDeliveryDrafts}
            onUpdateStatus={onUpdateStatus}
            onAdminOrderAction={onAdminOrderAction}
            onResendOrderInvoiceEmail={onResendOrderInvoiceEmail}
            requestOrderStatusChange={requestOrderStatusChange}
            onRequestRejectPayment={(orderId) => setAdminConfirmation({
              title: 'Rejeter le paiement ?',
              message: 'Cette commande passera en statut annulé et le client devra recommencer son paiement.',
              confirmLabel: 'Rejeter le paiement',
              onConfirm: () => onAdminOrderAction('rejectPayment', orderId, { reason: 'Paiement rejeté par un administrateur.' })
            })}
            getOrderStepIndex={getOrderStepIndex}
            getOrderStatusClasses={getOrderStatusClasses}
            ORDER_STATUS_LABELS={ORDER_STATUS_LABELS}
            ORDER_STATUS_STEPS={ORDER_STATUS_STEPS}
          />
        )}
        {activeTab === 'listings' && (
          <AdminListingsSection
            listings={listings}
            categories={categories}
            userRole={user.role}
            navigateTo={navigateTo}
            onCreateNew={() => requestAdminTab('create')}
            onEditListing={startEditingListing}
            onDeleteListing={handleDeleteListingClick}
            getListingStateClasses={getListingStateClasses}
          />
        )}
      </div>
    {listingPendingDelete && (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-rose-500 to-red-600 px-6 py-5 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 border border-white/20">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black">Confirmer la suppression</h3>
                  <p className="text-sm text-rose-100">Cette action est irreversible.</p>
                </div>
              </div>
              <button onClick={() => !isDeletingListing && setListingPendingDelete(null)} className="text-white/80 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
          </div>
          <div className="px-6 py-6 space-y-4">
            <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-4">
              <p className="text-sm font-semibold text-slate-900">Voulez-vous vraiment supprimer ce produit ?</p>
              <p className="mt-2 text-sm text-slate-600">
                <span className="font-bold text-slate-900">{listingPendingDelete.title}</span>
                {' '}sera retiré du catalogue et ne pourra plus être commandé.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setListingPendingDelete(null)}
                disabled={isDeletingListing}
                className="px-5 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-60"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDeleteListing}
                disabled={isDeletingListing}
                className="inline-flex items-center px-5 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-60"
              >
                {isDeletingListing ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Trash2 size={16} className="mr-2" />}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

// --- USER DASHBOARD ---
export const UserDashboard: React.FC<{
  user: User;
  orders: Order[];
  notifications: ClientNotification[];
  navigateTo: (page: string) => void;
  onMarkNotificationRead: (notificationId: string) => void;
  onMarkAllNotificationsRead: () => void;
}> = ({ user, orders, notifications, navigateTo, onMarkNotificationRead, onMarkAllNotificationsRead }) => {
  const sortedOrders = [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const unreadNotifications = notifications.filter((notification) => !notification.read);
  const [deliveryByOrder, setDeliveryByOrder] = useState<Record<string, Array<{ id: string; deliveryContent: string; deliveryType: string; activationGuide?: string; restrictions?: string; region?: string }>>>({});
  const [deliveryLoadingId, setDeliveryLoadingId] = useState<string | null>(null);
  const [deliveryError, setDeliveryError] = useState<Record<string, string>>({});

  const loadDelivery = async (order: Order) => {
    setDeliveryLoadingId(order.id);
    setDeliveryError((current) => ({ ...current, [order.id]: '' }));
    try {
      const result = await api.getOrderDelivery(order.orderNumber);
      setDeliveryByOrder((current) => ({ ...current, [order.id]: result.deliveries }));
    } catch (error) {
      setDeliveryError((current) => ({
        ...current,
        [order.id]: error instanceof Error ? error.message : 'Livraison indisponible pour le moment.'
      }));
    } finally {
      setDeliveryLoadingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <img src={user.avatarUrl || 'https://via.placeholder.com/150'} className="w-16 h-16 rounded-full border-2 border-indigo-500 shadow-sm object-cover" />
          <div>
            <h1 className="text-2xl font-black text-slate-900">Bonjour, {user.username} !</h1>
            <p className="text-sm text-slate-500">Gérez vos commandes et votre profil ici.</p>
          </div>
        </div>
        <button 
          onClick={() => navigateTo('profile')}
          className="bg-white border border-slate-200 text-slate-900 font-bold px-6 py-3 rounded-xl hover:bg-slate-50 transition-all flex items-center shadow-sm"
        >
          <UserIcon size={18} className="mr-2 text-indigo-600" /> Modifier mon profil
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-indigo-600 p-6 rounded-2xl shadow-lg text-white">
            <div className="text-xs font-bold text-indigo-200 uppercase tracking-wider mb-1">Solde Actuel</div>
            <div className="text-3xl font-black">{user.balance.toFixed(2)} TND</div>
            <div className="mt-4 pt-4 border-t border-indigo-500 flex justify-between items-center">
              <span className="text-xs text-indigo-100 italic">Prêt pour vos achats</span>
              <button className="text-[10px] font-bold uppercase bg-white text-indigo-600 px-2 py-1 rounded">Recharger</button>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center">
              <Clock size={18} className="mr-2 text-slate-400" /> Activité Récente
            </h3>
            <div className="space-y-4">
              {sortedOrders.slice(0, 3).map(o => (
                <div key={o.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 mr-2"></div>
                    <span className="text-slate-600 truncate max-w-[120px]">{o.items?.[0]?.titleSnapshot || 'Commande'}</span>
                  </div>
                  <span className="text-slate-400 text-xs">{new Date(o.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
              {orders.length === 0 && <p className="text-xs text-slate-400 italic">Aucune activité récente.</p>}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="font-bold text-slate-900 flex items-center">
                <LucideIcons.BellRing size={18} className="mr-2 text-indigo-500" /> Notifications
              </h3>
              {unreadNotifications.length > 0 && (
                <button
                  type="button"
                  onClick={onMarkAllNotificationsRead}
                  className="rounded-full border border-slate-200 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600 hover:bg-slate-50"
                >
                  Tout marquer lu
                </button>
              )}
            </div>
            <div className="space-y-3">
              {notifications.slice(0, 6).map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => !notification.read && onMarkNotificationRead(notification.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${notification.read ? 'border-slate-200 bg-slate-50' : 'border-indigo-200 bg-indigo-50 hover:border-indigo-300'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-black text-slate-900">{notification.title}</div>
                      <div className="mt-1 text-xs leading-5 text-slate-600">{notification.message}</div>
                      <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {notification.orderNumber && <span>{notification.orderNumber}</span>}
                        <span>{new Date(notification.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                    {!notification.read && <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black uppercase text-indigo-700">Nouveau</span>}
                  </div>
                </button>
              ))}
              {notifications.length === 0 && <p className="text-xs text-slate-400 italic">Aucune notification pour le moment.</p>}
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-4">
          <h2 className="font-black text-xl text-slate-900 flex items-center">
            <History size={20} className="mr-2 text-indigo-600" /> Historique des Commandes
          </h2>
          <div className="space-y-4">
            {sortedOrders.map((o) => (
               <div key={o.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all hover:shadow-md">
                  <div className="flex-1 w-full">
                     <div className="text-[10px] font-bold text-indigo-600 uppercase mb-1 tracking-widest">{o.orderNumber}</div>
                     {o.invoice?.invoiceNumber && <div className="text-[11px] text-slate-400">Facture: {o.invoice.invoiceNumber}</div>}
                     <h3 className="font-bold text-slate-900 text-lg">{o.items?.[0]?.titleSnapshot || 'Commande'}</h3>
                     <div className="mt-2 flex flex-wrap gap-2">
                       <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${getOrderStatusClasses(o.status)}`}>
                         {ORDER_STATUS_LABELS[o.status] || o.status}
                       </span>
                       {o.payments?.[0] && (
                         <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${o.payments[0].status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : o.payments[0].status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                           Paiement {o.payments[0].status === 'SUBMITTED' ? 'en cours de traitement' : o.payments[0].status}
                         </span>
                       )}
                     </div>
                     <div className="text-xs text-slate-500 mt-1 flex items-center">
                       <Clock size={12} className="mr-1" /> {new Date(o.createdAt).toLocaleString()}
                     </div>
                     <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
                       {ORDER_STATUS_STEPS.map((step, index) => {
                         const currentStepIndex = getOrderStepIndex(o.status);
                         const isDone = currentStepIndex >= index;
                         const isCurrent = o.status === step.status || (index === 0 && [OrderStatus.REGISTERED, OrderStatus.PENDING_PAYMENT, OrderStatus.PAYMENT_UNDER_REVIEW, OrderStatus.IN_PROGRESS].includes(o.status));
                         const isCancelled = o.status === OrderStatus.CANCELLED;
                         return (
                           <div key={step.status} className={`rounded-2xl border p-3 ${isCancelled ? 'border-red-200 bg-red-50' : isCurrent ? 'border-indigo-200 bg-indigo-50' : isDone ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-slate-50'}`}>
                              <div className={`mb-2 flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-black ${isCancelled ? 'bg-red-600 text-white' : isCurrent ? 'bg-indigo-600 text-white' : isDone ? 'bg-green-600 text-white' : 'bg-slate-300 text-slate-700'}`}>{index + 1}</div>
                              <div className="text-sm font-bold text-slate-900">{step.label}</div>
                           </div>
                         );
                       })}
                     </div>
                  </div>
                  
                  {o.items?.[0]?.deliveredContent && (
                     <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 w-full md:w-auto">
                         <div className="text-[10px] font-bold text-indigo-600 uppercase mb-2 tracking-wider">Contenu Livré</div>
                         <div className="text-sm font-mono font-bold text-slate-900 select-all break-all bg-white p-2 rounded border border-indigo-50 shadow-inner">
                           {o.items[0].deliveredContent}
                         </div>
                     </div>
                  )}

                  {o.status === OrderStatus.DELIVERED && (
                    <div className="w-full rounded-xl border border-emerald-100 bg-emerald-50 p-4 md:w-auto md:min-w-[260px]">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Produit livré</div>
                      {!deliveryByOrder[o.id] && (
                        <button
                          type="button"
                          onClick={() => loadDelivery(o)}
                          disabled={deliveryLoadingId === o.id}
                          className="mt-3 w-full rounded-xl bg-emerald-600 px-4 py-3 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                          {deliveryLoadingId === o.id ? 'Chargement...' : 'Voir ma livraison'}
                        </button>
                      )}
                      {deliveryError[o.id] && <div className="mt-3 rounded-lg bg-red-50 p-2 text-xs font-semibold text-red-700">{deliveryError[o.id]}</div>}
                      {deliveryByOrder[o.id] && (
                        <div className="mt-3 space-y-3">
                          {deliveryByOrder[o.id].map((delivery) => (
                            <div key={delivery.id} className="rounded-xl border border-emerald-100 bg-white p-3">
                              <div className="mb-2 text-[10px] font-black uppercase text-emerald-700">{delivery.deliveryType}</div>
                              <pre className="whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 font-mono text-xs font-bold text-slate-900">{delivery.deliveryContent}</pre>
                              {delivery.activationGuide && <div className="mt-2 text-xs text-slate-600"><strong>Activation:</strong> {delivery.activationGuide}</div>}
                              {delivery.restrictions && <div className="mt-1 text-xs text-slate-600"><strong>Restrictions:</strong> {delivery.restrictions}</div>}
                              {delivery.region && <div className="mt-1 text-xs text-slate-600"><strong>Region:</strong> {delivery.region}</div>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="text-right min-w-[100px]">
                     <div className="font-black text-slate-900 text-lg">{o.amount.toFixed(2)} TND</div>
                     <div className={`text-[10px] font-bold uppercase px-2 py-1 rounded mt-2 inline-block ${getOrderStatusClasses(o.status)}`}>
                         {ORDER_STATUS_LABELS[o.status]}
                     </div>
                  </div>
               </div>
            ))}
            {sortedOrders.length === 0 && (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300 text-slate-400 italic">
                    Vous n'avez pas encore passé de commande.
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Removed redundant X function as it's now imported from lucide-react
