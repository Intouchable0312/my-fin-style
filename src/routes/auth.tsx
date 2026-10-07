import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  beforeLoad: () => { throw redirect({ to: "/" }); },
  head: () => ({
    meta: [
      { title: "Connexion — Mon Compte" },
      { name: "description", content: "Accédez de façon sécurisée à vos comptes bancaires personnels." },
      { property: "og:title", content: "Connexion — Mon Compte" },
      { property: "og:description", content: "Accédez de façon sécurisée à vos comptes bancaires personnels." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) void navigate({ to: "/" });
    });
  }, [navigate]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    if (mode === "forgot") {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      setBusy(false);
      if (resetError) setError(resetError.message);
      else setMessage("Un lien de récupération vient de vous être envoyé.");
      return;
    }

    const result = mode === "signup"
      ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth` } })
      : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    if (mode === "signup" && !result.data.session) {
      setMessage("Confirmez votre adresse e-mail pour terminer la création du compte.");
      return;
    }
    await navigate({ to: "/" });
  };

  const signInGoogle = async () => {
    setBusy(true);
    setError("");
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (result.error) {
      setError(result.error.message);
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-muted px-5 py-10">
      <section className="w-full max-w-[430px] bg-card px-7 py-9 shadow-sm">
        {mode === "forgot" && (
          <Button variant="ghost" size="icon" aria-label="Retour à la connexion" onClick={() => setMode("signin")} className="-ml-2 mb-5 text-primary">
            <ArrowLeft />
          </Button>
        )}
        <p className="text-[15px] text-muted-foreground">MON COMPTE</p>
        <h1 className="mt-2 text-[30px] font-semibold">
          {mode === "signin" ? "Connexion" : mode === "signup" ? "Créer votre accès" : "Récupérer votre accès"}
        </h1>
        <p className="mt-3 text-[17px] leading-6 text-muted-foreground">
          {mode === "forgot" ? "Saisissez l’adresse e-mail associée à votre accès." : "Vos informations bancaires restent privées et protégées."}
        </p>

        <form onSubmit={submit} className="mt-8 space-y-5">
          <label className="block text-[15px] font-medium">
            Adresse e-mail
            <Input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 h-12 text-[17px]" />
          </label>
          {mode !== "forgot" && (
            <label className="block text-[15px] font-medium">
              Mot de passe
              <span className="relative mt-2 block">
                <Input required minLength={8} type={showPassword ? "text" : "password"} autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 pr-12 text-[17px]" />
                <Button type="button" variant="ghost" size="icon" aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"} onClick={() => setShowPassword((value) => !value)} className="absolute right-1 top-1.5 text-muted-foreground">
                  {showPassword ? <EyeOff /> : <Eye />}
                </Button>
              </span>
            </label>
          )}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {message && <p role="status" className="text-sm text-foreground">{message}</p>}
          <Button type="submit" disabled={busy} className="h-12 w-full text-[17px]">
            {busy ? "Veuillez patienter…" : mode === "signin" ? "Se connecter" : mode === "signup" ? "Créer mon accès" : "Envoyer le lien"}
          </Button>
        </form>

        {mode !== "forgot" && (
          <>
            <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />OU<span className="h-px flex-1 bg-border" /></div>
            <Button variant="outline" disabled={busy} onClick={signInGoogle} className="h-12 w-full text-[16px]">Continuer avec Google</Button>
            <div className="mt-7 flex flex-col items-center gap-3 text-sm">
              <Button variant="link" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
                {mode === "signin" ? "Créer un accès" : "J’ai déjà un accès"}
              </Button>
              {mode === "signin" && <Button variant="link" onClick={() => setMode("forgot")}>Mot de passe oublié ?</Button>}
            </div>
          </>
        )}
      </section>
    </main>
  );
}