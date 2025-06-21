# 📧 Email Setup Guide

## Quick Start

1. **Get Resend API Key**
   - Sign up at [resend.com](https://resend.com)
   - Create an API key in your dashboard

2. **Add Environment Variables**
   ```env
   RESEND_API_KEY=re_your_api_key_here
   FROM_EMAIL=orders@yourdomain.com
   ```

3. **Verify Your Domain**
   - Add your domain in Resend dashboard
   - Follow DNS verification steps
   - Update `FROM_EMAIL` to use verified domain

## What's Included

✅ **Order Confirmation Emails** - Automatic after purchase  
✅ **Contact Form Emails** - When customers contact you  
✅ **Welcome Emails** - For new customer registration  
✅ **Password Reset Emails** - For account recovery  
✅ **Shipping Notifications** - When orders ship  

## Features

- 🎨 **Beautiful Templates** - Professional, responsive design
- 🏪 **Dynamic Branding** - Uses your store name/slogan
- 🔄 **Automatic Sending** - Integrated with Stripe webhooks
- 🛠️ **Easy Integration** - Simple React hooks
- 🔒 **Secure** - Environment variable protection

## Example Usage

```javascript
import { useEmail } from '@/lib/hooks/useEmail';

const { sendWelcomeEmail, isLoading } = useEmail();

// Send welcome email
await sendWelcomeEmail('customer@example.com', 'John Doe');
```

For detailed documentation, see [docs/EMAIL_INTEGRATION.md](docs/EMAIL_INTEGRATION.md)

## Need Help?

- Check the full documentation in `/docs/EMAIL_INTEGRATION.md`
- Review environment variables in `.env.example`
- Test emails using the contact form at `/contact` 