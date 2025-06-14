"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, AlertCircle } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { redirect } from 'next/navigation';

export default function InventoryPage() {
  redirect('/admin/products');
}