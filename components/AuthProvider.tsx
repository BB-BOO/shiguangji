"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { DailyTargetRange, UserProfile } from "@/lib/types";
import { calculateInitialTargets } from "@/lib/goals";
import {
  addMemoryEntry,
  getAuth,
  loadProfile,
  loadTargets,
  saveProfile,
  saveTargets,
  setAuth,
} from "@/lib/storage";
import { setStoredUserId, clearStoredUserId } from "@/lib/userId";
import { loginUser, registerUser } from "@/lib/db";

interface AuthState {
  isAuthenticated: boolean;
  userProfile: UserProfile | null;
  dailyTarget: DailyTargetRange | null;
  login: (username: string) => Promise<void>;
  register: (username: string) => Promise<void>;
  logout: () => void;
  updateProfile: (profile: UserProfile) => void;
  updateTargets: (targets: DailyTargetRange) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [dailyTarget, setDailyTarget] = useState<DailyTargetRange | null>(null);

  useEffect(() => {
    setIsAuthenticated(getAuth());
    async function load() {
      setUserProfile(await loadProfile());
      setDailyTarget(await loadTargets());
    }
    load();
    setMounted(true);
  }, []);

  const login = useCallback(async (username: string) => {
    const id = await loginUser(username);
    setStoredUserId(id);
    setAuth(true);
    setIsAuthenticated(true);
  }, []);

  const register = useCallback(async (username: string) => {
    const id = await registerUser(username);
    setStoredUserId(id);
    setAuth(true);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    clearStoredUserId();
    setAuth(false);
    setIsAuthenticated(false);
  }, []);

  const updateProfile = useCallback(
    (profile: UserProfile) => {
      saveProfile(profile);
      setUserProfile(profile);
      const targets = calculateInitialTargets(
        profile.goal_mode,
        profile.weight_kg,
        profile.height_cm,
        profile.age,
      );
      saveTargets(targets);
      setDailyTarget(targets);

      const now = new Date().toISOString();
      const syncEntries = [
        { field: "身高", value: `${profile.height_cm}cm`, source: "profile", extracted_at: now },
        { field: "体重", value: `${profile.weight_kg}kg`, source: "profile", extracted_at: now },
        { field: "年龄", value: `${profile.age}岁`, source: "profile", extracted_at: now },
        { field: "目标", value: profile.goal_mode, source: "profile", extracted_at: now },
      ];
      for (const entry of syncEntries) {
        addMemoryEntry(entry);
      }
    },
    [],
  );

  const updateTargets = useCallback((targets: DailyTargetRange) => {
    saveTargets(targets);
    setDailyTarget(targets);
  }, []);

  if (!mounted) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="h-8 w-8 animate-pulse rounded-full bg-emerald-200/60" />
          <p className="text-sm text-[var(--color-muted)]">加载中…</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userProfile,
        dailyTarget,
        login,
        register,
        logout,
        updateProfile,
        updateTargets,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
