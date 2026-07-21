import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Pin, Trash2 } from "lucide-react";
import { addOrderNote, deleteOrderNote, fetchOrderNotes } from "../../services/orderService";

export default function OrderNotesPanel({ orderId, readOnly }) {
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [pinned, setPinned] = useState(false);

  const { data: notes = [] } = useQuery({
    queryKey: ["order-notes", orderId],
    queryFn: () => fetchOrderNotes(orderId),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["order-notes", orderId] });
    qc.invalidateQueries({ queryKey: ["order-timeline", orderId] });
  };

  const addMutation = useMutation({
    mutationFn: addOrderNote,
    onSuccess: () => { setNote(""); setPinned(false); invalidate(); },
    onError: () => toast.error("Failed to add note"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteOrderNote,
    onSuccess: invalidate,
    onError: () => toast.error("Failed to delete note"),
  });

  return (
    <div className="bg-white p-6 rounded-xl shadow dark:bg-slate-900 dark:shadow-none dark:border dark:border-slate-800">
      <h3 className="text-lg font-semibold mb-3 dark:text-slate-100">Notes</h3>
      {!readOnly && (
        <div className="space-y-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add an internal note about this order..."
            rows={2}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="accent-violet-600" />
              Pin note
            </label>
            <button
              disabled={!note.trim() || addMutation.isPending}
              onClick={() => addMutation.mutate({ id: orderId, note, isPinned: pinned })}
              className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {addMutation.isPending ? "Adding..." : "Add Note"}
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 space-y-3 max-h-72 overflow-y-auto pr-1">
        {notes.length === 0 && <p className="text-sm text-slate-400">No notes yet.</p>}
        {notes.map((n) => (
          <div key={n.id} className="rounded-lg border border-slate-100 dark:border-slate-800 p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{n.note}</p>
              <div className="flex shrink-0 items-center gap-1.5">
                {!!n.is_pinned && <Pin className="h-3.5 w-3.5 text-amber-500" />}
                {!readOnly && (
                  <button onClick={() => deleteMutation.mutate({ id: orderId, noteId: n.id })} className="text-slate-300 hover:text-rose-600 dark:text-slate-600 dark:hover:text-rose-400">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
              {n.created_by_name || "Admin"} · {new Date(n.created_at).toLocaleString("en-IN")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
