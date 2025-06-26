"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, X } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { createBrowserClient } from "@supabase/ssr";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { AdminButton } from "@/components/ui/admin-button";

export default function NewDiscountPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Discount information
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed_amount">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [minPurchaseAmount, setMinPurchaseAmount] = useState("0");
  const [maxDiscountAmount, setMaxDiscountAmount] = useState("");
  const [startsAt, setStartsAt] = useState<Date | undefined>(new Date());
  const [expiresAt, setExpiresAt] = useState<Date | undefined>(undefined);
  const [usageLimit, setUsageLimit] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [appliesTo, setAppliesTo] = useState<"all" | "products" | "collections">("all");
  
  // Products and collections (if needed)
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [collections, setCollections] = useState<{id: string, name: string}[]>([]);
  const [isLoadingCollections, setIsLoadingCollections] = useState(false);
  
  // Fetch collections on component mount
  useEffect(() => {
    const fetchCollections = async () => {
      if (appliesTo === 'collections') {
        setIsLoadingCollections(true);
        try {
          const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
          const { data, error } = await supabase
            .from('collections')
            .select('id, name')
            .order('name');
          
          if (error) throw error;
          setCollections(data || []);
        } catch (error) {
          console.error('Error fetching collections:', error);
          toast.error('Failed to load collections');
        } finally {
          setIsLoadingCollections(false);
        }
      }
    };
    
    fetchCollections();
  }, [appliesTo]);
  
  // Handle collection selection
  const toggleCollection = (collectionId: string) => {
    setSelectedCollections(prev => 
      prev.includes(collectionId)
        ? prev.filter(id => id !== collectionId)
        : [...prev, collectionId]
    );
  };
  
  // Remove a selected collection
  const removeCollection = (collectionId: string) => {
    setSelectedCollections(prev => prev.filter(id => id !== collectionId));
  };
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!code) {
      toast.error("Please enter a discount code");
      return;
    }
    
    if (!discountValue || isNaN(parseFloat(discountValue)) || parseFloat(discountValue) <= 0) {
      toast.error("Please enter a valid discount value");
      return;
    }
    
    try {
      setIsSubmitting(true);
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      
      // Create the discount
      const { data, error } = await supabase
        .from('discounts')
        .insert({
          code: code,
          description: description,
          discount_type: discountType,
          discount_value: parseFloat(discountValue),
          min_purchase_amount: parseFloat(minPurchaseAmount) || 0,
          max_discount_amount: maxDiscountAmount ? parseFloat(maxDiscountAmount) : null,
          starts_at: startsAt ? startsAt.toISOString() : null,
          expires_at: expiresAt ? expiresAt.toISOString() : null,
          usage_limit: usageLimit ? parseInt(usageLimit) : null,
          usage_count: 0,
          is_active: isActive,
          applies_to: appliesTo
        })
        .select();
      
      if (error) {
        throw error;
      }
      
      const discountId = data[0].id;
      
      // If discount applies to specific products, add them
      if (appliesTo === 'products' && selectedProducts.length > 0) {
        const productRelations = selectedProducts.map(productId => ({
          discount_id: discountId,
          product_id: productId
        }));
        
        const { error: productsError } = await supabase
          .from('discount_products')
          .insert(productRelations);
        
        if (productsError) {
          throw productsError;
        }
      }
      
      // If discount applies to specific collections, add them
      if (appliesTo === 'collections' && selectedCollections.length > 0) {
        const collectionRelations = selectedCollections.map(collectionId => ({
          discount_id: discountId,
          collection_id: collectionId
        }));
        
        const { error: collectionsError } = await supabase
          .from('discount_collections')
          .insert(collectionRelations);
        
        if (collectionsError) {
          throw collectionsError;
        }
      }
      
      toast.success("Discount created successfully");
      router.push("/admin/discounts");
    } catch (error) {
      console.error("Error creating discount:", error);
      toast.error(`Failed to create discount: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleButtonClick = async () => {
    await handleSubmit(new Event('submit') as unknown as React.FormEvent<HTMLFormElement>);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Link href="/admin/discounts">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-semibold">Create New Discount</h1>
        </div>
        <AdminButton onClick={handleButtonClick} disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Create Discount
        </AdminButton>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Discount Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Discount Code</label>
                <Input 
                  value={code} 
                  onChange={(e) => setCode(e.target.value.toUpperCase())} 
                  placeholder="e.g. SUMMER2023"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="Description of the discount"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Discount Type</label>
                <RadioGroup 
                  value={discountType} 
                  onValueChange={(value) => setDiscountType(value as "percentage" | "fixed_amount")}
                  className="flex space-x-4 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="percentage" id="percentage" />
                    <Label htmlFor="percentage">Percentage</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fixed_amount" id="fixed_amount" />
                    <Label htmlFor="fixed_amount">Fixed Amount</Label>
                  </div>
                </RadioGroup>
              </div>
              <div>
                <label className="text-sm font-medium">
                  {discountType === "percentage" ? "Discount Percentage (%)" : "Discount Amount ($)"}
                </label>
                <Input 
                  value={discountValue} 
                  onChange={(e) => setDiscountValue(e.target.value)} 
                  placeholder={discountType === "percentage" ? "e.g. 10" : "e.g. 5.99"}
                  type="number"
                  step={discountType === "percentage" ? "1" : "0.01"}
                  min="0"
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch 
                  id="is-active" 
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
                <Label htmlFor="is-active">Active</Label>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Discount Conditions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Minimum Purchase Amount ($)</label>
                <Input 
                  value={minPurchaseAmount} 
                  onChange={(e) => setMinPurchaseAmount(e.target.value)} 
                  placeholder="e.g. 50"
                  type="number"
                  step="0.01"
                  min="0"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Maximum Discount Amount ($)</label>
                <Input 
                  value={maxDiscountAmount} 
                  onChange={(e) => setMaxDiscountAmount(e.target.value)} 
                  placeholder="e.g. 100"
                  type="number"
                  step="0.01"
                  min="0"
                />
                <p className="text-sm text-gray-500 mt-1">Leave empty for no maximum</p>
              </div>
              <div>
                <label className="text-sm font-medium">Usage Limit</label>
                <Input 
                  value={usageLimit} 
                  onChange={(e) => setUsageLimit(e.target.value)} 
                  placeholder="e.g. 100"
                  type="number"
                  min="0"
                />
                <p className="text-sm text-gray-500 mt-1">Leave empty for unlimited uses</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Start Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <AdminButton
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startsAt && "text-muted-foreground"
                        )}
                      >
                        {startsAt ? format(startsAt, "PPP") : "Select date"}
                      </AdminButton>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startsAt}
                        onSelect={setStartsAt}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <label className="text-sm font-medium">Expiry Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <AdminButton
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !expiresAt && "text-muted-foreground"
                        )}
                      >
                        {expiresAt ? format(expiresAt, "PPP") : "No expiry"}
                      </AdminButton>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={expiresAt}
                        onSelect={setExpiresAt}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Applies To</label>
                <Select 
                  value={appliesTo} 
                  onValueChange={(value) => setAppliesTo(value as "all" | "products" | "collections")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select where discount applies" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Products</SelectItem>
                    <SelectItem value="products">Specific Products</SelectItem>
                    <SelectItem value="collections">Specific Collections</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {appliesTo === "products" && (
                <div>
                  <label className="text-sm font-medium">Select Products</label>
                  {/* Product selection UI would go here */}
                  <p className="text-sm text-gray-500 mt-1">
                    Product selection component would be implemented here
                  </p>
                </div>
              )}
              
              {appliesTo === "collections" && (
                <div className="space-y-3">
                  <label className="text-sm font-medium">Select Collections</label>
                  
                  {/* Display selected collections as badges */}
                  {selectedCollections.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {selectedCollections.map(collectionId => {
                        const collection = collections.find(c => c.id === collectionId);
                        return (
                          <Badge key={collectionId} variant="secondary" className="flex items-center gap-1">
                            {collection?.name || 'Unknown collection'}
                            <button 
                              type="button" 
                              onClick={() => removeCollection(collectionId)}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Collection dropdown */}
                  <Select
                    onValueChange={(value) => toggleCollection(value)}
                    value=""
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={isLoadingCollections ? "Loading collections..." : "Select a collection"} />
                    </SelectTrigger>
                    <SelectContent>
                      {collections.length === 0 && !isLoadingCollections ? (
                        <SelectItem value="empty" disabled>No collections found</SelectItem>
                      ) : (
                        collections.map(collection => (
                          <SelectItem 
                            key={collection.id} 
                            value={collection.id}
                            disabled={selectedCollections.includes(collection.id)}
                          >
                            {collection.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  
                  {isLoadingCollections && (
                    <div className="flex items-center justify-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-sm text-gray-500">Loading collections...</span>
                    </div>
                  )}
                  
                  {selectedCollections.length === 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      Select collections to apply this discount to
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}