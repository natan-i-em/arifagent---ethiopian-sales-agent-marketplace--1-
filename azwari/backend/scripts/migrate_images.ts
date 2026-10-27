import { prisma } from '../server/prisma';

// High-resolution realistic product images for Ethiopian eCommerce
export const ETHIOPIAN_PRODUCT_IMAGES: Record<string, { imageUrl: string; images: string[] }> = {
  // Ethiopian Coffee
  coffee: {
    imageUrl: 'https://images.unsplash.com/photo-1587734195503-904fca47e0e9?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1587734195503-904fca47e0e9?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80',
    ],
  },
  // Ethiopian Handcrafted Leather
  leather: {
    imageUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80',
    ],
  },
  // Skincare & Beauty
  beauty: {
    imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1608248597359-009772c3d550?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=800&q=80',
    ],
  },
  // Lotion / Moisturizer
  lotion: {
    imageUrl: 'https://images.unsplash.com/photo-1608248597359-009772c3d550?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1608248597359-009772c3d550?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80',
    ],
  },
  // Electronics & Gadgets
  electronics: {
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=800&q=80',
    ],
  },
  // Ethiopian Artisan Crafts & Habesha Textiles
  artisan: {
    imageUrl: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1590736969955-71cc94801759?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=80',
    ],
  },
};

async function migrateImages() {
  console.log('1. Adding imageUrl and images columns to Product table...');
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Product" 
      ADD COLUMN IF NOT EXISTS "imageUrl" text,
      ADD COLUMN IF NOT EXISTS "images" text[] DEFAULT '{}';
    `);
    console.log('Columns verified/added successfully.');
  } catch (err: any) {
    console.warn('Column add note (may already exist):', err.message);
  }

  console.log('2. Updating existing products with high-resolution visual imagery...');
  const products = await prisma.product.findMany();
  for (const prod of products) {
    let chosen = ETHIOPIAN_PRODUCT_IMAGES.beauty;
    const nameLower = prod.name.toLowerCase();
    const catLower = (prod.category || '').toLowerCase();

    if (nameLower.includes('lotion')) {
      chosen = ETHIOPIAN_PRODUCT_IMAGES.lotion;
    } else if (nameLower.includes('care') || nameLower.includes('skin') || catLower.includes('beauty')) {
      chosen = ETHIOPIAN_PRODUCT_IMAGES.beauty;
    } else if (catLower.includes('coffee') || nameLower.includes('coffee') || nameLower.includes('buna')) {
      chosen = ETHIOPIAN_PRODUCT_IMAGES.coffee;
    } else if (catLower.includes('leather') || nameLower.includes('leather') || nameLower.includes('bag')) {
      chosen = ETHIOPIAN_PRODUCT_IMAGES.leather;
    } else if (catLower.includes('electronics') || nameLower.includes('phone') || nameLower.includes('sound')) {
      chosen = ETHIOPIAN_PRODUCT_IMAGES.electronics;
    } else if (catLower.includes('craft') || catLower.includes('artisan')) {
      chosen = ETHIOPIAN_PRODUCT_IMAGES.artisan;
    }

    // Embed in description tag for backwards resilience & update columns
    let cleanDesc = prod.description ? prod.description.replace(/<!--IMG:.*?-->/g, '').trim() : '';
    cleanDesc = `${cleanDesc} <!--IMG:${JSON.stringify({ imageUrl: chosen.imageUrl, images: chosen.images })}-->`;

    await prisma.$executeRawUnsafe(
      `UPDATE "Product" SET "imageUrl" = $1, "images" = $2, "description" = $3 WHERE "id" = $4`,
      chosen.imageUrl,
      chosen.images,
      cleanDesc,
      prod.id
    );
    console.log(`Updated product ${prod.id} (${prod.name}) with image: ${chosen.imageUrl}`);
  }

  console.log('Done migrating images.');
}

migrateImages()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
