import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { RepoPage } from './pages/RepoPage';
import { ToastProvider } from './components/ui/Toast';
import { ConfirmProvider } from './components/ui/ConfirmDialog';

function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="repo/:id" element={<RepoPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ConfirmProvider>
    </ToastProvider>
  );
}

export default App;
