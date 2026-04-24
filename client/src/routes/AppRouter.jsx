import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import BrowserGuard from '../components/BrowserGuard';
import HomePage from '../pages/HomePage';
import SessionPage from '../pages/SessionPage';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <BrowserGuard>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/session/:id" element={<SessionPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserGuard>
    </BrowserRouter>
  );
}
