import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile
} from "firebase/auth";
import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { Bell, Edit2, Image, LogOut, MailPlus, MessageCircle, Plus, Reply, Search, Trash2, User, X } from "lucide-react";
import { auth, db, googleProvider, storage } from "./firebase/config";
import "./styles/app.css";

const defaultProfile = user => ({
  uid: user.uid,
  email: user.email || "",
  username: user.displayName || (user.email ? user.email.split("@")[0] : "User"),
  photoURL: user.photoURL || "",
  phone: "",
  address: "",
  createdAt: serverTimestamp()
});

function escapeText(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function useAuthUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async current => {
      setUser(current);
      setLoading(false);
      if (current) {
        const userRef = doc(db, "users", current.uid);
        const snap = await getDoc(userRef);
        if (!snap.exists()) await setDoc(userRef, defaultProfile(current));
      }
    });
    return () => unsub();
  }, []);

  return { user, loading };
}

function AuthPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleEmailAuth(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (isRegister) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName: username || email.split("@")[0] });
        await setDoc(doc(db, "users", result.user.uid), {
          ...defaultProfile(result.user),
          username: username || email.split("@")[0]
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleLogin() {
    setError("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const userRef = doc(db, "users", result.user.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) await setDoc(userRef, defaultProfile(result.user));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card pop-in">
        <div className="brand-row">
          <MessageCircle size={34} />
          <div>
            <h1>Midterm Chatroom</h1>
            <p>Firebase + React chat app</p>
          </div>
        </div>
        <form onSubmit={handleEmailAuth} className="form-stack">
          {isRegister && (
            <label>
              Username
              <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Your name" />
            </label>
          )}
          <label>
            Email
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" required placeholder="student@nthu.edu.tw" />
          </label>
          <label>
            Password
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" required minLength={6} placeholder="At least 6 characters" />
          </label>
          {error && <p className="error-box">{error}</p>}
          <button className="primary-btn" disabled={busy}>{busy ? "Processing..." : isRegister ? "Create account" : "Sign in"}</button>
        </form>
        <button className="ghost-btn" onClick={handleGoogleLogin}>Sign in with Google</button>
        <button className="text-btn" onClick={() => setIsRegister(v => !v)}>
          {isRegister ? "Already have an account? Sign in" : "Need an account? Sign up"}
        </button>
      </section>
    </main>
  );
}

function ProfileModal({ user, onClose }) {
  const [profile, setProfile] = useState({ username: "", email: "", phone: "", address: "", photoURL: "" });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) setProfile(snap.data());
    }
    load();
  }, [user.uid]);

  async function saveProfile(e) {
    e.preventDefault();
    setSaving(true);
    try {
      let photoURL = profile.photoURL || "";
      if (file) {
        const fileRef = ref(storage, `profiles/${user.uid}/${Date.now()}_${file.name}`);
        await uploadBytes(fileRef, file);
        photoURL = await getDownloadURL(fileRef);
      }
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: profile.email || user.email || "",
        username: profile.username || "Anonymous",
        phone: profile.phone || "",
        address: profile.address || "",
        photoURL,
        updatedAt: serverTimestamp()
      }, { merge: true });
      await updateProfile(user, { displayName: profile.username, photoURL });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <section className="modal-card slide-up">
        <button className="close-btn" onClick={onClose}><X size={18} /></button>
        <h2>User Profile</h2>
        <form onSubmit={saveProfile} className="form-stack">
          <div className="avatar-preview">
            {profile.photoURL ? <img src={profile.photoURL} alt="profile" /> : <User />}
          </div>
          <label>Profile picture<input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} /></label>
          <label>Username<input value={profile.username || ""} onChange={e => setProfile({ ...profile, username: e.target.value })} /></label>
          <label>Email<input value={profile.email || ""} onChange={e => setProfile({ ...profile, email: e.target.value })} /></label>
          <label>Phone number<input value={profile.phone || ""} onChange={e => setProfile({ ...profile, phone: e.target.value })} /></label>
          <label>Address<input value={profile.address || ""} onChange={e => setProfile({ ...profile, address: e.target.value })} /></label>
          <button className="primary-btn" disabled={saving}>{saving ? "Saving..." : "Save profile"}</button>
        </form>
      </section>
    </div>
  );
}

function RoomCreator({ user, onCreated }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");

  async function createRoom(e) {
    e.preventDefault();
    let members = [user.uid];
    if (memberEmail.trim()) {
      const memberQuery = query(collection(db, "users"), where("email", "==", memberEmail.trim()), limit(1));
      const snap = await getDocs(memberQuery);
      snap.forEach(d => members.push(d.id));
    }
    const room = await addDoc(collection(db, "rooms"), {
      name: name.trim() || "New Chatroom",
      members: [...new Set(members)],
      createdBy: user.uid,
      createdAt: serverTimestamp()
    });
    setName("");
    setMemberEmail("");
    setOpen(false);
    onCreated(room.id);
  }

  if (!open) return <button className="primary-btn" onClick={() => setOpen(true)}><Plus size={16} /> New room</button>;
  return (
    <form className="room-form" onSubmit={createRoom}>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Room name" />
      <input value={memberEmail} onChange={e => setMemberEmail(e.target.value)} placeholder="Invite by email" />
      <button className="primary-btn">Create</button>
      <button className="ghost-btn" type="button" onClick={() => setOpen(false)}>Cancel</button>
    </form>
  );
}

function InviteMember({ roomId }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  async function invite(e) {
    e.preventDefault();
    setMessage("");

    const q = query(collection(db, "users"), where("email", "==", email.trim()), limit(1));
    const snap = await getDocs(q);

    if (snap.empty) {
      setMessage("No registered user found.");
      return;
    }

    const uid = snap.docs[0].id;
    await updateDoc(doc(db, "rooms", roomId), { members: arrayUnion(uid) });

    setEmail("");
    setMessage("Invited.");
    setOpen(false);
  }

  return (
  <>
      <button className="circle-tool-btn" onClick={() => setOpen(v => !v)} title="Invite member">
        <MailPlus size={22} />
      </button>

      {open && (
        <form className="floating-tool-form" onSubmit={invite}>
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Invite by email"
          />
          <button className="primary-btn">Invite</button>
          {message && <small>{message}</small>}
        </form>
      )}
    </>
  );
}

function ChatMessage({ message, user, profiles, onEdit, onReply, onFocusReply }) {
  const mine = message.senderId === user.uid;
  const sender = profiles[message.senderId] || {};
  const createdAt = message.createdAt?.toDate ? message.createdAt.toDate().toLocaleString() : "sending...";
  const safeText = escapeText(message.text || "");

  return (
    <article id={`message-${message.id}`} className={`message ${mine ? "mine" : "theirs"} message-enter`}>
      <div className="message-meta">
        {sender.photoURL && <img className="mini-avatar" src={sender.photoURL} alt="avatar" />}
        <span>{sender.username || sender.email || "Unknown"}</span>
        <time>{createdAt}</time>
      </div>
      {message.replyTo && (
        <button className="reply-preview" onClick={() => onFocusReply(message.replyTo.id)}>
          Replying to: {message.replyTo.text || "image message"}
        </button>
      )}
      {message.imageUrl && <img className="chat-image" src={message.imageUrl} alt="uploaded message" />}
      {message.text && <p dangerouslySetInnerHTML={{ __html: safeText }} />}
      {message.edited && <small className="edited-label">edited</small>}
      <div className="message-actions">
        <button onClick={() => onReply(message)} title="Reply"><Reply size={15} /></button>
        {mine && <button onClick={() => onEdit(message)} title="Edit"><Edit2 size={15} /></button>}
        {mine && <button onClick={() => deleteDoc(doc(db, "rooms", message.roomId, "messages", message.id))} title="Unsend"><Trash2 size={15} /></button>}
      </div>
    </article>
  );
}

function ChatWindow({ user, roomId }) {
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!roomId) return;
    const unsubRoom = onSnapshot(doc(db, "rooms", roomId), snap => {
      if (snap.exists()) setRoom({ id: snap.id, ...snap.data() });
    });
    const msgQuery = query(collection(db, "rooms", roomId, "messages"), orderBy("createdAt", "asc"));
    const unsubMsg = onSnapshot(msgQuery, snap => {
      const rows = snap.docs.map(d => ({ id: d.id, roomId, ...d.data() }));
      setMessages(rows);
      const last = rows[rows.length - 1];
      if (last && last.senderId !== user.uid && document.hidden && Notification.permission === "granted") {
        new Notification("Unread chat message", { body: last.text || "New image message" });
      }
    });
    return () => { unsubRoom(); unsubMsg(); };
  }, [roomId, user.uid]);

  useEffect(() => {
    async function loadProfiles() {
      const ids = [...new Set([...(room?.members || []), ...messages.map(m => m.senderId)])];
      const next = {};
      for (const id of ids) {
        const snap = await getDoc(doc(db, "users", id));
        if (snap.exists()) next[id] = snap.data();
      }
      setProfiles(next);
    }
    loadProfiles();
  }, [room, messages]);

  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), [messages.length]);

  async function askNotificationPermission() {
    if (!("Notification" in window)) return alert("This browser does not support notifications.");
    const permission = await Notification.requestPermission();
    if (permission === "granted") new Notification("Notification enabled", { body: "You will receive unread message alerts." });
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!text.trim() && !imageFile) return;
    let imageUrl = "";
    if (imageFile) {
      const fileRef = ref(storage, `chat-images/${roomId}/${Date.now()}_${imageFile.name}`);
      await uploadBytes(fileRef, imageFile);
      imageUrl = await getDownloadURL(fileRef);
    }

    if (editing) {
      await updateDoc(doc(db, "rooms", roomId, "messages", editing.id), {
        text: text.trim(),
        edited: true,
        updatedAt: serverTimestamp()
      });
      setEditing(null);
    } else {
      await addDoc(collection(db, "rooms", roomId, "messages"), {
        senderId: user.uid,
        text: text.trim(),
        imageUrl,
        createdAt: serverTimestamp(),
        edited: false,
        replyTo: replyTo ? { id: replyTo.id, text: replyTo.text || "image message" } : null
      });
      setReplyTo(null);
    }
    setText("");
    setImageFile(null);
  }

  function startEdit(message) {
    setEditing(message);
    setText(message.text || "");
  }

  function focusReply(id) {
    const el = document.getElementById(`message-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("highlight");
    setTimeout(() => el.classList.remove("highlight"), 1600);
  }

  const filtered = useMemo(() => {
    const key = search.trim().toLowerCase();
    if (!key) return messages;
    return messages.filter(m => (m.text || "").toLowerCase().includes(key));
  }, [messages, search]);

  if (!roomId) return <section className="empty-state">Create or select a chatroom.</section>;

  return (
    <section className="chat-panel">
      <header className="chat-header">
        <div>
          <h2>{room?.name || "Chatroom"}</h2>
          <p>{room?.members?.length || 0} members</p>
        </div>
        <button className="ghost-btn" onClick={askNotificationPermission}><Bell size={16} /> Enable notification</button>
      </header>
      <div className="chat-tools">
        <InviteMember roomId={roomId} />

        <button
          className="circle-tool-btn"
          onClick={() => setSearch(search === "__OPEN__" ? "" : "__OPEN__")}
          title="Search messages"
        >
          <Search size={22} />
        </button>

        {(search === "__OPEN__" || (search !== "" && search !== "__OPEN__")) && (
          <input
            className="compact-search-input"
            autoFocus
            value={search === "__OPEN__" ? "" : search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search messages"
          />
        )}
      </div>
      <div className="message-list">
        {filtered.map(msg => (
          <ChatMessage
            key={msg.id}
            message={msg}
            user={user}
            profiles={profiles}
            onEdit={startEdit}
            onReply={setReplyTo}
            onFocusReply={focusReply}
          />
        ))}
        <div ref={bottomRef} />
      </div>
      {(replyTo || editing) && (
        <div className="compose-context">
          {replyTo && <span>Replying to: {replyTo.text || "image message"}</span>}
          {editing && <span>Editing your message</span>}
          <button onClick={() => { setReplyTo(null); setEditing(null); setText(""); }}><X size={15} /></button>
        </div>
      )}
      <form className="composer" onSubmit={sendMessage}>
        <label className="icon-upload">
          <Image size={20} />
          <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} />
        </label>
        <input value={text} onChange={e => setText(e.target.value)} placeholder={imageFile ? `Image selected: ${imageFile.name}` : "Type a message"} />
        <button className="primary-btn">{editing ? "Save" : "Send"}</button>
      </form>
    </section>
  );
}

function App() {
  const { user, loading } = useAuthUser();
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "rooms"), where("members", "array-contains", user.uid));
    const unsub = onSnapshot(q, snap => {
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRooms(rows);
      if (!selectedRoomId && rows[0]) setSelectedRoomId(rows[0].id);
    });
    return () => unsub();
  }, [user, selectedRoomId]);

  if (loading) return <main className="loading-screen">Loading...</main>;
  if (!user) return <AuthPage />;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <header className="sidebar-header">
          <h1>Chatroom</h1>
          <button onClick={() => setProfileOpen(true)} className="avatar-button"><User size={18} /></button>
        </header>
        <RoomCreator user={user} onCreated={setSelectedRoomId} />
        <nav className="room-list">
          {rooms.map(room => (
            <button key={room.id} className={room.id === selectedRoomId ? "room-item active" : "room-item"} onClick={() => setSelectedRoomId(room.id)}>
              <MessageCircle size={18} />
              <span>{room.name}</span>
            </button>
          ))}
        </nav>
        <button className="logout-btn" onClick={() => signOut(auth)}><LogOut size={16} /> Sign out</button>
      </aside>
      <ChatWindow user={user} roomId={selectedRoomId} />
      {profileOpen && <ProfileModal user={user} onClose={() => setProfileOpen(false)} />}
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
