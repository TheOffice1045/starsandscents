import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const supabase = createClient();
    const { data: settings, error } = await supabase
      .from('store_settings')
      .select('reviews_enabled, star_ratings_enabled, star_ratings_required')
      .eq('store_id', auth.admin.storeId)
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

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const { reviewsEnabled, starRatingsEnabled, starRatingsRequired } = body;

    const supabase = createClient();
    const { error } = await supabase
      .from('store_settings')
      .update({
        reviews_enabled: reviewsEnabled,
        star_ratings_enabled: starRatingsEnabled,
        star_ratings_required: starRatingsRequired,
        updated_at: new Date().toISOString()
      })
      .eq('store_id', auth.admin.storeId);

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
