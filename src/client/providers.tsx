"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/client/lib/theme";
import { Layout } from "@/client/components/Layout";
import { queryClient } from "@/client/lib/query";
import { Toaster } from "@/client/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <Layout>{children}</Layout>
        <Toaster richColors position="top-center" />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
