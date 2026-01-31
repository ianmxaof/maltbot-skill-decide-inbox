"use client";

import { useState, useEffect, useCallback } from "react";
import type { Project } from "@/types/project";

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (data.projects) setProjects(data.projects);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { projects, loading, refetch };
}
