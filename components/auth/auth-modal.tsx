"use client";

import { createContext, useContext, useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BadgeCheck, MessageCircle, Search } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoginForm } from "@/components/login-form";
import { SignUpForm } from "@/components/sign-up-form";

type AuthView = "login" | "signup";

type AuthModalContextValue = {
  open: (view: AuthView) => void;
  close: () => void;
};

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) {
    throw new Error("useAuthModal must be used within an AuthModalProvider");
  }
  return ctx;
}

const VALUE_PROPS = [
  { icon: Search, text: "Browse gigs, part-time and full-time roles" },
  { icon: BadgeCheck, text: "Hire and get hired by fellow USC students" },
  { icon: MessageCircle, text: "Chat with employers on Messenger" },
];

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [view, setView] = useState<AuthView | null>(null);
  const router = useRouter();

  const open = (v: AuthView) => setView(v);
  const close = () => setView(null);

  const handleLoginSuccess = () => {
    close();
    router.refresh(); // re-render the server Navbar with the new auth cookies
  };

  return (
    <AuthModalContext.Provider value={{ open, close }}>
      {children}
      <Suspense fallback={null}>
        <AuthParamWatcher />
      </Suspense>
      <Dialog open={view !== null} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-none gap-0 overflow-hidden p-0 sm:max-w-[860px]">
          <DialogTitle className="sr-only">
            {view === "signup" ? "Join Hustl" : "Log in to Hustl"}
          </DialogTitle>
          <div className="grid md:grid-cols-[45%_1fr]">
            {/* Brand panel */}
            <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-green-600 to-green-800 p-8 text-white md:flex">
              {/* Low-opacity texture — pure CSS, no image asset */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-15"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 20% 20%, white 1.5px, transparent 1.5px)",
                  backgroundSize: "22px 22px",
                }}
              />
              <div className="relative">
                <span className="text-4xl font-bold tracking-tight">
                  Hustl<span className="text-green-200">.</span>
                </span>
                <p className="mt-3 max-w-[22ch] text-lg font-medium text-green-50">
                  The USC student marketplace for gigs and jobs.
                </p>
              </div>
              <ul className="relative flex flex-col gap-4">
                {VALUE_PROPS.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-3">
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-green-100" />
                    <span className="text-sm text-green-50">{text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Form panel */}
            <div className="p-8">
              {view === "signup" ? (
                <SignUpForm embedded onNavigate={setView} />
              ) : (
                <LoginForm
                  embedded
                  onNavigate={setView}
                  onSuccess={handleLoginSuccess}
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AuthModalContext.Provider>
  );
}

/**
 * Opens the modal when the URL carries ?auth=login|signup (e.g. after logout),
 * then strips the param so it doesn't re-fire on refresh/back. useSearchParams
 * makes this reactive to client navigations; Suspense-wrapped by the provider.
 */
function AuthParamWatcher() {
  const { open } = useAuthModal();
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = searchParams.get("auth");

  useEffect(() => {
    if (auth === "login" || auth === "signup") {
      open(auth);
      router.replace(window.location.pathname);
    }
  }, [auth, open, router]);

  return null;
}
