import React, { useEffect, useState, useCallback } from 'react';
import {
  addDoc,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { auth, db } from './firebase';

const TABS = ['overview', 'users', 'posts', 'comments', 'audit'];
const TAB_LABELS = {
  overview: '📊 Overview',
  users: '👥 Users',
  posts: '📝 Posts',
  comments: '💬 Comments',
  audit: '📋 Audit Log',
};

function timeAgo(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function RoleBadge({ role, suspended }) {
  if (suspended) return <span className="badge badge-suspended">Suspended</span>;
  if (role === 'admin') return <span className="badge badge-admin">Admin</span>;
  return <span className="badge badge-user">User</span>;
}

function AdminPanel() {
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [error, setError] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [postUserFilter, setPostUserFilter] = useState('');

  const logAction = useCallback(async (action, detail) => {
    try {
      await addDoc(collection(db, 'adminLogs'), {
        action,
        detail,
        adminEmail: auth.currentUser?.email || '',
        adminUid: auth.currentUser?.uid || '',
        timestamp: serverTimestamp(),
      });
    } catch (_) {
      /* non-critical */
    }
  }, []);

  const loadAdminData = useCallback(async () => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }
    setError('');
    try {
      const profilesSnap = await getDocs(collection(db, 'userProfiles'));
      const userRows = profilesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setUsers(userRows);

      const postRows = [];
      for (const u of userRows) {
        const postsSnap = await getDocs(collection(db, 'users', u.id, 'posts'));
        for (const p of postsSnap.docs) {
          postRows.push({ id: p.id, ownerId: u.id, ownerName: u.displayName || u.email || 'User', ...p.data() });
        }
      }
      postRows.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setPosts(postRows);

      const commentsSnap = await getDocs(collectionGroup(db, 'comments'));
      const commentRows = commentsSnap.docs.map((d) => {
        const parts = d.ref.path.split('/');
        return { id: d.id, postOwnerId: parts[1] || '', postId: parts[3] || '', ref: d.ref, ...d.data() };
      });
      commentRows.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setComments(commentRows);

      const logsSnap = await getDocs(
        query(collection(db, 'adminLogs'), orderBy('timestamp', 'desc'), limit(100))
      );
      setAuditLogs(logsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      setError('Unable to load admin data: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const toggleAdminRole = async (u) => {
    const nextRole = u.role === 'admin' ? 'user' : 'admin';
    await setDoc(doc(db, 'userProfiles', u.id), { role: nextRole }, { merge: true });
    setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, role: nextRole } : x));
    await logAction(nextRole === 'admin' ? 'GRANT_ADMIN' : 'REVOKE_ADMIN', u.email || u.id);
  };

  const toggleSuspend = async (u) => {
    const next = !u.suspended;
    await setDoc(doc(db, 'userProfiles', u.id), { suspended: next }, { merge: true });
    setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, suspended: next } : x));
    await logAction(next ? 'SUSPEND_USER' : 'UNSUSPEND_USER', u.email || u.id);
  };

  const removePost = async (post) => {
    await deleteDoc(doc(db, 'users', post.ownerId, 'posts', post.id));
    setPosts((prev) => prev.filter((p) => !(p.id === post.id && p.ownerId === post.ownerId)));
    await logAction('DELETE_POST', `Post ${post.id} by ${post.ownerName}`);
  };

  const removeComment = async (comment) => {
    await deleteDoc(comment.ref);
    setComments((prev) => prev.filter((c) => !(c.id === comment.id && c.postId === comment.postId)));
    await logAction('DELETE_COMMENT', `Comment by ${comment.displayName || comment.userId || 'unknown'}`);
  };

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const newPostsToday = posts.filter((p) => { const d = p.createdAt?.toDate?.(); return d && d >= todayStart; }).length;
  const suspendedCount = users.filter((u) => u.suspended).length;
  const adminCount = users.filter((u) => u.role === 'admin').length;

  const filteredUsers = users.filter((u) => {
    if (!userSearch) return true;
    const s = userSearch.toLowerCase();
    return (u.email || '').toLowerCase().includes(s) || (u.displayName || '').toLowerCase().includes(s);
  });
  const filteredPosts = postUserFilter ? posts.filter((p) => p.ownerId === postUserFilter) : posts;

  if (loading) return <p className="muted" style={{ padding: 20 }}>Loading admin dashboard...</p>;

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h2 className="admin-header-title">Admin Dashboard</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <a className="admin-policy-link" href="/terms">Terms</a>
          <a className="admin-policy-link" href="/privacy">Privacy</a>
          <span className="muted" style={{ fontSize: 13 }}>{auth.currentUser?.email}</span>
          <button className="secondary-btn" style={{ padding: '6px 12px', fontSize: 13 }} onClick={loadAdminData}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {error ? <p className="error-text" style={{ marginBottom: 12 }}>{error}</p> : null}

      {/* Tabs */}
      <div className="admin-tab-bar">
        {TABS.map((t) => (
          <button key={t} className={`admin-tab-btn${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div>
          <div className="admin-stats-grid">
            {[
              { value: users.length, label: 'Total Users' },
              { value: adminCount, label: 'Admins' },
              { value: suspendedCount, label: 'Suspended', danger: true },
              { value: posts.length, label: 'Total Posts' },
              { value: newPostsToday, label: 'Posts Today' },
              { value: comments.length, label: 'Comments' },
            ].map(({ value, label, danger }) => (
              <div key={label} className="admin-stat-card">
                <p className={`admin-stat-value${danger ? ' admin-stat-danger' : ''}`}>{value}</p>
                <p className="admin-stat-label">{label}</p>
              </div>
            ))}
          </div>
          <div className="admin-block">
            <h3 className="admin-block-title">Recent Admin Activity</h3>
            {auditLogs.length === 0 ? <p className="muted">No actions recorded yet.</p> : null}
            {auditLogs.slice(0, 10).map((log) => (
              <div key={log.id} className="admin-log-row">
                <span className="admin-log-action">{log.action}</span>
                <span className="admin-log-detail">{log.detail}</span>
                <span className="admin-log-time muted">{timeAgo(log.timestamp)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Users */}
      {tab === 'users' && (
        <div className="admin-block">
          <div className="admin-block-toolbar">
            <input
              className="input admin-search"
              placeholder="Search by name or email…"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
            <span className="muted" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
              {filteredUsers.length} / {users.length}
            </span>
          </div>
          {filteredUsers.length === 0 ? <p className="muted">No users found.</p> : null}
          {filteredUsers.map((u) => (
            <div key={u.id} className="admin-user-row">
              <div className="admin-user-avatar">
                {(u.displayName || u.email || 'U')[0].toUpperCase()}
              </div>
              <div className="admin-user-info">
                <p className="admin-user-name">{u.displayName || 'User'}</p>
                <p className="muted" style={{ margin: 0, fontSize: 13 }}>{u.email || u.id}</p>
                <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                  <RoleBadge role={u.role} suspended={u.suspended} />
                  <span className="muted" style={{ fontSize: 12 }}>
                    {posts.filter((p) => p.ownerId === u.id).length} posts
                  </span>
                </div>
              </div>
              <div className="admin-user-actions">
                <button
                  className={u.role === 'admin' ? 'secondary-btn' : 'primary-btn'}
                  style={{ padding: '6px 10px', fontSize: 13 }}
                  disabled={u.id === auth.currentUser?.uid}
                  onClick={async () => {
                    try {
                      await toggleAdminRole(u);
                    } catch (e) {
                      setError(e.message);
                    }
                  }}
                >
                  {u.role === 'admin' ? '− Admin' : '+ Admin'}
                </button>
                <button
                  className={u.suspended ? 'primary-btn' : 'danger-btn'}
                  style={{ padding: '6px 10px', fontSize: 13 }}
                  disabled={u.id === auth.currentUser?.uid}
                  onClick={async () => {
                    try {
                      await toggleSuspend(u);
                    } catch (e) {
                      setError(e.message);
                    }
                  }}
                >
                  {u.suspended ? 'Unsuspend' : 'Suspend'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Posts */}
      {tab === 'posts' && (
        <div className="admin-block">
          <div className="admin-block-toolbar">
            <select
              className="input admin-search"
              value={postUserFilter}
              onChange={(e) => setPostUserFilter(e.target.value)}
              style={{ maxWidth: 260 }}
            >
              <option value="">All users</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.displayName || u.email || u.id}</option>
              ))}
            </select>
            <span className="muted" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
              {filteredPosts.length} post{filteredPosts.length !== 1 ? 's' : ''}
            </span>
          </div>
          {filteredPosts.length === 0 ? <p className="muted">No posts found.</p> : null}
          {filteredPosts.map((post) => (
            <div key={`${post.ownerId}-${post.id}`} className="admin-row">
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="admin-title" style={{ margin: '0 0 2px' }}>{post.ownerName}</p>
                <p className="muted" style={{ margin: '0 0 4px', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {post.text || '(video post)'}
                </p>
                <div style={{ display: 'flex', gap: 8, fontSize: 12 }}>
                  {post.videoUrl && <span className="badge badge-user">Video</span>}
                  <span className="muted">{timeAgo(post.createdAt)}</span>
                </div>
              </div>
              <button
                className="danger-btn"
                style={{ padding: '6px 10px', fontSize: 13, flexShrink: 0 }}
                onClick={async () => {
                  try {
                    await removePost(post);
                  } catch (e) {
                    setError(e.message);
                  }
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Comments */}
      {tab === 'comments' && (
        <div className="admin-block">
          <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
            {comments.length} comment{comments.length !== 1 ? 's' : ''} total
          </p>
          {comments.length === 0 ? <p className="muted">No comments found.</p> : null}
          {comments.map((comment) => (
            <div key={`${comment.postId}-${comment.id}`} className="admin-row">
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="admin-title" style={{ margin: '0 0 2px' }}>
                  {comment.displayName || comment.userId || 'Unknown user'}
                </p>
                <p className="muted" style={{ margin: '0 0 4px', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {comment.text || '(empty)'}
                </p>
                <span className="muted" style={{ fontSize: 12 }}>{timeAgo(comment.createdAt)}</span>
              </div>
              <button
                className="danger-btn"
                style={{ padding: '6px 10px', fontSize: 13, flexShrink: 0 }}
                onClick={async () => {
                  try {
                    await removeComment(comment);
                  } catch (e) {
                    setError(e.message);
                  }
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Audit Log */}
      {tab === 'audit' && (
        <div className="admin-block">
          <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>Last 100 admin actions</p>
          {auditLogs.length === 0 ? <p className="muted">No actions logged yet.</p> : null}
          {auditLogs.map((log) => (
            <div key={log.id} className="admin-log-row admin-log-row-full">
              <span className="admin-log-action">{log.action}</span>
              <span className="admin-log-detail">{log.detail}</span>
              <span className="muted" style={{ fontSize: 12 }}>{log.adminEmail}</span>
              <span className="admin-log-time muted">{timeAgo(log.timestamp)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminPanel;
