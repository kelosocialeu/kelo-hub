"use client";

import {
  Activity, ArrowRight, ArrowUpRight, CheckCircle2, FileText,
  Inbox, LayoutDashboard, Link2, LockKeyhole, LogOut, MessageCircle,
  RefreshCw, Settings2, ShieldCheck, Tag, Users, Workflow, Zap
} from "lucide-react";
import { useEffect, useState } from "react";

type SessionState = { authenticated: boolean; did?: string };
type PageMode = "home" | "login" | "dashboard";

const navigation = [
  { label: "Vue d'ensemble", icon: LayoutDashboard },
  { label: "Comptes AT Protocol", icon: Link2 },
  { label: "Publications", icon: Workflow },
  { label: "Boîte de réception", icon: Inbox },
  { label: "Commentaires", icon: MessageCircle },
  { label: "Mentions et tags", icon: Tag },
  { label: "Membres et accès", icon: Users },
  { label: "Journal d'activité", icon: Activity },
  { label: "Paramètres", icon: Settings2 }
];

const pages: Record<string, { eyebrow: string; title: string; description: string; icon: typeof Link2; emptyTitle: string; emptyDescription: string }> = {
  "Vue d'ensemble": { eyebrow: "VOTRE ESPACE", title: "Tout au même endroit.", description: "Un aperçu clair de l'état de votre espace Kelo Hub.", icon: LayoutDashboard, emptyTitle: "Votre espace est prêt", emptyDescription: "Aucune donnée n'est encore disponible. Connectez vos sources réelles pour commencer à synchroniser votre activité." },
  "Comptes AT Protocol": { eyebrow: "CONNEXIONS", title: "Comptes AT Protocol", description: "Retrouvez les comptes que vous aurez autorisés à Kelo Hub.", icon: Link2, emptyTitle: "Aucun compte supplémentaire", emptyDescription: "Votre connexion actuelle identifie uniquement votre session. La liaison sécurisée d'autres comptes reste à implémenter." },
  "Publications": { eyebrow: "CONTENU", title: "Publications", description: "Suivez vos publications lorsque la synchronisation AT Protocol sera disponible.", icon: Workflow, emptyTitle: "Aucune publication synchronisée", emptyDescription: "Aucune donnée fictive n'est affichée. La récupération et la publication réelles restent à connecter." },
  "Boîte de réception": { eyebrow: "COMMUNAUTÉ", title: "Boîte de réception", description: "Les messages apparaîtront ici après connexion de la source correspondante.", icon: Inbox, emptyTitle: "Boîte de réception vide", emptyDescription: "La synchronisation réelle des messages n'est pas encore implémentée." },
  "Commentaires": { eyebrow: "COMMUNAUTÉ", title: "Commentaires", description: "Centralisez les commentaires des comptes autorisés.", icon: MessageCircle, emptyTitle: "Aucun commentaire synchronisé", emptyDescription: "Les commentaires seront affichés ici une fois la connexion aux API réalisée." },
  "Mentions et tags": { eyebrow: "COMMUNAUTÉ", title: "Mentions et tags", description: "Retrouvez les mentions liées à vos comptes connectés.", icon: Tag, emptyTitle: "Aucune mention synchronisée", emptyDescription: "La récupération réelle des mentions reste à développer." },
  "Membres et accès": { eyebrow: "ORGANISATION", title: "Membres et accès", description: "La gestion des membres sera disponible après configuration des organisations et des rôles.", icon: Users, emptyTitle: "Gestion des accès à configurer", emptyDescription: "Aucun membre fictif n'est affiché. Les invitations et autorisations doivent être implémentées côté serveur." },
  "Journal d'activité": { eyebrow: "SÉCURITÉ", title: "Journal d'activité", description: "Consultez les événements enregistrés par les services connectés.", icon: FileText, emptyTitle: "Aucun événement enregistré", emptyDescription: "Le journal d'audit persistant n'est pas encore configuré." },
  "Paramètres": { eyebrow: "CONFIGURATION", title: "Paramètres", description: "Configurez votre espace lorsque les paramètres persistants seront disponibles.", icon: Settings2, emptyTitle: "Aucun paramètre configuré", emptyDescription: "Aucune valeur fictive n'est préremplie." }
};

export default function Home() {
  const [active, setActive] = useState("Vue d'ensemble");
  const [mode, setMode] = useState<PageMode>("home");
  const [atprotoHandle, setAtprotoHandle] = useState("");
  const [atprotoSession, setAtprotoSession] = useState<SessionState | null>(null);
  const [atprotoLoading, setAtprotoLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [atprotoError, setAtprotoError] = useState("");
  const [atprotoMessage, setAtprotoMessage] = useState("");
  const [settings, setSettings] = useState({ language: "fr", compactMode: false, confirmActions: true, syncOnOpen: false });
  const [settingsSaved, setSettingsSaved] = useState(false);

  async function refreshSession() {
    try {
      const response = await fetch("/oauth/session", { cache: "no-store", credentials: "same-origin" });
      const data = await response.json() as { authenticated?: boolean; did?: string };
      const next = data.authenticated && data.did ? { authenticated: true, did: data.did } : { authenticated: false };
      setAtprotoSession(next);
      if (next.authenticated) setMode("dashboard");
      setLastChecked(new Date().toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" }));
      return next;
    } catch {
      const next = { authenticated: false };
      setAtprotoSession(next);
      return next;
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    void refreshSession();
    try {
      const saved = window.localStorage.getItem("kelo_hub_preferences");
      if (saved) setSettings(current => ({ ...current, ...JSON.parse(saved) }));
    } catch { /* Ignore invalid local preferences and keep safe defaults. */ }
  }, []);

  async function handleAtprotoLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAtprotoLoading(true);
    setAtprotoError("");
    setAtprotoMessage("");
    try {
      const response = await fetch("/oauth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ handle: atprotoHandle.trim() }),
      });
      const data = await response.json() as { redirectUrl?: string; error?: string };
      if (!response.ok || !data.redirectUrl) throw new Error(data.error || "Impossible de démarrer l’autorisation AT Protocol.");
      window.location.assign(data.redirectUrl);
    } catch (error) {
      setAtprotoError(error instanceof Error ? error.message : "La connexion a échoué.");
      setAtprotoLoading(false);
    }
  }

  async function handleLogout() {
    try { await fetch("/oauth/logout", { method: "POST", credentials: "same-origin" }); } catch { /* The local UI still exits. */ }
    setAtprotoSession({ authenticated: false });
    setMode("home");
    setActive("Vue d'ensemble");
    setAtprotoMessage("");
  }

  if (atprotoSession === null) return <main className="auth-loading"><div className="brand-mark">K</div><p>Préparation de votre espace…</p></main>;

  if (!atprotoSession.authenticated && mode === "home") {
    return (
      <main className="landing-page">
        <header className="landing-nav">
          <a className="brand landing-brand" href="/" aria-label="Kelo Hub accueil"><span className="brand-mark">K</span><span><strong>Kelo Hub</strong><small>ORGANISATION OS</small></span></a>
          <nav aria-label="Navigation du site"><a href="#fonctionnalites">Fonctionnalités</a><a href="#securite">Sécurité</a><button className="landing-login-link" onClick={() => setMode("login")}>Connexion <ArrowUpRight size={15}/></button></nav>
        </header>
        <section className="hero-section">
          <div className="hero-copy">
            <div className="hero-pill"><span className="eyebrow-dot"/> UN ESPACE, PLUS DE CLARTÉ</div>
            <h1>Votre organisation.<br/><span>Tous vos outils.</span><br/>Un seul espace.</h1>
            <p>Kelo Hub est conçu pour réunir la gestion de vos comptes, vos publications et vos interactions dans une interface simple et cohérente.</p>
            <div className="hero-actions"><button className="primary-button hero-cta" onClick={() => setMode("login")}>Accéder à mon espace <ArrowRight size={17}/></button><a className="hero-secondary" href="#fonctionnalites">Découvrir Kelo Hub <span>↓</span></a></div>
            <div className="hero-trust"><span><CheckCircle2 size={15}/> Interface sans données fictives</span><span><ShieldCheck size={15}/> Connexion AT Protocol</span></div>
          </div>
          <div className="hero-visual" aria-label="Aperçu illustratif de Kelo Hub">
            <div className="visual-glow"/>
            <div className="visual-window">
              <div className="visual-top"><div className="visual-brand"><span className="brand-mark">K</span><strong>Kelo Hub</strong></div><span className="visual-live"><i/> Espace privé</span></div>
              <div className="visual-content"><aside className="visual-sidebar"><i/><i/><i/><i/><i/></aside><div className="visual-main"><div className="visual-heading"><span/><b/><em/></div><div className="visual-metrics"><i/><i/><i/></div><div className="visual-sync-card"><div className="visual-sync-icon"><RefreshCw size={17}/></div><div><b>Vos données, clairement organisées</b><span>Connectez vos services pour commencer</span></div></div><div className="visual-lines"><i/><i/><i/></div></div></div>
            </div>
            <div className="floating-chip chip-one"><span className="chip-icon"><ShieldCheck size={16}/></span><span><b>Accès contrôlé</b><small>Votre espace privé</small></span></div>
            <div className="floating-chip chip-two"><span className="chip-icon blue-chip"><Zap size={16}/></span><span><b>Vue centralisée</b><small>Une interface unifiée</small></span></div>
          </div>
        </section>
        <section className="landing-features" id="fonctionnalites"><div className="section-kicker">PENSÉ POUR VOTRE ORGANISATION</div><h2>Moins de dispersion.<br/><span>Plus de visibilité.</span></h2><p className="section-description">Un espace préparé pour rassembler les informations utiles, sans inventer de données ni simuler des actions réelles.</p><div className="feature-grid"><article><div className="feature-icon"><Link2 size={20}/></div><h3>Comptes centralisés</h3><p>Une base claire pour organiser les comptes AT Protocol que vous autorisez.</p></article><article><div className="feature-icon"><Workflow size={20}/></div><h3>Contenu organisé</h3><p>Une interface prévue pour gérer publications et statuts quand les connexions seront prêtes.</p></article><article><div className="feature-icon"><Inbox size={20}/></div><h3>Interactions réunies</h3><p>Une future vue unifiée pour les messages, commentaires et mentions réels.</p></article></div></section>
        <section className="landing-security" id="securite"><div className="security-emblem"><LockKeyhole size={25}/></div><div><div className="section-kicker">TRANSPARENCE D'ABORD</div><h2>Pas de chiffres inventés.<br/>Pas de fausse activité.</h2><p>Kelo Hub affiche les informations réellement disponibles. Certaines fonctions de synchronisation sont encore en développement et ne sont pas présentées comme actives.</p></div><button className="small-outline" onClick={() => setMode("login")}>Ouvrir ma session <ArrowRight size={14}/></button></section>
        <footer className="landing-footer"><a className="brand footer-brand" href="/"><span className="brand-mark">K</span><span><strong>Kelo Hub</strong><small>ORGANISATION OS</small></span></a><span>© 2026 Kelo Hub · En développement</span><button onClick={() => setMode("login")}>Connexion <ArrowUpRight size={14}/></button></footer>
      </main>
    );
  }

  if (!atprotoSession.authenticated) {
    return (
      <main className="auth-gate login-page">
        <button className="login-back" onClick={() => { setMode("home"); setAtprotoError(""); }}><ArrowRight size={15}/> Retour à l'accueil</button>
        <section className="auth-card login-card">
          <a className="brand auth-brand" href="/" onClick={event => { event.preventDefault(); setMode("home"); }} aria-label="Kelo Hub accueil"><span className="brand-mark">K</span><span><strong>Kelo Hub</strong><small>ORGANISATION OS</small></span></a>
          <div className="auth-eyebrow"><span className="eyebrow-dot" /> ESPACE PRIVÉ</div>
          <h1>Ravi de vous retrouver.</h1>
          <p className="auth-description">Connectez-vous avec votre identité AT Protocol pour accéder à votre espace Kelo Hub.</p>
          <div className="auth-security"><LockKeyhole size={17}/><span>Kelo Hub utilise OAuth AT Protocol : votre mot de passe reste sur le service qui authentifie votre compte.</span></div>
          <form className="atproto-login-form" onSubmit={handleAtprotoLogin}>
            <label htmlFor="atproto-handle">Handle ou DID AT Protocol</label>
            <input className="login-field" id="atproto-handle" value={atprotoHandle} onChange={event => setAtprotoHandle(event.target.value)} placeholder="nom.bsky.social ou did:plc:…" autoComplete="username" required maxLength={253} disabled={atprotoLoading}/>
            <div className="auth-security oauth-consent-info"><ShieldCheck size={17}/><span>Vous serez redirigé vers le service d’autorisation de votre compte. Vous pourrez vous connecter là-bas et examiner les autorisations avant de les accepter. Kelo Hub ne vous demande pas votre mot de passe.</span></div>
            <button className="primary-button login-submit" type="submit" disabled={atprotoLoading || !atprotoHandle.trim()}>{atprotoLoading ? <><RefreshCw className="spin-icon" size={16}/> Redirection…</> : <>Continuer vers AT Protocol <ArrowRight size={17}/></>}</button>
            <p className="atproto-privacy">Connexion via OAuth AT Protocol avec échange de jetons côté serveur et cookie de session HttpOnly. Les autorisations demandées sont limitées à l’identité de base pour le moment.</p>
          </form>
          {atprotoError && <p className="atproto-feedback error" role="alert">{atprotoError}</p>}
          {atprotoMessage && <p className="atproto-feedback" role="status">{atprotoMessage}</p>}
          <p className="auth-footer"><ShieldCheck size={14}/> Kelo Hub · Autorisation OAuth AT Protocol</p>
        </section>
      </main>
    );
  }

  const page = pages[active] ?? pages["Vue d'ensemble"];
  const PageIcon = page.icon;

  function handleSync() {
    setSyncing(true);
    window.setTimeout(async () => {
      const session = await refreshSession();
      if (session.authenticated) setAtprotoMessage("Session OAuth vérifiée. La synchronisation des données de contenu n'est pas encore disponible.");
    }, 150);
  }

  return (
    <main className={settings.compactMode ? "app-shell dashboard-shell compact-mode" : "app-shell dashboard-shell"}>
      <aside className="sidebar">
        <a className="brand" href="/" onClick={event => { event.preventDefault(); setMode("home"); }} aria-label="Kelo Hub accueil"><span className="brand-mark">K</span><span><strong>Kelo Hub</strong><small>ORGANISATION OS</small></span></a>
        <div className="workspace-switch"><div className="workspace-avatar">K</div><div className="workspace-label"><strong>Mon organisation</strong><span title={atprotoSession.did}>{atprotoSession.did || "Identité AT Protocol"}</span></div></div>
        <p className="nav-heading">ESPACE ADMINISTRATEUR</p>
        <nav className="main-nav" aria-label="Navigation principale">{navigation.map(({ label, icon: Icon }) => <button key={label} className={active === label ? "nav-item active" : "nav-item"} onClick={() => setActive(label)}><Icon size={18} strokeWidth={1.8}/><span>{label}</span></button>)}</nav>
        <div className="sidebar-spacer"/>
        <div className="security-card"><div className="security-icon"><ShieldCheck size={18}/></div><strong>Session AT Protocol</strong><p>Votre identité est connectée à cet espace.</p></div>
        <div className="profile"><div className="profile-avatar"><ShieldCheck size={15}/></div><div className="profile-text"><strong>Identité connectée</strong><span>{atprotoSession.did?.slice(0, 22) || "AT Protocol"}</span></div><button className="icon-button" aria-label="Déconnexion" onClick={handleLogout}><LogOut size={17}/></button></div>
      </aside>
      <section className="main-panel">
        <header className="topbar"><div className="breadcrumbs"><span>Mon organisation</span><span className="crumb-slash">/</span><strong>{active}</strong></div><div className="topbar-actions"><span className="sync-state"><i/> Session active</span><button className="sync-button" onClick={handleSync} disabled={syncing} title="Vérifier la session"><RefreshCw size={15} className={syncing ? "spin-icon" : ""}/><span>{syncing ? "Vérification…" : "Vérifier la session"}</span></button><div className="top-avatar"><ShieldCheck size={15}/></div></div></header>
        <div className="page-content dashboard-content">
          <div className="dashboard-welcome"><div><div className="eyebrow"><span className="eyebrow-dot"/> {page.eyebrow}</div><h1>{page.title}</h1><p>{page.description}</p></div><div className="last-sync"><span>Dernière vérification de session</span><strong>{lastChecked ? "Aujourd'hui, " + lastChecked : "Pas encore vérifiée"}</strong></div></div>
          <div className="connection-overview"><div className="connection-overview-icon"><ShieldCheck size={21}/></div><div className="connection-overview-copy"><strong>Identité AT Protocol connectée</strong><span title={atprotoSession.did}>{atprotoSession.did || "Identité confirmée par la session locale"}</span><small>Cette vérification concerne la session, pas la synchronisation des publications ou des messages.</small></div><span className="connection-status"><i/> Connectée</span></div>
          {atprotoMessage && <p className="atproto-feedback" role="status">{atprotoMessage}</p>}
          {active === "Paramètres" ? (
            <div className="settings-layout">
              <section className="panel settings-panel">
                <div className="panel-heading"><div><h2>Préférences de l’espace</h2><p>Ces préférences sont enregistrées dans ce navigateur.</p></div><Settings2 size={19}/></div>
                <div className="settings-row"><div><strong>Langue de l’interface</strong><p>Préférence enregistrée ici ; la traduction complète de l’interface n’est pas encore activée.</p></div><select value={settings.language} onChange={event => updateSetting("language", event.target.value)} aria-label="Langue de l’interface"><option value="fr">Français</option><option value="en">English</option><option value="nl">Nederlands</option></select></div>
                <div className="settings-row"><div><strong>Interface compacte</strong><p>Réduire les espacements pour afficher plus d’informations.</p></div><button className={settings.compactMode ? "settings-toggle on" : "settings-toggle"} role="switch" aria-checked={settings.compactMode} onClick={() => updateSetting("compactMode", !settings.compactMode)}><span/></button></div>
                <div className="settings-row"><div><strong>Confirmer les actions sensibles</strong><p>Préférence enregistrée ; les actions sensibles ne sont pas encore implémentées.</p></div><button className={settings.confirmActions ? "settings-toggle on" : "settings-toggle"} role="switch" aria-checked={settings.confirmActions} onClick={() => updateSetting("confirmActions", !settings.confirmActions)}><span/></button></div>
                <div className="settings-row"><div><strong>Vérifier la session à l’ouverture</strong><p>La session est vérifiée à l’ouverture ; la synchronisation des contenus reste désactivée.</p></div><button className={settings.syncOnOpen ? "settings-toggle on" : "settings-toggle"} role="switch" aria-checked={settings.syncOnOpen} onClick={() => updateSetting("syncOnOpen", !settings.syncOnOpen)}><span/></button></div>
                {settingsSaved && <p className="settings-saved" role="status"><CheckCircle2 size={15}/> Préférences enregistrées sur cet appareil.</p>}
              </section>
              <section className="panel settings-panel">
                <div className="panel-heading"><div><h2>Compte AT Protocol connecté</h2><p>Identité actuellement utilisée par Kelo Hub.</p></div><Link2 size={19}/></div>
                <div className="settings-account"><div className="settings-account-icon"><ShieldCheck size={21}/></div><div><strong>{atprotoSession.did || "Identité AT Protocol"}</strong><span>"Session OAuth active"</span><small>Cookie de session HttpOnly ; jetons gardés côté serveur</small></div><span className="connection-status"><i/> Active</span></div>
                <div className="settings-note"><ShieldCheck size={17}/><p><strong>À propos des autorisations</strong><span>Kelo Hub utilise désormais OAuth AT Protocol côté serveur. Le consentement actuel demande uniquement le scope « atproto » (identité de base) ; les permissions supplémentaires pour lire ou publier du contenu ne sont pas encore demandées. La connexion de plusieurs comptes et le stockage durable des sessions restent à développer.</span></p></div>
                <div className="settings-permissions"><div><CheckCircle2 size={15}/><span>Identité du compte et DID</span><small>Session actuelle</small></div><div><LockKeyhole size={15}/><span>Accès aux fonctions AT Protocol</span><small>Selon les droits du compte connecté</small></div><div><ShieldCheck size={15}/><span>Déconnexion et révocation OAuth</span><small>Supprime la session de ce navigateur</small></div></div>
                <button className="settings-danger-button" onClick={handleLogout}><LogOut size={15}/> Déconnecter ce compte</button>
              </section>
              <section className="settings-security-banner"><LockKeyhole size={19}/><div><strong>Protection de votre compte</strong><p>N’utilisez pas le mot de passe principal d’un compte si votre service propose un mot de passe d’application. Kelo Hub ne doit pas être considéré comme un système OAuth à permissions fines tant que cette intégration n’est pas terminée.</p></div></section>
            </div>
          ) : (
            <>
              <section className="panel dashboard-empty-panel"><div className="panel-heading"><div><h2>{active === "Vue d'ensemble" ? "État de votre espace" : page.title}</h2><p>Les données ne sont affichées que lorsqu'elles sont disponibles depuis une source réelle.</p></div><span className="data-source-label"><span/> Données réelles uniquement</span></div><div className="empty-state compact"><div className="empty-illustration"><PageIcon size={24}/></div><strong>{page.emptyTitle}</strong><p>{page.emptyDescription}</p></div></section>
              <div className="sync-explainer"><RefreshCw size={16}/><p><strong>À propos de la synchronisation</strong><span>La vérification ci-dessus relit la session AT Protocol enregistrée sur cet appareil. La synchronisation automatique des publications, messages, commentaires et comptes supplémentaires n'est pas encore connectée.</span></p></div>
            </>
          )}
          <footer className="page-footer"><span>© 2026 Kelo Hub</span><span><ShieldCheck size={14}/> Aucun contenu de démonstration</span></footer>
        </div>
      </section>
    </main>
  );
}
