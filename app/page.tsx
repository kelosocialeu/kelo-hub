"use client";

import {
  Activity, ArrowUpRight, Bell, Building2, Check, ChevronDown, CircleHelp,
  Command, FileText, Inbox, LayoutDashboard, Link2, LockKeyhole, LogOut,
  MessageCircle, MessageSquareText, Plus, Search, Send, Settings2, ShieldCheck,
  Tag, Users, Workflow, X, Image as ImageIcon, CalendarClock
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Account = { id: string; name: string; handle: string; initials: string; color: string; demo?: boolean };
type InboxItem = { id: number; kind: "message" | "comment" | "tag"; accountId: string; author: string; handle: string; text: string; time: string; replied?: boolean };

const demoAccounts: Account[] = [
  { id: "acc1", name: "Kelo Entreprise", handle: "@kelo-entreprise.example", initials: "KE", color: "lavender", demo: true },
  { id: "acc2", name: "Kelo Actualités", handle: "@kelo-actus.example", initials: "KA", color: "blue", demo: true },
  { id: "acc3", name: "Kelo Support", handle: "@kelo-support.example", initials: "KS", color: "mint", demo: true },
  { id: "acc4", name: "Kelo Communauté", handle: "@kelo-communaute.example", initials: "KC", color: "peach", demo: true }
];

const initialInbox: InboxItem[] = [
  { id: 1, kind: "message", accountId: "acc1", author: "Camille Martin", handle: "@camille.example", text: "Bonjour, pouvez-vous m'en dire plus sur vos services ?", time: "Il y a 12 min" },
  { id: 2, kind: "comment", accountId: "acc2", author: "Alex", handle: "@alex.example", text: "Merci pour cette publication ! Où peut-on en apprendre davantage ?", time: "Il y a 28 min" },
  { id: 3, kind: "tag", accountId: "acc4", author: "Morgan", handle: "@morgan.example", text: "Je vous mentionne ici pour avoir votre avis sur cette idée.", time: "Il y a 46 min" },
  { id: 4, kind: "comment", accountId: "acc1", author: "Sam", handle: "@sam.example", text: "Est-ce que cette fonctionnalité sera bientôt disponible ?", time: "Hier" }
];

export default function Home() {
  const [active, setActive] = useState("Vue d'ensemble");
  const [query, setQuery] = useState("");
  const [showNotice, setShowNotice] = useState(true);
  const [atprotoHandle, setAtprotoHandle] = useState("");
  const [atprotoSession, setAtprotoSession] = useState<{ authenticated: boolean; did?: string } | null>(null);
  const [atprotoLoading, setAtprotoLoading] = useState(false);
  const [atprotoError, setAtprotoError] = useState("");
  const [atprotoMessage, setAtprotoMessage] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [inbox, setInbox] = useState<InboxItem[]>(initialInbox);
  const [inboxFilter, setInboxFilter] = useState<"all" | "message" | "comment" | "tag">("all");
  const [replies, setReplies] = useState<Record<number, string>>({});
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [postText, setPostText] = useState("");
  const [postTargets, setPostTargets] = useState<string[]>(["acc1", "acc2", "acc4"]);
  const [scheduled, setScheduled] = useState(false);
  const [drafts, setDrafts] = useState<{ text: string; targets: string[]; status: string }[]>([]);
  const [showAddAccount, setShowAddAccount] = useState(false);

  async function refreshAtprotoSession() {
    try {
      const response = await fetch("/oauth/session", { cache: "no-store" });
      const data = await response.json();
      setAtprotoSession(data);
    } catch {
      setAtprotoSession({ authenticated: false });
    }
  }

  useEffect(() => {
    void refreshAtprotoSession();
    if (new URLSearchParams(window.location.search).get("atproto") === "login_failed") {
      setAtprotoError("La connexion AT Protocol a échoué. Réessaie et vérifie que ton compte est accessible.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  async function handleAtprotoLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAtprotoLoading(true); setAtprotoError(""); setAtprotoMessage("");
    try {
      const response = await fetch("/oauth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ handle: atprotoHandle.trim() }) });
      const data = await response.json();
      if (!response.ok || typeof data.redirectUrl !== "string") throw new Error(data.error || "Impossible de démarrer la connexion.");
      window.location.assign(data.redirectUrl);
    } catch (error) {
      setAtprotoError(error instanceof Error ? error.message : "La connexion a échoué.");
      setAtprotoLoading(false);
    }
  }

  async function handleAtprotoLogout() {
    setAtprotoLoading(true); setAtprotoError("");
    try {
      const response = await fetch("/oauth/logout", { method: "POST" });
      if (!response.ok) throw new Error("La déconnexion a échoué.");
      setAtprotoSession({ authenticated: false }); setAccounts([]);
      setAtprotoMessage("Compte AT Protocol déconnecté.");
    } catch { setAtprotoError("Impossible de terminer la déconnexion. Réessaie."); }
    finally { setAtprotoLoading(false); }
  }

  const nav = [
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

  const filteredInbox = useMemo(() => inbox.filter(item =>
    (inboxFilter === "all" || item.kind === inboxFilter) &&
    (item.author + " " + item.handle + " " + item.text).toLowerCase().includes(query.toLowerCase())
  ), [inbox, inboxFilter, query]);

  function addDemoAccount() {
    const next = demoAccounts.find(account => !accounts.some(existing => existing.id === account.id));
    if (next) setAccounts(current => [...current, next]);
    setShowAddAccount(false);
  }

  function toggleTarget(id: string) {
    setPostTargets(current => current.includes(id) ? current.filter(target => target !== id) : [...current, id]);
  }

  function savePost(status: string) {
    if (!postText.trim() || postTargets.length === 0) return;
    setDrafts(current => [{ text: postText.trim(), targets: [...postTargets], status }, ...current]);
    setPostText(""); setScheduled(false);
  }

  function sendReply(id: number) {
    if (!replies[id]?.trim()) return;
    setInbox(current => current.map(item => item.id === id ? { ...item, replied: true } : item));
    setReplies(current => ({ ...current, [id]: "" })); setReplyingTo(null);
  }

  if (atprotoSession === null) return <main className="auth-loading"><div className="brand-mark">K</div><p>Vérification de votre session sécurisée…</p></main>;

  if (!atprotoSession.authenticated) return (
    <main className="auth-gate">
      <section className="auth-card">
        <a className="brand auth-brand" href="/" aria-label="Kelo Hub"><span className="brand-mark">K</span><span><strong>Kelo Hub</strong><small>ORGANISATION OS</small></span></a>
        <div className="auth-eyebrow"><span className="eyebrow-dot" /> ESPACE ADMINISTRATEUR</div>
        <h1>Votre organisation.<br />Vos comptes. Un seul espace.</h1>
        <p className="auth-description">Connectez-vous avec l'identité AT Protocol de votre entreprise pour accéder à son espace d'administration.</p>
        <div className="auth-security"><LockKeyhole size={17} /><span>Connexion sécurisée via le service officiel de votre compte. Votre mot de passe n'est jamais demandé par Kelo Hub.</span></div>
        <form className="atproto-login-form" onSubmit={handleAtprotoLogin}>
          <label htmlFor="atproto-handle">Handle ou DID de l'entité</label>
          <div className="auth-input-row"><input id="atproto-handle" value={atprotoHandle} onChange={event => setAtprotoHandle(event.target.value)} placeholder="ex. entreprise.bsky.social" autoComplete="username" required maxLength={253} disabled={atprotoLoading} /><button className="primary-button" type="submit" disabled={atprotoLoading || !atprotoHandle.trim()}>{atprotoLoading ? "Redirection…" : "Se connecter"} <ArrowUpRight size={15} /></button></div>
          <p className="atproto-privacy">Après authentification, vous serez redirigé vers le tableau de bord associé à votre identité. L'isolation des organisations devra être activée côté serveur avant l'ouverture au public.</p>
        </form>
        {atprotoError && <p className="atproto-feedback error" role="alert">{atprotoError}</p>}
        {atprotoMessage && <p className="atproto-feedback" role="status">{atprotoMessage}</p>}
        <p className="auth-footer"><ShieldCheck size={14} /> Kelo Hub · Les connexions supplémentaires ne sont pas encore réelles.</p>
      </section>
    </main>
  );

  const connectedAccounts = accounts;
  const selectedAccountNames = postTargets.map(id => accounts.find(account => account.id === id)?.name).filter(Boolean);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="Kelo Hub accueil"><span className="brand-mark">K</span><span><strong>Kelo Hub</strong><small>ORGANISATION OS</small></span></a>
        <div className="workspace-switch"><div className="workspace-avatar">K</div><div className="workspace-label"><strong>Mon organisation</strong><span>{atprotoSession.did || "Espace AT Protocol"}</span></div><ChevronDown size={16} /></div>
        <p className="nav-heading">ESPACE ADMINISTRATEUR</p>
        <nav className="main-nav" aria-label="Navigation principale">
          {nav.map(({ label, icon: Icon }) => <button key={label} className={active === label ? "nav-item active" : "nav-item"} onClick={() => setActive(label)}><Icon size={18} strokeWidth={1.8} /><span>{label}</span>{label === "Boîte de réception" && <span className="nav-count">{inbox.filter(item => !item.replied).length}</span>}</button>)}
        </nav>
        <div className="sidebar-spacer" />
        <div className="security-card"><div className="security-icon"><ShieldCheck size={18} /></div><strong>Accès sous contrôle</strong><p>Chaque compte externe doit être autorisé explicitement.</p></div>
        <div className="profile"><div className="profile-avatar">AT</div><div className="profile-text"><strong>Administrateur</strong><span>Identité AT Protocol</span></div><button className="icon-button" aria-label="Déconnexion" onClick={handleAtprotoLogout}><LogOut size={17} /></button></div>
      </aside>

      <section className="main-panel">
        <header className="topbar"><div className="breadcrumbs"><span>Mon organisation</span><span className="crumb-slash">/</span><strong>{active}</strong></div><div className="topbar-actions"><label className="search-box"><Search size={16} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher..." aria-label="Rechercher" /></label><button className="icon-button notification-button" aria-label="Notifications"><Bell size={18} /><i /></button><div className="top-avatar">AT</div></div></header>
        <div className="page-content">
          {showNotice && <div className="prototype-notice"><div className="notice-symbol"><LockKeyhole size={17} /></div><div><strong>Interface de démonstration — fonctionnalités en cours de développement</strong><p>La connexion principale utilise AT Protocol. Les comptes supplémentaires, les messages et les publications affichés ci-dessous sont des maquettes interactives : aucune action n'est envoyée au réseau.</p></div><button onClick={() => setShowNotice(false)} aria-label="Fermer l'avertissement"><X size={16} /></button></div>}

          {active === "Vue d'ensemble" && <>
            <div className="page-intro"><div><div className="eyebrow"><span className="eyebrow-dot" /> ESPACE DE VOTRE ENTITÉ</div><h1>Votre espace de pilotage.</h1><p>Gérez les comptes AT Protocol de votre organisation depuis un tableau de bord unique.</p></div><button className="primary-button" onClick={() => setActive("Comptes AT Protocol")}><Plus size={17} /> Ajouter un compte</button></div>
            <div className="stats-grid">
              <article className="stat-card"><div className="stat-top"><span>Comptes connectés</span><span className="stat-icon purple"><Link2 size={18} /></span></div><div className="stat-value">{connectedAccounts.length}</div><div className="stat-foot"><span className="muted">Comptes de démonstration</span></div></article>
              <article className="stat-card"><div className="stat-top"><span>À traiter</span><span className="stat-icon orange"><Inbox size={18} /></span></div><div className="stat-value">{inbox.filter(item => !item.replied).length}</div><div className="stat-foot"><span className="muted">Messages, commentaires et tags</span></div></article>
              <article className="stat-card"><div className="stat-top"><span>Publications préparées</span><span className="stat-icon blue"><Workflow size={18} /></span></div><div className="stat-value">{drafts.length}</div><div className="stat-foot"><span className="muted">Brouillons locaux de cette session</span></div></article>
              <article className="stat-card"><div className="stat-top"><span>Identité administratrice</span><span className="stat-icon green"><ShieldCheck size={18} /></span></div><div className="stat-value status-value">Connectée</div><div className="stat-foot"><span className="status-dot" /><span className="muted">AT Protocol · {atprotoSession.did?.slice(0, 24) || "session active"}</span></div></article>
            </div>
            <div className="content-grid">
              <section className="panel"><div className="panel-heading"><div><h2>Comptes de l'entité</h2><p>Sélectionnez les comptes à administrer.</p></div><button className="text-button" onClick={() => setActive("Comptes AT Protocol")}>Gérer <ArrowUpRight size={15} /></button></div>
                {accounts.length ? <div className="connected-account-list">{accounts.slice(0,4).map(account => <AccountRow key={account.id} account={account} />)}</div> : <div className="empty-state compact"><div className="empty-illustration"><Link2 size={24} /></div><strong>Aucun compte ajouté</strong><p>Ajoutez vos comptes de réseaux sociaux pour préparer la gestion multi-comptes.</p><button className="small-outline" onClick={() => setActive("Comptes AT Protocol")}>Découvrir la maquette</button></div>}
              </section>
              <section className="panel"><div className="panel-heading"><div><h2>Boîte de réception</h2><p>Les interactions à traiter au même endroit.</p></div><button className="text-button" onClick={() => setActive("Boîte de réception")}>Ouvrir <ArrowUpRight size={15} /></button></div><div className="quick-inbox">{inbox.filter(item => !item.replied).slice(0,3).map(item => <button className="quick-inbox-row" key={item.id} onClick={() => { setInboxFilter(item.kind); setActive(item.kind === "comment" ? "Commentaires" : item.kind === "tag" ? "Mentions et tags" : "Boîte de réception"); }}><span className={"mini-kind " + item.kind}>{item.kind === "message" ? <Inbox size={14}/> : item.kind === "comment" ? <MessageCircle size={14}/> : <Tag size={14}/>}</span><span><strong>{item.author}</strong><small>{item.text}</small></span></button>)}</div></section>
            </div>
            <section className="onboarding-panel"><div className="onboarding-art"><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><div className="art-center"><Command size={27} /></div><div className="art-node node-one"><MessageSquareText size={16} /></div><div className="art-node node-two"><Building2 size={16} /></div><div className="art-node node-three"><Bell size={16} /></div></div><div className="onboarding-copy"><span className="step-label">PROCHAINES ÉTAPES</span><h2>Une seule console pour tout gérer.</h2><p>Connectez les comptes, préparez une publication, choisissez ses destinataires puis traitez les interactions compte par compte.</p><button className="primary-button" onClick={() => setActive("Publications")}>Préparer une publication <ArrowUpRight size={16} /></button></div><div className="onboarding-step"><div><span>01</span><strong>Connecter</strong><small>Autorisation par compte</small></div><div><span>02</span><strong>Publier</strong><small>Choisir 1, 2 ou plusieurs comptes</small></div><div><span>03</span><strong>Répondre</strong><small>Messages et commentaires</small></div></div></section>
          </>}

          {active === "Comptes AT Protocol" && <><PageTitle eyebrow="CONNEXIONS" title="Les comptes de votre entité" description="Chaque compte doit autoriser Kelo Hub séparément. L'ajout multi-compte est ici une maquette, pas encore une connexion réelle." action={<button className="primary-button" onClick={() => setShowAddAccount(true)}><Plus size={16}/> Ajouter un compte</button>} />
            <section className="panel"><div className="panel-heading"><div><h2>Comptes associés</h2><p>Chaque compte dispose de sa propre identité et de ses propres autorisations.</p></div><span className="demo-badge">MODE DÉMO</span></div>
              {accounts.length ? <div className="connected-account-list">{accounts.map(account => <div className="account-detail" key={account.id}><AccountRow account={account}/><span className="account-demo-label">Exemple fictif · non connecté au réseau</span><button className="small-outline" onClick={() => setAccounts(current => current.filter(item => item.id !== account.id))}>Retirer de la maquette</button></div>)}</div> : <div className="empty-state compact"><div className="empty-illustration"><Link2 size={24}/></div><strong>Votre liste est vide</strong><p>Ajoutez des comptes d'exemple pour tester le sélecteur de publication.</p><button className="primary-button" onClick={() => setShowAddAccount(true)}><Plus size={16}/> Ajouter un compte de démo</button></div>}
              {showAddAccount && <div className="modal-backdrop" role="presentation" onClick={() => setShowAddAccount(false)}><div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="add-account-title" onClick={event => event.stopPropagation()}><button className="modal-close" onClick={() => setShowAddAccount(false)} aria-label="Fermer"><X size={18}/></button><h2 id="add-account-title">Ajouter un compte</h2><p>La connexion réelle via OAuth multi-comptes est en cours de conception. Pour tester l'interface, ajoutez un compte fictif.</p><div className="available-demo-accounts">{demoAccounts.filter(account => !accounts.some(existing => existing.id === account.id)).map(account => <button key={account.id} onClick={addDemoAccount}><span className={"account-avatar " + account.color}>{account.initials}</span><span><strong>{account.name}</strong><small>{account.handle}</small></span><Plus size={16}/></button>)}</div><p className="modal-note"><ShieldCheck size={14}/> Aucun mot de passe ou jeton n'est enregistré par cette maquette.</p></div></div>}
            </section>
          </>}

          {active === "Publications" && <><PageTitle eyebrow="ÉDITEUR MULTI-COMPTES" title="Préparer une publication" description="Rédigez une fois, puis sélectionnez précisément les comptes destinataires." />
            <div className="publishing-layout"><section className="panel composer-panel"><div className="panel-heading"><div><h2>Nouvelle publication</h2><p>Le contenu sera préparé dans cette maquette uniquement.</p></div><span className="demo-badge">BROUILLON</span></div><label className="field-label" htmlFor="post-content">Votre texte</label><textarea id="post-content" className="post-textarea" value={postText} onChange={event => setPostText(event.target.value)} maxLength={3000} placeholder="Qu'aimeriez-vous partager avec votre communauté ?"/><div className="composer-tools"><button className="tool-button" type="button" onClick={() => setPostText(text => text + (text ? "\n" : "") + "#VotreHashtag")}><Tag size={15}/> Ajouter un hashtag</button><button className="tool-button" type="button" disabled><ImageIcon size={15}/> Photo (bientôt)</button><span>{postText.length}/3000</span></div><div className="composer-divider"/><div className="panel-heading"><div><h2>Où publier ?</h2><p>Cochez uniquement les comptes souhaités.</p></div><button className="text-button" onClick={() => setPostTargets(accounts.map(account => account.id))}>Tout sélectionner</button></div>
              {accounts.length ? <div className="target-list">{accounts.map(account => <label className={postTargets.includes(account.id) ? "target-account selected" : "target-account"} key={account.id}><input type="checkbox" checked={postTargets.includes(account.id)} onChange={() => toggleTarget(account.id)}/><AccountRow account={account}/><span className="target-check">{postTargets.includes(account.id) && <Check size={15}/>}</span></label>)}</div> : <div className="inline-empty">Ajoutez d'abord des comptes dans « Comptes AT Protocol » pour tester la sélection des destinataires.</div>}
              <div className="publish-actions"><button className="small-outline" onClick={() => savePost("Brouillon local")} disabled={!postText.trim()}>Enregistrer en brouillon</button><button className="primary-button" onClick={() => savePost(scheduled ? "Planification simulée" : "Prêt à publier (démo)")} disabled={!postText.trim() || postTargets.length === 0}><Send size={15}/> {scheduled ? "Simuler la planification" : "Préparer la publication"}</button></div><label className="schedule-option"><input type="checkbox" checked={scheduled} onChange={event => setScheduled(event.target.checked)}/><CalendarClock size={15}/> Simuler une planification (aucun envoi réel)</label>
            </section><aside className="panel preview-panel"><div className="panel-heading"><div><h2>Aperçu</h2><p>Votre publication</p></div><span className="preview-mark">at</span></div><div className="preview-post"><div className="preview-profile"><span className="account-avatar lavender">KH</span><span><strong>Votre entité</strong><small>{atprotoSession.did?.slice(0,30)}</small></span></div><p>{postText || "Votre texte apparaîtra ici au fur et à mesure de la rédaction…"}</p><div className="preview-meta"><MessageCircle size={14}/> <span>Répondre</span><span>·</span><span>Reposter</span><span>·</span><span>Aimer</span></div></div><div className="preview-destinations"><strong>Destinataires ({postTargets.length})</strong>{selectedAccountNames.length ? selectedAccountNames.map(name => <span key={name}><Check size={13}/>{name}</span>) : <small>Sélectionnez au moins un compte.</small>}</div></aside></div>
            <section className="panel drafts-panel"><div className="panel-heading"><div><h2>Publications préparées</h2><p>Conservées uniquement dans l'état de cette page, non dans une base de données.</p></div></div>{drafts.length ? drafts.map((draft,index) => <div className="draft-row" key={index}><div className="draft-status"><Check size={15}/></div><div><strong>{draft.status}</strong><p>{draft.text}</p><small>Destinataires : {draft.targets.map(id => accounts.find(account => account.id === id)?.name || id).join(", ")}</small></div></div>) : <div className="inline-empty">Aucune publication préparée pour le moment.</div>}</section>
          </>}

          {["Boîte de réception", "Commentaires", "Mentions et tags"].includes(active) && <><PageTitle eyebrow="RELATION COMMUNAUTÉ" title={active === "Boîte de réception" ? "Boîte de réception unifiée" : active === "Commentaires" ? "Répondre aux commentaires" : "Mentions et tags"} description="Retrouvez les interactions par type et préparez vos réponses depuis le même espace." />
            <div className="inbox-tabs" role="tablist" aria-label="Filtrer les interactions">{[{id:"all",label:"Tout"},{id:"message",label:"Messages"},{id:"comment",label:"Commentaires"},{id:"tag",label:"Mentions et tags"}].map(item => <button key={item.id} role="tab" aria-selected={inboxFilter===item.id} className={inboxFilter===item.id ? "inbox-tab active" : "inbox-tab"} onClick={() => setInboxFilter(item.id as typeof inboxFilter)}>{item.label}<span>{inbox.filter(entry => item.id === "all" ? !entry.replied : entry.kind === item.id && !entry.replied).length}</span></button>)}</div>
            <section className="panel inbox-panel"><div className="panel-heading"><div><h2>Interactions reçues</h2><p>Exemples fictifs pour concevoir le flux de réponse.</p></div><span className="demo-badge">DONNÉES DÉMO</span></div>
              {filteredInbox.length ? <div className="interaction-list">{filteredInbox.map(item => { const account = accounts.find(entry => entry.id === item.accountId) || demoAccounts.find(entry => entry.id === item.accountId)!; return <article className={item.replied ? "interaction-card replied" : "interaction-card"} key={item.id}><div className="interaction-kind-icon">{item.kind === "message" ? <Inbox size={17}/> : item.kind === "comment" ? <MessageCircle size={17}/> : <Tag size={17}/>}</div><div className="interaction-body"><div className="interaction-top"><div><strong>{item.author}</strong> <span>{item.handle}</span></div><time>{item.time}</time></div><p>{item.text}</p><div className="interaction-account"><span className={"account-avatar tiny " + account.color}>{account.initials}</span><span>Reçu sur <strong>{account.name}</strong></span><span className="interaction-type">{item.kind === "message" ? "Message" : item.kind === "comment" ? "Commentaire" : "Mention / tag"}</span></div>{item.replied ? <div className="reply-sent"><Check size={14}/> Réponse simulée préparée</div> : replyingTo === item.id ? <div className="reply-composer"><textarea value={replies[item.id] || ""} onChange={event => setReplies(current => ({...current,[item.id]:event.target.value}))} placeholder="Rédigez votre réponse…" rows={3}/><div><button className="small-outline" onClick={() => setReplyingTo(null)}>Annuler</button><button className="primary-button" disabled={!replies[item.id]?.trim()} onClick={() => sendReply(item.id)}><Send size={14}/> Préparer la réponse</button></div><small>Mode démo : aucune réponse n'est envoyée sur AT Protocol.</small></div> : <button className="reply-button" onClick={() => setReplyingTo(item.id)}><MessageSquareText size={14}/> Répondre</button>}</div></article>; })}</div> : <div className="empty-state compact"><div className="empty-illustration"><Inbox size={24}/></div><strong>Aucune interaction trouvée</strong><p>Essayez un autre filtre ou une autre recherche.</p></div>}
            </section>
          </>}

          {active === "Membres et accès" && <><PageTitle eyebrow="GOUVERNANCE" title="Membres et autorisations" description="Préparez les rôles de votre organisation avant d'inviter des collaborateurs."/><section className="panel"><div className="panel-heading"><div><h2>Rôles prévus</h2><p>La gestion des droits sera appliquée côté serveur dans une prochaine étape.</p></div><span className="demo-badge">À CONSTRUIRE</span></div><div className="role-grid"><div><Users size={19}/><strong>Propriétaire</strong><p>Contrôle de l'organisation et gestion des administrateurs.</p></div><div><ShieldCheck size={19}/><strong>Administrateur</strong><p>Gestion des comptes connectés, publications et interactions.</p></div><div><MessageSquareText size={19}/><strong>Community manager</strong><p>Préparation des publications et réponses autorisées.</p></div><div><LockKeyhole size={19}/><strong>Lecture seule</strong><p>Consultation sans possibilité de publier ou répondre.</p></div></div></section></>}

          {(active === "Journal d'activité" || active === "Paramètres") && <><PageTitle eyebrow={active === "Paramètres" ? "CONFIGURATION" : "SÉCURITÉ"} title={active} description={active === "Paramètres" ? "Les réglages de votre espace et les connexions autorisées." : "Les événements de sécurité et les changements importants de votre organisation."}/><section className="panel"><div className="empty-state compact"><div className="empty-illustration">{active === "Paramètres" ? <Settings2 size={24}/> : <FileText size={24}/>}</div><strong>{active === "Paramètres" ? "Paramètres à venir" : "Aucun événement réel enregistré"}</strong><p>{active === "Paramètres" ? "Les préférences, les autorisations et les sessions seront configurables après la mise en place de la persistance sécurisée." : "Un journal d'audit serveur sera nécessaire pour suivre les connexions, changements de droits et envois."}</p></div></section></>}

          <footer className="page-footer"><span>© 2026 Kelo Hub · Prototype en développement</span><span><ShieldCheck size={14}/> Les actions de cette maquette ne sont pas envoyées au réseau</span></footer>
        </div>
      </section>
    </main>
  );
}

function AccountRow({ account }: { account: Account }) {
  return <div className="account-row"><span className={"account-avatar " + account.color}>{account.initials}</span><span className="account-row-copy"><strong>{account.name}</strong><small>{account.handle}</small></span></div>;
}

function PageTitle({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="page-intro"><div><div className="eyebrow"><span className="eyebrow-dot"/> {eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}
