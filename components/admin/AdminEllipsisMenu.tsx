import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";
import { AdminButton } from "@/components/ui/admin-button";
import * as React from "react";

export function AdminEllipsisMenu({ children, disabled = false }: { children: React.ReactNode, disabled?: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <AdminButton
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 border-none focus:outline-none focus-visible:outline-none rounded-md"
          disabled={disabled}
        >
          <MoreVertical className="h-4 w-4" />
        </AdminButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="font-waldenburg text-[13px] rounded-md shadow-lg border border-gray-200 min-w-[120px] py-1"
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 