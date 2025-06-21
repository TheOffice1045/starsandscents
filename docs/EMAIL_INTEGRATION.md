# Email Integration with Resend

This documentation covers the email functionality added to the candle store application using Resend.

## Setup

### 1. Install Dependencies

The Resend package has been installed:
```bash
npm install resend
```

### 2. Environment Variables

Add these environment variables to your `.env.local` file:

```env
# Resend API Key (required)
RESEND_API_KEY=re_your_resend_api_key

# From Email Address (optional, defaults to orders@candles.com)
FROM_EMAIL=orders@yourdomain.com

# Site URL for email links (optional, defaults to http://localhost:3000)
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

### 3. Domain Verification

1. Sign up for a Resend account at https://resend.com
2. Add and verify your domain in the Resend dashboard
3. Update the `FROM_EMAIL` environment variable to use your verified domain

## Available Email Templates

### 1. Order Confirmation Email
Sent automatically when a customer completes a purchase through Stripe.

**Triggered by:** Stripe webhook (`checkout.session.completed`)

**Contains:**
- Order details and items
- Customer information
- Order total
- Store branding

### 2. Welcome Email
For sending to new customers when they register.

**Usage:**
```javascript
import { useEmail } from '@/lib/hooks/useEmail';

const { sendWelcomeEmail } = useEmail();
await sendWelcomeEmail('customer@example.com', 'John Doe', 'Store Name');
```

### 3. Password Reset Email
For password reset functionality.

**Usage:**
```javascript
const { sendPasswordReset } = useEmail();
await sendPasswordReset('customer@example.com', 'reset_token_here', 'Store Name');
```

### 4. Shipping Confirmation Email
For notifying customers when orders ship.

**Usage:**
```javascript
const { sendShippingConfirmation } = useEmail();
await sendShippingConfirmation(
  'customer@example.com',
  'John Doe',
  'ORD-000001',
  'TRACK123456',
  'USPS',
  'Store Name'
);
```

### 5. Contact Form Email
Automatically sent when customers submit the contact form.

**Triggered by:** Contact form submission

**Contains:**
- Customer's message
- Contact details
- Form submission data

## API Endpoints

### `/api/emails/send` (POST)

Send emails programmatically through the API.

**Request Format:**
```json
{
  "type": "order-confirmation" | "welcome" | "password-reset" | "shipping-confirmation" | "contact-form",
  "data": {
    // Type-specific data fields
  }
}
```

## React Hook Usage

### `useEmail()` Hook

Provides convenient methods for sending emails from React components.

```javascript
import { useEmail } from '@/lib/hooks/useEmail';

function MyComponent() {
  const { 
    sendOrderConfirmation,
    sendWelcomeEmail,
    sendPasswordReset,
    sendShippingConfirmation,
    sendContactForm,
    isLoading,
    error 
  } = useEmail();

  const handleSendEmail = async () => {
    const result = await sendWelcomeEmail(
      'customer@example.com',
      'John Doe',
      'My Store'
    );
    
    if (result.success) {
      console.log('Email sent successfully!');
    } else {
      console.error('Error:', result.error);
    }
  };

  return (
    <button onClick={handleSendEmail} disabled={isLoading}>
      {isLoading ? 'Sending...' : 'Send Welcome Email'}
    </button>
  );
}
```

## Error Handling

The email system includes comprehensive error handling:

1. **API Level**: Returns proper HTTP status codes and error messages
2. **Service Level**: Catches and logs Resend API errors
3. **Hook Level**: Provides loading states and error states for UI
4. **Webhook Level**: Prevents webhook failures if email sending fails

## Security Considerations

1. **API Key Protection**: Resend API key is stored in environment variables
2. **Input Validation**: All email data is validated before sending
3. **Rate Limiting**: Consider implementing rate limiting for email APIs
4. **Spam Prevention**: Validate email addresses and implement captcha for contact forms

## Monitoring and Logging

Email sending is logged with:
- Success confirmations with Resend email IDs
- Error messages for debugging
- Customer information (email addresses)
- Email type and status

Check your application logs and Resend dashboard for email delivery status.

## Testing

### Development Testing
1. Use Resend's test mode during development
2. Send test emails to verify templates
3. Test webhook integration with Stripe's test events

### Production Testing
1. Verify domain configuration
2. Test all email types with real customer data
3. Monitor delivery rates and open rates in Resend dashboard

## Troubleshooting

### Common Issues

1. **"RESEND_API_KEY environment variable is required"**
   - Add your Resend API key to `.env.local`

2. **"Domain not verified"**
   - Verify your domain in the Resend dashboard
   - Update `FROM_EMAIL` to use verified domain

3. **Emails not sending from webhook**
   - Check webhook logs for errors
   - Verify Stripe webhook configuration
   - Ensure proper error handling

4. **Template rendering issues**
   - Check template syntax
   - Verify all required data is provided
   - Test with sample data

### Support
- Resend Documentation: https://resend.com/docs
- Resend Support: Available through their dashboard
- Application Logs: Check your deployment logs for detailed error messages