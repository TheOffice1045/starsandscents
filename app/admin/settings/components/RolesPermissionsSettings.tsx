"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AdminButton } from "@/components/ui/admin-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Trash2, UserPlus, Mail, Check, X, MoreHorizontal } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Role = {
  id: string;
  name: string;
  description: string;
  permissions: string[];
};

type StoreUser = {
  id: string;
  email: string;
  role: string;
  role_name: string;
  invited: boolean;
  active: boolean;
  name?: string;
  avatar_url?: string;
  last_sign_in_at?: string;
  created_at?: string;
};

type Permission = {
  id: string;
  name: string;
  description: string;
  category: string;
};

interface User {
  id: string;
  email: string;
  role: string;
}

export default function RolesPermissionsSettings({ storeId }: { storeId: string | null }) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<StoreUser[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("");
  const [showAddRoleDialog, setShowAddRoleDialog] = useState(false);
  const [showInviteUserDialog, setShowInviteUserDialog] = useState(false);
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  // No changes needed to the imports and type definitions
  
  // Inside the useEffect where you fetch data
  useEffect(() => {
    if (!storeId) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch roles
        const { data: rolesData, error: rolesError } = await supabase
          .from('store_roles')
          .select('*')
          .eq('store_id', storeId);
          
        if (rolesError) throw rolesError;
        
        // Check if Owner role exists, if not create it
        let ownerRoleExists = rolesData.some(role => role.name === 'Owner');
        
        if (!ownerRoleExists) {
          // Get all available permissions
          const { data: allPermissions } = await supabase
            .from('permissions')
            .select('id');
            
          const permissionIds = allPermissions ? allPermissions.map(p => p.id) : [];
          
          // Create Owner role with all permissions
          const { data: ownerRole, error: createError } = await supabase
            .from('store_roles')
            .insert({
              store_id: storeId,
              name: 'Owner',
              description: 'Full access and unrestricted permissions across the entire platform',
              permissions: permissionIds,
            })
            .select()
            .single();
            
          if (createError) {
            console.error('Error creating Owner role:', createError);
          } else {
            // Add the new Owner role to the data
            rolesData.push(ownerRole);
          }
        }
        
        // Fetch users
        const { data: usersData, error: usersError } = await supabase
          .from('store_users')
          .select('*, store_roles(name)')
          .eq('store_id', storeId);
          
        if (usersError) throw usersError;
        
        // Fetch permissions
        const { data: permissionsData, error: permissionsError } = await supabase
          .from('permissions')
          .select('*')
          .order('category', { ascending: true });
          
        if (permissionsError) throw permissionsError;
        
        // Format the data
        const formattedRoles = rolesData.map((role) => ({
          id: role.id,
          name: role.name,
          description: role.description,
          permissions: Array.isArray(role.permissions) ? role.permissions : [],
        }));
        
        const formattedUsers = usersData.map((user) => ({
          id: user.user_id || user.id,
          email: user.email,
          role: user.role_id,
          role_name: user.store_roles?.name || 'Unknown',
          invited: user.status === 'invited',
          active: user.status === 'active',
        }));
        
        const formattedPermissions = permissionsData.map((permission) => ({
          id: permission.id,
          name: permission.name,
          description: permission.description,
          category: permission.category,
        }));
        
        setRoles(formattedRoles);
        setUsers(formattedUsers);
        setPermissions(formattedPermissions);
        
        if (formattedRoles.length > 0) {
          setSelectedRole(formattedRoles[0]);
        }
      } catch (error: any) {
        console.error('Error fetching roles and permissions:', error);
        toast.error(`Failed to load roles and permissions: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [storeId, supabase, newUserRole]);

  // Update the handleInviteUser function to ensure it properly uses the selected role
  const handleInviteUser = async () => {
    if (!storeId || !newUserEmail || !newUserRole) {
      toast.error("Please select a role and enter an email address");
      return;
    }
    
    console.log("Inviting user with role:", newUserRole); // Debug log
    
    try {
      // Check if user already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('store_users')
        .select('*')
        .eq('store_id', storeId)
        .eq('email', newUserEmail)
        .maybeSingle();
        
      if (checkError) throw checkError;
      
      if (existingUser) {
        toast.error("User already has access to this store");
        return;
      }
      
      // Create invitation
      const { data, error } = await supabase
        .from('store_users')
        .insert({
          store_id: storeId,
          email: newUserEmail,
          role_id: newUserRole,
          status: 'invited',
          invited_at: new Date().toISOString(),
        })
        .select()
        .single();
        
      if (error) throw error;
      
      // Get role name
      const role = roles.find(r => r.id === newUserRole);
      console.log("Found role:", role); // Debug log
      
      const newUser: StoreUser = {
        id: data.user_id || 'pending',
        email: data.email,
        role: data.role_id,
        role_name: role?.name || 'Unknown',
        invited: true,
        active: false
      };
      
      setUsers([...users, newUser]);
      setNewUserEmail("");
      setNewUserRole("");
      setShowInviteUserDialog(false);
      
      // Send invitation email (this would typically be handled by a server function)
      toast.success(`Invitation sent to ${newUserEmail}`);
    } catch (error: any) {
      console.error('Error inviting user:', error);
      toast.error(`Failed to invite user: ${error.message}`);
    }
  };

  const handleTogglePermission = async (permissionId: string) => {
    if (!selectedRole) return;
    
    const updatedPermissions = selectedRole.permissions.includes(permissionId)
      ? selectedRole.permissions.filter(id => id !== permissionId)
      : [...selectedRole.permissions, permissionId];
    
    try {
      const { error } = await supabase
        .from('store_roles')
        .update({ permissions: updatedPermissions })
        .eq('id', selectedRole.id);
        
      if (error) throw error;
      
      // Update local state
      const updatedRole = { ...selectedRole, permissions: updatedPermissions };
      setSelectedRole(updatedRole);
      setRoles(roles.map(role => role.id === selectedRole.id ? updatedRole : role));
      toast.success("Permissions updated");
    } catch (error: any) {
      console.error('Error updating permissions:', error);
      toast.error(`Failed to update permissions: ${error.message}`);
    }
  };

  const handleRemoveUser = async (userId: string, email: string) => {
    if (!storeId) return;
    
    if (!confirm(`Are you sure you want to remove ${email} from this store?`)) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('store_users')
        .delete()
        .eq('store_id', storeId)
        .eq('user_id', userId);
        
      if (error) throw error;
      
      setUsers(users.filter(user => user.id !== userId));
      toast.success(`${email} removed successfully`);
    } catch (error: any) {
      console.error('Error removing user:', error);
      toast.error(`Failed to remove user: ${error.message}`);
    }
  };

  const handleAddRole = async () => {
    if (!storeId || !newRoleName) return;
    
    try {
      const { data, error } = await supabase
        .from('store_roles')
        .insert({
          store_id: storeId,
          name: newRoleName,
          description: newRoleDescription,
          permissions: [],
        })
        .select()
        .single();
        
      if (error) throw error;
      
      const newRole = {
        id: data.id,
        name: data.name,
        description: data.description,
        permissions: data.permissions || [],
      };
      
      setRoles([...roles, newRole]);
      setSelectedRole(newRole);
      setNewRoleName("");
      setNewRoleDescription("");
      setShowAddRoleDialog(false);
      toast.success("Role added successfully");
    } catch (error: any) {
      console.error('Error adding role:', error);
      toast.error(`Failed to add role: ${error.message}`);
    }
  };

  // Add a new function to handle user activation/deactivation
  const handleStatusChange = async (userId: string, newStatus: 'active' | 'inactive' | 'invited') => {
    try {
      // Update the user's status in the database
      const { error } = await supabase
        .from('store_users')
        .update({ 
          status: newStatus === 'invited' ? 'pending' : newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      // Update the local state
      setUsers(users.map(user => 
        user.id === userId 
          ? { 
              ...user, 
              invited: newStatus === 'invited',
              active: newStatus === 'active'
            } 
          : user
      ));

      toast.success('User status updated successfully');
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Failed to update user status');
    }
  };

  // Update the User type to include active status
  // (This is just for reference - you'll need to update the type definition at the top of the file)
  // type User = {
  //   id: string;
  //   email: string;
  //   role: string;
  //   role_name: string;
  //   invited: boolean;
  //   active?: boolean;
  // };

  // Then update the users table to include the activation toggle
  // In the TableRow for users:

  // Add this function after handleToggleUserStatus
  const handleAcceptInvitation = async (userId: string, email: string) => {
    if (!storeId) return;
    
    try {
      console.log("Accepting invitation for user:", userId, email);
      
      // First, check if we're using the correct column name
      const { data: userData, error: userError } = await supabase
        .from('store_users')
        .select('*')
        .eq('store_id', storeId)
        .eq('email', email)
        .single();
        
      if (userError) {
        console.error("Error finding user:", userError);
        throw userError;
      }
      
      console.log("Found user data:", userData);
      
      // Update the status to 'active' and clear the invited_at field
      const { error } = await supabase
        .from('store_users')
        .update({ 
          status: 'active',
          invited_at: null
        })
        .eq('store_id', storeId)
        .eq('email', email);  // Use email instead of user_id as it might be more reliable
        
      if (error) throw error;
      
      // Try to update the accepted_at field separately
      try {
        await supabase
          .from('store_users')
          .update({ 
            accepted_at: new Date().toISOString()
          })
          .eq('store_id', storeId)
          .eq('email', email);
      } catch (acceptedAtError) {
        console.warn('Could not update accepted_at, column may not exist yet:', acceptedAtError);
      }
      
      // Update local state - use a functional update to avoid stale closures
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, invited: false, active: true } 
            : user
        )
      );
      
      toast.success(`Invitation accepted for ${email}`);
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      toast.error(`Failed to accept invitation: ${error.message}`);
    }
  };

  // Add this function after handleRemoveUser
  // Update the handleChangeUserRole function
  const handleChangeUserRole = async (userId: string, email: string, newRoleId: string) => {
    if (!storeId) return;
    
    try {
      // Find the role name for display purposes
      const role = roles.find(r => r.id === newRoleId);
      if (!role) {
        throw new Error("Selected role not found");
      }
      
      // Check if this is the last Owner
      const currentRole = roles.find(r => r.id === users.find(u => u.id === userId)?.role);
      if (currentRole?.name === 'Owner') {
        // Count how many owners we have
        const ownerCount = users.filter(u => {
          const userRole = roles.find(r => r.id === u.role);
          return userRole?.name === 'Owner';
        }).length;
        
        if (ownerCount <= 1 && role.name !== 'Owner') {
          toast.error("Cannot remove the last Owner. Please assign another Owner first.");
          return;
        }
      }
      
      // Update the user's role in the database
      const { error } = await supabase
        .from('store_users')
        .update({ role_id: newRoleId })
        .eq('store_id', storeId)
        .eq('user_id', userId);
        
      if (error) throw error;
      
      // Update local state
      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, role: newRoleId, role_name: role.name } 
          : user
      ));
      
      toast.success(`${email}'s role updated to ${role.name}`);
    } catch (error: any) {
      console.error('Error updating user role:', error);
      toast.error(`Failed to update role: ${error.message}`);
    }
  };

  // Update the status comparison
  const getStatusColor = (user: StoreUser) => {
    if (user.invited) return 'bg-yellow-100 text-yellow-800';
    return user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const getStatusText = (user: StoreUser) => {
    if (user.invited) return 'Invited';
    return user.active ? 'Active' : 'Inactive';
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="users">
        <TabsList className="mb-4">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
        </TabsList>
        
        <TabsContent value="users" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-medium">Store Users</h2>
            <Dialog open={showInviteUserDialog} onOpenChange={setShowInviteUserDialog}>
              <DialogTrigger asChild>
                <AdminButton size="sm">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite User
                </AdminButton>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite a new user</DialogTitle>
                  <DialogDescription>
                    Send an invitation to collaborate on this store.
                  </DialogDescription>
                </DialogHeader>
                
                <form className="space-y-6 py-4" onSubmit={(e) => {
                  e.preventDefault();
                  handleInviteUser();
                }}>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="invite-email">Email address</Label>
                      <div className="flex items-center border rounded-md focus-within:ring-2 focus-within:ring-[#4A332F] focus-within:border-[#4A332F]">
                        <Mail className="ml-3 h-4 w-4 text-gray-500" />
                        <Input
                          id="invite-email"
                          type="email"
                          placeholder="colleague@example.com"
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                          required
                        />
                      </div>
                      <p className="text-xs text-gray-500">They&apos;ll receive an email invitation to join this store.</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="invite-role">Role assignment</Label>
                      <div className="relative">
                        <Select 
                          value={newUserRole} 
                          onValueChange={(value) => {
                            console.log("Selected role ID:", value);
                            setNewUserRole(value);
                          }}
                        >
                          <SelectTrigger id="invite-role" className="w-full bg-white">
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                          <SelectContent position="popper" className="z-[9999] w-full min-w-[200px]" sideOffset={5}>
                            {roles.length > 0 ? (
                              roles.map((role) => (
                                <SelectItem key={role.id} value={role.id} className="cursor-pointer">
                                  {role.name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-roles" disabled>
                                No roles available
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      {roles.length > 0 && newUserRole && (
                        <p className="text-xs text-gray-500 mt-1">
                          {roles.find(r => r.id === newUserRole)?.description || ""}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <DialogFooter className="pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowInviteUserDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      disabled={!newUserEmail || !newUserRole}
                      className="flex items-center"
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      Send Invitation
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No users found. Invite someone to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id} className="group">
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>
                          <Select
                            value={user.role}
                            onValueChange={(value) => handleChangeUserRole(user.id, user.email, value)}
                          >
                            <SelectTrigger className="w-[140px] h-8">
                              <SelectValue>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100">
                                  {user.role_name}
                                </span>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {roles.map((role) => (
                                <SelectItem key={role.id} value={role.id} className="cursor-pointer">
                                  {role.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user)}`}>
                            {getStatusText(user)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right p-0 pr-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-70 group-hover:opacity-100">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[160px]">
                              {user.invited && (
                                <DropdownMenuItem
                                  onClick={() => handleAcceptInvitation(user.id, user.email)}
                                  className="cursor-pointer"
                                >
                                  <Check className="mr-2 h-4 w-4 text-green-500" />
                                  <span>Accept Invitation</span>
                                </DropdownMenuItem>
                              )}
                              {!user.invited && (
                                <DropdownMenuItem
                                  onClick={() => handleStatusChange(user.id, user.active === false ? 'active' : 'inactive')}
                                  className="cursor-pointer"
                                >
                                  {user.active === false ? (
                                    <>
                                      <Check className="mr-2 h-4 w-4 text-green-500" />
                                      <span>Activate</span>
                                    </>
                                  ) : (
                                    <>
                                      <X className="mr-2 h-4 w-4 text-orange-500" />
                                      <span>Deactivate</span>
                                    </>
                                  )}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem 
                                onClick={() => handleRemoveUser(user.id, user.email)}
                                className="cursor-pointer text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Remove</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="roles" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-medium">Roles & Permissions</h2>
            <Dialog open={showAddRoleDialog} onOpenChange={setShowAddRoleDialog}>
              <DialogTrigger asChild>
                <AdminButton size="sm">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Role
                </AdminButton>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create a new role</DialogTitle>
                  <DialogDescription>
                    Define a new role with specific permissions.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="role-name">Role Name</Label>
                    <Input
                      id="role-name"
                      placeholder="e.g., Store Manager"
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role-description">Description</Label>
                    <Input
                      id="role-description"
                      placeholder="Describe what this role can do"
                      value={newRoleDescription}
                      onChange={(e) => setNewRoleDescription(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddRoleDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddRole} disabled={!newRoleName}>
                    Create Role
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="md:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Roles</CardTitle>
                <CardDescription className="text-xs">Select a role to edit permissions</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1.5">
                  {roles.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No roles defined yet.</p>
                  ) : (
                    roles.map((role) => (
                      <button
                        key={role.id}
                        onClick={() => setSelectedRole(role)}
                        className={`w-full text-left px-3 py-2 rounded-md text-xs transition-all flex items-center justify-between ${
                          selectedRole?.id === role.id
                            ? "bg-[#19191c] text-white shadow-sm"
                            : "hover:bg-gray-100 border border-gray-100"
                        }`}
                      >
                        <span className="font-medium">{role.name}</span>
                        {selectedRole?.id === role.id && (
                          <Check className="h-3 w-3 ml-2" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card className="md:col-span-3">
              <CardHeader className="border-b pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{selectedRole?.name || "Select a role"}</CardTitle>
                    <CardDescription className="text-xs mt-1">{selectedRole?.description}</CardDescription>
                  </div>
                  {selectedRole && (
                    <span className="px-2 py-0.5 bg-gray-100 text-xs font-medium rounded-full">
                      {selectedRole.permissions.length} permissions
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {!selectedRole ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="bg-gray-100 p-3 rounded-full mb-3">
                      <PlusCircle className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-base font-medium">No role selected</p>
                    <p className="text-xs text-muted-foreground max-w-md mt-1">
                      Select a role from the left panel to manage its permissions.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {["Products", "Orders", "Customers", "Settings"].map((category) => {
                      const categoryPermissions = permissions.filter(
                        (p) => p.category === category.toLowerCase()
                      );
                      
                      if (categoryPermissions.length === 0) return null;
                      
                      return (
                        <div key={category} className="space-y-2">
                          <div className="flex items-center mb-2">
                            <h3 className="font-medium text-sm">{category}</h3>
                            <div className="h-px bg-gray-200 flex-grow ml-3"></div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {categoryPermissions.map((permission) => (
                              <div
                                key={permission.id}
                                className="flex items-center justify-between p-2 rounded-md border border-gray-100 hover:border-gray-200 transition-all"
                              >
                                <div className="pr-2">
                                  <p className="font-medium text-xs">{permission.name}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                    {permission.description}
                                  </p>
                                </div>
                                <Switch
                                  checked={selectedRole.permissions.includes(permission.id)}
                                  onCheckedChange={() => handleTogglePermission(permission.id)}
                                  className="ml-2 h-4 w-7 data-[state=checked]:bg-[#19191c]"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}