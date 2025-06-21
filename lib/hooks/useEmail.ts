import { useState } from 'react';

interface EmailData {
  customerEmail?: string;
  customerName?: string;
  orderNumber?: string;
  orderTotal?: number;
  items?: Array<{ name: string; quantity: number; price: number }>;
  storeName?: string;
  resetToken?: string;
  trackingNumber?: string;
  carrier?: string;
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
}

interface EmailResult {
  success: boolean;
  message?: string;
  id?: string;
  error?: string;
}

export function useEmail() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendEmail = async (type: string, data: EmailData): Promise<EmailResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/emails/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, data }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to send email');
        return { success: false, error: result.error || 'Failed to send email' };
      }

      return { success: true, message: result.message, id: result.id };
    } catch (err: any) {
      const errorMessage = err.message || 'Network error occurred';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const sendOrderConfirmation = async (
    customerEmail: string,
    customerName: string,
    orderNumber: string,
    orderTotal: number,
    items: Array<{ name: string; quantity: number; price: number }>,
    storeName?: string
  ) => {
    return sendEmail('order-confirmation', {
      customerEmail,
      customerName,
      orderNumber,
      orderTotal,
      items,
      storeName,
    });
  };

  const sendWelcomeEmail = async (
    customerEmail: string,
    customerName: string,
    storeName?: string
  ) => {
    return sendEmail('welcome', {
      customerEmail,
      customerName,
      storeName,
    });
  };

  const sendPasswordReset = async (
    customerEmail: string,
    resetToken: string,
    storeName?: string
  ) => {
    return sendEmail('password-reset', {
      customerEmail,
      resetToken,
      storeName,
    });
  };

  const sendShippingConfirmation = async (
    customerEmail: string,
    customerName: string,
    orderNumber: string,
    trackingNumber: string,
    carrier?: string,
    storeName?: string
  ) => {
    return sendEmail('shipping-confirmation', {
      customerEmail,
      customerName,
      orderNumber,
      trackingNumber,
      carrier,
      storeName,
    });
  };

  const sendContactForm = async (
    name: string,
    email: string,
    subject: string,
    message: string,
    storeName?: string
  ) => {
    return sendEmail('contact-form', {
      name,
      email,
      subject,
      message,
      storeName,
    });
  };

  return {
    sendEmail,
    sendOrderConfirmation,
    sendWelcomeEmail,
    sendPasswordReset,
    sendShippingConfirmation,
    sendContactForm,
    isLoading,
    error,
  };
} 