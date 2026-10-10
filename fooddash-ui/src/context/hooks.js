import { createContext, useContext } from 'react';

// Context objects and their hooks live here (separate from the provider
// components) so React Fast Refresh works on the provider files.
export const AuthContext = createContext(null);
export const CartContext = createContext(null);
export const StoreContext = createContext({ store: null, zones: [] });
export const ToastContext = createContext(() => {});

export const useAuth = () => useContext(AuthContext);
export const useCart = () => useContext(CartContext);
export const useStore = () => useContext(StoreContext);
export const useToast = () => useContext(ToastContext);
