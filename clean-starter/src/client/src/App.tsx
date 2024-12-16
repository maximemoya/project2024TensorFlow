import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import LobbyPage from './pages/LobbyPage';
import TrainingSetPage from './pages/TrainingSetPage';
import ModelPage from './pages/ModelPage';
import CreateModelPage from './pages/CreateModelPage';
import ModelDetailPage from './pages/ModelDetailPage';
import ProtectedRoute from './components/ProtectedRoute';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/lobby"
              element={
                <ProtectedRoute>
                  <LobbyPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/training-sets"
              element={
                <ProtectedRoute>
                  <TrainingSetPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/models"
              element={
                <ProtectedRoute>
                  <ModelPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/models/create"
              element={
                <ProtectedRoute>
                  <CreateModelPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/models/:id"
              element={
                <ProtectedRoute>
                  <ModelDetailPage />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/lobby" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
