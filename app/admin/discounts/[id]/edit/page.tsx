"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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

export default function EditDiscountPage() {
  const router = useRouter();
  const params = useParams();
  const discountId = params.id as string;
  const [isLoading, setIsLoading] = useState(true);
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
  
  // Fetch discount data
  useEffect(() => {
    const fetchDiscount = async () => {
      setIsLoading(true);
      try {
        const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
        
        // Fetch discount details
        const { data: discount, error } = await supabase
          .from('discounts')
          .select('*')
          .eq('id', discountId)
          .single();
        
        if (error) throw error;
        
        if (!discount) {
          toast.error("Discount not found");
          router.push("/admin/discounts");
          return;
        }
        
        // Set form values
        setCode(discount.code);
        setDescription(discount.description || "");
        setDiscountType(discount.discount_type);
        setDiscountValue(discount.discount_value.toString());
        setMinPurchaseAmount(discount.min_purchase_amount.toString());
        setMaxDiscountAmount(discount.max_discount_amount ? discount.max_discount_amount.toString() : "");
        setStartsAt(discount.starts_at ? new Date(discount.starts_at) : new Date());
        setExpiresAt(discount.expires_at ? new Date(discount.expires_at) : undefined);
        setUsageLimit(discount.usage_limit ? discount.usage_limit.toString() : "");
        setIsActive(discount.is_active);
        setAppliesTo(discount.applies_to);
        
        // Fetch related products/collections if needed
        if (discount.applies_to === 'products') {
          const { data: productData, error: productError } = await supabase
            .from('discount_products')
            .select('product_id')
            .eq('discount_id', discountId);
          
          if (!productError && productData) {
            setSelectedProducts(productData.map(item => item.product_id));
          }
        } else if (discount.applies_to === 'collections') {
          const { data: collectionData, error: collectionError } = await supabase
            .from('discount_collections')
            .select('collection_id')
            .eq('discount_id', discountId);
          
          if (!collectionError && collectionData) {
            setSelectedCollections(collectionData.map(item => item.collection_id));
          }
        }
        
      } catch (error) {
        console.error("Error fetching discount:", error);
        toast.error("Failed to load discount");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDiscount();
  }, [discountId, router]);
  
  // Fetch collections when needed
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
      
      // Update the discount
      const { error } = await supabase
        .from('discounts')
        .update({
          code: code,
          description: description,
          discount_type: discountType,
          discount_value: parseFloat(discountValue),
          min_purchase_amount: parseFloat(minPurchaseAmount) || 0,
          max_discount_amount: maxDiscountAmount ? parseFloat(maxDiscountAmount) : null,
          starts_at: startsAt ? startsAt.toISOString() : null,
          expires_at: expiresAt ? expiresAt.toISOString() : null,
          usage_limit: usageLimit ? parseInt(usageLimit) : null,
          is_active: isActive,
          applies_to: appliesTo
        })
        .eq('id', discountId);
      
      if (error) {
        throw error;
      }
      
      // If discount applies to specific products, update them
      if (appliesTo === 'products') {
        // First delete existing relations
        await supabase
          .from('discount_products')
          .delete()
          .eq('discount_id', discountId);
        
        // Then add new ones if there are any
        if (selectedProducts.length > 0) {
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
      }
      
      // If discount applies to specific collections, update them
      if (appliesTo === 'collections') {
        // First delete existing relations
        await supabase
          .from('discount_collections')
          .delete()
          .eq('discount_id', discountId);
        
        // Then add new ones if there are any
        if (selectedCollections.length > 0) {
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
      }
      
      toast.success("Discount updated successfully");
      router.push("/admin/discounts");
    } catch (error) {
      console.error("Error updating discount:", error);
      toast.error(`Failed to update discount: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleButtonClick = async () => {
    await handleSubmit(new Event('submit') as unknown as React.FormEvent<HTMLFormElement>);
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Link href="/admin/discounts">
            <AdminButton variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </AdminButton>
          </Link>
          <h1 className="text-2xl font-semibold">Edit Discount</h1>
        </div>
        <AdminButton onClick={handleButtonClick} disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save Changes
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
                        {startsAt ? (
                          format(startsAt, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </AdminButton>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
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
                        {expiresAt ? (
                          format(expiresAt, "PPP")
                        ) : (
                          <span>No expiry date</span>
                        )}
                      </AdminButton>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
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
                <RadioGroup 
                  value={appliesTo} 
                  onValueChange={(value) => setAppliesTo(value as "all" | "products" | "collections")}
                  className="flex flex-col space-y-2 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="all" />
                    <Label htmlFor="all">All Products</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="products" id="products" />
                    <Label htmlFor="products">Specific Products</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="collections" id="collections" />
                    <Label htmlFor="collections">Specific Collections</Label>
                  </div>
                </RadioGroup>
              </div>
              
              {appliesTo === "collections" && (
                <div className="space-y-3">
                  <label className="text-sm font-medium">Select Collections</label>
                  
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
                  
                  <Select
                    onValueChange={toggleCollection}
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
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}