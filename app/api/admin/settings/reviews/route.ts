import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  try {
    const session = await isAuthenticated(req);
    
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: settings, error } = await supabase
      .from('store_settings')
      .select('reviews_enabled, star_ratings_enabled, star_ratings_required')
      .eq('store_id', session.id)
      .single();

    if (error) {
      console.error("Error fetching review settings:", error);
      return new NextResponse("Error fetching settings", { status: 500 });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error in GET /api/admin/settings/reviews:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await isAuthenticated(req);
    
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { reviewsEnabled, starRatingsEnabled, starRatingsRequired } = body;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error } = await supabase
      .from('store_settings')
      .upsert({
        store_id: session.id,
        reviews_enabled: reviewsEnabled,
        star_ratings_enabled: starRatingsEnabled,
        star_ratings_required: starRatingsRequired,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error("Error updating review settings:", error);
      return new NextResponse("Error updating settings", { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in POST /api/admin/settings/reviews:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}