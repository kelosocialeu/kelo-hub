"use client";

import {
  Activity, ArrowUpRight, Bell, FileText, Inbox, LayoutDashboard, Link2,
  LockKeyhole, LogOut, MessageCircle, Settings2, ShieldCheck, Tag, Users,
  Workflow
} from "lucide-react";
import { useEffect, useState } from "react";
import { getStoredAtprotoSession, loginAtproto, logoutAtproto } from "@/lib/auth/atproto-browser";

type SessionState = { authenticated: boolean; did?: string };

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

export default function Home() {
  const [active, setActive] = useState("Vue d'ensemble");
  const [atprotoHandle, setAtprotoHandle] = useState("");
  const [atprotoPassword, setAtprotoPassword] = useState("");
  const [authFactorToken, setAuthFactorToken] = useState("");
  const [atprotoSession, setAtprotoSession] = useState<SessionState | null>(null);
  const [atprotoLoading, setAtprotoLoading] = useState(false);
  const [atprotoError, setAtprotoError] = useState("");
  const [atprotoMessage, setAtprotoMessage] = useState("");

  useEffect(() => {
    const session = getStoredAtprotoSession();
    setAtprotoSession(session ? { authenticated: true, did: session.did } : { authenticated: false });
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
      setAtprotoMessage("Connexion AT Protocol réussie.");
    } catch (error) {
      setAtprotoError(error instanceof Error ? error.message : "La connexion a échoué.");
    } finally {
      setAtprotoLoading(false);
    }
  }

  function handleAtprotoLogout() {
    logoutAtproto();
    setAtprotoSession({ authenticated: false });
    setAtprotoPassword("");
    setAuthFactorToken("");
    setAtprotoMessage("Session AT Protocol supprimée de cet appareil.");
    setActive("Vue d'ensemble");
  }

  if (atprotoSession === null) {
    return <main className="auth-loading"><div className="brand-mark">K</div><p>Vérification de votre session…</p></main>;
  }

  if (!atprotoSession.authenticated) {
    return (
      <main className="auth-gate">
        <section className="auth-card">
          <a className="brand auth-brand" href="/" aria-label="Kelo Hub"><span className="brand-mark">K</span><span><strong>Kelo Hub</strong><small>ORGANISATION OS</small></span></a>
          <div className="auth-eyebrow"><span className="eyebrow-dot" /> ESPACE ADMINISTRATEUR</div>
          <h1>Votre organisation.<br />Vos comptes. Un seul espace.</h1>
          <p className="auth-description">Connectez-vous avec votre identité AT Protocol pour accéder à Kelo Hub.</p>
          <div className="auth-security"><LockKeyhole size={17} /><span>Votre mot de passe est transmis au service AT Protocol découvert pour authentification. Kelo Hub ne l'enregistre pas.</span></div>
          <form className="atproto-login-form" onSubmit={handleAtprotoLogin}>
            <label htmlFor="atproto-handle">Adresse e-mail, handle ou DID</label>
            <div className="auth-input-row"><input id="atproto-handle" value={atprotoHandle} onChange={event => setAtprotoHandle(event.target.value)} placeholder="Identifiant AT Protocol" autoComplete="username" required maxLength={253} disabled={atprotoLoading} /></div>
            <label htmlFor="atproto-password">Mot de passe du compte AT Protocol</label>
            <input id="atproto-password" type="password" value={atprotoPassword} onChange={event => setAtprotoPassword(event.target.value)} autoComplete="current-password" required disabled={atprotoLoading} />
            {atprotoError.includes("code de connexion") && <><label htmlFor="auth-factor-token">Code de connexion reçu par e-mail</label><input id="auth-factor-token" value={authFactorToken} onChange={event => setAuthFactorToken(event.target.value)} autoComplete="one-time-code" inputMode="numeric" disabled={atprotoLoading} /></>}
            <button className="primary-button" type="submit" disabled={atprotoLoading || !atprotoHandle.trim() || !atprotoPassword}>{atprotoLoading ? "Connexion…" : "Se connecter"} <ArrowUpRight size={15} /></button>
            <p className="atproto-privacy">Les identifiants sont utilisés pour l'authentification auprès du service AT Protocol et ne sont pas enregistrés par Kelo Hub.</p>
          </form>
          {atprotoError && <p className="atproto-feedback error" role="alert">{atprotoError}</p>}
          {atprotoMessage && <p className="atproto-feedback" role="status">{atprotoMessage}</p>}
          <p className="auth-footer"><ShieldCheck size={14} /> Kelo Hub · Espace de gestion en cours de développement.</p>
        </section>
      </main>
    );
  }

  const pageDescriptions: Record<string, { eyebrow: string; title: string; description: string; icon: typeof Link2; emptyTitle: string; emptyDescription: string }> = {
    "Vue d'ensemble": {
      eyebrow: "ESPACE DE VOTRE ENTITÉ",
      title: "Votre espace de pilotage.",
      description: "Retrouvez ici les données réelles accessibles à votre organisation.",
      icon: LayoutDashboard,
      emptyTitle: "Votre espace est prêt à être configuré",
      emptyDescription: "Aucune donnée n'est affichée tant qu'aucun compte ou service réel n'est connecté."
    },
    "Comptes AT Protocol": {
      eyebrow: "CONNEXIONS",
      title: "Comptes AT Protocol",
      description: "Les comptes associés à votre organisation apparaîtront ici après la mise en place de leur connexion réelle.",
      icon: Link2,
      emptyTitle: "Aucun compte supplémentaire connecté",
      emptyDescription: "La session actuelle authentifie uniquement votre identité. La connexion multi-comptes n'est pas encore implémentée."
    },
    "Publications": {
      eyebrow: "PUBLICATIONS",
      title: "Publications",
      description: "Les publications réelles et leur statut apparaîtront ici lorsque la publication AT Protocol sera implémentée.",
      icon: Workflow,
      emptyTitle: "Aucune publication disponible",
      emptyDescription: "Aucune publication fictive ou aucun brouillon de démonstration n'est chargé."
    },
    "Boîte de réception": {
      eyebrow: "RELATION COMMUNAUTÉ",
      title: "Boîte de réception",
      description: "Les interactions réelles apparaîtront ici lorsque la lecture des messages sera connectée.",
      icon: Inbox,
      emptyTitle: "Aucun message disponible",
      emptyDescription: "Aucun message de démonstration n'est affiché. La synchronisation de la boîte de réception reste à développer."
    },
    "Commentaires": {
      eyebrow: "RELATION COMMUNAUTÉ",
      title: "Commentaires",
      description: "Les commentaires récupérés depuis les comptes connectés apparaîtront ici.",
      icon: MessageCircle,
      emptyTitle: "Aucun commentaire disponible",
      emptyDescription: "Aucun commentaire fictif n'est chargé. La récupération et les réponses réelles restent à développer."
    },
    "Mentions et tags": {
      eyebrow: "RELATION COMMUNAUTÉ",
      title: "Mentions et tags",
      description: "Les mentions réelles des comptes autorisés apparaîtront ici.",
      icon: Tag,
      emptyTitle: "Aucune mention disponible",
      emptyDescription: "Aucune mention de démonstration n'est affichée. La synchronisation reste à développer."
    },
    "Membres et accès": {
      eyebrow: "GOUVERNANCE",
      title: "Membres et accès",
      description: "Les membres et autorisations réels de l'organisation apparaîtront ici.",
      icon: Users,
      emptyTitle: "Gestion des membres non configurée",
      emptyDescription: "Aucun membre fictif n'est ajouté. L'invitation et le contrôle des rôles doivent encore être implémentés côté serveur."
    },
    "Journal d'activité": {
      eyebrow: "SÉCURITÉ",
      title: "Journal d'activité",
      description: "Les événements seront listés à partir d'un journal d'audit persistant.",
      icon: FileText,
      emptyTitle: "Aucun événement enregistré",
      emptyDescription: "Aucune activité fictive n'est affichée. Un journal d'audit côté serveur reste à mettre en place."
    },
    "Paramètres": {
      eyebrow: "CONFIGURATION",
      title: "Paramètres",
      description: "Les réglages de votre espace seront disponibles lorsque leur stockage sécurisé sera configuré.",
      icon: Settings2,
      emptyTitle: "Aucun paramètre configuré",
      emptyDescription: "Aucune valeur de démonstration n'est préremplie."
    }
  };

  const page = pageDescriptions[active] ?? pageDescriptions["Vue d'ensemble"];
  const PageIcon = page.icon;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="Kelo Hub accueil"><span className="brand-mark">K</span><span><strong>Kelo Hub</strong><small>ORGANISATION OS</small></span></a>
        <div className="workspace-switch"><div className="workspace-avatar">K</div><div className="workspace-label"><strong>Mon organisation</strong><span>{atprotoSession.did || "Identité AT Protocol"}</span></div></div>
        <p className="nav-heading">ESPACE ADMINISTRATEUR</p>
        <nav className="main-nav" aria-label="Navigation principale">
          {navigation.map(({ label, icon: Icon }) => <button key={label} className={active === label ? "nav-item active" : "nav-item"} onClick={() => setActive(label)}><Icon size={18} strokeWidth={1.8} /><span>{label}</span></button>)}
        </nav>
        <div className="sidebar-spacer" />
        <div className="security-card"><div className="security-icon"><ShieldCheck size={18} /></div><strong>Session AT Protocol</strong><p>Connectée avec votre identité.</p></div>
        <div className="profile"><div className="profile-avatar">AT</div><div className="profile-text"><strong>Compte connecté</strong><span>{atprotoSession.did?.slice(0, 24) || "AT Protocol"}</span></div><button className="icon-button" aria-label="Déconnexion" onClick={handleAtprotoLogout}><LogOut size={17} /></button></div>
      </aside>

      <section className="main-panel">
        <header className="topbar"><div className="breadcrumbs"><span>Mon organisation</span><span className="crumb-slash">/</span><strong>{active}</strong></div><div className="topbar-actions"><div className="top-avatar">AT</div></div></header>
        <div className="page-content">
          <div className="page-intro"><div><div className="eyebrow"><span className="eyebrow-dot" /> {page.eyebrow}</div><h1>{page.title}</h1><p>{page.description}</p></div></div>
          {atprotoMessage && <p className="atproto-feedback" role="status">{atprotoMessage}</p>}
          <section className="panel">
            <div className="panel-heading"><div><h2>{active === "Vue d'ensemble" ? "État de votre espace" : page.title}</h2><p>Informations issues des connexions réellement disponibles.</p></div><span className="status-dot" /></div>
            <div className="empty-state compact">
              <div className="empty-illustration"><PageIcon size={24} /></div>
              <strong>{page.emptyTitle}</strong>
              <p>{page.emptyDescription}</p>
            </div>
          </section>
          <footer className="page-footer"><span>© 2026 Kelo Hub</span><span><ShieldCheck size={14}/> Aucune donnée de démonstration n'est affichée</span></footer>
        </div>
      </section>
    </main>
  );
}
