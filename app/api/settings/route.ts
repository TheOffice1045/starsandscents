import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logError } from '@/lib/utils';

export async function GET() {
  const supabase = createClient();
  try {
    const { data: settings, error } = await supabase
      .from('store_settings')
      .select('*')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // This means no rows were found, which might be okay.
        // We can return default settings or an empty object.
        return NextResponse.json({});
      }
      logError('Error fetching store settings', error);
      throw error;
    }

    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}
