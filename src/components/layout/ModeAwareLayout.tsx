import { useAppModeStore } from "../../stores/appModeStore.ts";
import { HackerTransition } from "../consumer/HackerTransition.tsx";
import ConsumerHome from "../../pages/ConsumerHome.tsx";
import Index from "../../pages/Index.tsx";
import { MainLayout } from "./MainLayout.tsx";

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
