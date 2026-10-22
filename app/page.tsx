"use client";

import {
  Activity, ArrowRight, ArrowUpRight, CheckCircle2, Eye, EyeOff, FileText,
  Inbox, LayoutDashboard, Link2, LockKeyhole, LogOut, MessageCircle,
  RefreshCw, Settings2, ShieldCheck, Tag, Users, Workflow, Zap
} from "lucide-react";
import { useEffect, useState } from "react";
import { getStoredAtprotoSession, loginAtproto, logoutAtproto } from "@/lib/auth/atproto-browser";

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
  const [atprotoPassword, setAtprotoPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authFactorToken, setAuthFactorToken] = useState("");
  const [atprotoSession, setAtprotoSession] = useState<SessionState | null>(null);
  const [atprotoLoading, setAtprotoLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [atprotoError, setAtprotoError] = useState("");
  const [atprotoMessage, setAtprotoMessage] = useState("");

  function refreshSession() {
    const session = getStoredAtprotoSession();
    const next = session ? { authenticated: true, did: session.did } : { authenticated: false };
    setAtprotoSession(next);
    setLastChecked(new Date().toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" }));
    setSyncing(false);
    if (next.authenticated) setMode("dashboard");
    return next;
  }

  useEffect(() => {
    const session = getStoredAtprotoSession();
    setAtprotoSession(session ? { authenticated: true, did: session.did } : { authenticated: false });
    setLastChecked(new Date().toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" }));
  }, []);

  async function handleAtprotoLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAtprotoLoading(true);
    setAtprotoError("");
    setAtprotoMessage("");
    try {
      const session = await loginAtproto(atprotoHandle, atprotoPassword, authFactorToken);
      setAtprotoSession({ authenticated: true, did: session.did });
      setAtprotoPassword("");
      setAuthFactorToken("");
      setMode("dashboard");
      setAtprotoMessage("Connexion AT Protocol réussie.");
      setLastChecked(new Date().toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" }));
    } catch (error) {
      setAtprotoError(error instanceof Error ? error.message : "La connexion a échoué.");
    } finally {
      setAtprotoLoading(false);
    }
  }

  function handleLogout() {
    logoutAtproto();
    setAtprotoSession({ authenticated: false });
    setAtprotoPassword("");
    setAuthFactorToken("");
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
          <div className="auth-security"><LockKeyhole size={17}/><span>Authentification auprès du service AT Protocol associé à votre identité. Votre mot de passe n'est pas enregistré par Kelo Hub.</span></div>
          <form className="atproto-login-form" onSubmit={handleAtprotoLogin}>
            <label htmlFor="atproto-handle">Adresse e-mail, handle ou DID</label>
            <input className="login-field" id="atproto-handle" value={atprotoHandle} onChange={event => setAtprotoHandle(event.target.value)} placeholder="nom@domaine.be ou handle.bsky.social" autoComplete="username" required maxLength={253} disabled={atprotoLoading}/>
            <div className="password-label-row"><label htmlFor="atproto-password">Mot de passe</label><span><LockKeyhole size={12}/> Connexion sécurisée</span></div>
            <div className="password-input-wrap"><input className="login-field password-field" id="atproto-password" type={showPassword ? "text" : "password"} value={atprotoPassword} onChange={event => setAtprotoPassword(event.target.value)} placeholder="Saisissez votre mot de passe" autoComplete="current-password" required disabled={atprotoLoading}/><button className="password-toggle" type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"} title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}>{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div>
            {atprotoError.includes("code de connexion") && <div className="auth-factor-wrap"><label htmlFor="auth-factor-token">Code de connexion reçu par e-mail</label><input className="login-field" id="auth-factor-token" value={authFactorToken} onChange={event => setAuthFactorToken(event.target.value)} placeholder="Code à usage unique" autoComplete="one-time-code" inputMode="numeric" disabled={atprotoLoading}/></div>}
            <button className="primary-button login-submit" type="submit" disabled={atprotoLoading || !atprotoHandle.trim() || !atprotoPassword}>{atprotoLoading ? <><RefreshCw className="spin-icon" size={16}/> Connexion en cours…</> : <>Se connecter <ArrowRight size={17}/></>}</button>
            <p className="atproto-privacy">Vos identifiants sont utilisés pour l'authentification auprès du service AT Protocol découvert. Ils ne sont pas enregistrés par Kelo Hub.</p>
          </form>
          {atprotoError && <p className="atproto-feedback error" role="alert">{atprotoError}</p>}
          {atprotoMessage && <p className="atproto-feedback" role="status">{atprotoMessage}</p>}
          <p className="auth-footer"><ShieldCheck size={14}/> Kelo Hub · Connexion par identité AT Protocol</p>
        </section>
      </main>
    );
  }

  const page = pages[active] ?? pages["Vue d'ensemble"];
  const PageIcon = page.icon;

  function handleSync() {
    setSyncing(true);
    window.setTimeout(() => {
      const session = refreshSession();
      if (session.authenticated) setAtprotoMessage("Session vérifiée. La synchronisation des données de contenu n'est pas encore disponible.");
    }, 150);
  }

  return (
    <main className="app-shell dashboard-shell">
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
          <section className="panel dashboard-empty-panel"><div className="panel-heading"><div><h2>{active === "Vue d'ensemble" ? "État de votre espace" : page.title}</h2><p>Les données ne sont affichées que lorsqu'elles sont disponibles depuis une source réelle.</p></div><span className="data-source-label"><span/> Données réelles uniquement</span></div><div className="empty-state compact"><div className="empty-illustration"><PageIcon size={24}/></div><strong>{page.emptyTitle}</strong><p>{page.emptyDescription}</p></div></section>
          <div className="sync-explainer"><RefreshCw size={16}/><p><strong>À propos de la synchronisation</strong><span>La vérification ci-dessus relit la session AT Protocol enregistrée sur cet appareil. La synchronisation automatique des publications, messages, commentaires et comptes supplémentaires n'est pas encore connectée.</span></p></div>
          <footer className="page-footer"><span>© 2026 Kelo Hub</span><span><ShieldCheck size={14}/> Aucun contenu de démonstration</span></footer>
        </div>
      </section>
    </main>
  );
}
