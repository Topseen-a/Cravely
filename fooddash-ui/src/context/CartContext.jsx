import { useState, useEffect, useCallback } from 'react';
import { CartContext, useAuth } from './hooks';
import * as API from '../api/endpoints';


export function CartProvider({ children }) {
  const { user, isStaff } = useAuth();
  const [cart, setCart] = useState(null);
  const [bump, setBump] = useState(0); // increments to animate the cart badge

  const enabled = !!user && !isStaff;

  const refreshCart = useCallback(
    () => (enabled ? API.getCart().then(({ data }) => setCart(data.data)).catch(() => setCart(null)) : Promise.resolve()),
    [enabled],
  );

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  // Every mutation returns the updated cart, so no extra fetch is needed.
  const run = async (fn) => {
    const { data } = await fn();
    setCart(data.data);
    return data.data;
  };

  const add = async (menuItemId, quantity = 1, special_instructions = '') => {
    const c = await run(() => API.addToCart({ menu_item_id: menuItemId, quantity, special_instructions }));
    setBump((b) => b + 1);
    return c;
  };
  const update = (lineId, quantity, special_instructions = '') =>
    run(() => API.updateCartItem(lineId, { quantity, special_instructions }));
  const remove = (lineId) => run(() => API.removeCartItem(lineId));
  const clear = () => run(() => API.clearCart());

  // Only expose a cart while a customer is signed in.
  const visible = enabled ? cart : null;
  const itemCount = visible?.items?.reduce((sum, i) => sum + i.quantity, 0) || 0;
  const lineFor = (menuItemId) => visible?.items?.find((i) => i.menu_item_id === menuItemId);

  return (
    <CartContext.Provider value={{ cart: visible, itemCount, bump, refreshCart, add, update, remove, clear, lineFor }}>
      {children}
    </CartContext.Provider>
  );
}
