import { Suspense } from "react";
import { Journal } from "@/client/pages/Journal";

export default function JournalPage() {
  return (
    <Suspense>
      <Journal />
    </Suspense>
  );
}
