import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router";
import { App } from "./App";
import { queryClient } from "./lib/query";
import { Toaster } from "@/client/components/ui/sonner";
import "../index.css";

const root = document.getElementById("root")!;
const tree = (
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
      <Toaster richColors position="top-center" />
    </QueryClientProvider>
  </StrictMode>
);

(import.meta.hot.data.root ??= createRoot(root)).render(tree);
