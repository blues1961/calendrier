import React, { createContext, useContext, useEffect, useState } from "react";
import { login as apiLogin, whoami, tokens, refresh as apiRefresh } from "../api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => { (async () => {
    if (tokens.access) { try { setUser(await whoami()); } catch { setUser(null); } }
    setReady(true);
  })(); }, []);

  async function signIn(username, password) {
    const { access } = await apiLogin(username, password);
    const me = await whoami(access);
    setUser(me);
    return me;
  }
  function signOut(){ tokens.clear(); setUser(null); }

  const value = { user, ready, signIn, signOut };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(){ const c = useContext(AuthCtx); if(!c) throw new Error('useAuth within AuthProvider'); return c; }
