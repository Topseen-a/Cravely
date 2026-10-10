import api from './client';

// Auth & profile
export const register = (data) => api.post('/auth/register', data);
export const registerStaff = (data) => api.post('/auth/register-staff', data);
export const login = (data) => api.post('/auth/login', data);
export const forgotPassword = (email) => api.post('/auth/forgot-password', { email });
export const resetPassword = (token, password) => api.post('/auth/reset-password', { token, password });
export const getMe = () => api.get('/auth/me');
export const updateMe = (data) => api.patch('/auth/me', data);
export const changePassword = (data) => api.put('/auth/me/password', data);

// Public
export const getStore = () => api.get('/store');
export const getMenu = () => api.get('/menu');
export const getCategories = () => api.get('/categories');
export const getDeliveryZones = () => api.get('/delivery-zones');

// Cart
export const getCart = () => api.get('/cart');
export const addToCart = (data) => api.post('/cart/items', data);
export const updateCartItem = (id, data) => api.patch(`/cart/items/${id}`, data);
export const removeCartItem = (id) => api.delete(`/cart/items/${id}`);
export const clearCart = () => api.delete('/cart');

// Orders & payments
export const placeOrder = (data) => api.post('/orders', data);
export const getMyOrders = (page = 1, pageSize = 10) => api.get('/orders', { params: { page, page_size: pageSize } });
export const getOrder = (id) => api.get(`/orders/${id}`);
export const cancelOrder = (id, reason) => api.post(`/orders/${id}/cancel`, { reason });
export const payOrder = (id) => api.post(`/orders/${id}/pay`);
export const verifyPayment = (reference) => api.get('/payments/verify', { params: { reference } });

// Staff
export const getTodaysOrders = (params = {}) => api.get('/staff/orders', { params });
export const updateOrderStatus = (id, data) => api.patch(`/staff/orders/${id}/status`, data);
export const getDailySummary = (params = {}) => api.get('/staff/summary', { params });
export const getMenuAdmin = () => api.get('/staff/menu');
export const createMenuItem = (data) => api.post('/staff/menu', data);
export const updateMenuItem = (id, data) => api.put(`/staff/menu/${id}`, data);
export const deleteMenuItem = (id) => api.delete(`/staff/menu/${id}`);
export const toggleAvailability = (id) => api.patch(`/staff/menu/${id}/availability`);
export const setSoldOutNote = (id, data) => api.patch(`/staff/menu/${id}/sold-out-note`, data);
export const createCategory = (data) => api.post('/staff/categories', data);
export const updateCategory = (id, data) => api.put(`/staff/categories/${id}`, data);
export const deleteCategory = (id) => api.delete(`/staff/categories/${id}`);
export const getZonesAdmin = () => api.get('/staff/delivery-zones');
export const createZone = (data) => api.post('/staff/delivery-zones', data);
export const updateZone = (id, data) => api.put(`/staff/delivery-zones/${id}`, data);
export const deleteZone = (id) => api.delete(`/staff/delivery-zones/${id}`);
