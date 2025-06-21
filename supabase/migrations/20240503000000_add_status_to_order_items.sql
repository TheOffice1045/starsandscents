-- Add status column to order_items
ALTER TABLE public.order_items
ADD COLUMN status VARCHAR NOT NULL DEFAULT 'active'; 