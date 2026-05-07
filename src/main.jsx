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
  arrayRemove,
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
import {
  Bell,
  Edit2,
  Image,
  LogOut,
  MailPlus,
  MessageCircle,
  Plus,
  Reply,
  Search,
  Trash2,
  User,
  UserX,
  X
} from "lucide-react";
import { auth, db, googleProvider } from "./firebase/config";
import "./styles/app.css";

const defaultProfile = (user) => ({
  uid: user.uid,
  email: user.email || "",
  username: user.displayName || (user.email ? user.email.split("@")[0] : "User"),
  photoURL: user.photoURL || "",
  phone: "",
  address: "",
  blockedUsers: [],
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

function formatTime(value) {
  if (!value?.toDate) return "sending...";
  return value.toDate().toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}


function compressImageToDataUrl(file, maxWidth = 900, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const img = new window.Image();

      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");

        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL("image/jpeg", quality);

        if (dataUrl.length > 850000) {
          reject(new Error("Image is still too large after compression. Please choose a smaller image."));
          return;
        }

        resolve(dataUrl);
      };

      img.onerror = reject;
      img.src = reader.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function useAuthUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (current) => {
      setUser(current);
      setLoading(false);

      if (current) {
        const userRef = doc(db, "users", current.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
          await setDoc(userRef, defaultProfile(current));
        }
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
        const displayName = username.trim() || email.split("@")[0];

        await updateProfile(result.user, { displayName });
        await setDoc(doc(db, "users", result.user.uid), {
          ...defaultProfile(result.user),
          username: displayName
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

      if (!snap.exists()) {
        await setDoc(userRef, defaultProfile(result.user));
      }
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card pop-in" aria-label="Authentication form">
        <div className="brand-row">
          <div className="brand-mark">
            <MessageCircle size={28} />
          </div>
          <div>
            <h1>Midterm Chatroom</h1>
            <p>Realtime Firebase chat workspace</p>
          </div>
        </div>

        <form onSubmit={handleEmailAuth} className="form-stack">
          {isRegister && (
            <label>
              Username
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your display name"
              />
            </label>
          )}

          <label>
            Email
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              placeholder="student@nthu.edu.tw"
            />
          </label>

          <label>
            Password
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              minLength={6}
              placeholder="At least 6 characters"
            />
          </label>

          {error && <p className="error-box">{error}</p>}

          <button className="primary-btn" disabled={busy}>
            {busy ? "Processing..." : isRegister ? "Create account" : "Sign in"}
          </button>
        </form>

        <button className="ghost-btn wide-btn" onClick={handleGoogleLogin}>
          Sign in with Google
        </button>

        <button className="text-btn" onClick={() => setIsRegister((v) => !v)}>
          {isRegister ? "Already have an account? Sign in" : "Need an account? Sign up"}
        </button>
      </section>
    </main>
  );
}

function ProfileModal({ user, onClose }) {
  const [profile, setProfile] = useState({
    username: "",
    email: "",
    phone: "",
    address: "",
    photoURL: ""
  });
  const [file, setFile] = useState(null);
  const [avatarFileName, setAvatarFileName] = useState("");
  const [saving, setSaving] = useState(false);
  const firstInputRef = useRef(null);

  useEffect(() => {
    async function load() {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) setProfile(snap.data());
    }

    load();
    setTimeout(() => firstInputRef.current?.focus(), 80);
  }, [user.uid]);

  async function saveProfile(e) {
    e.preventDefault();
    setSaving(true);

    try {
      let photoURL = profile.photoURL || "";

      if (file) {
        photoURL = await compressImageToDataUrl(file, 600, 0.72);
      }

      await setDoc(
        doc(db, "users", user.uid),
        {
          uid: user.uid,
          email: profile.email || user.email || "",
          username: profile.username || "Anonymous",
          phone: profile.phone || "",
          address: profile.address || "",
          photoURL,
          blockedUsers: profile.blockedUsers || [],
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );

      await updateProfile(user, { displayName: profile.username });
      onClose();
    } catch (err) {
      alert(`Profile update failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="User profile">
      <section className="modal-card slide-up">
        <button className="close-btn" onClick={onClose} aria-label="Close profile">
          <X size={18} />
        </button>

        <h2>User Profile</h2>
        <p className="modal-subtitle">Keep your chat identity clear and recognizable.</p>

        <form onSubmit={saveProfile} className="form-stack">
          <div className="avatar-preview">
            {profile.photoURL ? <img src={profile.photoURL} alt="profile" /> : <User />}
          </div>

          <label>
            Profile picture

            <div className="avatar-upload-row">
              <label className="avatar-upload-btn">
                Upload avatar
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const selected = e.target.files?.[0] || null;
                    setFile(selected);
                    setAvatarFileName(selected ? selected.name : "");
                  }}
                />
              </label>

              <span className="avatar-file-name">
                {avatarFileName || "No file selected"}
              </span>
            </div>
          </label>

          <label>
            Username
            <input
              ref={firstInputRef}
              value={profile.username || ""}
              onChange={(e) => setProfile({ ...profile, username: e.target.value })}
            />
          </label>

          <label>
            Email
            <input
              value={profile.email || ""}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
            />
          </label>

          <label>
            Phone number
            <input
              value={profile.phone || ""}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            />
          </label>

          <label>
            Address
            <input
              value={profile.address || ""}
              onChange={(e) => setProfile({ ...profile, address: e.target.value })}
            />
          </label>

          <button className="primary-btn" disabled={saving}>
            {saving ? "Saving..." : "Save profile"}
          </button>
        </form>
      </section>
    </div>
  );
}

function RoomCreator({ user, onCreated }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [error, setError] = useState("");

  async function createRoom(e) {
    e.preventDefault();
    setError("");

    try {
      const members = [user.uid];

      if (memberEmail.trim()) {
        const memberQuery = query(
          collection(db, "users"),
          where("email", "==", memberEmail.trim()),
          limit(1)
        );

        const snap = await getDocs(memberQuery);

        if (snap.empty) {
          setError("No registered user found with that email.");
          return;
        }

        snap.forEach((d) => members.push(d.id));
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
    } catch (err) {
      setError(err.message);
    }
  }

  if (!open) {
    return (
      <button className="new-room-btn" onClick={() => setOpen(true)}>
        <Plus size={18} />
        New room
      </button>
    );
  }

  return (
    <form className="room-form" onSubmit={createRoom}>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Room name" />
      <input
        value={memberEmail}
        onChange={(e) => setMemberEmail(e.target.value)}
        placeholder="Invite by email"
      />
      {error && <small className="inline-error">{error}</small>}

      <div className="room-form-actions">
        <button className="primary-btn">Create</button>
        <button className="ghost-btn" type="button" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
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

    try {
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
    } catch (err) {
      setMessage(err.message);
    }
  }

  return (
    <>
      <button
        className={open ? "circle-tool-btn active" : "circle-tool-btn"}
        onClick={() => setOpen((v) => !v)}
        title="Invite member"
        aria-label="Invite member"
      >
        <MailPlus size={20} />
      </button>

      {open && (
        <form className="floating-tool-form" onSubmit={invite}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Invite by email"
            autoFocus
          />
          <button className="primary-btn small-btn">Invite</button>
          {message && <small className="tool-message">{message}</small>}
        </form>
      )}
    </>
  );
}


function BlockUserTool({ user, room }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [myProfile, setMyProfile] = useState(null);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) setMyProfile(snap.data());
    });
    return () => unsub();
  }, [user?.uid]);

  async function blockByEmail(e) {
    e.preventDefault();
    setMessage("");

    if (!email.trim()) return;

    try {
      const q = query(collection(db, "users"), where("email", "==", email.trim()), limit(1));
      const snap = await getDocs(q);

      if (snap.empty) {
        setMessage("No registered user found.");
        return;
      }

      const targetDoc = snap.docs[0];
      const targetUid = targetDoc.id;

      if (targetUid === user.uid) {
        setMessage("You cannot block yourself.");
        return;
      }

      if (room?.members && !room.members.includes(targetUid)) {
        setMessage("This user is not in this room.");
        return;
      }

      await setDoc(
        doc(db, "users", user.uid),
        { blockedUsers: arrayUnion(targetUid), updatedAt: serverTimestamp() },
        { merge: true }
      );

      setEmail("");
      setMessage("Blocked.");
      setOpen(false);
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function unblock(uid) {
    await updateDoc(doc(db, "users", user.uid), {
      blockedUsers: arrayRemove(uid),
      updatedAt: serverTimestamp()
    });
  }

  const blockedUsers = myProfile?.blockedUsers || [];

  return (
    <>
      <button
        className={open ? "circle-tool-btn danger active" : "circle-tool-btn danger"}
        onClick={() => setOpen((v) => !v)}
        title="Block user"
        aria-label="Block user"
      >
        <UserX size={20} />
      </button>

      {open && (
        <form className="floating-tool-form" onSubmit={blockByEmail}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Block by email"
            autoFocus
          />
          <button className="primary-btn small-btn danger-btn">Block</button>
          {message && <small className="tool-message">{message}</small>}
        </form>
      )}

      {open && blockedUsers.length > 0 && (
        <div className="blocked-list">
          {blockedUsers.map((uid) => (
            <button key={uid} type="button" onClick={() => unblock(uid)}>
              Unblock {uid.slice(0, 6)}
            </button>
          ))}
        </div>
      )}
    </>
  );
}


function AvatarView({ profile, className = "member-avatar" }) {
  const label = profile?.username || profile?.email || "?";
  if (profile?.photoURL) {
    return <img className={className} src={profile.photoURL} alt={label} />;
  }

  return <span className={`${className} avatar-fallback`}>{label.charAt(0).toUpperCase()}</span>;
}

function InlineUserSearch({ currentUser, room, disabledUserIds = [], placeholder, onSelect }) {
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function searchUsers() {
      const key = keyword.trim().toLowerCase();
      setMessage("");

      if (!key) {
        setResults([]);
        return;
      }

      try {
        const snap = await getDocs(collection(db, "users"));
        const rows = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((u) => {
            if (u.id === currentUser?.uid) return false;
            if (disabledUserIds.includes(u.id)) return false;

            const username = (u.username || "").toLowerCase();
            const email = (u.email || "").toLowerCase();
            const uid = (u.id || "").toLowerCase();

            return username.includes(key) || email.includes(key) || uid.includes(key);
          })
          .slice(0, 8);

        if (!cancelled) setResults(rows);
      } catch (err) {
        if (!cancelled) setMessage(err.message);
      }
    }

    const timer = setTimeout(searchUsers, 160);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [keyword, currentUser?.uid, disabledUserIds]);

  async function pick(userProfile) {
    try {
      await onSelect(userProfile);
      setKeyword("");
      setResults([]);
      setMessage("Invited.");
      setTimeout(() => setMessage(""), 1200);
    } catch (err) {
      setMessage(err.message);
    }
  }

  return (
    <div className="inline-user-search">
      <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder={placeholder} />
      {message && <small className="tool-message">{message}</small>}

      {keyword.trim() && (
        <div className="member-search-results">
          {results.length === 0 ? (
            <div className="lookup-empty">No matching users.</div>
          ) : (
            results.map((u) => (
              <button key={u.id} type="button" className="member-search-row" onClick={() => pick(u)}>
                <AvatarView profile={u} className="lookup-avatar" />
                <span>
                  <strong>{u.username || "Unnamed user"}</strong>
                  <small>{u.email || u.id}</small>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function MemberProfileModal({ profile, onClose }) {
  if (!profile) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Member profile">
      <section className="modal-card member-profile-card slide-up">
        <button className="close-btn" onClick={onClose} aria-label="Close member profile">
          <X size={18} />
        </button>

        <div className="member-profile-hero">
          <AvatarView profile={profile} className="member-profile-avatar" />
          <div>
            <h2>{profile.username || "Unnamed user"}</h2>
            <p>{profile.email || "No email"}</p>
          </div>
        </div>

        <div className="member-profile-fields">
          <div>
            <span>Phone</span>
            <strong>{profile.phone || "Not provided"}</strong>
          </div>
          <div>
            <span>Address</span>
            <strong>{profile.address || "Not provided"}</strong>
          </div>
          <div>
            <span>User ID</span>
            <strong>{profile.uid || profile.id || "Unknown"}</strong>
          </div>
        </div>
      </section>
    </div>
  );
}

function RoomMembersModal({ user, room, profiles, myProfile, onClose, onOpenProfile }) {
  const blockedUsers = myProfile?.blockedUsers || [];
  const members = (room?.members || []).map((uid) => ({
    uid,
    profile: profiles[uid] || { uid, username: "Loading..." }
  }));

  async function inviteMember(targetUser) {
    await updateDoc(doc(db, "rooms", room.id), {
      members: arrayUnion(targetUser.id)
    });
  }

  async function blockMember(uid) {
    if (uid === user.uid) return;
    await setDoc(
      doc(db, "users", user.uid),
      { blockedUsers: arrayUnion(uid), updatedAt: serverTimestamp() },
      { merge: true }
    );
  }

  async function unblockMember(uid) {
    await updateDoc(doc(db, "users", user.uid), {
      blockedUsers: arrayRemove(uid),
      updatedAt: serverTimestamp()
    });
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Room members">
      <section className="modal-card room-members-modal slide-up">
        <button className="close-btn" onClick={onClose} aria-label="Close room members">
          <X size={18} />
        </button>

        <header className="members-modal-header">
          <div>
            <span className="eyebrow">Room members</span>
            <h2>{room?.name || "Chatroom"}</h2>
            <p>{members.length} members · click an avatar to view profile</p>
          </div>
        </header>

        <section className="member-invite-section">
          <h3>Invite by profile name</h3>
          <InlineUserSearch
            currentUser={user}
            room={room}
            disabledUserIds={room?.members || []}
            placeholder="Search username or email"
            onSelect={inviteMember}
          />
        </section>

        <section className="members-grid">
          {members.map(({ uid, profile }) => {
            const isMe = uid === user.uid;
            const isBlocked = blockedUsers.includes(uid);

            return (
              <article key={uid} className={isBlocked ? "member-card blocked" : "member-card"}>
                <button
                  type="button"
                  className="member-avatar-button"
                  onClick={() => onOpenProfile({ id: uid, uid, ...profile })}
                  aria-label={`Open ${profile.username || profile.email || uid} profile`}
                >
                  <AvatarView profile={profile} />
                </button>

                <div className="member-info">
                  <strong>{profile.username || profile.email || "Unknown"}</strong>
                  <small>{isMe ? "You" : profile.email || uid}</small>
                  {isBlocked && <span className="member-status blocked">Blocked</span>}
                </div>

                {!isMe && (
                  <button
                    type="button"
                    className={isBlocked ? "member-action unblock" : "member-action block"}
                    onClick={() => (isBlocked ? unblockMember(uid) : blockMember(uid))}
                  >
                    {isBlocked ? "Unblock" : "Block"}
                  </button>
                )}
              </article>
            );
          })}
        </section>
      </section>
    </div>
  );
}


function ChatMessage({ message, user, profiles, onEdit, onReply, onFocusReply, onReact }) {
  const mine = message.senderId === user.uid;
  const sender = profiles[message.senderId] || {};


  return (
    <article id={`message-${message.id}`} className={`message ${mine ? "mine" : "theirs"} message-enter`}>
      <div className="message-meta">
        {sender.photoURL ? (
          <img className="mini-avatar" src={sender.photoURL} alt="avatar" />
        ) : (
          <span className="mini-avatar placeholder-avatar">
            {(sender.username || sender.email || "?").charAt(0).toUpperCase()}
          </span>
        )}
        <span className="sender-name">{sender.username || sender.email || "Unknown"}</span>
        <time>{formatTime(message.createdAt)}</time>
      </div>

      {message.replyTo && (
        <button className="reply-preview" onClick={() => onFocusReply(message.replyTo.id)}>
          <span>Replying to</span>
          <strong>{message.replyTo.text || "image message"}</strong>
        </button>
      )}

      {message.imageUrl && (
        <img className="chat-image" src={message.imageUrl} alt="uploaded message" loading="lazy" />
      )}

      {message.text && <p>{message.text}</p>}

      <div className="message-footer">
        <div className="message-reactions" aria-label="Message reactions">
          {["👍", "❤️", "😂"].map((emoji) => {
            const reactedUsers = message.reactions?.[emoji] || [];
            const active = reactedUsers.includes(user.uid);

            return (
              <button
                key={emoji}
                type="button"
                className={active ? "reaction-btn active" : "reaction-btn"}
                onClick={() => onReact(message.id, emoji)}
                aria-label={`React with ${emoji}`}
              >
                <span>{emoji}</span>
                {reactedUsers.length > 0 && <small>{reactedUsers.length}</small>}
              </button>
            );
          })}
        </div>

        {message.edited && <small className="edited-label">edited</small>}

        <div className="message-actions">
          <button onClick={() => onReply(message)} title="Reply" aria-label="Reply message">
            <Reply size={15} />
          </button>

          {mine && (
            <button onClick={() => onEdit(message)} title="Edit" aria-label="Edit message">
              <Edit2 size={15} />
            </button>
          )}

          {mine && (
            <button
              onClick={() => deleteDoc(doc(db, "rooms", message.roomId, "messages", message.id))}
              title="Unsend"
              aria-label="Unsend message"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function ChatWindow({ user, roomId }) {
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [unreadMap, setUnreadMap] = useState({});
  const [profiles, setProfiles] = useState({});
  const [myProfile, setMyProfile] = useState(null);
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const hasLoadedMessagesRef = useRef(false);
  const knownMessageIdsRef = useRef(new Set());
  const isWindowFocusedRef = useRef(true);
  const profilesRef = useRef({});
  const roomRef = useRef(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [notificationEnabled, setNotificationEnabled] = useState(() => {
    return localStorage.getItem("chatroomNotificationEnabled") === "true";
  });
  const [viewingMember, setViewingMember] = useState(null);


  useEffect(() => {
    function handleFocus() {
      isWindowFocusedRef.current = true;
      setUnreadMap((prev) => ({ ...prev, [roomId]: 0 }));
    }

    function handleBlur() {
      isWindowFocusedRef.current = false;
    }

    function handleVisibilityChange() {
      isWindowFocusedRef.current = !document.hidden;
      if (!document.hidden) {
        setUnreadMap((prev) => ({ ...prev, [roomId]: 0 }));
      }
    }

    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [roomId]);

  useEffect(() => {
    hasLoadedMessagesRef.current = false;
    knownMessageIdsRef.current = new Set();
    setUnreadMap((prev) => ({ ...prev, [roomId]: 0 }));
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;

    const unsubRoom = onSnapshot(doc(db, "rooms", roomId), (snap) => {
      if (snap.exists()) {
        setRoom({ id: snap.id, ...snap.data() });
      }
    });

    const msgQuery = query(collection(db, "rooms", roomId, "messages"), orderBy("createdAt", "asc"));
    const unsubMsg = onSnapshot(msgQuery, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, roomId, ...d.data() }));
      setMessages(rows);

      const addedMessages = snap
        .docChanges()
        .filter((change) => change.type === "added")
        .map((change) => ({ id: change.doc.id, roomId, ...change.doc.data() }));

      const isInitialLoad = !hasLoadedMessagesRef.current;

      if (isInitialLoad) {
        knownMessageIdsRef.current = new Set(rows.map((msg) => msg.id));
        hasLoadedMessagesRef.current = true;
        return;
      }

      addedMessages.forEach((msg) => {
        if (knownMessageIdsRef.current.has(msg.id)) return;
        knownMessageIdsRef.current.add(msg.id);

        const isFromOtherUser = msg.senderId !== user.uid;
        const isUnread = document.hidden || !isWindowFocusedRef.current;

        if (isFromOtherUser && isUnread) {
          setUnreadMap((prev) => ({
            ...prev,
            [roomId]: (prev[roomId] || 0) + 1
          }));

          if (
            notificationEnabled &&
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            const senderName =
              profilesRef.current[msg.senderId]?.username ||
              profilesRef.current[msg.senderId]?.email ||
              "Someone";
            const roomName = roomRef.current?.name || "Chatroom";
            const bodyText = msg.text ? `${senderName}: ${msg.text}` : `${senderName}: sent an image`;

            new Notification(`Unread message · ${roomName}`, {
              body: bodyText,
              tag: `room-${roomId}`,
              renotify: true
            });
          }
        }
      });
    });

    return () => {
      unsubRoom();
      unsubMsg();
    };
  }, [roomId, user.uid]);


  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) setMyProfile(snap.data());
    });
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    profilesRef.current = profiles;
  }, [profiles]);

  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  useEffect(() => {
    async function loadProfiles() {
      const ids = [...new Set([...(room?.members || []), ...messages.map((m) => m.senderId)])];
      const next = {};

      for (const id of ids) {
        const snap = await getDoc(doc(db, "users", id));
        if (snap.exists()) next[id] = snap.data();
      }

      setProfiles(next);
    }

    loadProfiles();
  }, [room, messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function askNotificationPermission() {
    if (!("Notification" in window)) {
      alert("This browser does not support notifications.");
      return;
    }

    if (notificationEnabled) {
      setNotificationEnabled(false);
      localStorage.setItem("chatroomNotificationEnabled", "false");
      return;
    }

    if (Notification.permission === "granted") {
      setNotificationEnabled(true);
      localStorage.setItem("chatroomNotificationEnabled", "true");

      new Notification("Unread notification enabled", {
        body: "You will receive alerts only for unread messages."
      });

      return;
    }

    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      setNotificationEnabled(true);
      localStorage.setItem("chatroomNotificationEnabled", "true");

      new Notification("Unread notification enabled", {
        body: "You will receive alerts only for unread messages."
      });
    } else {
      setNotificationEnabled(false);
      localStorage.setItem("chatroomNotificationEnabled", "false");
      alert("Notification permission was not granted.");
    }
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!text.trim() && !imageFile) return;

    if (directChatBlocked) {
      alert("This direct chat is blocked. Messages cannot be sent anymore.");
      return;
    }

    try {
      let imageUrl = "";

      if (imageFile) {
        imageUrl = await compressImageToDataUrl(imageFile);
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
      inputRef.current?.focus();
    } catch (err) {
      alert(`Message failed: ${err.message}`);
    }
  }

  async function toggleReaction(messageId, emoji) {
    if (!roomId || !user?.uid) return;

    const targetMessage = messages.find((m) => m.id === messageId);
    const reactedUsers = targetMessage?.reactions?.[emoji] || [];
    const alreadyReacted = reactedUsers.includes(user.uid);

    try {
      await updateDoc(doc(db, "rooms", roomId, "messages", messageId), {
        [`reactions.${emoji}`]: alreadyReacted
          ? arrayRemove(user.uid)
          : arrayUnion(user.uid)
      });
    } catch (err) {
      alert(`Reaction failed: ${err.message}`);
    }
  }

  function startEdit(message) {
    setEditing(message);
    setReplyTo(null);
    setText(message.text || "");
    inputRef.current?.focus();
  }

  function startReply(message) {
    setReplyTo(message);
    setEditing(null);
    inputRef.current?.focus();
  }

  function focusReply(id) {
    const el = document.getElementById(`message-${id}`);
    if (!el) return;

    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("highlight");
    setTimeout(() => el.classList.remove("highlight"), 1600);
  }

  function cancelComposeState() {
    setReplyTo(null);
    setEditing(null);
    setText("");
  }

  const blockedByMe = myProfile?.blockedUsers || [];

  const blockedMe = useMemo(() => {
    return Object.entries(profiles)
      .filter(([, profile]) => (profile.blockedUsers || []).includes(user.uid))
      .map(([uid]) => uid);
  }, [profiles, user.uid]);

  const visibleMessages = useMemo(() => {
    return messages.filter((m) => {
      const senderBlockedByMe = blockedByMe.includes(m.senderId);
      const senderBlockedMe = blockedMe.includes(m.senderId);
      return !senderBlockedByMe && !senderBlockedMe;
    });
  }, [messages, blockedByMe, blockedMe]);

  const directChatBlocked = useMemo(() => {
    if (!room?.members || room.members.length !== 2) return false;
    const otherUid = room.members.find((uid) => uid !== user.uid);
    if (!otherUid) return false;

    const otherProfile = profiles[otherUid];
    const otherBlockedMe = (otherProfile?.blockedUsers || []).includes(user.uid);
    const iBlockedOther = blockedByMe.includes(otherUid);

    return otherBlockedMe || iBlockedOther;
  }, [room, profiles, user.uid, blockedByMe]);

  const filtered = useMemo(() => {
    const key = search.trim().toLowerCase();
    const source = visibleMessages;
    if (!key) return source;
    return source.filter((m) => (m.text || "").toLowerCase().includes(key));
  }, [visibleMessages, search]);

  if (!roomId) {
    return (
      <section className="empty-state">
        <div>
          <MessageCircle size={48} />
          <h2>Create or select a chatroom</h2>
          <p>Your private conversations will appear here.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="chat-panel" aria-label="Chat panel">
      <header className="chat-header">
        <button type="button" className="room-summary-button" onClick={() => setMembersOpen(true)}>
          <span className="eyebrow">Current room</span>
          <h2>{room?.name || "Chatroom"}</h2>
          <p>
            {room?.members?.length || 0} members · manage members
            {unreadMap[roomId] > 0 ? ` · ${unreadMap[roomId]} unread` : ""}
          </p>
        </button>

        <button
          className={
            notificationEnabled
              ? "ghost-btn notification-btn enabled"
              : "ghost-btn notification-btn"
          }
          onClick={askNotificationPermission}
          title={
            notificationEnabled
              ? "Unread notification enabled"
              : "Enable unread notification"
          }
        >
          <Bell size={18} />
        </button>
      </header>

      {membersOpen && (
        <RoomMembersModal
          user={user}
          room={room}
          profiles={profiles}
          myProfile={myProfile}
          onClose={() => setMembersOpen(false)}
          onOpenProfile={setViewingMember}
        />
      )}

      {viewingMember && (
        <MemberProfileModal profile={viewingMember} onClose={() => setViewingMember(null)} />
      )}

      <div className="chat-tools" aria-label="Chat tools">
        <button
          className={searchOpen ? "circle-tool-btn active" : "circle-tool-btn"}
          onClick={() => {
            setSearchOpen((v) => !v);
            if (searchOpen) setSearch("");
          }}
          title="Search messages"
          aria-label="Search messages"
        >
          <Search size={20} />
        </button>

        {searchOpen && (
          <input
            className="compact-search-input"
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search messages in this room"
          />
        )}

        {searchOpen && search && (
          <button className="clear-search-btn" onClick={() => setSearch("")} aria-label="Clear search">
            <X size={16} />
          </button>
        )}
      </div>

      {directChatBlocked && (
        <div className="block-warning">
          This direct chat is blocked. You can still view allowed history, but new messages are disabled.
        </div>
      )}

      {directChatBlocked && (
        <div className="direct-block-warning" role="alert">
          This direct chat is blocked. Messages cannot be sent anymore.
        </div>
      )}

      <div className="message-list" aria-live="polite">
        {filtered.length === 0 ? (
          <div className="empty-thread">
            <MessageCircle size={36} />
            <h3>{search ? "No messages found" : "No messages yet"}</h3>
            <p>{search ? "Try another keyword." : "Send the first message to start the conversation."}</p>
          </div>
        ) : (
          filtered.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              user={user}
              profiles={profiles}
              onEdit={startEdit}
              onReply={startReply}
              onFocusReply={focusReply}
              onReact={toggleReaction}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {(replyTo || editing) && (
        <div className="compose-context">
          <div>
            <strong>{replyTo ? "Replying to message" : "Editing your message"}</strong>
            <span>{replyTo ? replyTo.text || "image message" : editing?.text || ""}</span>
          </div>
          <button onClick={cancelComposeState} aria-label="Cancel current compose action">
            <X size={16} />
          </button>
        </div>
      )}

      <form className={directChatBlocked ? "composer disabled" : "composer"} onSubmit={sendMessage}>
        <label className="icon-upload" aria-label="Upload image">
          <Image size={20} />
          <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
        </label>

        <input
          ref={inputRef}
          disabled={directChatBlocked}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={imageFile ? `Image selected: ${imageFile.name}` : "Type a message"}
        />

        <button className="primary-btn send-btn" disabled={directChatBlocked}>
          {editing ? "Save" : "Send"}
        </button>
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
    if (!user?.uid) {
      setRooms([]);
      setSelectedRoomId(null);
      return;
    }

    setRooms([]);
    setSelectedRoomId(null);

    const q = query(
      collection(db, "rooms"),
      where("members", "array-contains", user.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({
        id: d.id,
        ...d.data()
      }));

      setRooms(rows);

      setSelectedRoomId((currentId) => {
        if (rows.length === 0) {
          return null;
        }

        const stillExists = rows.some(
          (room) => room.id === currentId
        );

        if (stillExists) {
          return currentId;
        }

        return rows[0].id;
      });
    });

    return () => unsub();
  }, [user?.uid]);

  if (loading) return <main className="loading-screen">Loading...</main>;
  if (!user) return <AuthPage />;

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Chatroom sidebar">
        <header className="sidebar-header">
          <div>
            <span className="eyebrow">Workspace</span>
            <h1>Chatroom</h1>
          </div>
          <button onClick={() => setProfileOpen(true)} className="avatar-button" aria-label="Open profile">
            <User size={18} />
          </button>
        </header>

        <RoomCreator user={user} onCreated={setSelectedRoomId} />

        <nav className="room-list" aria-label="Chatroom list">
          {rooms.length === 0 ? (
            <div className="empty-room-list">
              <MessageCircle size={24} />
              <p>No rooms yet.</p>
            </div>
          ) : (
            rooms.map((room) => (
              <button
                key={room.id}
                className={room.id === selectedRoomId ? "room-item active" : "room-item"}
                onClick={() => setSelectedRoomId(room.id)}
              >
                <span className="room-icon">
                  <MessageCircle size={17} />
                </span>
                <span>{room.name}</span>
              </button>
            ))
          )}
        </nav>

        <button className="logout-btn" onClick={() => signOut(auth)}>
          <LogOut size={16} />
          Sign out
        </button>
      </aside>

      <ChatWindow
        key={`${user?.uid}-${selectedRoomId || "empty"}`}
        user={user}
        roomId={selectedRoomId}
      />

      {profileOpen && <ProfileModal user={user} onClose={() => setProfileOpen(false)} />}
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
