import React, { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { screen, fireEvent, waitFor } from "@testing-library/dom";
import { ReactFlowProvider } from "@xyflow/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";

// Create a new QueryClient for each test
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

interface AllTheProvidersProps {
  children: React.ReactNode;
}

const AllTheProviders: React.FC<AllTheProvidersProps> = ({ children }) => {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ReactFlowProvider>{children}</ReactFlowProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) => render(ui, { wrapper: AllTheProviders, ...options });

export { customRender as render, screen, fireEvent, waitFor };
export type { RenderOptions };
