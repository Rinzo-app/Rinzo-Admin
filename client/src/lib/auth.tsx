import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { isFirebaseConfigured, getFirebaseAuth } from "./firebase";
import { queryClient } from "./queryClient";

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "https://api.rinzo.app";

interface AdminInfo {
  id: string;
  username: string;
  name: string;
}

interface AuthContextType {
  admin: AdminInfo | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function buildAdmin(firebaseUser: any): AdminInfo {
  return {
    id: firebaseUser.uid,
    username: firebaseUser.email || firebaseUser.uid,
    name:
      firebaseUser.displayName ||
      firebaseUser.email?.split("@")[0] ||
      "Admin",
  };
}

/**
 * Verify that the authenticated Firebase user has ADMIN role
 * in the Rinzo backend.  Returns the backend user object or
 * throws if verification fails.
 */
async function verifyAdminRole(firebaseUser: any): Promise<void> {
  const idToken = await firebaseUser.getIdToken();
  const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });

  if (!res.ok) {
    throw new Error("Unable to verify account. Please try again.");
  }

  const data = await res.json();
  if (data.role !== "ADMIN") {
    throw new Error("Access denied — admin accounts only");
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── Bootstrap: listen to Firebase auth state ───────────
  useEffect(() => {
    if (!isFirebaseConfigured) {
      setIsLoading(false);
      return;
    }

    const auth = getFirebaseAuth();
    if (!auth) {
      setIsLoading(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;

    import("firebase/auth").then(({ onAuthStateChanged, signOut }) => {
      unsubscribe = onAuthStateChanged(auth, async (firebaseUser: any) => {
        if (firebaseUser) {
          try {
            await verifyAdminRole(firebaseUser);
            setAdmin(buildAdmin(firebaseUser));
          } catch {
            // Not an admin — sign out immediately
            await signOut(auth).catch(() => {});
            setAdmin(null);
            queryClient.clear();
          }
        } else {
          setAdmin(null);
        }
        setIsLoading(false);
      });
    }).catch(() => {
      setIsLoading(false);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // ── Email / password sign-in ────────────────────────────
  // The login form sends "username" but admins register with
  // email addresses in Firebase, so we treat username as email.
  const login = async (username: string, password: string) => {
    if (!isFirebaseConfigured) {
      throw new Error("Firebase is not configured");
    }
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Firebase auth not available");

    const { signInWithEmailAndPassword, signOut } = await import("firebase/auth");
    try {
      const cred = await signInWithEmailAndPassword(auth, username, password);
      // Verify the user is an admin before onAuthStateChanged sets state
      await verifyAdminRole(cred.user);
      // onAuthStateChanged will set admin state
    } catch (err: any) {
      // If sign-in succeeded but role check failed, sign out
      if (auth.currentUser) {
        await signOut(auth).catch(() => {});
      }
      const code = err?.code || "";
      if (
        code === "auth/invalid-credential" ||
        code === "auth/wrong-password"
      ) {
        throw new Error("Invalid email or password");
      } else if (code === "auth/user-not-found") {
        throw new Error("No account found with this email");
      } else if (code === "auth/too-many-requests") {
        throw new Error("Too many attempts. Please try again later");
      } else if (code === "auth/invalid-email") {
        throw new Error("Please enter a valid email");
      }
      // Re-throw role-check errors as-is
      if (err.message?.includes("Access denied") || err.message?.includes("Unable to verify")) {
        throw err;
      }
      throw new Error("Sign in failed. Please try again");
    }
  };

  // ── Sign out ───────────────────────────────────────────
  const logout = async () => {
    try {
      if (isFirebaseConfigured) {
        const auth = getFirebaseAuth();
        if (auth) {
          const { signOut } = await import("firebase/auth");
          await signOut(auth);
        }
      }
      setAdmin(null);
      queryClient.clear();
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  const value = useMemo(
    () => ({ admin, isLoading, login, logout }),
    [admin, isLoading],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
