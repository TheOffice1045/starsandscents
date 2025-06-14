-- Update products table with all required columns
DO $$
BEGIN
  -- Add columns if they don't exist
  
  -- Basic product info
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'title') THEN
    ALTER TABLE products ADD COLUMN title TEXT NOT NULL DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'description') THEN
    ALTER TABLE products ADD COLUMN description TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'price') THEN
    ALTER TABLE products ADD COLUMN price DECIMAL(10, 2) NOT NULL DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'compare_at_price') THEN
    ALTER TABLE products ADD COLUMN compare_at_price DECIMAL(10, 2);
  END IF;
  
  -- Status and inventory
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'status') THEN
    ALTER TABLE products ADD COLUMN status TEXT NOT NULL DEFAULT 'draft';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'quantity') THEN
    ALTER TABLE products ADD COLUMN quantity INTEGER NOT NULL DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'track_quantity') THEN
    ALTER TABLE products ADD COLUMN track_quantity BOOLEAN NOT NULL DEFAULT TRUE;
  END IF;
  
  -- Media
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'images') THEN
    ALTER TABLE products ADD COLUMN images JSONB DEFAULT '[]'::jsonb;
  END IF;
  
  -- Additional properties
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'taxable') THEN
    ALTER TABLE products ADD COLUMN taxable BOOLEAN NOT NULL DEFAULT TRUE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'weight') THEN
    ALTER TABLE products ADD COLUMN weight DECIMAL(10, 2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'weight_unit') THEN
    ALTER TABLE products ADD COLUMN weight_unit TEXT DEFAULT 'lb';
  END IF;
  
  -- Sales channels
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'online_store') THEN
    ALTER TABLE products ADD COLUMN online_store BOOLEAN NOT NULL DEFAULT TRUE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'point_of_sale') THEN
    ALTER TABLE products ADD COLUMN point_of_sale BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
  
  -- Timestamps
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'created_at') THEN
    ALTER TABLE products ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'updated_at') THEN
    ALTER TABLE products ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
  
END $$;