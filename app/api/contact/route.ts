import { NextResponse } from 'next/server';
import { EmailService } from '@/lib/email';
import { createServiceClient } from '@/lib/supabase/admin';
import { notifyAdmins } from '@/lib/notifications-server';

const LIMITS = { name: 120, email: 200, subject: 200, message: 5000 };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Public contact form: saves the message to the admin inbox (/indoorme/messages),
// emails the store, and notifies admins. The email is best-effort; the saved
// message is what counts.
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Hidden form field real visitors never fill in; bots usually do.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return NextResponse.json({ success: true });
  }

  const field = (key: keyof typeof LIMITS) =>
    typeof body[key] === 'string' ? (body[key] as string).trim() : '';
  const name = field('name');
  const email = field('email');
  const subject = field('subject');
  const message = field('message');

  if (!name || !email || !subject || !message) {
    return NextResponse.json({ error: 'Please fill in every field.' }, { status: 400 });
  }
  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }
  if (
    name.length > LIMITS.name ||
    email.length > LIMITS.email ||
    subject.length > LIMITS.subject ||
    message.length > LIMITS.message
  ) {
    return NextResponse.json({ error: 'Your message is too long.' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Basic flood protection: at most 5 messages per sender per hour.
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from('contact_messages')
    .select('id', { count: 'exact', head: true })
    .eq('email', email)
    .gte('created_at', since);
  if ((count ?? 0) >= 5) {
    return NextResponse.json({ error: 'Too many messages. Please try again later.' }, { status: 429 });
  }

  const { error } = await supabase
    .from('contact_messages')
    .insert({ name, email, subject, message });

  if (error) {
    console.error('Failed to save contact message:', error);
    return NextResponse.json({ error: 'Could not send your message. Please try again.' }, { status: 500 });
  }

  await notifyAdmins(supabase, 'New Message', `${name} (${email}): ${subject}`.slice(0, 300));

  const storeName = typeof body.storeName === 'string' ? body.storeName.slice(0, 100) : undefined;
  const emailResult = await EmailService.sendContactForm(name, email, subject, message, storeName);
  if (!emailResult.success) {
    console.error('Contact email failed (message is saved in the inbox):', emailResult.error);
  }

  return NextResponse.json({ success: true });
}
