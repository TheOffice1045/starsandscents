"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Pencil, Trash2, LayoutGrid, List } from "lucide-react";
import { useState, useEffect } from "react";
import { useCollectionStore } from "@/lib/store/collections";
// Add Supabase client
import { createBrowserClient } from "@supabase/ssr";
import { AdminButton } from "@/components/ui/admin-button";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
// Add these imports at the top with other imports
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  status: z.enum(["Active", "Inactive"]).default("Active"),
});

export default function CollectionsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const { collections, setCollections, addCollection, updateCollection, deleteCollection, toggleStatus: storeToggleStatus } = useCollectionStore();
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  // Fetch collections from database on component mount
  useEffect(() => {
    const fetchCollections = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('collections')
          .select('*');
        
        if (error) {
          console.error('Error fetching collections:', error.message);
          toast.error('Failed to load collections');
          return;
        }
        
        // Get product counts for each collection
        const collectionsWithCounts = await Promise.all(
          data.map(async (collection) => {
            try {
              // Query the products table directly to get accurate count
              const { count, error: countError } = await supabase
                .from('products')
                .select('*', { count: 'exact', head: true })
                .eq('collection_id', collection.id);
              
              if (countError) {
                console.error('Error fetching product count:', countError);
                return {
                  ...collection,
                  productCount: 0,
                  status: collection.is_featured ? "Active" : "Inactive"
                };
              }
              
              return {
                ...collection,
                productCount: count || 0,
                status: collection.is_featured ? "Active" : "Inactive"
              };
            } catch (err) {
              console.error('Error getting product count for collection:', err);
              return {
                ...collection,
                productCount: 0,
                status: collection.is_featured ? "Active" : "Inactive"
              };
            }
          })
        );
        
        setCollections(collectionsWithCounts);
      } catch (err) {
        console.error('Error in fetchCollections:', err);
        toast.error('An error occurred while loading collections');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCollections();
  }, [setCollections, supabase]);

  // Update onSubmit to save to database
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (editingId) {
        // Update in database
        const { error } = await supabase
          .from('collections')
          .update({
            name: values.name,
            description: values.description,
            is_featured: values.status === "Active",
            is_visible: values.status === "Active" // Add this field to control visibility
          })
          .eq('id', editingId);
          
        if (error) throw error;
          
        // Update in local state
        updateCollection(editingId, values);
        toast.success('Collection updated successfully');
      } else {
        // Create in database
        const { data, error } = await supabase
          .from('collections')
          .insert({
            name: values.name,
            description: values.description,
            is_featured: values.status === "Active",
            is_visible: values.status === "Active", // Add this field to control visibility
            slug: values.name.toLowerCase().replace(/\s+/g, '-')
          })
          .select();
          
        if (error) throw error;
          
        // Add to local state with the returned ID
        if (data && data[0]) {
          addCollection({
            name: values.name,
            description: values.description,
            status: values.status
          });
          toast.success('Collection created successfully');
        }
      }
    } catch (err) {
      console.error('Error saving collection:', err);
      toast.error('Failed to save collection');
    } finally {
      setIsOpen(false);
      setEditingId(null);
      form.reset();
    }
  };

  // Update delete function to remove from database
  const handleDeleteCollection = async (id: string) => {
    try {
      const { error } = await supabase
        .from('collections')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
        
      // Remove from local state
      deleteCollection(id);
      toast.success('Collection deleted successfully');
    } catch (err) {
      console.error('Error deleting collection:', err);
      toast.error('Failed to delete collection');
    }
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      status: "Active",
    },
  });

  const filteredCollections = collections.filter((collection) =>
    collection.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    collection.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (collection: typeof collections[0]) => {
    setEditingId(collection.id);
    form.reset({
      name: collection.name,
      description: collection.description,
      status: collection.status,
    });
    setIsOpen(true);
  };

  // Fix: Define toggleStatus inside the component so it can access collections
  const toggleStatus = async (id: string) => {
    try {
      const collection = collections.find((c: any) => c.id === id);
      if (!collection) return;
      
      const newStatus = collection.status === "Active" ? "Inactive" : "Active";
      
      const { error } = await supabase
        .from('collections')
        .update({
          is_featured: newStatus === "Active",
          is_visible: newStatus === "Active"
        })
        .eq('id', id);
      
      if (error) throw error;
      
      // Update in local state
      updateCollection(id, { status: newStatus });
      toast.success('Collection status updated');
    } catch (err) {
      console.error('Error toggling collection status:', err);
      toast.error('Failed to update collection status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Collections</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <AdminButton size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Collection
            </AdminButton>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Collection" : "Add Collection"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          rows={4}
                          placeholder="Enter collection description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active Status</FormLabel>
                        <div className="text-sm text-gray-500">
                          Collection will be {field.value === "Active" ? "visible" : "hidden"} in shop
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value === "Active"}
                          onCheckedChange={(checked) => 
                            field.onChange(checked ? "Active" : "Inactive")
                          }
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsOpen(false);
                      setEditingId(null);
                      form.reset();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingId ? "Save Changes" : "Create Collection"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and View Toggle */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <Input
            placeholder="Search collections..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 bg-white border rounded-lg p-1">
          <AdminButton
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid size={16} />
          </AdminButton>
          <AdminButton
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <List size={16} />
          </AdminButton>
        </div>
      </div>

      {/* List View */}
      {viewMode === "list" && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Collection Name</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Description</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Products</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Status</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCollections.map((collection) => (
                <tr key={collection.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{collection.name}</td>
                  <td className="px-6 py-4 text-gray-500 text-xs">{collection.description}</td>
                  <td className="px-6 py-4">{collection.productCount}</td>
                  <td className="px-6 py-4">
                    <Button
                      variant="ghost"
                      onClick={() => toggleStatus(collection.id)}
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        collection.status === "Active"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {collection.status}
                    </Button>
                  </td>
                 
                  <td className="px-6 py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(collection)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem 
                              className="text-red-600"
                              onSelect={(e) => {
                                e.preventDefault();
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Collection</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this collection? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteCollection(collection.id)}
                                className="bg-red-500 hover:bg-red-600"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Grid View */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCollections.map((collection) => (
            <div key={collection.id} className="bg-white rounded-lg shadow p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-lg">{collection.name}</h3>
                  <p className="text-sm text-gray-500">{collection.description}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(collection)}
                  >
                    <Pencil size={16} />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-red-500">
                        <Trash2 size={16} />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Collection</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this collection? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteCollection(collection.id)}
                          className="bg-red-500 hover:bg-red-600"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              
              <div className="flex justify-between items-center pt-4 border-t">
                <span className="text-sm text-gray-500">
                  {collection.productCount} products
                </span>
                <Button
                  variant="ghost"
                  onClick={() => toggleStatus(collection.id)}
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    collection.status === "Active"
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {collection.status}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredCollections.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg">
          <h3 className="text-lg font-medium text-gray-900">No collections found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchQuery
              ? "No collections match your search."
              : "Get started by creating a new collection."}
          </p>
          {!searchQuery && (
            <div className="mt-6">
              <Button onClick={() => setIsOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Collection
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}