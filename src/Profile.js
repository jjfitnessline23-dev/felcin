import React, { useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from './firebase';

function Profile({ userId }) {
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [bio, setBio] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      if (!userId || !auth.currentUser) {
        setLoading(false);
        return;
      }

      try {
        const isOwn = userId === auth.currentUser.uid;
        setIsOwnProfile(isOwn);

        const profileDoc = await getDoc(doc(db, 'userProfiles', userId));
        if (profileDoc.exists()) {
          const profileData = profileDoc.data();
          setProfile(profileData);
          setDisplayName(profileData.displayName || '');
          setBio(profileData.bio || '');
        }

        const postsSnap = await getDocs(collection(db, 'users', userId, 'posts'));
        const userPosts = postsSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        userPosts.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        setPosts(userPosts);

        if (!isOwn) {
          const followDoc = await getDoc(doc(db, 'users', auth.currentUser.uid, 'following', userId));
          setIsFollowing(followDoc.exists());
        }

        setLoading(false);
      } catch (error) {
        console.error('Error loading profile:', error);
        setLoading(false);
      }
    };

    loadProfile();
  }, [userId]);

  const toggleFollow = async () => {
    try {
      const currentUserId = auth.currentUser.uid;
      if (isFollowing) {
        await deleteDoc(doc(db, 'users', currentUserId, 'following', userId));
        await deleteDoc(doc(db, 'users', userId, 'followers', currentUserId));
      } else {
        await setDoc(doc(db, 'users', currentUserId, 'following', userId), {
          followedAt: new Date(),
        });
        await setDoc(doc(db, 'users', userId, 'followers', currentUserId), {
          followedAt: new Date(),
        });
      }
      setIsFollowing(!isFollowing);
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  const saveBio = async () => {
    try {
      await setDoc(
        doc(db, 'userProfiles', auth.currentUser.uid),
        {
          displayName,
          bio,
          email: auth.currentUser.email,
        },
        { merge: true }
      );
      setProfile((prev) => ({ ...prev, displayName, bio }));
      setEditingBio(false);
    } catch (error) {
      console.error('Error saving bio:', error);
    }
  };

  const uploadProfilePhoto = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please choose an image file.');
      return;
    }

    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      setPhotoError('Image is too large. Maximum size is 5MB.');
      return;
    }

    setPhotoError('');
    setPhotoUploading(true);
    try {
      const photoRef = ref(storage, `profilePictures/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
      await new Promise((resolve, reject) => {
        const task = uploadBytesResumable(photoRef, file);
        task.on('state_changed', null, (error) => reject(error), () => resolve());
      });
      const photoURL = await getDownloadURL(photoRef);
      await setDoc(doc(db, 'userProfiles', auth.currentUser.uid), { photoURL }, { merge: true });
      setProfile((prev) => ({ ...prev, photoURL }));
    } catch (error) {
      setPhotoError('Failed to upload profile picture.');
    } finally {
      setPhotoUploading(false);
    }
  };

  if (loading) {
    return <p className="loading-text">Loading profile...</p>;
  }

  const initial = (profile?.displayName || 'U')[0].toUpperCase();

  return (
    <div>
      <div className="profile-container">
        <div className="profile-cover" />
        <div className="profile-body">
          <div className="profile-top-row">
            <div className="profile-avatar-wrap">
              <div className="avatar avatar-xl">
                {profile?.photoURL ? (
                  <img className="avatar-img" src={profile.photoURL} alt="Profile" />
                ) : (
                  initial
                )}
              </div>
              {isOwnProfile ? (
                <label className="avatar-upload-btn">
                  {photoUploading ? 'Uploading...' : 'Change photo'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => uploadProfilePhoto(e.target.files?.[0] || null)}
                    style={{ display: 'none' }}
                    disabled={photoUploading}
                  />
                </label>
              ) : null}
            </div>
            {isOwnProfile ? (
              <button className="secondary-btn pill-btn" onClick={() => setEditingBio(!editingBio)}>
                {editingBio ? 'Cancel' : 'Edit Profile'}
              </button>
            ) : (
              <button className={`${isFollowing ? 'secondary-btn' : 'primary-btn'} pill-btn`} onClick={toggleFollow}>
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
          </div>

          <h2 className="profile-name">{profile?.displayName || 'User'}</h2>
          <p className="profile-handle">{profile?.email || auth.currentUser?.email}</p>
          {profile?.bio && <p className="profile-bio-text">{profile.bio}</p>}
          {photoError ? <p className="error-text">{photoError}</p> : null}

          <div className="profile-stats-row">
            <div className="profile-stat">
              <span className="profile-stat-value">{posts.length}</span>
              <span className="profile-stat-label">Posts</span>
            </div>
            <div className="profile-stat">
              <span className="profile-stat-value">{profile?.followers || 0}</span>
              <span className="profile-stat-label">Followers</span>
            </div>
            <div className="profile-stat">
              <span className="profile-stat-value">{profile?.following || 0}</span>
              <span className="profile-stat-label">Following</span>
            </div>
          </div>
        </div>
      </div>

      {editingBio && isOwnProfile && (
        <div className="edit-profile-box">
          <input
            type="text"
            placeholder="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="input"
          />
          <textarea
            placeholder="Bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="input"
            style={{ minHeight: '72px' }}
          />
          <button className="primary-btn" style={{ alignSelf: 'flex-start' }} onClick={saveBio}>
            Save changes
          </button>
        </div>
      )}

      <p className="profile-posts-title">Posts</p>
      <div className="posts-list">
        {posts.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">No posts</div>
            <p className="empty-title">No posts yet</p>
          </div>
        )}
        {posts.map((post) => (
          <div key={post.id} className="post-card">
            <div className="post-avatar-col">
              <div className="avatar avatar-sm">
                {profile?.photoURL ? (
                  <img className="avatar-img" src={profile.photoURL} alt="Profile" />
                ) : (
                  initial
                )}
              </div>
            </div>
            <div>
              <div className="post-meta">
                <span className="post-author">{profile?.displayName || 'User'}</span>
              </div>
              {post.videoUrl && <video className="post-video" src={post.videoUrl} controls />}
              {post.text && <p className="post-text">{post.text}</p>}
              <div className="post-actions">
                <button className="action-btn">Like {post.likes || 0}</button>
                <button className="action-btn">Comments {post.commentsCount || 0}</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Profile;
