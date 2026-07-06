import { Suspense } from "react";
import { History } from "@/client/pages/History";

export default function HistoryPage() {
  return (
    <Suspense>
      <History />
    </Suspense>
  );
}
