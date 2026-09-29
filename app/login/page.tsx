"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "../../lib/supabase-client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    supabase?.auth.getSession().then(({ data }) =>
      setHasSession(Boolean(data.session)),
    );
  }, [supabase]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return setMessage("Supabase is not configured.");
    setBusy(true);
    setMessage("");
    const result = mode === "sign-in"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
    setBusy(false);
    if (result.error) return setMessage(result.error.message);
    if (mode === "sign-up" && !result.data.session) return setMessage("Account created. Check your email to confirm it, then sign in.");
    const next = new URLSearchParams(window.location.search).get("next");
    router.push(next === "create-job" ? "/?create=1" : "/");
    router.refresh();
  }

  return <main className="auth-page"><div className="auth-card"><div className="brand auth-brand"><span className="brand-mark">H</span><span>hire<span>flow</span></span></div><p className="eyebrow">Nowshera Digital</p><h1>{mode === "sign-in" ? "Welcome back" : "Create your account"}</h1><p className="muted">{mode === "sign-in" ? "Sign in to continue to your hiring workspace." : "Candidates can create an account and apply for open roles."}</p><form onSubmit={submit}>{mode === "sign-up" && <label>Full name<input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Your full name" /></label>}<label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" /></label><label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="At least 6 characters" /></label>{message && <p className="auth-message">{message}</p>}<button className="button primary auth-submit" disabled={busy}>{busy ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account"}</button></form>{mode === "sign-in" && <div className="test-account"><strong>For your test video</strong><span>Admin: admin@test.com · test123</span><span>Recruiter: recruiter@test.com · test123</span><button type="button" onClick={() => { setEmail("admin@test.com"); setPassword("test123"); }}>Use Admin account</button></div>}<button className="auth-toggle" onClick={() => { setMode(mode === "sign-in" ? "sign-up" : "sign-in"); setMessage(""); }}>{mode === "sign-in" ? "Need a candidate account? Sign up" : "Already have an account? Sign in"}</button><div className="auth-navigation">{hasSession && <button className="auth-back" onClick={async () => { await supabase?.auth.signOut(); setHasSession(false); }}>Sign out</button>}<button className="auth-back" onClick={() => router.push("/")}>← Back to website</button></div></div></main>;
}
