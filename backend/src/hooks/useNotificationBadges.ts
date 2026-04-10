import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import type { NotificationCategory } from "@/types";
import { useLocation } from "react-router-dom";

// Map sidebar routes to notification categories
const ROUTE_CATEGORY_MAP: Record<string, NotificationCategory> = {
  "/tasks": "task",
  "/payslip": "payslip",
  "/notes": "announcement",
  "/messages": "message",
  "/finance": "finance",
  "/explorer": "explorer",
  "/partner": "partner",
  "/approval": "approval",
  "/attendance": "attendance",
  "/team": "team",
};

export function useNotificationBadges() {
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({});
  const location = useLocation();

  const fetchBadges = useCallback(async () => {
    if (!api.getToken()) return;
    try {
      const counts = await api.getNotificationBadgeCounts();
      setBadgeCounts(counts);
    } catch {
      // silently fail
    }
  }, []);

  // Poll on mount and every 30 seconds
  useEffect(() => {
    fetchBadges();
    const interval = setInterval(fetchBadges, 30000);
    
    const handleFocus = () => fetchBadges();
    window.addEventListener("focus", handleFocus);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchBadges]);

  // Mark category as read when navigating to a route
  useEffect(() => {
    const category = ROUTE_CATEGORY_MAP[location.pathname];
    if (category && badgeCounts[category] && badgeCounts[category] > 0) {
      api.markNotificationCategoryRead(category).then(() => {
        setBadgeCounts(prev => ({ ...prev, [category]: 0 }));
      }).catch(() => {});
    }
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const getBadgeForRoute = (url: string): number => {
    const category = ROUTE_CATEGORY_MAP[url];
    if (!category) return 0;
    return badgeCounts[category] || 0;
  };

  return { badgeCounts, getBadgeForRoute, refetch: fetchBadges };
}
