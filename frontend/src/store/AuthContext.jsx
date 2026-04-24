import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getMyMenus } from "../api/permissionApi";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessibleMenus, setAccessibleMenus] = useState([]);

  const fetchMenus = useCallback(async () => {
    try {
      const res = await getMyMenus();
      setAccessibleMenus(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch user menus", err);
      setAccessibleMenus([]);
    }
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && token) {
      fetchMenus().finally(() => setLoading(false));
    } else if (!token) {
      setAccessibleMenus([]);
      setLoading(false);
    }
  }, [user, token, fetchMenus]);

  const login = (tokenValue, userData) => {
    localStorage.setItem("token", tokenValue);
    localStorage.setItem("user", JSON.stringify(userData));
    setToken(tokenValue);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    setAccessibleMenus([]);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, accessibleMenus }}>
      {children}
    </AuthContext.Provider>
  );
};


export const useAuth = () => useContext(AuthContext);
