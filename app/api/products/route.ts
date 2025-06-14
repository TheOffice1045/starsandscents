import { createServerClient } from "@supabase/ssr";
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: string) => cookieStore.get(name)?.value,
          set: (name: string, value: string, options: any) => {
            cookieStore.set(name, value, options);
          },
          remove: (name: string, options: any) => {
            cookieStore.set(name, '', { ...options, maxAge: 0 });
          },
        },
      }
    );
    
    // Fetch products with their images, removing is_featured
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        *,
        images:product_images(*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching products:', error);
      return new NextResponse('Error fetching products', { status: 500 });
    }

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error in GET /api/products:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: string) => cookieStore.get(name)?.value,
          set: (name: string, value: string, options: any) => {
            cookieStore.set(name, value, options);
          },
          remove: (name: string, options: any) => {
            cookieStore.set(name, '', { ...options, maxAge: 0 });
          },
        },
      }
    );

    const body = await request.json();
    const { title, description, price, quantity, images, collections } = body;

    // Insert the product
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        title,
        description,
        price,
        quantity: quantity || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (productError) {
      console.error('Error creating product:', productError);
      return new NextResponse('Error creating product', { status: 500 });
    }

    // Insert product images if any
    if (images && images.length > 0) {
      const { error: imagesError } = await supabase
        .from('product_images')
        .insert(
          images.map((image: any, index: number) => ({
            product_id: product.id,
            url: image.url,
            position: index,
            created_at: new Date().toISOString()
          }))
        );

      if (imagesError) {
        console.error('Error creating product images:', imagesError);
        return new NextResponse('Error creating product images', { status: 500 });
      }
    }

    // Insert product collections if any
    if (collections && collections.length > 0) {
      const { error: collectionsError } = await supabase
        .from('product_collections')
        .insert(
          collections.map((collectionId: string) => ({
            product_id: product.id,
            collection_id: collectionId,
            created_at: new Date().toISOString()
          }))
        );

      if (collectionsError) {
        console.error('Error creating product collections:', collectionsError);
        return new NextResponse('Error creating product collections', { status: 500 });
      }
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error in POST /api/products:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: string) => cookieStore.get(name)?.value,
          set: (name: string, value: string, options: any) => {
            cookieStore.set(name, value, options);
          },
          remove: (name: string, options: any) => {
            cookieStore.set(name, '', { ...options, maxAge: 0 });
          },
        },
      }
    );

    const body = await request.json();
    const { id, title, description, price, quantity, images, collections } = body;

    if (!id) {
      return new NextResponse('Product ID is required', { status: 400 });
    }

    // Update the product
    const { data: product, error: productError } = await supabase
      .from('products')
      .update({
        title,
        description,
        price,
        quantity: quantity || 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (productError) {
      console.error('Error updating product:', productError);
      return new NextResponse('Error updating product', { status: 500 });
    }

    // Update product images if any
    if (images && images.length > 0) {
      // First, delete existing images
      const { error: deleteImagesError } = await supabase
        .from('product_images')
        .delete()
        .eq('product_id', id);

      if (deleteImagesError) {
        console.error('Error deleting existing product images:', deleteImagesError);
        return new NextResponse('Error updating product images', { status: 500 });
      }

      // Then, insert new images
      const { error: imagesError } = await supabase
        .from('product_images')
        .insert(
          images.map((image: any, index: number) => ({
            product_id: id,
            url: image.url,
            position: index,
            created_at: new Date().toISOString()
          }))
        );

      if (imagesError) {
        console.error('Error creating new product images:', imagesError);
        return new NextResponse('Error updating product images', { status: 500 });
      }
    }

    // Update product collections if any
    if (collections && collections.length > 0) {
      // First, delete existing collections
      const { error: deleteCollectionsError } = await supabase
        .from('product_collections')
        .delete()
        .eq('product_id', id);

      if (deleteCollectionsError) {
        console.error('Error deleting existing product collections:', deleteCollectionsError);
        return new NextResponse('Error updating product collections', { status: 500 });
      }

      // Then, insert new collections
      const { error: collectionsError } = await supabase
        .from('product_collections')
        .insert(
          collections.map((collectionId: string) => ({
            product_id: id,
            collection_id: collectionId,
            created_at: new Date().toISOString()
          }))
        );

      if (collectionsError) {
        console.error('Error creating new product collections:', collectionsError);
        return new NextResponse('Error updating product collections', { status: 500 });
      }
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error in PUT /api/products:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: string) => cookieStore.get(name)?.value,
          set: (name: string, value: string, options: any) => {
            cookieStore.set(name, value, options);
          },
          remove: (name: string, options: any) => {
            cookieStore.set(name, '', { ...options, maxAge: 0 });
          },
        },
      }
    );

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return new NextResponse('Product ID is required', { status: 400 });
    }

    // Delete the product
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting product:', error);
      return new NextResponse('Error deleting product', { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error in DELETE /api/products:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}