import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/client/lib/api";
import type { SaveAnalysisInput } from "@/shared/analysis";

const KEYS = {
  all: ["analyses"] as const,
};

export function useAnalyses() {
  return useQuery({ queryKey: KEYS.all, queryFn: api.listAnalyses });
}

export function useSaveAnalysis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveAnalysisInput) => api.saveAnalysis(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useDeleteAnalysis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteAnalysis(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}
