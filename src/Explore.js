import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import { logError } from './logError';

function Explore() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(new Set());

  useEffect(() => {
    const loadUsers = async () => {
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }

      try {
        const [profilesSnap, followingSnap] = await Promise.all([
          getDocs(collection(db, 'userProfiles')),
          getDocs(collection(db, 'users', auth.currentUser.uid, 'following')),
        ]);

        const allUsers = profilesSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((u) => u.id !== auth.currentUser.uid);

        setFollowing(new Set(followingSnap.docs.map((d) => d.id)));
        setUsers(allUsers);
        setLoading(false);
      } catch (error) {
        logError('Explore.loadUsers', error);
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  const toggleFollow = async (userId) => {
    try {
      const currentUserId = auth.currentUser.uid;
      if (following.has(userId)) {
        // Unfollow
        await deleteDoc(doc(db, 'users', currentUserId, 'following', userId));
        await deleteDoc(doc(db, 'users', userId, 'followers', currentUserId));
        setFollowing((prev) => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      } else {
        // Follow
        await setDoc(doc(db, 'users', currentUserId, 'following', userId), {
          followedAt: new Date(),
        });
        await setDoc(doc(db, 'users', userId, 'followers', currentUserId), {
          followedAt: new Date(),
        });
        setFollowing((prev) => new Set(prev).add(userId));
      }
    } catch (error) {
      logError('Explore.toggleFollow', error);
    }
  };

  if (loading) {
    return <p className="loading-text">Loading people…</p>;
  }

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Discover People</h2>
        <p className="page-subtitle">Find and follow people on Felcin</p>
      </div>

      {users.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <p className="empty-title">No one to discover yet</p>
          <p className="empty-desc">Be the first to invite your friends!</p>
        </div>
      ) : (
        <div className="explore-list">
          {users.map((user) => (
            <div key={user.id} className="explore-user-row">
              <div className="avatar avatar-md">
                {user.photoURL ? (
                  <img className="avatar-img" src={user.photoURL} alt="Profile" />
                ) : (
                  (user.displayName || 'U')[0].toUpperCase()
                )}
              </div>
              <div className="explore-user-info">
                <div className="explore-user-name">{user.displayName || 'User'}</div>
                <div className="explore-user-bio">{user.bio || 'No bio yet'}</div>
                <div className="explore-follow-stat">{user.followers || 0} followers</div>
              </div>
              <button
                className={`${following.has(user.id) ? 'secondary-btn' : 'primary-btn'} pill-btn`}
                onClick={() => toggleFollow(user.id)}
              >
                {following.has(user.id) ? 'Following' : 'Follow'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Explore;
