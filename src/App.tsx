import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { RepoPage } from './pages/RepoPage';
import { CodeEntry } from './pages/CodeEntry';
import { ToastProvider } from './components/ui/Toast';
import { ConfirmProvider } from './components/ui/ConfirmDialog';
import { ProjectProvider, useProject } from './contexts/ProjectContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { projectCode, isLoading } = useProject();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!projectCode) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { projectCode, isLoading } = useProject();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={
        projectCode ? <Navigate to="/" replace /> : <CodeEntry />
      } />
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Home />} />
        <Route path="repo/:id" element={<RepoPage />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <ProjectProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ProjectProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}

export default App;
