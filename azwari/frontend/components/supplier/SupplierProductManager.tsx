'use client';

import React, { useState, useMemo } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  Truck, 
  Layers, 
  X, 
  Eye, 
  Power, 
  Filter, 
  SlidersHorizontal,
  ChevronDown,
  Percent,
  Clock,
  ArrowUpDown,
  LayoutGrid,
  List,
  Sparkles,
  Archive,
  RefreshCw,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { Product, Business } from '../../types';
import { ProductImage, CURATED_ETHIOPIAN_PRODUCT_GALLERY } from '../common/ProductImage';

interface SupplierProductManagerProps {
  products: Product[];
  currentSupplier: Business;
  onCreateProduct: (prodData: Partial<Product>) => boolean;
  onUpdateProduct: (productId: string, updates: Partial<Product>) => boolean;
  onDeleteProduct: (productId: string, permanent?: boolean) => boolean;
  showAddModalInitially?: boolean;
  onCloseInitialAddModal?: () => void;
}

const ADDIS_SUBCITIES = [
  'Bole',
  'Kirkos',
  'Yeka',
  'Arada',
  'Lideta',
  'Nifas Silk-Lafto',
  'Kolfe Keranio',
  'Gulele',
  'Akaki Kality',
  'Lemi Kura'
];

export const SupplierProductManager: React.FC<SupplierProductManagerProps> = ({
  products,
  currentSupplier,
  onCreateProduct,
  onUpdateProduct,
  onDeleteProduct,
  showAddModalInitially = false,
  onCloseInitialAddModal
}) => {
  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock' | 'inactive'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modal States
  const [showAddModal, setShowAddModal] = useState(showAddModalInitially);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  // Form State for Adding Product
  const [addForm, setAddForm] = useState({
    name: '',
    category: 'Fashion & Leather' as Product['category'],
    sku: '',
    description: '',
    imageUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80',
    unitPrice: 2400,
    suggestedRetailPrice: 3000,
    costPrice: 1500,
    stock: 25,
    minimumOrderQty: 1,
    deliveryAreas: ['Bole', 'Kirkos', 'Yeka', 'Arada'],
    standardDeliveryFee: 150,
    estimatedFulfillmentHours: 24,
    commType: 'fixed_per_unit' as 'fixed_per_unit' | 'percentage',
    commRate: 300,
    settlementHours: 48,
    returnDays: 3,
  });

  // Form State for Editing Product
  const [editForm, setEditForm] = useState<Partial<Product> & { commType?: 'fixed_per_unit' | 'percentage'; commRate?: number; imageUrl?: string }>({});

  // Image Uploading States for Supabase Storage (Azwari_Product_Images)
  const [isUploadingAddImage, setIsUploadingAddImage] = useState(false);
  const [isUploadingEditImage, setIsUploadingEditImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Helper to send image file to backend Express API, which uploads to Supabase Storage
  const handleFileUpload = async (file: File, isEdit: boolean = false) => {
    if (!file) return;
    setUploadError(null);
    if (isEdit) setIsUploadingEditImage(true);
    else setIsUploadingAddImage(true);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const fileData = e.target?.result as string;
        if (!fileData) {
          if (isEdit) setIsUploadingEditImage(false);
          else setIsUploadingAddImage(false);
          return;
        }

        try {
          const res = await fetch('/api/upload/product-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileData,
              fileName: file.name,
              category: isEdit ? editForm.category : addForm.category,
              productId: isEdit && editingProduct ? editingProduct.id : undefined,
            }),
          });

          const data = await res.json();
          if (data.success && data.imageUrl) {
            if (isEdit) {
              setEditForm((prev) => ({ ...prev, imageUrl: data.imageUrl }));
            } else {
              setAddForm((prev) => ({ ...prev, imageUrl: data.imageUrl }));
            }
          } else {
            console.error('[UPLOAD ERROR]', data.error);
            setUploadError(data.error || 'Upload failed');
            if (isEdit) {
              setEditForm((prev) => ({ ...prev, imageUrl: fileData }));
            } else {
              setAddForm((prev) => ({ ...prev, imageUrl: fileData }));
            }
          }
        } catch (fetchErr: any) {
          console.error('[UPLOAD NETWORK ERROR]', fetchErr);
          setUploadError(fetchErr.message || 'Network upload failed');
          if (isEdit) {
            setEditForm((prev) => ({ ...prev, imageUrl: fileData }));
          } else {
            setAddForm((prev) => ({ ...prev, imageUrl: fileData }));
          }
        } finally {
          if (isEdit) setIsUploadingEditImage(false);
          else setIsUploadingAddImage(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error('[FILE READ ERROR]', err);
      setUploadError(err.message || 'File reading failed');
      if (isEdit) setIsUploadingEditImage(false);
      else setIsUploadingAddImage(false);
    }
  };

  // Sync initial add modal prop if changed from parent
  React.useEffect(() => {
    if (showAddModalInitially) {
      setShowAddModal(true);
    }
  }, [showAddModalInitially]);

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    if (onCloseInitialAddModal) onCloseInitialAddModal();
  };

  // Open Edit Modal and prefill
  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setEditForm({
      name: product.name,
      category: product.category,
      sku: product.sku,
      description: product.description,
      imageUrl: product.imageUrl || (product.images && product.images[0]) || '',
      unitPrice: product.unitPrice,
      suggestedRetailPrice: product.suggestedRetailPrice || product.unitPrice * 1.25,
      costPrice: product.costPrice || product.unitPrice * 0.65,
      stock: product.stock,
      minimumOrderQty: product.minimumOrderQty,
      deliveryAreas: product.deliveryAreas || ['Bole', 'Kirkos'],
      standardDeliveryFee: product.standardDeliveryFee,
      estimatedFulfillmentHours: product.estimatedFulfillmentHours,
      status: product.status,
      commType: product.commissionTerms?.type || 'fixed_per_unit',
      commRate: product.commissionTerms?.rateOrAmount || 250,
    });
  };

  // Quick Inline Stock increment
  const handleQuickStockAdjust = (product: Product, delta: number) => {
    const newStock = Math.max(0, product.stock + delta);
    const newStatus = newStock === 0 ? 'out_of_stock' : product.status === 'out_of_stock' ? 'active' : product.status;
    onUpdateProduct(product.id, { stock: newStock, status: newStatus });
  };

  // Quick Toggle Active/Inactive
  const handleToggleProductStatus = (product: Product) => {
    const nextStatus = product.status === 'active' ? 'draft' : 'active';
    onUpdateProduct(product.id, {
      status: nextStatus,
      isActive: nextStatus === 'active',
    } as any);
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Search
      const matchSearch =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());

      // Category
      const matchCategory = selectedCategory === 'all' || p.category === selectedCategory;

      // Stock / Status
      let matchStock = true;
      if (stockFilter === 'in_stock') matchStock = p.stock > 9 && p.status === 'active';
      else if (stockFilter === 'low_stock') matchStock = p.stock > 0 && p.stock <= 9;
      else if (stockFilter === 'out_of_stock') matchStock = p.stock === 0 || p.status === 'out_of_stock';
      else if (stockFilter === 'inactive') matchStock = p.status === 'draft';

      return matchSearch && matchCategory && matchStock;
    });
  }, [products, searchQuery, selectedCategory, stockFilter]);

  // Aggregate Metrics
  const stats = useMemo(() => {
    const total = products.length;
    const inStock = products.filter((p) => p.stock > 9 && p.status === 'active').length;
    const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 9).length;
    const outOfStock = products.filter((p) => p.stock === 0 || p.status === 'out_of_stock').length;
    const totalCatalogValue = products.reduce((sum, p) => sum + p.unitPrice * (p.stock || 0), 0);
    return { total, inStock, lowStock, outOfStock, totalCatalogValue };
  }, [products]);

  // Submit Add Product Form
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const generatedSku = addForm.sku || `SKU-${Date.now().toString(36).toUpperCase()}`;

    const imgUrl = addForm.imageUrl.trim();
    onCreateProduct({
      supplierId: currentSupplier.id,
      supplierName: currentSupplier.name,
      name: addForm.name,
      category: addForm.category,
      sku: generatedSku,
      description: addForm.description,
      imageUrl: imgUrl || undefined,
      images: imgUrl ? [imgUrl] : [],
      unitPrice: Number(addForm.unitPrice),
      suggestedRetailPrice: Number(addForm.suggestedRetailPrice),
      costPrice: Number(addForm.costPrice),
      stock: Number(addForm.stock),
      minimumOrderQty: Number(addForm.minimumOrderQty),
      deliveryAreas: addForm.deliveryAreas,
      standardDeliveryFee: Number(addForm.standardDeliveryFee),
      estimatedFulfillmentHours: Number(addForm.estimatedFulfillmentHours),
      fulfillmentType: 'physical',
      status: Number(addForm.stock) > 0 ? 'active' : 'out_of_stock',
      commissionTerms: {
        id: 'comm_' + Date.now().toString(36),
        productId: '',
        type: addForm.commType,
        rateOrAmount: Number(addForm.commRate),
        calculationBasis: 'subtotal_excluding_delivery',
        eligibilityConditions: 'Eligible 48 hours after verified buyer delivery without dispute.',
        returnPeriodDays: addForm.returnDays,
        settlementDeadlineHours: addForm.settlementHours,
        version: 1,
        isActive: true,
        effectiveFrom: new Date().toISOString(),
      },
    });

    handleCloseAddModal();
    // Reset form
    setAddForm({
      name: '',
      category: 'Fashion & Leather',
      sku: '',
      description: '',
      imageUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80',
      unitPrice: 2400,
      suggestedRetailPrice: 3000,
      costPrice: 1500,
      stock: 25,
      minimumOrderQty: 1,
      deliveryAreas: ['Bole', 'Kirkos', 'Yeka', 'Arada'],
      standardDeliveryFee: 150,
      estimatedFulfillmentHours: 24,
      commType: 'fixed_per_unit',
      commRate: 300,
      settlementHours: 48,
      returnDays: 3,
    });
  };

  // Submit Edit Product Form
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const editImgUrl = editForm.imageUrl ? editForm.imageUrl.trim() : undefined;
    const updates: Partial<Product> = {
      name: editForm.name,
      category: editForm.category,
      sku: editForm.sku,
      description: editForm.description,
      imageUrl: editImgUrl,
      images: editImgUrl ? [editImgUrl] : [],
      unitPrice: Number(editForm.unitPrice),
      suggestedRetailPrice: Number(editForm.suggestedRetailPrice),
      costPrice: Number(editForm.costPrice),
      stock: Number(editForm.stock),
      minimumOrderQty: Number(editForm.minimumOrderQty),
      deliveryAreas: editForm.deliveryAreas,
      standardDeliveryFee: Number(editForm.standardDeliveryFee),
      estimatedFulfillmentHours: Number(editForm.estimatedFulfillmentHours),
      status: Number(editForm.stock) === 0 ? 'out_of_stock' : editForm.status,
      isActive: editForm.status === 'active',
      commissionTerms: {
        ...editingProduct.commissionTerms,
        type: editForm.commType || editingProduct.commissionTerms.type,
        rateOrAmount: Number(editForm.commRate ?? editingProduct.commissionTerms.rateOrAmount),
      },
    };

    onUpdateProduct(editingProduct.id, updates);
    setEditingProduct(null);
  };

  // Confirm and execute delete
  const handleConfirmDelete = (permanent: boolean = false) => {
    if (!deletingProduct) return;
    onDeleteProduct(deletingProduct.id, permanent);
    setDeletingProduct(null);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Summary Statistics */}
      <div className="glass-card rounded-3xl border border-white/90 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">Product Catalog & Inventory</h1>
              <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md border border-slate-200">
                {products.length} Products
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage your merchandise offerings, inventory stock, Addis delivery fees, and independent sales agent commission rates.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Add New Product</span>
          </button>
        </div>

        {/* Operational KPI Tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          <div className="p-3.5 rounded-2xl glass-card-subtle border border-slate-200/80">
            <span className="text-[11px] font-medium text-slate-500 block">Total Active Catalog</span>
            <div className="font-mono-numbers text-xl font-bold text-slate-900 mt-1">
              {stats.total}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Visible to sales agents</span>
          </div>

          <div className="p-3.5 rounded-2xl glass-card-subtle border border-slate-200/80">
            <span className="text-[11px] font-medium text-emerald-700 block">Healthy In-Stock</span>
            <div className="font-mono-numbers text-xl font-bold text-emerald-800 mt-1">
              {stats.inStock}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">&gt; 10 units available</span>
          </div>

          <div className="p-3.5 rounded-2xl glass-card-subtle border border-slate-200/80">
            <span className="text-[11px] font-medium text-amber-700 block">Low Stock Alert</span>
            <div className="font-mono-numbers text-xl font-bold text-amber-700 mt-1 flex items-center gap-2">
              <span>{stats.lowStock}</span>
              {stats.lowStock > 0 && (
                <span className="text-[10px] font-sans font-semibold bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded">
                  Restock
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">1 - 9 units left</span>
          </div>

          <div className="p-3.5 rounded-2xl glass-card-subtle border border-slate-200/80">
            <span className="text-[11px] font-medium text-slate-500 block">Total Inventory Value</span>
            <div className="font-mono-numbers text-xl font-bold text-slate-900 mt-1">
              ETB {stats.totalCatalogValue.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">At unit trade price</span>
          </div>
        </div>
      </div>

      {/* 2. Search, Filter, and Controls Bar */}
      <div className="glass-card rounded-2xl border border-white/90 p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products by title, SKU, or keywords..."
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Stock Filter & View Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl text-xs border border-slate-200">
              <button
                onClick={() => setStockFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  stockFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({products.length})
              </button>
              <button
                onClick={() => setStockFilter('in_stock')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  stockFilter === 'in_stock' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                In Stock ({stats.inStock})
              </button>
              <button
                onClick={() => setStockFilter('low_stock')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  stockFilter === 'low_stock' ? 'bg-white text-amber-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Low Stock ({stats.lowStock})
              </button>
              <button
                onClick={() => setStockFilter('out_of_stock')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  stockFilter === 'out_of_stock' ? 'bg-white text-rose-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Out of Stock ({stats.outOfStock})
              </button>
            </div>

            {/* Grid / Table Toggle */}
            <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  viewMode === 'grid' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Pills Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 text-xs">
          <span className="text-[11px] font-medium text-slate-400 mr-1 shrink-0">Category:</span>
          {['all', 'Fashion & Leather', 'Coffee & Agro', 'Beauty & Health', 'Electronics & Home', 'Artisan Crafts'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white font-semibold shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat === 'all' ? 'All Categories' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Products List Rendering (Grid or Table) */}
      {filteredProducts.length === 0 ? (
        <div className="glass-card rounded-3xl border border-white/90 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No products matched your filter</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try resetting your search query or category filters, or list a new item to offer sales commissions to independent agents.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setStockFilter('all');
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reset Filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProducts.map((prod) => {
            const isOutOfStock = prod.stock === 0 || prod.status === 'out_of_stock';
            const isLowStock = prod.stock > 0 && prod.stock <= 9;

            return (
              <div
                key={prod.id}
                className="glass-card-hover rounded-3xl border border-white/90 p-5 flex flex-col justify-between space-y-4 relative group overflow-hidden"
              >
                {/* Visual Image Header with Overlays */}
                <div className="relative -mx-5 -mt-5 h-44 bg-slate-100 overflow-hidden border-b border-slate-100/80">
                  <ProductImage
                    src={prod.imageUrl}
                    category={prod.category}
                    alt={prod.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Status Overlay Badge */}
                  <div className="absolute top-3 right-3">
                    <span
                      className={`text-[10px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm backdrop-blur-md ${
                        isOutOfStock
                          ? 'bg-rose-950/85 text-rose-100 border border-rose-500/30'
                          : isLowStock
                          ? 'bg-amber-950/85 text-amber-100 border border-amber-500/30'
                          : prod.status === 'draft'
                          ? 'bg-slate-900/85 text-slate-200 border border-slate-600/30'
                          : 'bg-emerald-950/85 text-emerald-100 border border-emerald-500/30'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isOutOfStock
                            ? 'bg-rose-400'
                            : isLowStock
                            ? 'bg-amber-400 animate-pulse'
                            : prod.status === 'draft'
                            ? 'bg-slate-400'
                            : 'bg-emerald-400'
                        }`}
                      />
                      {isOutOfStock
                        ? 'Out of Stock'
                        : isLowStock
                        ? `Low (${prod.stock})`
                        : prod.status === 'draft'
                        ? 'Paused'
                        : 'Active'}
                    </span>
                  </div>

                  {/* Category Pill Overlay */}
                  <div className="absolute bottom-3 left-3">
                    <span className="text-[10px] font-semibold bg-white/95 backdrop-blur-md text-slate-800 px-2.5 py-0.5 rounded-lg border border-white/70 shadow-xs">
                      {prod.category}
                    </span>
                  </div>
                </div>

                {/* SKU & Title */}
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-slate-400">
                      {prod.sku}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mt-1 line-clamp-1" title={prod.name}>
                    {prod.name}
                  </h3>

                  <p className="text-xs text-slate-600 mt-1 line-clamp-2" title={prod.description}>
                    {prod.description || 'No description provided.'}
                  </p>
                </div>

                {/* Economics Box */}
                <div className="p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/80 space-y-2 text-xs">
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-500">Unit Price:</span>
                    <span className="font-mono-numbers text-base font-bold text-slate-900">
                      ETB {prod.unitPrice.toLocaleString()}
                    </span>
                  </div>

                  {/* Commission Offered */}
                  <div className="flex justify-between text-xs pt-1 border-t border-slate-200">
                    <span className="font-semibold text-slate-900">Agent Commission:</span>
                    <span className="font-mono-numbers font-bold text-amber-700">
                      {prod.commissionTerms?.type === 'fixed_per_unit'
                        ? `ETB ${prod.commissionTerms.rateOrAmount}/unit`
                        : `${prod.commissionTerms?.rateOrAmount || 10}% of subtotal`}
                    </span>
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Delivery (Addis):</span>
                    <span className="font-mono-numbers text-slate-700">ETB {prod.standardDeliveryFee}</span>
                  </div>
                </div>

                {/* Stock Quick Controls & Areas */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Inventory Stock:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleQuickStockAdjust(prod, -1)}
                        className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs"
                        title="Reduce 1 unit"
                      >
                        -
                      </button>
                      <span className="font-mono-numbers font-bold text-slate-900 px-1">
                        {prod.stock}
                      </span>
                      <button
                        onClick={() => handleQuickStockAdjust(prod, 5)}
                        className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs"
                        title="Add 5 units"
                      >
                        +5
                      </button>
                    </div>
                  </div>

                  {/* Delivery Areas preview */}
                  <div className="flex items-center gap-1 flex-wrap text-[10px] text-slate-500">
                    <span className="text-slate-400">Areas:</span>
                    {(prod.deliveryAreas || ['Bole', 'Kirkos']).slice(0, 3).map((area) => (
                      <span key={area} className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                        {area}
                      </span>
                    ))}
                    {(prod.deliveryAreas?.length || 0) > 3 && (
                      <span className="text-slate-400 font-mono">+{prod.deliveryAreas.length - 3}</span>
                    )}
                  </div>
                </div>

                {/* Action Buttons Toolbar */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleToggleProductStatus(prod)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-colors ${
                      prod.status === 'active'
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                    }`}
                    title={prod.status === 'active' ? 'Pause product' : 'Activate product'}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>{prod.status === 'active' ? 'Pause' : 'Activate'}</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(prod)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold transition-colors shadow-2xs"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => setDeletingProduct(prod)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Archive or Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Product Details</th>
                  <th className="py-3 px-4">Category & SKU</th>
                  <th className="py-3 px-4 text-right">Unit Price</th>
                  <th className="py-3 px-4 text-center">Stock</th>
                  <th className="py-3 px-4">Agent Commission</th>
                  <th className="py-3 px-4">Delivery</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((prod) => {
                  const isOutOfStock = prod.stock === 0 || prod.status === 'out_of_stock';
                  const isLowStock = prod.stock > 0 && prod.stock <= 9;
                  return (
                    <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200/80">
                            <ProductImage
                              src={prod.imageUrl}
                              category={prod.category}
                              alt={prod.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate max-w-xs">{prod.name}</div>
                            <div className="text-[11px] text-slate-400 line-clamp-1 max-w-xs">{prod.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-700 block">{prod.category}</span>
                        <span className="font-mono text-slate-400 text-[10px]">{prod.sku}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-mono-numbers font-bold text-slate-900">
                          ETB {prod.unitPrice.toLocaleString()}
                        </div>
                        {prod.costPrice && (
                          <div className="text-[10px] text-slate-400">Cost: ETB {prod.costPrice}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1 font-mono-numbers font-bold">
                          <button
                            onClick={() => handleQuickStockAdjust(prod, -1)}
                            className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs"
                          >
                            -
                          </button>
                          <span className={`px-1.5 ${isOutOfStock ? 'text-rose-700' : isLowStock ? 'text-amber-700' : 'text-slate-900'}`}>
                            {prod.stock}
                          </span>
                          <button
                            onClick={() => handleQuickStockAdjust(prod, 5)}
                            className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono-numbers font-semibold text-amber-800">
                        {prod.commissionTerms?.type === 'fixed_per_unit'
                          ? `ETB ${prod.commissionTerms.rateOrAmount}/unit`
                          : `${prod.commissionTerms?.rateOrAmount || 12}%`}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                        <div>ETB {prod.standardDeliveryFee}</div>
                        <div className="text-[10px] text-slate-400">{prod.estimatedFulfillmentHours}h SLA</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block ${
                            isOutOfStock
                              ? 'bg-rose-50 text-rose-800'
                              : isLowStock
                              ? 'bg-amber-50 text-amber-800'
                              : 'bg-emerald-50 text-emerald-800'
                          }`}
                        >
                          {isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'Active'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(prod)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg text-xs"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeletingProduct(prod)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: ADD PRODUCT */}
      {/* ============================================================ */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-modal w-full max-w-2xl rounded-3xl shadow-2xl border border-white/90 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 bg-white/70">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900">
                  List New Product for Independent Sales Agents
                </h3>
              </div>
              <button onClick={handleCloseAddModal} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Product Title & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Product Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Premium Handcrafted Genuine Leather Travel Bag"
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={addForm.category}
                    onChange={(e) => setAddForm({ ...addForm, category: e.target.value as any })}
                    className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 bg-white text-slate-900"
                  >
                    <option value="Fashion & Leather">Fashion & Leather</option>
                    <option value="Coffee & Agro">Coffee & Agro</option>
                    <option value="Beauty & Health">Beauty & Health</option>
                    <option value="Electronics & Home">Electronics & Home</option>
                    <option value="Artisan Crafts">Artisan Crafts</option>
                  </select>
                </div>
              </div>

              {/* SKU & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    SKU Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ETH-BAG-001"
                    value={addForm.sku}
                    onChange={(e) => setAddForm({ ...addForm, sku: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-900 font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Description & Selling Points *
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Describe material origin, key selling features, warranty, and customer fit..."
                    value={addForm.description}
                    onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-900"
                  />
                </div>
              </div>

              {/* Product Visual Imagery */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-amber-600" />
                    <span className="text-[11px] font-semibold text-slate-800">Product Visual Imagery *</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Visible to direct buyers & sales agents</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-start">
                  {/* Live Thumbnail Preview */}
                  <div className="w-24 h-24 rounded-2xl overflow-hidden bg-white border border-slate-200 shrink-0 relative shadow-xs">
                    <ProductImage
                      src={addForm.imageUrl}
                      category={addForm.category}
                      alt="Product preview"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 space-y-2 w-full">
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="Paste image URL (https://...)"
                        value={addForm.imageUrl}
                        onChange={(e) => setAddForm({ ...addForm, imageUrl: e.target.value })}
                        className="flex-1 text-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-900 bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-500"
                      />
                      <label className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-semibold cursor-pointer shrink-0 transition-colors ${
                        isUploadingAddImage 
                          ? 'bg-amber-50 border-amber-300 text-amber-800' 
                          : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                      }`}>
                        {isUploadingAddImage ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
                            <span>Uploading...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5 text-slate-500" />
                            <span>Upload</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          disabled={isUploadingAddImage}
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleFileUpload(file, false);
                            }
                          }}
                        />
                      </label>
                    </div>

                    {/* Status notification for Supabase Storage */}
                    {isUploadingAddImage && (
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                        <RefreshCw className="w-3 h-3 animate-spin text-amber-600" />
                        <span>Sending to backend and saving to Supabase Storage (Azwari_Product_Images)...</span>
                      </div>
                    )}
                    {!isUploadingAddImage && addForm.imageUrl && addForm.imageUrl.includes('Azwari_Product_Images') && (
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 font-medium">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Saved in Supabase Storage Bucket: <strong>Azwari_Product_Images</strong></span>
                      </div>
                    )}
                    {uploadError && (
                      <div className="flex items-center gap-1.5 text-[11px] text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                        <AlertCircle className="w-3 h-3 text-rose-600" />
                        <span>{uploadError}</span>
                      </div>
                    )}

                    {/* Presets quick-picker */}
                    <div>
                      <span className="text-[10px] font-medium text-slate-500 block mb-1">
                        Or pick from curated Ethiopian commercial photos:
                      </span>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                        {CURATED_ETHIOPIAN_PRODUCT_GALLERY.map((item, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setAddForm({ ...addForm, imageUrl: item.url, category: item.category as any })}
                            className={`text-[10px] px-2 py-0.5 rounded-lg border transition-all truncate max-w-[200px] ${
                              addForm.imageUrl === item.url
                                ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold'
                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                            title={item.title}
                          >
                            {item.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Product Pricing & Agent Commission */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Selling Price (ETB) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={addForm.unitPrice}
                    onChange={(e) => setAddForm({ ...addForm, unitPrice: parseInt(e.target.value) || 0 })}
                    placeholder="e.g. 1500"
                    className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-900 font-mono bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Commission Type *
                  </label>
                  <select
                    value={addForm.commType}
                    onChange={(e) => setAddForm({ ...addForm, commType: e.target.value as any })}
                    className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 bg-white text-slate-900"
                  >
                    <option value="percentage">Percentage (%) of Subtotal</option>
                    <option value="fixed_per_unit">Fixed ETB per Unit Sold</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    {addForm.commType === 'percentage' ? 'Commission Rate (%) *' : 'Commission Amount (ETB) *'}
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={addForm.commRate}
                    onChange={(e) => setAddForm({ ...addForm, commRate: parseInt(e.target.value) || 0 })}
                    placeholder={addForm.commType === 'percentage' ? 'e.g. 10' : 'e.g. 200'}
                    className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-900 font-mono bg-white"
                  />
                </div>
              </div>

              {/* Stock & Delivery Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Initial Stock Available *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={addForm.stock}
                    onChange={(e) => setAddForm({ ...addForm, stock: parseInt(e.target.value) || 0 })}
                    className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Addis Delivery Fee (ETB) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={addForm.standardDeliveryFee}
                    onChange={(e) => setAddForm({ ...addForm, standardDeliveryFee: parseInt(e.target.value) || 0 })}
                    className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Fulfillment Hours SLA
                  </label>
                  <select
                    value={addForm.estimatedFulfillmentHours}
                    onChange={(e) => setAddForm({ ...addForm, estimatedFulfillmentHours: parseInt(e.target.value) || 24 })}
                    className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 bg-white text-slate-900"
                  >
                    <option value={12}>12 Hours (Same Day Express)</option>
                    <option value={24}>24 Hours (Next Day Delivery)</option>
                    <option value={48}>48 Hours (Standard)</option>
                  </select>
                </div>
              </div>

              {/* Delivery Subcities in Addis */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                  Supported Addis Ababa Delivery Subcities:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ADDIS_SUBCITIES.map((subcity) => {
                    const isSelected = addForm.deliveryAreas.includes(subcity);
                    return (
                      <button
                        type="button"
                        key={subcity}
                        onClick={() => {
                          const updated = isSelected
                            ? addForm.deliveryAreas.filter((s) => s !== subcity)
                            : [...addForm.deliveryAreas, subcity];
                          setAddForm({ ...addForm, deliveryAreas: updated });
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                          isSelected
                            ? 'bg-slate-900 text-white font-semibold'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {isSelected ? `✓ ${subcity}` : `+ ${subcity}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleCloseAddModal}
                  className="px-4 py-2 text-xs text-slate-600 hover:text-slate-900 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-colors"
                >
                  Publish to Sales Agent Network
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: EDIT PRODUCT */}
      {/* ============================================================ */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-modal w-full max-w-2xl rounded-3xl shadow-2xl border border-white/90 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 bg-white/70">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Edit Product: {editingProduct.name}
                </h3>
              </div>
              <button onClick={() => setEditingProduct(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Product Title *</label>
                  <input
                    type="text"
                    required
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value as any })}
                    className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 bg-white text-slate-900"
                  >
                    <option value="Fashion & Leather">Fashion & Leather</option>
                    <option value="Coffee & Agro">Coffee & Agro</option>
                    <option value="Beauty & Health">Beauty & Health</option>
                    <option value="Electronics & Home">Electronics & Home</option>
                    <option value="Artisan Crafts">Artisan Crafts</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-900"
                />
              </div>

              {/* Product Visual Imagery */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-amber-600" />
                    <span className="text-[11px] font-semibold text-slate-800">Product Visual Imagery</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Live preview & agent catalog appearance</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-start">
                  {/* Live Thumbnail Preview */}
                  <div className="w-24 h-24 rounded-2xl overflow-hidden bg-white border border-slate-200 shrink-0 relative shadow-xs">
                    <ProductImage
                      src={editForm.imageUrl}
                      category={editForm.category}
                      alt="Product preview"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 space-y-2 w-full">
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="Paste image URL (https://...)"
                        value={editForm.imageUrl || ''}
                        onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })}
                        className="flex-1 text-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-900 bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-500"
                      />
                      <label className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-semibold cursor-pointer shrink-0 transition-colors ${
                        isUploadingEditImage 
                          ? 'bg-amber-50 border-amber-300 text-amber-800' 
                          : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                      }`}>
                        {isUploadingEditImage ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
                            <span>Uploading...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5 text-slate-500" />
                            <span>Upload</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          disabled={isUploadingEditImage}
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleFileUpload(file, true);
                            }
                          }}
                        />
                      </label>
                    </div>

                    {/* Status notification for Supabase Storage */}
                    {isUploadingEditImage && (
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                        <RefreshCw className="w-3 h-3 animate-spin text-amber-600" />
                        <span>Sending to backend and saving to Supabase Storage (Azwari_Product_Images)...</span>
                      </div>
                    )}
                    {!isUploadingEditImage && editForm.imageUrl && editForm.imageUrl.includes('Azwari_Product_Images') && (
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 font-medium">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Saved in Supabase Storage Bucket: <strong>Azwari_Product_Images</strong></span>
                      </div>
                    )}
                    {uploadError && (
                      <div className="flex items-center gap-1.5 text-[11px] text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                        <AlertCircle className="w-3 h-3 text-rose-600" />
                        <span>{uploadError}</span>
                      </div>
                    )}

                    {/* Presets quick-picker */}
                    <div>
                      <span className="text-[10px] font-medium text-slate-500 block mb-1">
                        Or pick from curated Ethiopian commercial photos:
                      </span>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                        {CURATED_ETHIOPIAN_PRODUCT_GALLERY.map((item, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setEditForm({ ...editForm, imageUrl: item.url, category: item.category as any })}
                            className={`text-[10px] px-2 py-0.5 rounded-lg border transition-all truncate max-w-[200px] ${
                              editForm.imageUrl === item.url
                                ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold'
                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                            title={item.title}
                          >
                            {item.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing & Stock */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div>
                  <label className="block text-[10px] text-slate-600 mb-1">Unit Price (ETB) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={editForm.unitPrice || 0}
                    onChange={(e) => setEditForm({ ...editForm, unitPrice: parseInt(e.target.value) || 0 })}
                    className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-600 mb-1">Available Stock *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editForm.stock || 0}
                    onChange={(e) => setEditForm({ ...editForm, stock: parseInt(e.target.value) || 0 })}
                    className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-600 mb-1">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                    className="w-full text-xs rounded-xl border border-slate-300 px-2.5 py-2 bg-white text-slate-900"
                  >
                    <option value="active">Active (Listed)</option>
                    <option value="draft">Paused (Hidden)</option>
                    <option value="out_of_stock">Out of Stock</option>
                  </select>
                </div>
              </div>

              {/* Commission Offered */}
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-600 mb-1">Commission Type</label>
                    <select
                      value={editForm.commType}
                      onChange={(e) => setEditForm({ ...editForm, commType: e.target.value as any })}
                      className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 bg-white text-slate-900"
                    >
                      <option value="percentage">Percentage (%) of Subtotal</option>
                      <option value="fixed_per_unit">Fixed ETB per Unit</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 mb-1">
                      {editForm.commType === 'percentage' ? 'Commission Rate (%)' : 'Commission Amount (ETB)'}
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={editForm.commRate || 0}
                      onChange={(e) => setEditForm({ ...editForm, commRate: parseInt(e.target.value) || 0 })}
                      className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-900 font-mono bg-white"
                    />
                  </div>
                </div>
                <div className="text-[10px] text-amber-900 bg-amber-100/80 px-2.5 py-1 rounded-lg">
                  💡 You can edit commission terms anytime. New rates apply to future sales. Orders already placed remain locked at their agreed snapshot.
                </div>
              </div>

              {/* Delivery Fee & Subcities */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Addis Delivery Fee (ETB)</label>
                  <input
                    type="number"
                    value={editForm.standardDeliveryFee || 0}
                    onChange={(e) => setEditForm({ ...editForm, standardDeliveryFee: parseInt(e.target.value) || 0 })}
                    className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Fulfillment Hours SLA</label>
                  <input
                    type="number"
                    value={editForm.estimatedFulfillmentHours || 24}
                    onChange={(e) => setEditForm({ ...editForm, estimatedFulfillmentHours: parseInt(e.target.value) || 24 })}
                    className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-900 font-mono"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 text-xs text-slate-600 hover:text-slate-900 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: DELETE / ARCHIVE CONFIRMATION */}
      {/* ============================================================ */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-modal w-full max-w-md rounded-3xl shadow-2xl border border-white/90 overflow-hidden p-6 space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Archive className="w-5 h-5" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">
                Remove Product: {deletingProduct.name}?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                You can archive this product (removes it from the marketplace while keeping prior customer order records intact) or permanently delete it.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 text-xs space-y-1 font-mono text-slate-700 border border-slate-200">
              <div>SKU: {deletingProduct.sku}</div>
              <div>Current Stock: {deletingProduct.stock} units</div>
              <div>Price: ETB {deletingProduct.unitPrice.toLocaleString()}</div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingProduct(null)}
                className="px-3.5 py-2 text-xs text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDelete(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
              >
                Archive (Recommended)
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDelete(true)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-700 hover:bg-rose-800 text-white shadow-xs"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
