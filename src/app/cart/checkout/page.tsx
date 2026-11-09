import { Suspense } from "react";
import { CheckoutScreen } from "@/components/delivery-checkout";

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutScreen />
    </Suspense>
  );
}
