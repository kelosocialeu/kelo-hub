"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck, LoaderCircle, MessageCircle, RefreshCw, Send, Sparkles, Workflow } from "lucide-react";

type Section = "Publications" | "Boîte de réception" | "Notifications" | "Commentaires" | "Mentions et tags";
type Account = { did: string; primary: boolean };
type FeedPost = { accountDid: string; post?: { uri?: string; indexedAt?: string; author?: { handle?: string; displayName?: string }; record?: { text?: string } } };
type Notice = { accountDid: string; uri?: string; reason?: string; indexedAt?: string; isRead?: boolean; author?: { handle?: string; displayName?: string }; record?: { text?: string; $type?: string } };
type Conversation = { accountDid: string; convoId: string; unreadCount?: number; members?: Array<{ did?: string; handle?: string; displayName?: string }>; lastMessage?: { text?: string; sentAt?: string } };
type Message = { id?: string; text?: string; sentAt?: string; sender?: { did?: string; handle?: string; displayName?: string }; $type?: string };
type Result = { did: string; items?: Array<FeedPost | Notice | Conversation>; messages?: Message[]; error?: string };
type Payload = { kind?: string; syncedAt?: string; results?: Result[]; error?: string };

function asText(value: unknown) { return typeof value === "string" ? value : ""; }
function shortDid(value: string) { return value.length > 34 ? value.slice(0, 17) + "…" + value.slice(-9) : value; }
function dateLabel(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("fr-BE", { dateStyle: "medium", timeStyle: "short" });
}
function errorText(payload: Payload) {
  return payload.error || payload.results?.map(result => result.error).filter(Boolean).join(" · ") || "";
}

export default function WorkspacePanel({ section }: { section: Section }) {
  const kind = section === "Publications" ? "posts" : section === "Boîte de réception" ? "messages" : "notifications";
  const [results, setResults] = useState<Result[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [syncedAt, setSyncedAt] = useState("");
  const [text, setText] = useState("");
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [readSync, setReadSync] = useState(false);

  const loadAccounts = useCallback(async () => {
    try {
      const response = await fetch("/oauth/accounts", { cache: "no-store", credentials: "same-origin" });
      const payload = await response.json() as { accounts?: Account[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "Impossible de charger les comptes connectés.");
      const next = payload.accounts ?? [];
      setAccounts(next);
      setSelectedAccounts(current => current.length ? current.filter(did => next.some(account => account.did === did)) : next.map(account => account.did));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible de charger les comptes.");
    }
  }, []);

  const loadData = useCallback(async (markSeen = false) => {
    setLoading(true);
    setError("");
    setStatus("");
    try {
      const params = new URLSearchParams({ kind });
      if (kind === "notifications" && markSeen) params.set("markSeen", "true");
      if (selectedConvo && kind === "messages") {
        params.set("convoId", selectedConvo.convoId);
        params.set("accountDid", selectedConvo.accountDid);
      }
      const response = await fetch("/api/workspace?" + params.toString(), { cache: "no-store", credentials: "same-origin" });
      const payload = await response.json() as Payload;
      if (!response.ok) throw new Error(payload.error || "La synchronisation a échoué.");
      setResults(payload.results ?? []);
      setSyncedAt(payload.syncedAt ?? new Date().toISOString());
      if (markSeen) setStatus("Notifications synchronisées et marquées comme lues sur les comptes qui le permettent.");
      if (selectedConvo && kind === "messages") {
        const result = (payload.results ?? []).find(item => item.did === selectedConvo.accountDid);
        setMessages(result?.messages ?? []);
        if (result?.error) setError(result.error);
      } else {
        const failures = (payload.results ?? []).filter(result => result.error);
        if (failures.length) setError(failures.map(result => shortDid(result.did) + " : " + result.error).join(" · "));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "La synchronisation a échoué.");
    } finally {
      setLoading(false);
    }
  }, [kind, selectedConvo]);

  useEffect(() => {
    setSelectedConvo(null);
    setMessages([]);
    setResults([]);
    setStatus("");
    void loadAccounts();
  }, [section, loadAccounts]);

  useEffect(() => {
    void loadData(false);
  }, [loadData]);

  async function sendContent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    setError("");
    setStatus("");
    try {
      const isMessage = section === "Boîte de réception" && selectedConvo;
      const body = isMessage
        ? { action: "message", accountDid: selectedConvo.accountDid, convoId: selectedConvo.convoId, text: text.trim() }
        : { action: "publish", accountDids: selectedAccounts, text: text.trim() };
      const response = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body),
      });
      const payload = await response.json() as { success?: boolean; error?: string; outcomes?: Array<{ did: string; success: boolean; error?: string }> };
      if (!response.ok) throw new Error(payload.error || "L’envoi a échoué.");
      if (isMessage) {
        setStatus("Message envoyé.");
        setText("");
        await loadData(false);
      } else {
        const successes = payload.outcomes?.filter(item => item.success).length ?? 0;
        const failures = payload.outcomes?.filter(item => !item.success) ?? [];
        setStatus(successes + " publication(s) envoyée(s)." + (failures.length ? " Échecs : " + failures.map(item => shortDid(item.did) + " — " + item.error).join(" ; ") : ""));
        setText("");
        await loadData(false);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "L’envoi a échoué.");
    } finally {
      setSending(false);
    }
  }

  const posts = results.flatMap(result => (result.items ?? []) as FeedPost[]);
  const notices = results.flatMap(result => (result.items ?? []) as Notice[]);
  const conversations = results.flatMap(result => (result.items ?? []) as Conversation[]);
  const allMessages = messages;
  const headingIcon = section === "Publications" ? <Workflow size={19}/> : section === "Boîte de réception" ? <MessageCircle size={19}/> : <Bell size={19}/>;

  return (
    <div className="workspace-panel-layout">
      <section className="panel workspace-main-panel">
        <div className="panel-heading">
          <div><h2>{section}</h2><p>{section === "Publications" ? "Rédige et publie sur les comptes que tu sélectionnes." : section === "Boîte de réception" ? "Conversations disponibles via les API de messagerie du fournisseur." : "Notifications récupérées depuis les comptes connectés."}</p></div>
          <button className="small-outline workspace-refresh" onClick={() => void loadData(false)} disabled={loading} aria-label="Synchroniser">{loading ? <LoaderCircle className="spin-icon" size={15}/> : <RefreshCw size={15}/>} Synchroniser</button>
        </div>
        {error && <p className="atproto-feedback error" role="alert">{error}</p>}
        {status && <p className="atproto-feedback" role="status">{status}</p>}

        {section === "Publications" && (
          <>
            <form className="workspace-composer" onSubmit={sendContent}>
              <label htmlFor="post-content">Nouvelle publication</label>
              <textarea id="post-content" value={text} onChange={event => setText(event.target.value)} maxLength={3000} rows={5} placeholder="Qu’aimerais-tu partager ?" required disabled={sending}/>
              <div className="workspace-account-targets">
                <strong>Publier sur</strong>
                {accounts.length ? accounts.map(account => (
                  <label key={account.did} className="workspace-account-choice">
                    <input type="checkbox" checked={selectedAccounts.includes(account.did)} onChange={event => setSelectedAccounts(current => event.target.checked ? [...current, account.did] : current.filter(did => did !== account.did))}/>
                    <span>{account.primary ? "Compte principal" : "Compte lié"} · {shortDid(account.did)}</span>
                  </label>
                )) : <small>Aucun compte OAuth restaurable.</small>}
              </div>
              <div className="workspace-composer-footer"><span>{text.length}/3000</span><button className="primary-button" type="submit" disabled={sending || !text.trim() || !selectedAccounts.length}>{sending ? <LoaderCircle className="spin-icon" size={15}/> : <Send size={15}/>} Publier</button></div>
            </form>
            <div className="workspace-feed-heading"><strong>Publications récentes</strong><span>{syncedAt ? "Synchronisé à " + dateLabel(syncedAt) : ""}</span></div>
            {loading ? <p className="settings-note"><LoaderCircle className="spin-icon" size={16}/> Récupération des publications…</p> : posts.length ? posts.map((item, index) => (
              <article className="workspace-post" key={(item.post?.uri ?? "") + item.accountDid + index}>
                <div className="workspace-item-top"><strong>{item.post?.author?.displayName || item.post?.author?.handle || shortDid(item.accountDid)}</strong><span>{dateLabel(item.post?.indexedAt)}</span></div>
                <p>{item.post?.record?.text || "Publication sans texte."}</p><small>Compte : {shortDid(item.accountDid)}</small>
              </article>
            )) : <div className="workspace-empty"><Workflow size={23}/><strong>Aucune publication à afficher</strong><span>Vérifie la connexion ou publie un premier message.</span></div>}
          </>
        )}

        {section === "Boîte de réception" && (
          <div className="workspace-messages-layout">
            <div className="workspace-conversation-list">
              {loading && <p className="settings-note"><LoaderCircle className="spin-icon" size={16}/> Chargement des conversations…</p>}
              {!loading && conversations.map((convo, index) => {
                const name = convo.members?.filter(member => member.did !== convo.accountDid).map(member => member.displayName || member.handle || member.did).filter(Boolean).join(", ") || "Conversation AT Protocol";
                return <button key={convo.convoId + convo.accountDid + index} className={selectedConvo?.convoId === convo.convoId && selectedConvo.accountDid === convo.accountDid ? "workspace-conversation active" : "workspace-conversation"} onClick={() => { setSelectedConvo(convo); setMessages([]); }}>
                  <span className="workspace-conversation-icon"><MessageCircle size={16}/></span><span className="workspace-conversation-copy"><strong>{name}</strong><small>{convo.lastMessage?.text || "Aucun message récent"}</small><em>{shortDid(convo.accountDid)}</em></span>{(convo.unreadCount ?? 0) > 0 && <i className="workspace-unread-count">{convo.unreadCount}</i>}
                </button>;
              })}
              {!loading && !conversations.length && <div className="workspace-empty"><MessageCircle size={23}/><strong>Aucune conversation</strong><span>Les conversations apparaissent si le fournisseur expose l’API de chat à ce compte.</span></div>}
            </div>
            <div className="workspace-message-thread">
              {!selectedConvo ? <div className="workspace-empty"><Sparkles size={22}/><strong>Choisis une conversation</strong><span>Les messages seront chargés depuis le service connecté.</span></div> : <>
                <div className="workspace-thread-head"><strong>Conversation</strong><small>{shortDid(selectedConvo.accountDid)}</small></div>
                {loading ? <p className="settings-note"><LoaderCircle className="spin-icon" size={16}/> Chargement des messages…</p> : allMessages.map((message, index) => <article className="workspace-message" key={(message.id ?? "") + index}><strong>{message.sender?.displayName || message.sender?.handle || shortDid(message.sender?.did || "")}</strong><p>{message.text || "Message sans texte."}</p><time>{dateLabel(message.sentAt)}</time></article>)}
                <form className="workspace-message-composer" onSubmit={sendContent}><textarea rows={2} value={text} onChange={event => setText(event.target.value)} maxLength={3000} placeholder="Écrire un message…" required disabled={sending}/><button className="primary-button" type="submit" disabled={sending || !text.trim()}>{sending ? <LoaderCircle className="spin-icon" size={15}/> : <Send size={15}/>} Envoyer</button></form>
              </>}
            </div>
          </div>
        )}

        {(section === "Notifications" || section === "Commentaires" || section === "Mentions et tags") && (
          <>
            {section === "Notifications" && <div className="workspace-notification-actions"><button className="small-outline" onClick={() => void loadData(true)} disabled={loading}><CheckCheck size={15}/> Synchroniser et marquer comme lues</button></div>}
            {loading ? <p className="settings-note"><LoaderCircle className="spin-icon" size={16}/> Synchronisation des notifications…</p> : notices.filter(item => section === "Commentaires" ? ["reply", "quote"].includes(item.reason || "") : section === "Mentions et tags" ? ["mention", "tag"].includes(item.reason || "") : true).map((item, index) => (
              <article className="workspace-notice" key={(item.uri ?? "") + item.accountDid + index}>
                <span className="workspace-notice-icon"><Bell size={16}/></span><div><div className="workspace-item-top"><strong>{item.author?.displayName || item.author?.handle || "Compte AT Protocol"}</strong><time>{dateLabel(item.indexedAt)}</time></div><p><b>{(item.reason || "notification").replace(/_/g, " ")}</b>{item.record?.text ? " · " + item.record.text : ""}</p><small>Compte : {shortDid(item.accountDid)}{item.isRead ? " · Lue" : " · Non lue"}</small></div>
              </article>
            ))}
            {!loading && !notices.filter(item => section === "Commentaires" ? ["reply", "quote"].includes(item.reason || "") : section === "Mentions et tags" ? ["mention", "tag"].includes(item.reason || "") : true).length && <div className="workspace-empty"><Bell size={23}/><strong>Aucune notification disponible</strong><span>Les données affichées proviennent uniquement des comptes dont l’API est accessible.</span></div>}
          </>
        )}
      </section>
      <aside className="panel workspace-status-panel">
        <div className="panel-heading"><div><h2>État de la synchronisation</h2><p>Statut du dernier accès distant.</p></div>{headingIcon}</div>
        <div className="workspace-status-row"><span>Comptes liés</span><strong>{accounts.length}</strong></div>
        <div className="workspace-status-row"><span>Dernière synchro</span><strong>{syncedAt ? dateLabel(syncedAt) : "—"}</strong></div>
        <div className="workspace-status-row"><span>Source</span><strong>AT Protocol</strong></div>
        <p className="workspace-status-note">Les messages privés dépendent du service de chat et de ses autorisations. Les comptes incompatibles affichent une erreur au lieu de données simulées.</p>
      </aside>
    </div>
  );
}
