import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase/client";

export const Route = createFileRoute("/onboarding")({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw redirect({ to: "/login" });
    }

    throw redirect({ to: "/pos-cadastro" });
  },
  component: OnboardingRedirect,
});

function OnboardingRedirect() {
  return null;
}
