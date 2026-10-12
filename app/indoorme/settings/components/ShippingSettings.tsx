"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminButton } from "@/components/ui/admin-button";
import { createBrowserClient } from "@supabase/ssr";
import { useSettingsStore } from "@/lib/store/settings";
import { toast } from "sonner";

// Type definitions
type PickupLocation = {
  id: number;
  name: string;
  address: string;
  details?: string;
};

type ShippingMethod = {
  id: string;
  name: string;
  enabled: boolean;
  settings: {
    [key: string]: any;
  };
};

interface ShippingLocation {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
}

// Add the props interface
interface ShippingSettingsProps {
  storeId: string | null;
}

export default function ShippingSettings({ storeId }: ShippingSettingsProps) {
  const { settings } = useSettingsStore();
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  
  // State for shipping methods
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([
    {
      id: 'free-shipping',
      name: 'Free Shipping',
      enabled: true, // Set to true by default
      settings: {
        requires: 'no_requirement',
        minOrderAmount: 0,
      }
    },
    {
      id: 'local-pickup',
      name: 'Local Pickup',
      enabled: false,
      settings: {
        cost: 0,
        locations: [] as PickupLocation[],
      }
    },
    {
      id: 'flat-rate',
      name: 'Flat Rate',
      enabled: false,
      settings: {
        cost: 5.99,
        taxable: false,
      }
    },
    {
      id: 'calculated',
      name: 'Calculated Shipping',
      enabled: false,
      settings: {
        taxable: false,
        calculateBy: 'weight',
        zones: [],
      }
    }
  ]);

  // State for adding new pickup locations
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [newLocation, setNewLocation] = useState<Partial<PickupLocation>>({
    name: '',
    address: '',
    details: ''
  });

  // Handler functions
  const handleAddLocation = () => {
    if (!newLocation.name || !newLocation.address) return;
    
    setShippingMethods(methods =>
      methods.map(m =>
        m.id === 'local-pickup'
          ? {
              ...m,
              settings: {
                ...m.settings,
                locations: [
                  ...m.settings.locations,
                  {
                    id: Date.now(),
                    name: newLocation.name,
                    address: newLocation.address,
                    details: newLocation.details || ''
                  }
                ]
              }
            }
          : m
      )
    );
    
    setNewLocation({ name: '', address: '', details: '' });
    setIsAddingLocation(false);
  };
  
  const handleRemoveLocation = (locationId: number) => {
    setShippingMethods(methods =>
      methods.map(m =>
        m.id === 'local-pickup'
          ? {
              ...m,
              settings: {
                ...m.settings,
                locations: m.settings.locations.filter((loc: ShippingLocation) => loc.id !== locationId)
              }
            }
          : m
      )
    );
  };

  const saveShippingSettings = async () => {
    try {
      // Check if storeId exists
      if (!storeId) {
        console.error("Store ID is missing");
        throw new Error("Store ID is missing. Please refresh the page or contact support.");
      }
      
      // Save shipping settings to database
      const { error } = await supabase
        .from('store_settings')
        .upsert({
          store_id: storeId,
          shipping_methods: shippingMethods,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'store_id'  // Add this to specify the conflict resolution
        });
        
      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error saving shipping settings:", error);
      throw error;
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-medium">Shipping Methods</h2>
          <AdminButton variant="outline" size="sm">
            Add Shipping Zone
          </AdminButton>
        </div>
        
        {/* Shipping methods */}
        {shippingMethods.map((method) => (
          <div key={method.id} className="border rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id={`enable-${method.id}`}
                  checked={method.enabled}
                  onChange={(e) => {
                    setShippingMethods(methods =>
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
                {method.id === 'free-shipping' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Free shipping requires
                      </label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={method.settings.requires}
                        onChange={(e) => {
                          setShippingMethods(methods =>
                            methods.map(m =>
                              m.id === method.id
                                ? { ...m, settings: { ...m.settings, requires: e.target.value } }
                                : m
                            )
                          );
                        }}
                      >
                        <option value="no_requirement">No requirement</option>
                        <option value="min_amount">Minimum order amount</option>
                      </select>
                    </div>
                    
                    {method.settings.requires === 'min_amount' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Minimum order amount
                        </label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={method.settings.minOrderAmount.toString()}
                          onChange={(e) => {
                            setShippingMethods(methods =>
                              methods.map(m =>
                                m.id === method.id
                                  ? { ...m, settings: { ...m.settings, minOrderAmount: parseFloat(e.target.value) || 0 } }
                                  : m
                              )
                            );
                          }}
                        />
                      </div>
                    )}
                  </>
                )}
                
                {method.id === 'local-pickup' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cost
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={method.settings.cost.toString()}
                        onChange={(e) => {
                          setShippingMethods(methods =>
                            methods.map(m =>
                              m.id === method.id
                                ? { ...m, settings: { ...m.settings, cost: parseFloat(e.target.value) || 0 } }
                                : m
                            )
                          );
                        }}
                      />
                    </div>
                    
                    <div className="mt-4">
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Pickup Locations
                        </label>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setIsAddingLocation(true)}
                        >
                          Add Pickup Location
                        </Button>
                      </div>
                      
                      {method.settings.locations && method.settings.locations.length > 0 ? (
                        <div className="space-y-3 mt-3">
                          {method.settings.locations.map((location: PickupLocation) => (
                            <div key={location.id} className="border rounded p-3 bg-gray-50">
                              <div className="flex justify-between">
                                <div>
                                  <h4 className="font-medium">{location.name}</h4>
                                  <p className="text-sm text-gray-600">{location.address}</p>
                                  {location.details && (
                                    <p className="text-sm text-gray-500 mt-1">{location.details}</p>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleRemoveLocation(location.id)}
                                  className="text-red-500 hover:text-red-700 text-sm"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">No pickup locations added yet.</p>
                      )}
                      
                      {isAddingLocation && (
                        <div className="border rounded p-4 mt-3 bg-gray-50">
                          <h4 className="font-medium mb-3">Add New Location</h4>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Location Name
                              </label>
                              <Input
                                placeholder="e.g., Main Store"
                                value={newLocation.name}
                                onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Address
                              </label>
                              <Input
                                placeholder="Full address"
                                value={newLocation.address}
                                onChange={(e) => setNewLocation({ ...newLocation, address: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Details (optional)
                              </label>
                              <Input
                                placeholder="e.g., Opening hours, instructions"
                                value={newLocation.details || ''}
                                onChange={(e) => setNewLocation({ ...newLocation, details: e.target.value })}
                              />
                            </div>
                            <div className="flex justify-end space-x-2 mt-3">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setIsAddingLocation(false);
                                  setNewLocation({ name: '', address: '', details: '' });
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={handleAddLocation}
                                disabled={!newLocation.name || !newLocation.address}
                              >
                                Add Location
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
                
                {method.id === 'flat-rate' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cost
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={method.settings.cost.toString()}
                        onChange={(e) => {
                          setShippingMethods(methods =>
                            methods.map(m =>
                              m.id === method.id
                                ? { ...m, settings: { ...m.settings, cost: parseFloat(e.target.value) || 0 } }
                                : m
                            )
                          );
                        }}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="flat-rate-taxable"
                        checked={method.settings.taxable}
                        onChange={(e) => {
                          setShippingMethods(methods =>
                            methods.map(m =>
                              m.id === method.id
                                ? { ...m, settings: { ...m.settings, taxable: e.target.checked } }
                                : m
                            )
                          );
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                        style={{ accentColor: 'black' }}
                      />
                      <label htmlFor="flat-rate-taxable" className="text-sm text-gray-700">
                        Charge tax on shipping
                      </label>
                    </div>
                  </>
                )}
                
                {method.id === 'calculated' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Calculate shipping based on
                      </label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={method.settings.calculateBy}
                        onChange={(e) => {
                          setShippingMethods(methods =>
                            methods.map(m =>
                              m.id === method.id
                                ? { ...m, settings: { ...m.settings, calculateBy: e.target.value } }
                                : m
                            )
                          );
                        }}
                      >
                        <option value="weight">Product weight</option>
                        <option value="price">Order price</option>
                      </select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="calculated-taxable"
                        checked={method.settings.taxable}
                        onChange={(e) => {
                          setShippingMethods(methods =>
                            methods.map(m =>
                              m.id === method.id
                                ? { ...m, settings: { ...m.settings, taxable: e.target.checked } }
                                : m
                            )
                          );
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                        style={{ accentColor: 'black' }}
                      />
                      <label htmlFor="calculated-taxable" className="text-sm text-gray-700">
                        Charge tax on shipping
                      </label>
                    </div>
                    <div className="mt-4">
                      <p className="text-sm text-gray-500 italic">
                        Shipping zones and rates can be configured after enabling this method.
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <AdminButton onClick={async () => {
          try {
            await saveShippingSettings();
            toast.success("Shipping settings saved successfully");
          } catch (error: any) {
            toast.error(`Failed to save settings: ${error.message || 'Unknown error'}`);
          }
        }}>Save changes</AdminButton>
      </div>
    </div>
  );
}