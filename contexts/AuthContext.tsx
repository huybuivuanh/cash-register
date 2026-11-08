"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { isBusinessSetUp, loadMember, setBusinessId } from "@/lib/business";
import { setUpBusiness, type StoreInfo } from "@/lib/setup";
import { listenToAllStores, resetAllStores } from "@/stores/allStores";

/**
 * - loading: checking the login / looking up the business
 * - signedOut: show /login
 * - needsSetup: signed in but the store info hasn't been entered yet: show /setup
 * - ready: business loaded, data listeners running
 */
export type AuthStatus = "loading" | "signedOut" | "needsSetup" | "ready";

type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  /** The login's business and role; null before setup. */
  member: Member | null;
  /** Admins can change things; staff are read only. */
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  /** Saves the one-time store info and opens the register. */
  completeSetup: (info: StoreInfo) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Friendly text for Firebase Auth error codes. */
function authErrorMessage(err: unknown, fallback: string): string {
  const code = err && typeof err === "object" && "code" in err ? (err as { code: string }).code : "";
  switch (code) {
    case "auth/invalid-email":
      return "Invalid email address.";
    case "auth/user-not-found":
      return "No account with this email.";
    case "auth/wrong-password":
      return "Incorrect password.";
    case "auth/invalid-credential":
      return "Invalid email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Try again later.";
    case "auth/email-already-in-use":
      return "There's already an account with this email. Sign in instead.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/operation-not-allowed":
    case "auth/admin-restricted-operation":
      return "Creating accounts is turned off. Ask the owner to turn on sign-up in Firebase.";
    default:
      return fallback;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Stops the live store listeners; set while the business is loaded. */
  const stopListeningRef = useRef<(() => void) | null>(null);

  const stopListening = useCallback(() => {
    stopListeningRef.current?.();
    stopListeningRef.current = null;
  }, []);

  /** Loads a business's data and opens the app. */
  const startBusiness = useCallback(
    (m: Member) => {
      stopListening();
      setBusinessId(m.businessId);
      // Live listeners keep every store in sync for as long as staff are signed in.
      stopListeningRef.current = listenToAllStores();
      setMember(m);
      setStatus("ready");
    },
    [stopListening],
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      stopListening();
      setBusinessId(null);
      setMember(null);
      setUser(nextUser);
      if (!nextUser) {
        resetAllStores();
        setStatus("signedOut");
        return;
      }

      // Find this login's business before loading any data.
      setStatus("loading");
      try {
        const found = await loadMember(nextUser.uid);
        if (auth.currentUser?.uid !== nextUser.uid) return; // signed out meanwhile
        const setUp = found ? await isBusinessSetUp(found.businessId) : false;
        if (auth.currentUser?.uid !== nextUser.uid) return;

        if (found && setUp) {
          startBusiness(found);
        } else if (!found || found.role === "admin") {
          // New account, or an admin who hasn't finished setup.
          setMember(found);
          setStatus("needsSetup");
        } else {
          setError("Your business hasn't been set up yet. Ask the owner to finish setup first.");
          await signOut(auth);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't load your business.");
        await signOut(auth);
      }
    });
    return () => {
      unsubscribe();
      stopListening();
    };
  }, [stopListening, startBusiness]);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(authErrorMessage(err, "Login failed. Please try again."));
      throw err;
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(authErrorMessage(err, "Couldn't create the account. Please try again."));
      throw err;
    }
  }, []);

  const completeSetup = useCallback(
    async (info: StoreInfo) => {
      const current = auth.currentUser;
      if (!current) throw new Error("You're signed out. Sign in again.");
      startBusiness(await setUpBusiness(current.uid, member, info));
    },
    [member, startBusiness],
  );

  const logout = useCallback(async () => {
    setError(null);
    // Stop listening before signing out, or the listeners would hit permission errors.
    stopListening();
    await signOut(auth);
    resetAllStores();
  }, [stopListening]);

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider
      value={{
        status,
        user,
        member,
        isAdmin: member?.role === "admin",
        login,
        signUp,
        completeSetup,
        logout,
        error,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx == null) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
