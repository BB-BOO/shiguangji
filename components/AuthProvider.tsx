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

interface AuthState {
  isAuthenticated: boolean;
  userProfile: UserProfile | null;
  dailyTarget: DailyTargetRange | null;
  login: (email: string, password: string) => void;
  register: (nickname: string, email: string, password: string) => void;
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
    setUserProfile(loadProfile());
    setDailyTarget(loadTargets());
    setMounted(true);
  }, []);

  const login = useCallback((_email: string, _password: string) => {
    setAuth(true);
    setIsAuthenticated(true);
  }, []);

  const register = useCallback((_nickname: string, _email: string, _password: string) => {
    setAuth(true);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
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

      // 同步到 memory，让 MemoryManager 立即可见
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
