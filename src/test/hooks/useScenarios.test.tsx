import React, { useEffect } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useScenarios } from '@/hooks/useScenarios.ts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client.ts';
import { AuthProvider } from '@/contexts/AuthContext.tsx';

// jest-style mock (vitest supports similar API)
vi.mock('../../src/integrations/supabase/client.ts', () => {
  return {
    supabase: {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn(),
    },
  };
});


describe('useScenarios hook', () => {
  const queryClient = new QueryClient();
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );

  function TestComponent() {
    const { data, isLoading } = useScenarios();
    return (
      <div>
        {isLoading && <span>loading</span>}
        {data && <span data-testid="first-id">{data[0].id}</span>}
      </div>
    );
  }

  it('renders default scenarios when supabase returns empty', async () => {
    // mock supabase chain
    (supabase as any).from = () => ({
      select: () => ({
        or: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    });

    render(
      <Wrapper>
        <TestComponent />
      </Wrapper>
    );

    await waitFor(() => expect(screen.getByTestId('first-id')).toBeInTheDocument());
    expect(screen.getByTestId('first-id').textContent).toBe('interview-tech');
  });
});
