import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, auth } from './firebase';

function formatTime(ts) {
  if (!ts?.toMillis) return '';
  const diff = Date.now() - ts.toMillis();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return new Date(ts.toMillis()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function Feed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState([]);

  useEffect(() => {
    const loadFollowingAndPosts = async () => {
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }

      try {
        const followingRef = collection(db, 'users', auth.currentUser.uid, 'following');
        const followingSnap = await getDocs(followingRef);
        const followingList = followingSnap.docs.map((d) => d.id);
        setFollowing(followingList);

        if (followingList.length === 0) {
          setPosts([]);
          setLoading(false);
          return;
        }

        const allPosts = [];
        for (const userId of followingList) {
          const [postsSnap, userSnap] = await Promise.all([
            getDocs(collection(db, 'users', userId, 'posts')),
            getDoc(doc(db, 'userProfiles', userId)),
          ]);
          const user = userSnap.data() || {};
          for (const postDoc of postsSnap.docs) {
            allPosts.push({ id: postDoc.id, userId, ...postDoc.data(), user });
          }
        }

        allPosts.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        setPosts(allPosts);
        setLoading(false);
      } catch (error) {
        console.error('Error loading feed:', error);
        setLoading(false);
      }
    };

    loadFollowingAndPosts();
  }, []);

  if (loading) {
    return <p className="loading-text">Loading feed...</p>;
  }

  if (following.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">👥</div>
        <p className="empty-title">Your feed is empty</p>
        <p className="empty-desc">Go to Explore and follow people to see their posts here.</p>
      </div>
    );
  }

  return (
    <div className="feed">
      {posts.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">✍️</div>
          <p className="empty-title">No posts yet</p>
          <p className="empty-desc">People you follow haven't posted anything yet.</p>
        </div>
      )}
      {posts.map((post) => {
        const initial = (post.user?.displayName || '?')[0].toUpperCase();
        return (
          <div key={`${post.userId}-${post.id}`} className="post-card">
            <div className="post-avatar-col">
              <div className="avatar avatar-sm">
                {post.user?.photoURL ? (
                  <img className="avatar-img" src={post.user.photoURL} alt="Profile" />
                ) : (
                  initial
                )}
              </div>
            </div>
            <div>
              <div className="post-meta">
                <span className="post-author">{post.user?.displayName || 'Unknown'}</span>
                <span className="post-dot">·</span>
                <span className="post-time">{formatTime(post.createdAt)}</span>
              </div>
              {post.text && <p className="post-text">{post.text}</p>}
              {post.videoUrl && (
                <video className="post-video" src={post.videoUrl} controls />
              )}
              <div className="post-actions">
                <button className="action-btn">❤️ {post.likes || 0}</button>
                <button className="action-btn">💬 {post.commentsCount || 0}</button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default Feed;
