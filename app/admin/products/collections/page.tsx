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
import { MoreVertical } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  status: z.enum(["Active", "Inactive"]).default("Active"),
});

// DraggableRow for collections
function DraggableRow({ id, children, handle, ...props }: { id: string; children: React.ReactNode; handle?: (args: { listeners: any }) => React.ReactNode; [key: string]: any }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    background: isDragging ? '#f3f4f6' : undefined,
  };
  return (
    <tr ref={setNodeRef} style={style} {...attributes} {...props}>
      <td className="pl-2 pr-0 w-6 align-middle cursor-grab select-none" style={{ verticalAlign: 'middle' }}>
        {typeof handle === 'function' ? handle({ listeners }) : null}
      </td>
      {children}
    </tr>
  );
}

export default function CollectionsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [collectionOrder, setCollectionOrder] = useState<string[]>([]);
  
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

  useEffect(() => {
    const newOrder = filteredCollections.map((c) => c.id);
    if (JSON.stringify(collectionOrder) !== JSON.stringify(newOrder)) {
      setCollectionOrder(newOrder);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredCollections]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setCollectionOrder((prev) => arrayMove(prev, prev.indexOf(active.id), prev.indexOf(over.id)));
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
          <DialogContent className="font-waldenburg text-[13px]">
            <DialogHeader>
              <DialogTitle className="font-waldenburg text-xl font-semibold">{editingId ? "Edit Collection" : "Add Collection"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-waldenburg text-[13px]">Name</FormLabel>
                      <FormControl>
                        <Input {...field} className="font-waldenburg text-[13px]" />
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
                      <FormLabel className="font-waldenburg text-[13px]">Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={4} placeholder="Enter collection description" className="font-waldenburg text-[13px]" />
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
                        <FormLabel className="font-waldenburg text-[13px] text-base">Active Status</FormLabel>
                        <div className="text-sm text-gray-500 font-waldenburg text-[13px]">
                          Collection will be {field.value === "Active" ? "visible" : "hidden"} in shop
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value === "Active"}
                          onCheckedChange={(checked) => field.onChange(checked ? "Active" : "Inactive")}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2 mt-4">
                  <AdminButton
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsOpen(false);
                      setEditingId(null);
                      form.reset();
                    }}
                    className="h-10 px-6 font-waldenburg text-[13px]"
                  >
                    Cancel
                  </AdminButton>
                  <AdminButton type="submit" className="h-10 px-6 font-waldenburg text-[13px]">
                    {editingId ? "Save Changes" : "Create Collection"}
                  </AdminButton>
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
      {viewMode === 'list' && (
        <Card className="border-0">
          <CardContent className="p-0">
            <div className="overflow-x-auto w-full">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={collectionOrder}
                  strategy={verticalListSortingStrategy}
                >
                  <table className="w-full" style={{ border: '1px solid #e5e5e5', borderRadius: '12px', overflow: 'hidden' }}>
                    <thead>
                      <tr className="border-b" style={{ background: '#f5f5f5', color: '#0a0a0a' }}>
                        <th className="pl-2 pr-0 w-6"></th>
                        <th className="px-10 py-3 text-left align-middle text-sm font-medium whitespace-nowrap" style={{ color: '#0a0a0a' }}>Collection Name</th>
                        <th className="px-10 py-3 text-left align-middle text-sm font-medium whitespace-nowrap" style={{ color: '#0a0a0a' }}>Description</th>
                        <th className="px-10 py-3 text-left align-middle text-sm font-medium whitespace-nowrap" style={{ color: '#0a0a0a' }}>Products</th>
                        <th className="px-10 py-3 text-left align-middle text-sm font-medium whitespace-nowrap" style={{ color: '#0a0a0a' }}>Status</th>
                        <th className="px-10 py-3 text-right align-middle text-sm font-medium whitespace-nowrap" style={{ color: '#0a0a0a' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {collectionOrder.map((id) => {
                        const collection = filteredCollections.find((c) => c.id === id);
                        if (!collection) return null;
                        return (
                          <DraggableRow key={collection.id} id={collection.id} handle={({ listeners }) => (
                            <span {...listeners} aria-label="Drag row" tabIndex={0} className="flex items-center justify-center h-6 w-6 text-gray-400 hover:text-gray-600 focus:outline-none">
                              <GripVertical className="h-4 w-4" />
                            </span>
                          )}>
                            <td className="px-10 py-3 font-medium text-sm text-left align-middle whitespace-nowrap">{collection.name}</td>
                            <td className="px-10 py-3 text-gray-500 text-xs text-left align-middle whitespace-nowrap">{collection.description}</td>
                            <td className="px-10 py-3 text-left align-middle whitespace-nowrap">{collection.productCount}</td>
                            <td className="px-10 py-3 text-left align-middle whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                collection.status === "Active"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}>
                                {collection.status}
                              </span>
                            </td>
                            <td className="px-10 py-3 text-right align-middle whitespace-nowrap">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreVertical className="h-4 w-4" />
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
                          </DraggableRow>
                        );
                      })}
                    </tbody>
                  </table>
                </SortableContext>
              </DndContext>
            </div>
          </CardContent>
        </Card>
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