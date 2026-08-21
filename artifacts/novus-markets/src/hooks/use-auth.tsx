import React, { createContext, useContext } from "react";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import type { User } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const { data: user, isLoading: isUserLoading, isError } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      retry: false,
    },
  });

  const login = () => {
    queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
  };

  const logout = () => {
    queryClient.removeQueries({ queryKey: getGetMeQueryKey() });
    queryClient.setQueryData(getGetMeQueryKey(), null);
  };

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading: isUserLoading,
        login,
        logout,
        isAuthenticated: !!user && !isError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}