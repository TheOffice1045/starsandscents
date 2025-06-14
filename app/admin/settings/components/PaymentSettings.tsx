"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { AdminButton } from "@/components/ui/admin-button";
import { createBrowserClient } from "@supabase/ssr";
import { useSettingsStore } from "@/lib/store/settings";
import { toast } from "sonner";

// Type definition
type PaymentMethod = {
  id: string;
  name: string;
  enabled: boolean;
  settings: {
    [key: string]: any;
  };
};

// Add the props interface
interface PaymentSettingsProps {
  storeId: string | null;
}

export default function PaymentSettings({ storeId }: PaymentSettingsProps) {
  const { settings } = useSettingsStore();
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    {
      id: 'cod',
      name: 'Cash on Delivery',
      enabled: false,
      settings: {
        instructions: '',
      }
    },
    {
      id: 'paypal',
      name: 'PayPal',
      enabled: false,
      settings: {
        email: '',
        sandboxMode: true,
        clientId: '',
        clientSecret: '',
      }
    },
    {
      id: 'stripe',
      name: 'Stripe',
      enabled: false,
      settings: {
        publishableKey: '',
        secretKey: '',
        testMode: true,
      }
    }
  ]);

  const savePaymentSettings = async () => {
    try {
      // Check if storeId exists
      if (!storeId) {
        console.error("Store ID is missing");
        throw new Error("Store ID is missing. Please refresh the page or contact support.");
      }
      
      // Save payment settings to database
      const { error } = await supabase
        .from('store_settings')
        .upsert({
          store_id: storeId,
          payment_methods: paymentMethods,
          updated_at: new Date().toISOString()
        });
        
      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error saving payment settings:", error);
      throw error;
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-medium mb-6">Payment Methods</h2>
        <div className="space-y-6">
          {paymentMethods.map((method) => (
            <div key={method.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id={`enable-${method.id}`}
                    checked={method.enabled}
                    onChange={(e) => {
                      setPaymentMethods(methods =>
                        methods.map(m =>
                          m.id === method.id ? { ...m, enabled: e.target.checked } : m
                        )
                      );
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                    style={{ accentColor: 'black' }}
                  />
                  <label htmlFor={`enable-${method.id}`} className="font-medium">{method.name}</label>
                </div>
              </div>

              {method.enabled && (
                <div className="ml-7 space-y-4">
                  {method.id === 'cod' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Instructions
                      </label>
                      <Input
                        placeholder="Payment instructions for customers"
                        value={method.settings.instructions}
                        onChange={(e) => {
                          setPaymentMethods(methods =>
                            methods.map(m =>
                              m.id === method.id
                                ? { ...m, settings: { ...m.settings, instructions: e.target.value } }
                                : m
                            )
                          );
                        }}
                      />
                    </div>
                  )}

                  {method.id === 'paypal' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          PayPal Email
                        </label>
                        <Input
                          type="email"
                          placeholder="PayPal business email"
                          value={method.settings.email}
                          onChange={(e) => {
                            setPaymentMethods(methods =>
                              methods.map(m =>
                                m.id === method.id
                                  ? { ...m, settings: { ...m.settings, email: e.target.value } }
                                  : m
                              )
                            );
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Client ID
                        </label>
                        <Input
                          placeholder="PayPal Client ID"
                          value={method.settings.clientId}
                          onChange={(e) => {
                            setPaymentMethods(methods =>
                              methods.map(m =>
                                m.id === method.id
                                  ? { ...m, settings: { ...m.settings, clientId: e.target.value } }
                                  : m
                              )
                            );
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Client Secret
                        </label>
                        <Input
                          type="password"
                          placeholder="PayPal Client Secret"
                          value={method.settings.clientSecret}
                          onChange={(e) => {
                            setPaymentMethods(methods =>
                              methods.map(m =>
                                m.id === method.id
                                  ? { ...m, settings: { ...m.settings, clientSecret: e.target.value } }
                                  : m
                              )
                            );
                          }}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="paypal-sandbox"
                          checked={method.settings.sandboxMode}
                          onChange={(e) => {
                            setPaymentMethods(methods =>
                              methods.map(m =>
                                m.id === method.id
                                  ? { ...m, settings: { ...m.settings, sandboxMode: e.target.checked } }
                                  : m
                              )
                            );
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                          style={{ accentColor: 'black' }}
                        />
                        <label htmlFor="paypal-sandbox" className="text-sm text-gray-700">
                          Enable Sandbox Mode
                        </label>
                      </div>
                    </>
                  )}

                  {method.id === 'stripe' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Publishable Key
                        </label>
                        <Input
                          placeholder="Stripe Publishable Key"
                          value={method.settings.publishableKey}
                          onChange={(e) => {
                            setPaymentMethods(methods =>
                              methods.map(m =>
                                m.id === method.id
                                  ? { ...m, settings: { ...m.settings, publishableKey: e.target.value } }
                                  : m
                              )
                            );
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Secret Key
                        </label>
                        <Input
                          type="password"
                          placeholder="Stripe Secret Key"
                          value={method.settings.secretKey}
                          onChange={(e) => {
                            setPaymentMethods(methods =>
                              methods.map(m =>
                                m.id === method.id
                                  ? { ...m, settings: { ...m.settings, secretKey: e.target.value } }
                                  : m
                              )
                            );
                          }}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="stripe-test"
                          checked={method.settings.testMode}
                          onChange={(e) => {
                            setPaymentMethods(methods =>
                              methods.map(m =>
                                m.id === method.id
                                  ? { ...m, settings: { ...m.settings, testMode: e.target.checked } }
                                  : m
                              )
                            );
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                          style={{ accentColor: 'black' }}
                        />
                        <label htmlFor="stripe-test" className="text-sm text-gray-700">
                          Enable Test Mode
                        </label>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <AdminButton onClick={async () => {
          try {
            await savePaymentSettings();
            toast.success("Payment settings saved successfully");
          } catch (error: any) {
            toast.error(`Failed to save settings: ${error.message || 'Unknown error'}`);
          }
        }}>Save changes</AdminButton>
      </div>
    </div>
  );
}