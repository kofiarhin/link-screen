import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import Providers from './redux/providers';
import AppRouter from './routes/AppRouter';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Providers>
      <AppRouter />
    </Providers>
  </StrictMode>
);
