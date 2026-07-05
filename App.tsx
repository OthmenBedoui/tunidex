import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './src/routes';
import { AuthProvider } from './src/contexts/AuthContext';
import { CartProvider } from './src/contexts/CartContext';
import { CommerceProvider } from './src/contexts/CommerceContext';
import { NotificationProvider } from './src/contexts/NotificationContext';
import { queryClient } from './src/queryClient';
import { UIProvider } from './src/contexts/UIContext';

const App: React.FC = () => (
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <UIProvider>
        <AuthProvider>
          <CommerceProvider>
            <CartProvider>
              <NotificationProvider>
                <AppRoutes />
              </NotificationProvider>
            </CartProvider>
          </CommerceProvider>
        </AuthProvider>
      </UIProvider>
    </QueryClientProvider>
  </BrowserRouter>
);

export default App;
