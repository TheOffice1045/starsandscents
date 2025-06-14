export const dynamic = "force-dynamic";

import { Suspense } from "react";
import AccountContent from "./AccountContent";

export default function AccountPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AccountContent />
    </Suspense>
  );
}