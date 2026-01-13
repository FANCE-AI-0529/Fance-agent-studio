import { useAppModeStore } from "@/stores/appModeStore";
import { HackerTransition } from "@/components/consumer/HackerTransition";
import ConsumerHome from "@/pages/ConsumerHome";
import Index from "@/pages/Index";
import { MainLayout } from "./MainLayout";

export function ModeAwareLayout() {
  const { mode, isTransitioning } = useAppModeStore();

  // Show transition animation
  if (isTransitioning) {
    return <HackerTransition />;
  }

  // Consumer mode - magic interface
  if (mode === 'consumer') {
    return <ConsumerHome />;
  }

  // Studio mode - full IDE
  return (
    <MainLayout>
      <Index />
    </MainLayout>
  );
}
