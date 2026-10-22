"use client";

import {
  Activity, ArrowDownRight, ArrowUpRight, Bell, Building2, ChevronDown,
  CircleHelp, Command, FileText, Inbox, LayoutDashboard, Link2, LockKeyhole,
  Mail, Plus, Search, Settings2, ShieldCheck, Users, Workflow
} from "lucide-react";
import { useState } from "react";

const integrations = [
  { name: "Messagerie professionnelle", detail: "Connecteurs e-mail à venir", icon: Mail, status: "À configurer", tone: "violet" },
  { name: "Réseaux sociaux", detail: "API officielles selon disponibilité", icon: Workflow, status: "À configurer", tone: "blue" },
  { name: "Outils de travail", detail: "Services et espaces d'équipe", icon: Link2, status: "À configurer", tone: "green" }
];

export default function Home() {
  const [active, setActive] = useState("Vue d'ensemble");
  const [query, setQuery] = useState("");
  const [showNotice, setShowNotice] = useState(true);
  const nav = [
    { label: "Vue d'ensemble", icon: LayoutDashboard },
    { label: "Organisations", icon: Building2 },
    { label: "Boîte de réception", icon: Inbox },
    { label: "Connexions", icon: Link2 },
    { label: "Membres et accès", icon: Users },
    { label: "Journal d'activité", icon: Activity }
  ];

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" aria-label="Kelo Hub accueil">
          <span className="brand-mark">K</span>
          <span><strong>Kelo Hub</strong><small>ORGANISATION OS</small></span>
        </a>
        <div className="workspace-switch">
          <div className="workspace-avatar">K</div>
          <div className="workspace-label"><strong>Mon organisation</strong><span>Espace principal</span></div>
          <ChevronDown size={16} />
        </div>
        <p className="nav-heading">ESPACE DE TRAVAIL</p>
        <nav className="main-nav" aria-label="Navigation principale">
          {nav.map(({ label, icon: Icon }) => (
            <button key={label} className={active === label ? "nav-item active" : "nav-item"} onClick={() => setActive(label)}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
              {label === "Boîte de réception" && <span className="nav-count">0</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="security-card">
          <div className="security-icon"><ShieldCheck size={18} /></div>
          <strong>La sécurité d'abord</strong>
          <p>Les connexions externes nécessiteront votre autorisation explicite.</p>
        </div>
        <button className="nav-item bottom-nav" onClick={() => setActive("Paramètres")}><Settings2 size={18} /><span>Paramètres</span></button>
        <div className="profile">
          <div className="profile-avatar">KH</div>
          <div className="profile-text"><strong>Administrateur</strong><span>Prototype local</span></div>
          <button className="icon-button" aria-label="Aide"><CircleHelp size={18} /></button>
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <div className="breadcrumbs"><span>Mon organisation</span><span className="crumb-slash">/</span><strong>{active}</strong></div>
          <div className="topbar-actions">
            <label className="search-box"><Search size={16} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher..." aria-label="Rechercher" /></label>
            <button className="icon-button notification-button" aria-label="Notifications"><Bell size={18} /><i /></button>
            <div className="top-avatar">KH</div>
          </div>
        </header>

        <div className="page-content">
          <div className="page-intro">
            <div><div className="eyebrow"><span className="eyebrow-dot" /> ESPACE CENTRALISÉ</div><h1>{active === "Vue d'ensemble" ? "Tout votre travail, au même endroit." : active}</h1><p>Retrouvez vos organisations, vos outils et vos activités depuis un espace unique.</p></div>
            <button className="primary-button" onClick={() => setActive("Organisations")}><Plus size={17} /> Ajouter une organisation</button>
          </div>

          {showNotice && <div className="prototype-notice"><div className="notice-symbol"><LockKeyhole size={17} /></div><div><strong>Prototype en développement</strong><p>Les connexions, données et messages sont fictifs pour le moment. Aucun compte externe n'est connecté.</p></div><button onClick={() => setShowNotice(false)} aria-label="Fermer l'avertissement">×</button></div>}

          <div className="stats-grid">
            <article className="stat-card"><div className="stat-top"><span>Organisations</span><span className="stat-icon purple"><Building2 size={18} /></span></div><div className="stat-value">0 <small>connectée</small></div><div className="stat-foot"><span className="muted">Votre espace commence ici</span></div></article>
            <article className="stat-card"><div className="stat-top"><span>Comptes liés</span><span className="stat-icon blue"><Link2 size={18} /></span></div><div className="stat-value">0</div><div className="stat-foot"><span className="muted">Aucune intégration active</span></div></article>
            <article className="stat-card"><div className="stat-top"><span>Messages à traiter</span><span className="stat-icon orange"><Inbox size={18} /></span></div><div className="stat-value">0</div><div className="stat-foot"><span className="muted">Boîte de réception unifiée</span></div></article>
            <article className="stat-card"><div className="stat-top"><span>État de sécurité</span><span className="stat-icon green"><ShieldCheck size={18} /></span></div><div className="stat-value status-value">Prototype</div><div className="stat-foot"><span className="status-dot" /> <span className="muted">Aucun compte externe relié</span></div></article>
          </div>

          <div className="content-grid">
            <section className="panel integrations-panel">
              <div className="panel-heading"><div><h2>Vos connexions</h2><p>Rassemblez vos services professionnels.</p></div><button className="text-button" onClick={() => setActive("Connexions")}>Voir tout <ArrowUpRight size={15} /></button></div>
              <div className="integration-list">
                {integrations.filter(item => (item.name + " " + item.detail).toLowerCase().includes(query.toLowerCase())).map(({ name, detail, icon: Icon, status, tone }) => <article className="integration-row" key={name}><div className={"integration-icon " + tone}><Icon size={19} /></div><div className="integration-copy"><strong>{name}</strong><span>{detail}</span></div><span className="integration-status">{status}</span><button className="small-outline" onClick={() => setActive("Connexions")}>Configurer</button></article>)}
              </div>
              <button className="add-connection" onClick={() => setActive("Connexions")}><Plus size={17} /><span>Explorer les connecteurs</span><ArrowDownRight size={16} /></button>
            </section>

            <section className="panel activity-panel">
              <div className="panel-heading"><div><h2>Activité récente</h2><p>Un aperçu des changements de l'espace.</p></div><button className="icon-button" aria-label="Journal d'activité" onClick={() => setActive("Journal d'activité")}><FileText size={17} /></button></div>
              <div className="empty-state"><div className="empty-illustration"><Activity size={24} /></div><strong>Tout est calme pour le moment</strong><p>Les événements autorisés apparaîtront ici lorsque les intégrations seront disponibles.</p></div>
            </section>
          </div>

          <section className="onboarding-panel"><div className="onboarding-art"><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><div className="art-center"><Command size={27} /></div><div className="art-node node-one"><Mail size={16} /></div><div className="art-node node-two"><Building2 size={16} /></div><div className="art-node node-three"><Bell size={16} /></div></div><div className="onboarding-copy"><span className="step-label">POUR BIEN COMMENCER</span><h2>Votre espace, vos règles.</h2><p>Ajoutez vos filiales, définissez les rôles de votre équipe, puis connectez vos outils un par un en validant chaque autorisation.</p><button className="primary-button" onClick={() => setActive("Organisations")}>Configurer mon espace <ArrowUpRight size={16} /></button></div><div className="onboarding-step"><div><span>01</span><strong>Organiser</strong><small>Filiales et équipes</small></div><div><span>02</span><strong>Connecter</strong><small>Autorisations officielles</small></div><div><span>03</span><strong>Centraliser</strong><small>Messages et alertes</small></div></div></section>

          <footer className="page-footer"><span>© 2026 Kelo Hub · Prototype Alpha</span><span><ShieldCheck size={14} /> Vos accès restent sous votre contrôle</span></footer>
        </div>
      </section>
    </main>
  );
}