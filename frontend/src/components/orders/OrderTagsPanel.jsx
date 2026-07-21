import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { X } from "lucide-react";
import { fetchOrderTags, tagOrder, untagOrder } from "../../services/orderService";

export default function OrderTagsPanel({ orderId, tags = [], readOnly }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");

  const { data: allTags = [] } = useQuery({ queryKey: ["order-tags"], queryFn: fetchOrderTags });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["order", orderId] });
    qc.invalidateQueries({ queryKey: ["order-timeline", orderId] });
    qc.invalidateQueries({ queryKey: ["order-tags"] });
  };

  const tagMutation = useMutation({
    mutationFn: tagOrder,
    onSuccess: () => { setName(""); invalidate(); },
    onError: (e) => toast.error(e.response?.data?.message || "Failed to add tag"),
  });

  const untagMutation = useMutation({
    mutationFn: untagOrder,
    onSuccess: invalidate,
    onError: () => toast.error("Failed to remove tag"),
  });

  const attachedIds = new Set(tags.map((t) => t.id));
  const suggestions = allTags.filter((t) => !attachedIds.has(t.id));

  return (
    <div className="bg-white p-6 rounded-xl shadow dark:bg-slate-900 dark:shadow-none dark:border dark:border-slate-800">
      <h3 className="text-lg font-semibold mb-3 dark:text-slate-100">Tags</h3>
      <div className="flex flex-wrap gap-2 mb-3">
        {tags.length === 0 && <p className="text-sm text-slate-400">No tags yet.</p>}
        {tags.map((t) => (
          <span
            key={t.id}
            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold"
            style={{ borderColor: `${t.color}55`, backgroundColor: `${t.color}15`, color: t.color }}
          >
            {t.name}
            {!readOnly && (
              <button onClick={() => untagMutation.mutate({ id: orderId, tagId: t.id })}>
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
      </div>
      {!readOnly && (
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) tagMutation.mutate({ id: orderId, name: name.trim() }); }}
            list="order-tag-suggestions"
            placeholder="Add or create a tag..."
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <datalist id="order-tag-suggestions">
            {suggestions.map((t) => <option key={t.id} value={t.name} />)}
          </datalist>
          <button
            disabled={!name.trim() || tagMutation.isPending}
            onClick={() => tagMutation.mutate({ id: orderId, name: name.trim() })}
            className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}
