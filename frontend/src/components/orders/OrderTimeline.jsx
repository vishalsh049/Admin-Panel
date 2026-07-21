import { useQuery } from "@tanstack/react-query";
import {
  Ban, ClipboardList, Copy, CreditCard, Mail, MessageSquare, PauseCircle, Receipt,
  Tag, Truck, UserPlus,
} from "lucide-react";
import { fetchOrderTimeline } from "../../services/orderService";

const ICONS = {
  status: ClipboardList,
  note: MessageSquare,
  tag: Tag,
  assignment: UserPlus,
  hold: PauseCircle,
  duplicate: Copy,
  request: Receipt,
  request_decision: Receipt,
  refund: CreditCard,
  email: Mail,
  whatsapp: Mail,
  shipping: Truck,
  cancel: Ban,
};

export default function OrderTimeline({ orderId }) {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["order-timeline", orderId],
    queryFn: () => fetchOrderTimeline(orderId),
  });

  return (
    <div className="bg-white p-6 rounded-xl shadow dark:bg-slate-900 dark:shadow-none dark:border dark:border-slate-800">
      <h3 className="text-lg font-semibold mb-4 dark:text-slate-100">Activity Timeline</h3>
      {isLoading ? (
        <p className="text-sm text-slate-400">Loading timeline...</p>
      ) : events.length === 0 ? (
        <p className="text-sm text-slate-400">No activity yet.</p>
      ) : (
        <ol className="relative border-l border-slate-200 dark:border-slate-700 ml-2 space-y-5 max-h-[520px] overflow-y-auto pr-1">
          {[...events].reverse().map((e, i) => {
            const Icon = ICONS[e.type] || ClipboardList;
            return (
              <li key={i} className="ml-4">
                <span className="absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 ring-4 ring-white dark:ring-slate-900">
                  <Icon className="h-2.5 w-2.5 text-white" />
                </span>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{e.title}</p>
                {e.description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{e.description}</p>}
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  {new Date(e.createdAt).toLocaleString("en-IN")}
                  {e.actor ? ` · ${e.actor}` : ""}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
