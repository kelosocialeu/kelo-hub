"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Link2, LoaderCircle, ShieldCheck } from "lucide-react";

type LinkedAccount = { did: string; primary: boolean };

export default function AtprotoAccountManager({ primaryDid }: { primaryDid: string }) {
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [handle, setHandle] = useState("");
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState("");

  async function loadAccounts() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/oauth/accounts", { cache: "no-store", credentials: "same-origin" });
      const data = await response.json() as { accounts?: LinkedAccount[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Impossible de charger les comptes.");
      setAccounts(data.accounts ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible de charger les comptes liés.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadAccounts(); }, []);

  async function handleLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!handle.trim()) return;
    setLinking(true);
    setError("");
    try {
      const response = await fetch("/oauth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ handle: handle.trim(), intent: "link" }),
      });
      const data = await response.json() as { redirectUrl?: string; error?: string };
      if (!response.ok || !data.redirectUrl) throw new Error(data.error || "Impossible de démarrer la liaison OAuth.");
      window.location.assign(data.redirectUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "La liaison du compte a échoué.");
      setLinking(false);
    }
  }

  return (
    <div className="settings-layout">
      <section className="panel settings-panel">
        <div className="panel-heading">
          <div><h2>Comptes autorisés</h2><p>Liez chaque identité via son propre écran d’autorisation AT Protocol.</p></div>
          <Link2 size={19}/>
        </div>
        {loading ? (
          <p className="settings-note"><LoaderCircle className="spin-icon" size={17}/> Chargement des comptes autorisés…</p>
        ) : accounts.length ? (
          <div>
            {accounts.map(account => (
              <div className="settings-account" key={account.did}>
                <div className="settings-account-icon"><ShieldCheck size={21}/></div>
                <div>
                  <strong>{account.did}</strong>
                  <span>{account.primary ? "Identité principale de cet espace" : "Compte supplémentaire lié"}</span>
                  <small>OAuth restauré côté serveur</small>
                </div>
                <span className="connection-status"><i/> {account.primary ? "Principal" : "Lié"}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="settings-note">Aucun compte OAuth valide n’a pu être restauré. Recharge la page ou reconnecte-toi.</p>
        )}
        {error && <p className="atproto-feedback error" role="alert">{error}</p>}
      </section>

      <section className="panel settings-panel">
        <div className="panel-heading">
          <div><h2>Lier un autre compte</h2><p>Le compte actuel reste la session principale de Kelo Hub.</p></div>
          <Link2 size={19}/>
        </div>
        <form className="atproto-login-form" onSubmit={handleLink} style={{ maxWidth: "620px" }}>
          <label htmlFor="link-atproto-handle">Handle ou DID du compte à lier</label>
          <input
            className="login-field"
            id="link-atproto-handle"
            value={handle}
            onChange={event => setHandle(event.target.value)}
            placeholder="nom.bsky.social ou did:plc:…"
            autoComplete="off"
            required
            maxLength={253}
            disabled={linking || accounts.length >= 25}
          />
          <button className="primary-button login-submit" type="submit" disabled={linking || !handle.trim() || accounts.length >= 25}>
            {linking ? <><LoaderCircle className="spin-icon" size={16}/> Redirection…</> : <>Autoriser ce compte <ArrowRight size={17}/></>}
          </button>
        </form>
        {accounts.length >= 25 && <p className="atproto-feedback error" role="status">La limite actuelle de 25 comptes par navigateur est atteinte.</p>}
        <div className="settings-note">
          <ShieldCheck size={17}/>
          <p><strong>Autorisation sécurisée</strong><span>Tu seras redirigé vers le fournisseur du compte pour examiner et accepter l’autorisation. Kelo Hub ne reçoit jamais le mot de passe. Pour l’instant, OAuth confirme l’identité uniquement : la lecture et la publication de contenu ne sont pas encore autorisées.</span></p>
        </div>
        <p className="atproto-privacy">L’identité principale actuelle : {primaryDid || "non disponible"}. Les connexions OAuth sont encore conservées en mémoire serveur ; un redémarrage Render peut nécessiter de reconnecter les comptes.</p>
      </section>
      <section className="settings-security-banner"><CheckCircle2 size={19}/><div><strong>Ce qui est actif</strong><p>Chaque compte supplémentaire doit confirmer son propre consentement OAuth. Cette page liste les sessions que le serveur peut restaurer ; elle ne prétend pas que les publications, messages ou commentaires sont synchronisés.</p></div></section>
    </div>
  );
}
