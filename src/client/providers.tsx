"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { Layout } from "@/client/components/Layout";
import { queryClient } from "@/client/lib/query";
import { Toaster } from "@/client/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <Layout>{children}</Layout>
      <Toaster richColors position="top-center" />
    </QueryClientProvider>
  );
}
