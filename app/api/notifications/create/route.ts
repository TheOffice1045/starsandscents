import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logError } from '@/lib/utils';

export async function POST(req: Request) {
  const supabase = createClient();
  const { userId, title, message } = await req.json();

  if (!userId || !title) {
    return NextResponse.json({ error: 'Missing required fields: userId and title' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
      })
      .select();

    if (error) {
      logError('Error creating notification', error);
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }
} 