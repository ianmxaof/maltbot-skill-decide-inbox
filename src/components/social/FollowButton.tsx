"use client";

import { useState, useCallback } from "react";

interface FollowButtonProps {
  followerId: string;
  followingId: string;
  initialFollowing?: boolean;
  onChanged?: (isFollowing: boolean) => void;
}

export function FollowButton({ followerId, followingId, initialFollowing = false, onChanged }: FollowButtonProps) {
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  const toggle = useCallback(async () => {
    setLoading(true);
    try {
      const method = following ? "DELETE" : "POST";
      const res = await fetch("/api/social/follow", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followerId, followingId }),
      });
      if (res.ok) {
        const next = !following;
        setFollowing(next);
        onChanged?.(next);
      }
    } catch {
      // Silently fail — network error
    } finally {
      setLoading(false);
    }
  }, [following, followerId, followingId, onChanged]);

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
        following
          ? "border border-violet-500/40 bg-transparent text-violet-300 hover:bg-violet-500/10"
          : "bg-violet-600 text-white hover:bg-violet-500"
      } ${loading ? "opacity-50 cursor-wait" : "cursor-pointer"}`}
    >
      {loading ? "..." : following ? "Following" : "Follow"}
    </button>
  );
}
