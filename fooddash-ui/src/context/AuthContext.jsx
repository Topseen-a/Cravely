import { useState, useEffect } from 'react';
import { AuthContext } from './hooks';
import * as API from '../api/endpoints';


function readUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  // Restore the session from localStorage so it survives a refresh.
  const [user, setUser] = useState(readUser);

  const saveSession = ({ token, user: u }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
    return u;
  };

  // Refresh the profile once on load so name/phone/role are current.
  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    API.getMe()
      .then(({ data }) => {
        localStorage.setItem('user', JSON.stringify(data.data));
        setUser(data.data);
      })
      .catch(() => {});
  }, []);

  const login = async (email, password) => saveSession((await API.login({ email, password })).data);

  // The API returns a token on sign-up, so new users go straight in.
  const register = async (form) => saveSession((await API.register(form)).data);

  const registerStaff = async (form) => saveSession((await API.registerStaff(form)).data);

  const updateUser = (u) => {
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, register, registerStaff, updateUser, saveSession, isStaff: user?.role === 'staff' }}>
      {children}
    </AuthContext.Provider>
  );
}
