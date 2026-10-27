'use client';

import React, { useState } from 'react';
import { Package, Sparkles, Image as ImageIcon } from 'lucide-react';

export const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  'Fashion & Leather': 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80',
  'Coffee & Agro': 'https://images.unsplash.com/photo-1587734195503-904fca47e0e9?auto=format&fit=crop&w=800&q=80',
  'Beauty & Health': 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80',
  'Electronics & Home': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
  'Artisan Crafts': 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?auto=format&fit=crop&w=800&q=80',
};

// Preset gallery for suppliers to easily pick during product listing
export const CURATED_ETHIOPIAN_PRODUCT_GALLERY = [
  {
    title: 'Ethiopian Skincare Cream / Lotion',
    category: 'Beauty & Health',
    url: 'https://images.unsplash.com/photo-1608248597359-009772c3d550?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Organic Facial Oil & Beauty Serum',
    category: 'Beauty & Health',
    url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Natural Herbal Cosmetics & Balm',
    category: 'Beauty & Health',
    url: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Single-Origin Yirgacheffe / Sidama Coffee Beans',
    category: 'Coffee & Agro',
    url: 'https://images.unsplash.com/photo-1587734195503-904fca47e0e9?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Roasted Ethiopian Buna & Coffee Package',
    category: 'Coffee & Agro',
    url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Handcrafted Addis Leather Backpack / Bag',
    category: 'Fashion & Leather',
    url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Genuine Leather Duffle & Travel Bag',
    category: 'Fashion & Leather',
    url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Ethiopian Leather Wallet & Accessories',
    category: 'Fashion & Leather',
    url: 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Premium Bluetooth Headphones / Audio',
    category: 'Electronics & Home',
    url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Smart Gadget & Wireless Accessories',
    category: 'Electronics & Home',
    url: 'https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Traditional Habesha Hand-Woven Textile',
    category: 'Artisan Crafts',
    url: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Addis Artisan Ceramic Coffee Cups (Sini)',
    category: 'Artisan Crafts',
    url: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=80',
  },
];

interface ProductImageProps {
  src?: string;
  alt: string;
  category?: string;
  className?: string;
  aspectRatio?: 'square' | 'video' | 'wide' | 'auto';
  showCategoryBadge?: boolean;
  zoomOnHover?: boolean;
  priority?: boolean;
}

export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt,
  category = 'Fashion & Leather',
  className = '',
  aspectRatio = 'square',
  showCategoryBadge = false,
  zoomOnHover = true,
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Fallback candidate
  const fallbackUrl = CATEGORY_FALLBACK_IMAGES[category] || CATEGORY_FALLBACK_IMAGES['Fashion & Leather'];
  const displaySrc = hasError || !src ? fallbackUrl : src;

  const aspectClass = {
    square: 'aspect-square',
    video: 'aspect-video',
    wide: 'aspect-[16/10]',
    auto: '',
  }[aspectRatio];

  return (
    <div
      className={`relative overflow-hidden bg-slate-100 ${aspectClass} ${className} group`}
    >
      {/* Background skeleton placeholder while loading */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-slate-200 animate-pulse flex items-center justify-center">
          <ImageIcon className="w-6 h-6 text-slate-300" />
        </div>
      )}

      {/* Product Image */}
      <img
        src={displaySrc}
        alt={alt}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          if (!hasError) {
            setHasError(true);
          }
        }}
        className={`w-full h-full object-cover object-center transition-all duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        } ${zoomOnHover ? 'group-hover:scale-105' : ''}`}
      />

      {/* Subtle overlay gradient at the bottom for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />

      {/* Optional Category Tag */}
      {showCategoryBadge && (
        <div className="absolute top-2.5 left-2.5 z-10">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/90 backdrop-blur-md text-slate-800 shadow-2xs border border-white/60">
            {category}
          </span>
        </div>
      )}
    </div>
  );
};
