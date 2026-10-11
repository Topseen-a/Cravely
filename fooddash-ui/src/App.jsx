import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './context/hooks';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { StoreProvider } from './context/StoreContext';
import { ToastProvider } from './context/ToastContext';
import Navbar from './components/Navbar';
import MobileNav from './components/MobileNav';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import MenuPage from './pages/MenuPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StaffRegisterPage from './pages/StaffRegisterPage';
import CartPage from './pages/CartPage';
import OrderPage from './pages/OrderPage';
import OrderHistoryPage from './pages/OrderHistoryPage';
import AccountPage from './pages/AccountPage';
import PaymentCallbackPage from './pages/PaymentCallbackPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import StaffDashboard from './pages/StaffDashboard';
import MenuManagementPage from './pages/MenuManagementPage';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// Completes a logout: first go home (leaving any members-only page while still
// signed in), then clear the session there.
function LogoutHandler() {
  const { loggingOut, completeLogout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  useEffect(() => {
    if (!loggingOut) return;
    if (pathname !== '/') navigate('/', { replace: true });
    else completeLogout();
  }, [loggingOut, pathname, navigate, completeLogout]);
  return null;
}

// Auth pages use their own full-bleed layout without the footer.
function Shell({ children }) {
  const { pathname } = useLocation();
  const bare = ['/login', '/register', '/staff/register', '/forgot-password', '/reset-password'].includes(pathname);
  return (
    <>
      <Navbar />
      <main className={bare ? '' : 'mx-auto min-h-[60vh] max-w-6xl px-4 pb-24 pt-6 md:pb-6'}>{children}</main>
      {!bare && <Footer />}
      <MobileNav />
    </>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <StoreProvider>
            <BrowserRouter>
              <ScrollToTop />
              <LogoutHandler />
              <Shell>
                <Routes>
                  <Route path="/" element={<MenuPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/staff/register" element={<StaffRegisterPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  <Route path="/cart" element={<ProtectedRoute customerOnly><CartPage /></ProtectedRoute>} />
                  <Route path="/orders" element={<ProtectedRoute customerOnly><OrderHistoryPage /></ProtectedRoute>} />
                  <Route path="/orders/:id" element={<ProtectedRoute><OrderPage /></ProtectedRoute>} />
                  <Route path="/payment/callback" element={<ProtectedRoute><PaymentCallbackPage /></ProtectedRoute>} />
                  <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
                  <Route path="/staff" element={<ProtectedRoute staffOnly><StaffDashboard /></ProtectedRoute>} />
                  <Route path="/staff/menu" element={<ProtectedRoute staffOnly><MenuManagementPage /></ProtectedRoute>} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Shell>
            </BrowserRouter>
          </StoreProvider>
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
