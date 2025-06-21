import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY environment variable is required');
}

const resend = new Resend(process.env.RESEND_API_KEY);

// Email templates
export interface EmailTemplate {
  to: string[];
  subject: string;
  html: string;
  from?: string;
}

// Default from email - should be from your verified domain
const DEFAULT_FROM = process.env.FROM_EMAIL || 'orders@candles.com';

// Order confirmation email template
export const createOrderConfirmationEmail = (
  customerEmail: string,
  customerName: string,
  orderNumber: string,
  orderTotal: number,
  items: Array<{ name: string; quantity: number; price: number }>,
  storeName: string = 'Candles Store'
): EmailTemplate => ({
  to: [customerEmail],
  subject: `Order Confirmation #${orderNumber} - ${storeName}`,
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Order Confirmation</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #4A332F; padding-bottom: 20px; margin-bottom: 30px; }
        .order-details { background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
        .total { font-weight: bold; font-size: 18px; text-align: right; margin-top: 20px; }
        .footer { text-align: center; margin-top: 40px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="color: #4A332F; margin: 0;">${storeName}</h1>
          <p style="margin: 10px 0;">Order Confirmation</p>
        </div>
        
        <h2>Thank you for your order, ${customerName}!</h2>
        <p>We've received your order and will begin processing it shortly.</p>
        
        <div class="order-details">
          <h3>Order #${orderNumber}</h3>
          ${items.map(item => `
            <div class="item">
              <span>${item.name} (x${item.quantity})</span>
              <span>$${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          `).join('')}
          <div class="total">
            Total: $${orderTotal.toFixed(2)}
          </div>
        </div>
        
        <p>You'll receive a shipping confirmation email once your order is on its way.</p>
        
        <div class="footer">
          <p>Questions? Contact us at support@${storeName.toLowerCase().replace(' ', '')}.com</p>
          <p>&copy; ${new Date().getFullYear()} ${storeName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `
});

// Welcome email template
export const createWelcomeEmail = (
  customerEmail: string,
  customerName: string,
  storeName: string = 'Candles Store'
): EmailTemplate => ({
  to: [customerEmail],
  subject: `Welcome to ${storeName}!`,
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Welcome</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #4A332F; padding-bottom: 20px; margin-bottom: 30px; }
        .welcome-content { text-align: center; padding: 20px; }
        .cta-button { display: inline-block; background: #4A332F; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 40px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="color: #4A332F; margin: 0;">${storeName}</h1>
        </div>
        
        <div class="welcome-content">
          <h2>Welcome, ${customerName}!</h2>
          <p>Thank you for joining our community of candle lovers. We're excited to share our handcrafted candles with you.</p>
          
          <p>Discover our collection of premium candles made with natural ingredients and love.</p>
          
          <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/shop" class="cta-button">
            Start Shopping
          </a>
          
          <p>Follow us on social media for the latest updates, new arrivals, and special offers!</p>
        </div>
        
        <div class="footer">
          <p>Need help? Contact us at support@${storeName.toLowerCase().replace(' ', '')}.com</p>
          <p>&copy; ${new Date().getFullYear()} ${storeName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `
});

// Password reset email template
export const createPasswordResetEmail = (
  customerEmail: string,
  resetToken: string,
  storeName: string = 'Candles Store'
): EmailTemplate => ({
  to: [customerEmail],
  subject: `Password Reset - ${storeName}`,
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Password Reset</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #4A332F; padding-bottom: 20px; margin-bottom: 30px; }
        .reset-content { padding: 20px; }
        .cta-button { display: inline-block; background: #4A332F; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .warning { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }
        .footer { text-align: center; margin-top: 40px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="color: #4A332F; margin: 0;">${storeName}</h1>
        </div>
        
        <div class="reset-content">
          <h2>Password Reset Request</h2>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          
          <div style="text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}" class="cta-button">
              Reset Password
            </a>
          </div>
          
          <div class="warning">
            <strong>Important:</strong> This link will expire in 1 hour for security reasons.
          </div>
          
          <p>If you didn't request this password reset, please ignore this email or contact us if you have concerns.</p>
        </div>
        
        <div class="footer">
          <p>Need help? Contact us at support@${storeName.toLowerCase().replace(' ', '')}.com</p>
          <p>&copy; ${new Date().getFullYear()} ${storeName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `
});

// Shipping confirmation email template
export const createShippingConfirmationEmail = (
  customerEmail: string,
  customerName: string,
  orderNumber: string,
  trackingNumber: string,
  carrier: string = 'USPS',
  storeName: string = 'Candles Store'
): EmailTemplate => ({
  to: [customerEmail],
  subject: `Your order #${orderNumber} has shipped - ${storeName}`,
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Shipping Confirmation</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #4A332F; padding-bottom: 20px; margin-bottom: 30px; }
        .shipping-info { background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .tracking-button { display: inline-block; background: #4A332F; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 40px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="color: #4A332F; margin: 0;">${storeName}</h1>
          <p style="margin: 10px 0;">Shipping Confirmation</p>
        </div>
        
        <h2>Great news, ${customerName}!</h2>
        <p>Your order has been shipped and is on its way to you.</p>
        
        <div class="shipping-info">
          <h3>Shipping Details</h3>
          <p><strong>Order Number:</strong> #${orderNumber}</p>
          <p><strong>Carrier:</strong> ${carrier}</p>
          <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
          
          <div style="text-align: center;">
            <a href="https://tools.usps.com/go/TrackConfirmAction_input?qtc_tLabels1=${trackingNumber}" class="tracking-button">
              Track Your Package
            </a>
          </div>
        </div>
        
        <p>Your package should arrive within 3-7 business days. You'll receive updates as your package moves through our shipping network.</p>
        
        <div class="footer">
          <p>Questions about your order? Contact us at support@${storeName.toLowerCase().replace(' ', '')}.com</p>
          <p>&copy; ${new Date().getFullYear()} ${storeName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `
});

// Contact form email template
export const createContactFormEmail = (
  name: string,
  email: string,
  subject: string,
  message: string,
  storeName: string = 'Candles Store'
): EmailTemplate => ({
  to: [DEFAULT_FROM], // Send to store email
  subject: `Contact Form: ${subject} - ${storeName}`,
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Contact Form Submission</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #4A332F; padding-bottom: 20px; margin-bottom: 30px; }
        .form-data { background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .field { margin-bottom: 15px; }
        .label { font-weight: bold; color: #4A332F; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="color: #4A332F; margin: 0;">${storeName}</h1>
          <p style="margin: 10px 0;">New Contact Form Submission</p>
        </div>
        
        <div class="form-data">
          <div class="field">
            <div class="label">Name:</div>
            <div>${name}</div>
          </div>
          
          <div class="field">
            <div class="label">Email:</div>
            <div><a href="mailto:${email}">${email}</a></div>
          </div>
          
          <div class="field">
            <div class="label">Subject:</div>
            <div>${subject}</div>
          </div>
          
          <div class="field">
            <div class="label">Message:</div>
            <div style="white-space: pre-wrap;">${message}</div>
          </div>
        </div>
        
        <p><em>This message was sent from the contact form on your website.</em></p>
      </div>
    </body>
    </html>
  `
});

// Email service functions
export class EmailService {
  static async sendEmail(template: EmailTemplate): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const { data, error } = await resend.emails.send({
        from: template.from || DEFAULT_FROM,
        to: template.to,
        subject: template.subject,
        html: template.html,
      });

      if (error) {
        console.error('Resend error:', error);
        return { success: false, error: error.message };
      }

      console.log('Email sent successfully:', data?.id);
      return { success: true, id: data?.id };
    } catch (error: any) {
      console.error('Email sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  static async sendOrderConfirmation(
    customerEmail: string,
    customerName: string,
    orderNumber: string,
    orderTotal: number,
    items: Array<{ name: string; quantity: number; price: number }>,
    storeName?: string
  ) {
    const template = createOrderConfirmationEmail(customerEmail, customerName, orderNumber, orderTotal, items, storeName);
    return this.sendEmail(template);
  }

  static async sendWelcomeEmail(customerEmail: string, customerName: string, storeName?: string) {
    const template = createWelcomeEmail(customerEmail, customerName, storeName);
    return this.sendEmail(template);
  }

  static async sendPasswordReset(customerEmail: string, resetToken: string, storeName?: string) {
    const template = createPasswordResetEmail(customerEmail, resetToken, storeName);
    return this.sendEmail(template);
  }

  static async sendShippingConfirmation(
    customerEmail: string,
    customerName: string,
    orderNumber: string,
    trackingNumber: string,
    carrier?: string,
    storeName?: string
  ) {
    const template = createShippingConfirmationEmail(customerEmail, customerName, orderNumber, trackingNumber, carrier, storeName);
    return this.sendEmail(template);
  }

  static async sendContactForm(name: string, email: string, subject: string, message: string, storeName?: string) {
    const template = createContactFormEmail(name, email, subject, message, storeName);
    return this.sendEmail(template);
  }
}