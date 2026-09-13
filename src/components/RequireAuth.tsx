import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";

/**
 * Wraps a route that requires a signed-in user. Signed-out visitors are sent
 * straight to `/auth` with their intended path preserved via `returnTo`.
 */
export function RequireAuth({
  children,
}: {
  children: ReactNode;
}) {
  const { isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (!isAuthenticated) {
    const returnTo = `${location.pathname}${location.search}`;
    const signInHref = `/auth?returnTo=${encodeURIComponent(returnTo)}`;
    return <Navigate to={signInHref} replace />;
  }

  return children;
}
