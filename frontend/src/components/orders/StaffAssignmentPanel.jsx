import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { UserCog } from "lucide-react";
import { assignOrder, fetchStaffList } from "../../services/orderService";

export default function StaffAssignmentPanel({ orderId, assignedTo, readOnly }) {
  const qc = useQueryClient();
  const { data: staff = [] } = useQuery({ queryKey: ["order-staff"], queryFn: fetchStaffList });

  const assignMutation = useMutation({
    mutationFn: assignOrder,
    onSuccess: () => {
      toast.success("Assignment updated");
      qc.invalidateQueries({ queryKey: ["order", orderId] });
      qc.invalidateQueries({ queryKey: ["order-timeline", orderId] });
    },
    onError: () => toast.error("Failed to update assignment"),
  });

  return (
    <div className="bg-white p-6 rounded-xl shadow dark:bg-slate-900 dark:shadow-none dark:border dark:border-slate-800">
      <h3 className="flex items-center gap-2 text-lg font-semibold mb-3 dark:text-slate-100">
        <UserCog className="h-4 w-4 text-violet-600" /> Assigned Staff
      </h3>
      <select
        value={assignedTo || ""}
        onChange={(e) => assignMutation.mutate({ id: orderId, assignedTo: e.target.value ? Number(e.target.value) : null })}
        disabled={assignMutation.isPending || readOnly}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
      >
        <option value="">Unassigned</option>
        {staff.map((s) => (
          <option key={s.id} value={s.id}>{s.name || s.email}</option>
        ))}
      </select>
    </div>
  );
}
