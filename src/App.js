import React, { useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import {
  addDoc,
  collection,
  serverTimestamp,
  doc,
  setDoc,
  getDoc,
} from 'firebase/firestore';
import { auth, db, storage, isFirebaseConfigured } from './firebase';
import Feed from './Feed';
import Profile from './Profile';
import Explore from './Explore';
import Messages from './Messages';
import AdminPanel from './AdminPanel';
import PolicyPage from './PolicyPage';
import { useWelcomeNotification } from './welcomeNotification';
import './index.css';

function getAuthErrorMessage(errorCode) {
  switch (errorCode) {
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/user-not-found':
    case 'auth/invalid-credential':
      return 'Account not found or password is incorrect.';
    case 'auth/wrong-password':
      return 'Password is incorrect.';
    case 'auth/email-already-in-use':
      return 'That email is already in use. Try logging in.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait and try again.';
    default:
      return 'Authentication failed. Please try again.';
  }
}

function getStorageErrorMessage(errorCode) {
  switch (errorCode) {
    case 'storage/unauthorized':
      return 'Video upload blocked by Firebase Storage rules. Please contact admin.';
    case 'storage/canceled':
      return 'Video upload was canceled.';
    case 'storage/retry-limit-exceeded':
      return 'Upload timed out. Try a smaller video or better network.';
    case 'storage/invalid-checksum':
      return 'Upload failed integrity check. Please retry.';
    case 'storage/quota-exceeded':
      return 'Storage quota exceeded. Please contact admin.';
    default:
      return 'Failed to upload video. Please try again.';
  }
}

const POLICY_VERSION = '2026-04-14';

function calculateAge(dateString) {
  if (!dateString) return NaN;
  const birth = new Date(dateString);
  if (Number.isNaN(birth.getTime())) return NaN;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

function getMaxBirthDateFor16() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 16);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function App() {
  useWelcomeNotification();
  const bootstrapAdminEmail = 'johnjeannis@gmail.com';
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const [policyDialog, setPolicyDialog] = useState('');
  const [authError, setAuthError] = useState('');
  const [currentPage, setCurrentPage] = useState('feed');
  const [userRole, setUserRole] = useState('user');
  const [currentUserPhoto, setCurrentUserPhoto] = useState('');
  const [input, setInput] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [postError, setPostError] = useState('');
  const [suspendedMsg, setSuspendedMsg] = useState('');
  const isDemoMode = !isFirebaseConfigured;
  const isAdminUser =
    (user?.email || '').toLowerCase() === bootstrapAdminEmail || userRole === 'admin';
  const policyRoute = window.location.pathname === '/terms' || window.location.pathname === '/privacy';
  const policyType = window.location.pathname === '/terms' ? 'terms' : 'privacy';

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser && !isDemoMode) {
        const profileRef = doc(db, 'userProfiles', currentUser.uid);
        const profileSnap = await getDoc(profileRef);
        if (!profileSnap.exists()) {
          await setDoc(profileRef, {
            displayName: 'User',
            bio: '',
            photoURL: '',
            email: currentUser.email,
            followers: 0,
            following: 0,
            role: 'user',
            createdAt: serverTimestamp(),
          });
          setUserRole('user');
          setCurrentUserPhoto('');
        } else {
          const profileData = profileSnap.data();
          if (profileData.suspended === true) {
            setSuspendedMsg('Your account has been suspended. Contact johnjeannis@gmail.com.');
            await signOut(auth);
            setAuthLoading(false);
            return;
          }
          setUserRole(profileData.role || 'user');
          setCurrentUserPhoto(profileData.photoURL || '');
        }
      } else {
        setUserRole('user');
        setCurrentUserPhoto('');
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [isDemoMode]);

  const handleAuth = async () => {
    if (!auth) return;

    if (!email.trim() || !password.trim()) {
      setAuthError('Email and password are required.');
      return;
    }

    if (authMode === 'signup' && password.length < 6) {
      setAuthError('Password should be at least 6 characters.');
      return;
    }

    if (authMode === 'signup') {
      const age = calculateAge(birthDate);
      if (!birthDate || Number.isNaN(age)) {
        setAuthError('Enter your date of birth to continue.');
        return;
      }
      if (age < 16) {
        setAuthError('You must be at least 16 years old to create an account.');
        return;
      }
      if (!acceptedPolicies) {
        setAuthError('You must accept the Terms and Privacy Policy.');
        return;
      }
    }

    setAuthError('');

    try {
      if (authMode === 'signup') {
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await setDoc(
          doc(db, 'userProfiles', credential.user.uid),
          {
            birthDate,
            ageVerified16Plus: true,
            acceptedPolicies: true,
            acceptedPolicyVersion: POLICY_VERSION,
            acceptedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }

      setEmail('');
      setPassword('');
      setBirthDate('');
      setAcceptedPolicies(false);
      setCurrentPage('feed');
    } catch (error) {
      setAuthError(getAuthErrorMessage(error.code));
    }
  };

  const addPost = async () => {
    if (!user || !db) {
      setPostError('You must be signed in to post.');
      return;
    }

    if (!input.trim() && !videoFile) {
      setPostError('Write something or upload a video.');
      return;
    }

    if (videoFile) {
      if (!videoFile.type.startsWith('video/')) {
        setPostError('Only video files are allowed.');
        return;
      }
      const maxBytes = 100 * 1024 * 1024;
      if (videoFile.size > maxBytes) {
        setPostError('Video is too large. Maximum size is 100MB.');
        return;
      }
    }

    setPostError('');
    setUploading(true);
    setUploadProgress(0);

    try {
      let videoUrl = null;

      if (videoFile) {
        const videoRef = ref(
          storage,
          `videos/${user.uid}/${Date.now()}_${videoFile.name}`
        );

        await new Promise((resolve, reject) => {
          const task = uploadBytesResumable(videoRef, videoFile);
          task.on(
            'state_changed',
            (snapshot) => {
              const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
              setUploadProgress(pct);
            },
            (error) => reject(error),
            () => resolve()
          );
        });

        videoUrl = await getDownloadURL(videoRef);
      }

      await addDoc(collection(db, 'users', user.uid, 'posts'), {
        text: input.trim(),
        videoUrl,
        likes: 0,
        commentsCount: 0,
        createdAt: serverTimestamp(),
      });

      setInput('');
      setVideoFile(null);
      setUploadProgress(0);
    } catch (error) {
      setPostError(getStorageErrorMessage(error?.code));
    } finally {
      setUploading(false);
    }
  };

  if (policyRoute) {
    return <PolicyPage type={policyType} />;
  }

  if (!isFirebaseConfigured) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="auth-logo-row">
            <img src="/felcin-logo-7-heartbeat.svg" alt="Felcin" className="auth-logo-icon" />
            <span className="auth-logo-name">Felcin</span>
          </div>
          <p className="auth-tagline">Fast, simple way to share and connect.</p>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '16px' }}>
            <p style={{ fontWeight: 700, marginBottom: 6 }}>Demo mode</p>
            <p className="muted" style={{ fontSize: 14 }}>Firebase is not configured. Add your REACT_APP_FIREBASE_* keys in .env.local.</p>
          </div>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="auth-logo-row">
            <img src="/felcin-logo-7-heartbeat.svg" alt="Felcin" className="auth-logo-icon" />
            <span className="auth-logo-name">Felcin</span>
          </div>
          <p className="loading-text">Checking session\u2026</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="auth-logo-row">
            <img src="/felcin-logo-7-heartbeat.svg" alt="Felcin" className="auth-logo-icon" />
            <span className="auth-logo-name">Felcin</span>
          </div>
          <p className="auth-tagline">Fast, simple way to share and connect.</p>

          <h2 className="auth-form-title">
            {authMode === 'signup' ? 'Create your account' : 'Welcome back'}
          </h2>

          <div className="field-group">
            <div className="field-wrap">
              <label className="field-label">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                type="email"
                autoComplete="email"
                className="input"
              />
            </div>
            <div className="field-wrap">
              <label className="field-label">Password</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="\u00b7\u00b7\u00b7\u00b7\u00b7\u00b7\u00b7\u00b7"
                type="password"
                autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                className="input"
              />
            </div>
            {authMode === 'signup' ? (
              <div className="field-wrap">
                <label className="field-label">Date of birth (must be 16+)</label>
                <input
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  type="date"
                  max={getMaxBirthDateFor16()}
                  className="input"
                />
              </div>
            ) : null}
          </div>

          {authMode === 'signup' ? (
            <div className="policy-consent-box">
              <label className="policy-checkbox-row">
                <input
                  type="checkbox"
                  checked={acceptedPolicies}
                  onChange={(e) => setAcceptedPolicies(e.target.checked)}
                />
                <span>
                  I confirm I am at least 16 and agree to the
                  <button className="policy-link-btn" type="button" onClick={() => setPolicyDialog('terms')}>Terms</button>
                  and
                  <button className="policy-link-btn" type="button" onClick={() => setPolicyDialog('privacy')}>Privacy Policy</button>.
                </span>
              </label>
            </div>
          ) : null}

          <button className="primary-btn full-btn" onClick={handleAuth}>
            {authMode === 'signup' ? 'Create account' : 'Sign in'}
          </button>

          {authError ? <p className="error-text">{authError}</p> : null}
          {suspendedMsg ? <p className="error-text">{suspendedMsg}</p> : null}

          <div className="auth-switch-row">
            {authMode === 'signup' ? 'Already have an account?' : "Don't have an account?"}
            <button onClick={() => {
              setAuthError('');
              setBirthDate('');
              setAcceptedPolicies(false);
              setAuthMode(authMode === 'signup' ? 'login' : 'signup');
            }}>
              {authMode === 'signup' ? 'Sign in' : 'Sign up'}
            </button>
          </div>

          <div className="policy-inline-links">
            <a href="/terms">Terms</a>
            <span>•</span>
            <a href="/privacy">Privacy</a>
          </div>

          {policyDialog ? (
            <div className="policy-modal-overlay">
              <div className="policy-modal-box">
                <h3>{policyDialog === 'terms' ? 'Terms of Use' : 'Privacy Policy'}</h3>
                <div className="policy-modal-content">
                  {policyDialog === 'terms' ? (
                    <>
                      <p>You must be at least 16 years old to use Felcin.</p>
                      <p>You are responsible for content you post and must not upload illegal, abusive, or infringing material.</p>
                      <p>We may remove content or suspend accounts that violate safety or platform rules.</p>
                      <p>By creating an account, you agree to these terms and our privacy policy.</p>
                    </>
                  ) : (
                    <>
                      <p>We collect account data such as email, profile fields, and content you upload to provide the service.</p>
                      <p>We use Firebase services for authentication, database, and storage operations.</p>
                      <p>Admin actions and moderation logs may be stored for security and abuse prevention.</p>
                      <p>You can request profile updates or account removal by contacting platform support.</p>
                    </>
                  )}
                  <p className="muted">Policy version: {POLICY_VERSION}</p>
                </div>
                <div className="button-row" style={{ justifyContent: 'flex-end' }}>
                  <button className="primary-btn" type="button" onClick={() => setPolicyDialog('')}>Close</button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="main-container">
      <div className="sidebar">
        <div className="sidebar-brand">
          <img src="/felcin-logo-7-heartbeat.svg" alt="Felcin" className="sidebar-logo-icon" />
          <span className="sidebar-logo-name">Felcin</span>
        </div>

        <nav className="nav-menu">
          {[
            { id: 'feed',    icon: '\ud83c\udfe0', label: 'Feed' },
            { id: 'profile', icon: '\ud83d\udc64', label: 'Profile' },
            { id: 'explore', icon: '\ud83d\udd0d', label: 'Explore' },
            { id: 'messages', icon: '\ud83d\udcac', label: 'Messages' },
            ...(isAdminUser ? [{ id: 'admin', icon: '\ud83d\udee0', label: 'Admin' }] : []),
          ].map(({ id, icon, label }) => (
            <button
              key={id}
              className={`nav-btn${currentPage === id ? ' active' : ''}`}
              onClick={() => setCurrentPage(id)}
            >
              <span className="nav-icon">{icon}</span>
              <span className="nav-label">{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user-row">
            <div className="avatar avatar-sm">
              {currentUserPhoto ? (
                <img className="avatar-img" src={currentUserPhoto} alt="Profile" />
              ) : (
                (user.email?.[0] || 'U').toUpperCase()
              )}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user.email}</div>
              {isAdminUser && <div className="sidebar-user-role">Administrator</div>}
            </div>
          </div>
          <div className="policy-inline-links policy-inline-links-left">
            <a href="/terms">Terms</a>
            <span>•</span>
            <a href="/privacy">Privacy</a>
          </div>
          <button className="secondary-btn full-btn" onClick={() => signOut(auth)}>Sign out</button>
        </div>
      </div>

      <div className="content">
        {currentPage !== 'admin' && currentPage !== 'messages' && (
          <div className="composer-card">
            <div className="composer-inner">
              <div className="avatar avatar-sm">
                {currentUserPhoto ? (
                  <img className="avatar-img" src={currentUserPhoto} alt="Profile" />
                ) : (
                  (user.email?.[0] || 'U').toUpperCase()
                )}
              </div>
              <div className="composer-right">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="What's on your mind?"
                  className="input"
                />
                <div className="composer-toolbar">
                  <div className="composer-toolbar-left">
                    <label className="tool-btn">
                      \ud83d\udcf9 Video
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                        style={{ display: 'none' }}
                      />
                    </label>
                    {videoFile && <span className="chip">\ud83d\udcce {videoFile.name}</span>}
                  </div>
                  <button className="primary-btn pill-btn" onClick={addPost} disabled={uploading}>
                    {uploading ? (videoFile ? `Uploading ${uploadProgress}%` : 'Posting\u2026') : 'Post'}
                  </button>
                </div>
                {postError ? <p className="error-text">{postError}</p> : null}
              </div>
            </div>
          </div>
        )}

        {currentPage === 'feed'    && <Feed />}
        {currentPage === 'profile' && <Profile userId={user.uid} />}
        {currentPage === 'explore' && <Explore />}
        {currentPage === 'messages' && <Messages currentUser={user} />}
        {currentPage === 'admin' && isAdminUser && <AdminPanel />}
      </div>
    </div>
  );
}

export default App;
