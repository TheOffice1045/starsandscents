"use client";

import * as React from "react";
import { toast as sonnerToast, Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };

export function useToast() {
  const toast = ({
    title,
    description,
    variant = "default",
  }: {
    title?: string;
    description?: string;
    variant?: "default" | "destructive";
  }) => {
    return sonnerToast(title, {
      description,
      className: variant === "destructive" ? "destructive" : "",
    });
  };

  return {
    toast,
  };
}