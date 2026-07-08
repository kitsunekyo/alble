import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/client/lib/api";
import type { CreateJournalEntryInput, UpdateJournalEntryInput } from "@/shared/schemas";

const KEYS = {
  all: ["journal"] as const,
};

export function useJournalEntries(days?: number, offset?: number) {
  return useQuery({
    queryKey: [...KEYS.all, { days, offset }],
    queryFn: () => api.journal.list({ days, offset }),
  });
}

function useInvalidateAll() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["journal"] });
  };
}

export function useAddJournalEntry() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (input: CreateJournalEntryInput) => api.journal.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdateJournalEntry() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (vars: { id: number; input: UpdateJournalEntryInput }) =>
      api.journal.update(vars.id, vars.input),
    onSuccess: invalidate,
  });
}

export function useRecentTags() {
  return useQuery({
    queryKey: [...KEYS.all, "tags"],
    queryFn: () => api.journal.tags(),
    staleTime: 30_000,
  });
}

export function useDeleteJournalEntry() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (id: number) => api.journal.delete(id),
    onSuccess: invalidate,
  });
}
