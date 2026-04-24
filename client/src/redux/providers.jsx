import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { store } from './store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000 },
  },
});

export default function Providers({ children }) {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </Provider>
  );
}
