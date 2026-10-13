"use client";

import { useState, useEffect, useCallback } from "react";
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
  id: string; // store_users row id
  user_id: string | null;
  email: string;
  role_id: string | null;
  role_name: string | null;
  active: boolean;
  pending: boolean;
  has_admin_access: boolean;
  is_self: boolean;
};

type Permission = {
  id: string;
  name: string;
  description: string;
  category: string;
};

// Admin access is granted by role name (middleware.ts); other roles can't open /indoorme.
const ADMIN_ROLE_NAMES = ["Owner", "Admin", "Manager"];

async function readJson(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body;
}

export default function RolesPermissionsSettings({ storeId }: { storeId: string | null }) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<StoreUser[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("");
  const [inviting, setInviting] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [showAddRoleDialog, setShowAddRoleDialog] = useState(false);
  const [showInviteUserDialog, setShowInviteUserDialog] = useState(false);

  const loadUsers = useCallback(async () => {
    if (!storeId) return;
    const data = await readJson(await fetch(`/api/admin/users?store_id=${storeId}`));
    setUsers(data.users);
    setIsOwner(Boolean(data.me?.is_owner));
  }, [storeId]);

  useEffect(() => {
    if (!storeId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const rolesData = await readJson(await fetch(`/api/admin/roles?store_id=${storeId}`));
        const permissionsData = await readJson(await fetch('/api/admin/permissions'));

        // Every store needs an Owner role; create it (with all permissions) if missing
        if (!rolesData.some((role: any) => role.name === 'Owner')) {
          const permissionIds = Object.values(permissionsData).flat().map((p: any) => p.id);
          const createOwnerResponse = await fetch('/api/admin/roles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              store_id: storeId,
              name: 'Owner',
              description: 'Full access and unrestricted permissions across the entire platform',
              permissions: permissionIds,
            }),
          });
          if (createOwnerResponse.ok) rolesData.push(await createOwnerResponse.json());
        }

        await loadUsers();

        const formattedRoles = rolesData.map((role: any) => ({
          id: role.id,
          name: role.name,
          description: role.description,
          permissions: Array.isArray(role.permissions) ? role.permissions : [],
        }));

        const formattedPermissions = Object.values(permissionsData).flat().map((permission: any) => ({
          id: permission.id,
          name: permission.name,
          description: permission.description,
          category: permission.category,
        }));

        setRoles(formattedRoles);
        setPermissions(formattedPermissions);
        if (formattedRoles.length > 0) setSelectedRole(formattedRoles[0]);
      } catch (error: any) {
        console.error('Error fetching roles and permissions:', error);
        toast.error(`Failed to load roles and permissions: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [storeId, loadUsers]);

  // Non-owners can't hand out the Owner role
  const assignableRoles = roles.filter(role => isOwner || role.name !== 'Owner');
  const roleLabel = (role: Role) =>
    ADMIN_ROLE_NAMES.includes(role.name) ? role.name : `${role.name} (no admin access)`;

  const handleInviteUser = async () => {
    if (!storeId || !newUserEmail || !newUserRole) {
      toast.error("Please select a role and enter an email address");
      return;
    }

    setInviting(true);
    try {
      const result = await readJson(await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: storeId, email: newUserEmail, role_id: newUserRole }),
      }));

      await loadUsers();
      toast.success(result.emailed
        ? `Invitation sent to ${newUserEmail}`
        : `${newUserEmail} already has an account and was added. They can sign in now.`);
      setNewUserEmail("");
      setNewUserRole("");
      setShowInviteUserDialog(false);
    } catch (error: any) {
      console.error('Error inviting user:', error);
      toast.error(`Failed to invite user: ${error.message}`);
    } finally {
      setInviting(false);
    }
  };

  // Shared runner for row actions: calls the API, then reloads the list from the server
  const runUserAction = async (user: StoreUser, request: () => Promise<Response>, success: string) => {
    setBusyUserId(user.id);
    try {
      await readJson(await request());
      await loadUsers();
      toast.success(success);
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error(error.message);
    } finally {
      setBusyUserId(null);
    }
  };

  const patchUser = (user: StoreUser, changes: Record<string, unknown>) =>
    fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ store_id: storeId, id: user.id, ...changes }),
    });

  const handleChangeUserRole = (user: StoreUser, newRoleId: string) => {
    const role = roles.find(r => r.id === newRoleId);
    if (!role || newRoleId === user.role_id) return;
    if (!ADMIN_ROLE_NAMES.includes(role.name) &&
        !confirm(`The ${role.name} role can't open the admin. ${user.email} will lose admin access. Continue?`)) {
      return;
    }
    runUserAction(user, () => patchUser(user, { role_id: newRoleId }), `${user.email} is now ${role.name}`);
  };

  const handleStatusChange = (user: StoreUser) => {
    const status = user.active ? 'inactive' : 'active';
    runUserAction(user, () => patchUser(user, { status }),
      status === 'active' ? `${user.email} activated` : `${user.email} deactivated`);
  };

  const handleResendInvite = (user: StoreUser) => {
    runUserAction(user, () => patchUser(user, { resend: true }), `Sign-in link sent to ${user.email}`);
  };

  const handleRemoveUser = (user: StoreUser) => {
    if (!confirm(`Remove ${user.email} from this store? Their login stays, but they lose admin access.`)) return;
    runUserAction(user, () => fetch(`/api/admin/users?store_id=${storeId}&id=${user.id}`, { method: 'DELETE' }),
      `${user.email} removed`);
  };

  const getStatusColor = (user: StoreUser) => {
    if (!user.active) return 'bg-red-100 text-red-800';
    return user.pending ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800';
  };

  const getStatusText = (user: StoreUser) => {
    if (!user.active) return 'Inactive';
    return user.pending ? 'Invited' : 'Active';
  };

  // Owners can only be changed by another Owner; nobody edits their own row
  const canEdit = (user: StoreUser) => !user.is_self && (isOwner || user.role_name !== 'Owner');


  const handleTogglePermission = async (permissionId: string) => {
    if (!selectedRole) return;
    
    const updatedPermissions = selectedRole.permissions.includes(permissionId)
      ? selectedRole.permissions.filter(id => id !== permissionId)
      : [...selectedRole.permissions, permissionId];
    
    try {
      const response = await fetch(`/api/admin/roles?id=${selectedRole.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedRole.name,
          description: selectedRole.description,
          permissions: updatedPermissions,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update permissions');
      }
      
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

  const handleAddRole = async () => {
    if (!storeId || !newRoleName.trim()) {
      toast.error("Please enter a role name");
      return;
    }
    
    try {
      const response = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: storeId,
          name: newRoleName.trim(),
          description: newRoleDescription.trim() || '',
          permissions: [],
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add role');
      }
      
      const data = await response.json();
      
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

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    if (!confirm(`Are you sure you want to delete the "${roleName}" role? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/admin/roles?id=${roleId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete role');
      }
      
      // Remove role from local state
      const updatedRoles = roles.filter(role => role.id !== roleId);
      setRoles(updatedRoles);
      
      // If the deleted role was selected, select the first available role
      if (selectedRole?.id === roleId) {
        setSelectedRole(updatedRoles.length > 0 ? updatedRoles[0] : null);
      }
      
      toast.success(`Role "${roleName}" deleted successfully`);
    } catch (error: any) {
      console.error('Error deleting role:', error);
      toast.error(`Failed to delete role: ${error.message}`);
    }
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
            <div>
              <h2 className="text-xl font-medium">Store Users</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Owner and Admin can use the whole admin. Manager can use everything except Settings and Finance. Other roles can&apos;t sign in to the admin.
              </p>
            </div>
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
                      <p className="text-xs text-gray-500">They&apos;ll get an email to set a password. If they already have an account, they&apos;re added straight away.</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="invite-role">Role assignment</Label>
                      <div className="relative">
                        <Select 
                          value={newUserRole} 
                          onValueChange={setNewUserRole}
                        >
                          <SelectTrigger id="invite-role" className="w-full bg-white">
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                          <SelectContent position="popper" className="z-[9999] w-full min-w-[200px]" sideOffset={5}>
                            {assignableRoles.length > 0 ? (
                              assignableRoles.map((role) => (
                                <SelectItem key={role.id} value={role.id} className="cursor-pointer">
                                  {roleLabel(role)}
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
                      disabled={!newUserEmail || !newUserRole || inviting}
                      className="flex items-center"
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      {inviting ? "Sending..." : "Send Invitation"}
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
                        <TableCell className="font-medium">
                          {user.email}
                          {user.is_self && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                          {user.active && !user.has_admin_access && (
                            <p className="text-xs font-normal text-orange-600 mt-0.5">
                              {user.role_name ? `${user.role_name} role can't open the admin` : 'No role assigned'}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={user.role_id ?? undefined}
                            onValueChange={(newRoleId) => handleChangeUserRole(user, newRoleId)}
                            disabled={!canEdit(user) || busyUserId === user.id}
                          >
                            <SelectTrigger className="w-[220px] bg-transparent">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              {roles
                                .filter(role => isOwner || role.name !== 'Owner' || role.id === user.role_id)
                                .map((role) => (
                                  <SelectItem key={role.id} value={role.id} className="cursor-pointer">
                                    {roleLabel(role)}
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
                          {canEdit(user) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-70 group-hover:opacity-100" disabled={busyUserId === user.id}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-[180px]">
                                {user.pending && user.active && (
                                  <DropdownMenuItem onClick={() => handleResendInvite(user)} className="cursor-pointer">
                                    <Mail className="mr-2 h-4 w-4" />
                                    <span>Resend invite</span>
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => handleStatusChange(user)} className="cursor-pointer">
                                  {user.active ? (
                                    <>
                                      <X className="mr-2 h-4 w-4 text-orange-500" />
                                      <span>Deactivate</span>
                                    </>
                                  ) : (
                                    <>
                                      <Check className="mr-2 h-4 w-4 text-green-500" />
                                      <span>Activate</span>
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleRemoveUser(user)}
                                  className="cursor-pointer text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  <span>Remove</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
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
                  <AdminButton variant="outline" onClick={() => setShowAddRoleDialog(false)}>
                    Cancel
                  </AdminButton>
                  <AdminButton onClick={handleAddRole} disabled={!newRoleName}>
                    Create Role
                  </AdminButton>
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