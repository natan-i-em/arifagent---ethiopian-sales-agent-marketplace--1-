import { prisma } from '../src/prisma.js';

async function main() {
  console.log('Applying complete Storage RLS policies for Azwari_Product_Images...');

  // 1. Ensure storage.buckets allows public SELECT
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'buckets' AND policyname = 'Public Select Buckets'
      ) THEN
        CREATE POLICY "Public Select Buckets"
        ON storage.buckets FOR SELECT
        TO public
        USING (true);
      END IF;
    END $$;
  `);

  // 2. Add SELECT policy for Azwari_Product_Images on storage.objects
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Select Azwari_Product_Images'
      ) THEN
        CREATE POLICY "Public Select Azwari_Product_Images"
        ON storage.objects FOR SELECT
        TO public
        USING (bucket_id = 'Azwari_Product_Images');
      END IF;
    END $$;
  `);

  // 3. Ensure INSERT policy exists for public & anon & authenticated
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Insert Azwari_Product_Images'
      ) THEN
        CREATE POLICY "Public Insert Azwari_Product_Images"
        ON storage.objects FOR INSERT
        TO public
        WITH CHECK (bucket_id = 'Azwari_Product_Images');
      END IF;
    END $$;
  `);

  // 4. Ensure UPDATE policy exists for public & anon & authenticated
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Update Azwari_Product_Images'
      ) THEN
        CREATE POLICY "Public Update Azwari_Product_Images"
        ON storage.objects FOR UPDATE
        TO public
        USING (bucket_id = 'Azwari_Product_Images')
        WITH CHECK (bucket_id = 'Azwari_Product_Images');
      END IF;
    END $$;
  `);

  // 5. Ensure DELETE policy exists for public & anon & authenticated
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Delete Azwari_Product_Images'
      ) THEN
        CREATE POLICY "Public Delete Azwari_Product_Images"
        ON storage.objects FOR DELETE
        TO public
        USING (bucket_id = 'Azwari_Product_Images');
      END IF;
    END $$;
  `);

  // 6. Ensure service_role has unconditional bypass on storage.objects and storage.buckets
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Service Role All storage.objects'
      ) THEN
        CREATE POLICY "Service Role All storage.objects"
        ON storage.objects FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);
      END IF;
    END $$;
  `);

  console.log('Successfully applied all storage RLS policies.');
}

main().finally(() => prisma.$disconnect());

