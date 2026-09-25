import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LayoutShell } from '@/shared/ui/layout-shell';
import './styles.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

import { FeedbackInspectorOverlay } from '@/shared/ui/feedback-inspector-overlay';
import { UiLanguageProvider } from '@/shared/i18n/ui-language';

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <UiLanguageProvider>
        <LayoutShell />
        <FeedbackInspectorOverlay />
      </UiLanguageProvider>
    </QueryClientProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
