import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    if (!type || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: type and data' },
        { status: 400 }
      );
    }

    let result;

    switch (type) {
      case 'order-confirmation':
        const { customerEmail, customerName, orderNumber, orderTotal, items, storeName } = data;
        if (!customerEmail || !customerName || !orderNumber || !orderTotal || !items) {
          return NextResponse.json(
            { error: 'Missing required fields for order confirmation email' },
            { status: 400 }
          );
        }
        result = await EmailService.sendOrderConfirmation(
          customerEmail,
          customerName,
          orderNumber,
          orderTotal,
          items,
          storeName
        );
        break;

      case 'welcome':
        const { customerEmail: welcomeEmail, customerName: welcomeName, storeName: welcomeStoreName } = data;
        if (!welcomeEmail || !welcomeName) {
          return NextResponse.json(
            { error: 'Missing required fields for welcome email' },
            { status: 400 }
          );
        }
        result = await EmailService.sendWelcomeEmail(welcomeEmail, welcomeName, welcomeStoreName);
        break;

      case 'password-reset':
        const { customerEmail: resetEmail, resetToken, storeName: resetStoreName } = data;
        if (!resetEmail || !resetToken) {
          return NextResponse.json(
            { error: 'Missing required fields for password reset email' },
            { status: 400 }
          );
        }
        result = await EmailService.sendPasswordReset(resetEmail, resetToken, resetStoreName);
        break;

      case 'shipping-confirmation':
        const { customerEmail: shippingEmail, customerName: shippingName, orderNumber: shippingOrder, trackingNumber, carrier, storeName: shippingStoreName } = data;
        if (!shippingEmail || !shippingName || !shippingOrder || !trackingNumber) {
          return NextResponse.json(
            { error: 'Missing required fields for shipping confirmation email' },
            { status: 400 }
          );
        }
        result = await EmailService.sendShippingConfirmation(
          shippingEmail,
          shippingName,
          shippingOrder,
          trackingNumber,
          carrier,
          shippingStoreName
        );
        break;

      case 'contact-form':
        const { name, email, subject, message, storeName: contactStoreName } = data;
        if (!name || !email || !subject || !message) {
          return NextResponse.json(
            { error: 'Missing required fields for contact form email' },
            { status: 400 }
          );
        }
        result = await EmailService.sendContactForm(name, email, subject, message, contactStoreName);
        break;

      default:
        return NextResponse.json(
          { error: `Unknown email type: ${type}` },
          { status: 400 }
        );
    }

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Email sent successfully',
        id: result.id 
      });
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Email API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 