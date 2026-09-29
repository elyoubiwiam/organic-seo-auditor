import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import icon from "@/assets/icon.png";

export function SiteHeader() {
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
  return (
    <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
      <Link to="/" className="text-sm font-semibold text-primary">Organic Auditor</Link>
      <nav className="flex items-center gap-4 text-sm">
        {loading ? null : user ? (
          <>
            <Link to="/audits" className="text-muted-foreground hover:text-foreground">My audits</Link>
            <span className="hidden text-muted-foreground sm:inline">{user.email}</span>
            <button onClick={signOut} className="rounded-lg border px-3 py-1.5 hover:bg-secondary">Sign out</button>
          </>
        ) : (
          <Link to="/auth" className="rounded-lg bg-primary px-3 py-1.5 text-primary-foreground">Sign in</Link>
        )}
      </nav>
    </div>
  );
}
