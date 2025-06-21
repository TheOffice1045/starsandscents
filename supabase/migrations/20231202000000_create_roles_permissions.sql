-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create store_roles table with standardized roles
CREATE TABLE IF NOT EXISTS store_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  permissions UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, name),
  CONSTRAINT valid_role_name CHECK (
    name IN ('Owner', 'Admin', 'Manager', 'Staff', 'Customer')
  )
);

-- Create store_users table
CREATE TABLE IF NOT EXISTS store_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role_id UUID REFERENCES store_roles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  invited_at TIMESTAMP WITH TIME ZONE,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, email)
);

-- Set up Row Level Security (RLS)
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_users ENABLE ROW LEVEL SECURITY;

-- Create policies for permissions
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'permissions' 
        AND policyname = 'Allow authenticated users to view permissions'
    ) THEN
        CREATE POLICY "Allow authenticated users to view permissions"
        ON permissions FOR SELECT
        TO authenticated
        USING (true);
    END IF;
END $$;

-- Create policies for store_roles
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'store_roles' 
        AND policyname = 'Allow store users to view roles'
    ) THEN
        CREATE POLICY "Allow store users to view roles"
        ON store_roles FOR SELECT
        TO authenticated
        USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'store_roles' 
        AND policyname = 'Allow store owners to manage roles'
    ) THEN
        CREATE POLICY "Allow store owners to manage roles"
        ON store_roles FOR ALL
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM store_users su
                JOIN store_roles sr ON su.role_id = sr.id
                WHERE su.user_id = auth.uid()
                AND sr.name = 'Owner'
            )
        );
    END IF;
END $$;

-- Remove the old recursive policy if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'store_users' AND policyname = 'Allow store owners to manage users'
  ) THEN
    DROP POLICY "Allow store owners to manage users" ON store_users;
  END IF;
END $$;

-- Add the new non-recursive policy
CREATE POLICY "Allow store owners to manage users"
ON store_users
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM store_users su
    JOIN store_roles sr ON su.role_id = sr.id
    WHERE
      su.user_id = auth.uid()
      AND su.store_id = store_users.store_id
      AND sr.name = 'Owner'
      AND su.status = 'active'
  )
);

-- Create policies for store_users
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'store_users' 
        AND policyname = 'Allow store users to view users'
    ) THEN
        CREATE POLICY "Allow store users to view users"
        ON store_users FOR SELECT
        TO authenticated
        USING (true);
    END IF;
END $$;

-- Create indexes for better performance
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_store_roles_store_id') THEN
        CREATE INDEX idx_store_roles_store_id ON store_roles(store_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_store_users_store_id') THEN
        CREATE INDEX idx_store_users_store_id ON store_users(store_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_store_users_user_id') THEN
        CREATE INDEX idx_store_users_user_id ON store_users(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_store_users_role_id') THEN
        CREATE INDEX idx_store_users_role_id ON store_users(role_id);
    END IF;
END $$;

-- Create function to ensure proper role hierarchy
CREATE OR REPLACE FUNCTION check_role_hierarchy()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent downgrading an Owner's role
  IF EXISTS (
    SELECT 1 FROM store_users su
    JOIN store_roles sr ON su.role_id = sr.id
    WHERE su.user_id = NEW.user_id
    AND sr.name = 'Owner'
  ) THEN
    RAISE EXCEPTION 'Cannot modify the role of an Owner';
  END IF;
  
  -- Prevent creating multiple Owners
  IF NEW.role_id IN (
    SELECT id FROM store_roles WHERE name = 'Owner'
  ) AND EXISTS (
    SELECT 1 FROM store_users su
    JOIN store_roles sr ON su.role_id = sr.id
    WHERE su.store_id = NEW.store_id
    AND sr.name = 'Owner'
  ) THEN
    RAISE EXCEPTION 'Store already has an Owner';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for role hierarchy
DROP TRIGGER IF EXISTS enforce_role_hierarchy ON store_users;
CREATE TRIGGER enforce_role_hierarchy
BEFORE INSERT OR UPDATE ON store_users
FOR EACH ROW
EXECUTE FUNCTION check_role_hierarchy();