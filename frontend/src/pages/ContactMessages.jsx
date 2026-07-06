import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../utils/api";

const STATUS_STYLES = {
  new: "bg-blue-100 text-blue-700",
  read: "bg-amber-100 text-amber-700",
  replied: "bg-green-100 text-green-700",
  closed: "bg-slate-100 text-slate-600",
};

const PAGE_LIMIT = 20;

export default function ContactMessages() {
  const [messages, setMessages] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMessages();
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, status]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: PAGE_LIMIT });
      if (search) params.set("search", search);
      if (status !== "all") params.set("status", status);

      const res = await fetch(`${BASE_URL}/api/store/contact/admin?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (data.success) {
        setMessages(data.data || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error("Contact messages fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  return (
    <div className="flex min-h-full w-full max-w-full" style={{ fontFamily: "'DM Sans', sans-serif", color: "#1e293b" }}>
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="sticky top-0 z-20 flex items-center rounded-xl border-b border-slate-200 bg-white p-3">
          <div className="mx-auto flex w-full flex-col gap-4 px-2 lg:flex-row lg:items-center">
            <div className="flex-1">
              <h1 className="text-[18px] font-semibold leading-tight">Contact Messages</h1>
              <p className="text-[13px] tracking-wide text-slate-400">Inquiries submitted through the website contact form</p>
            </div>
          </div>
        </header>

        <main className="p-2 flex-1 w-full mx-auto">
          <div className="mb-2 grid grid-cols-1 gap-4 rounded-xl bg-white p-1 shadow-sm md:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-1.5 flex-1 min-w-48">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by name, email, subject..."
                  value={search}
                  onChange={(e) => { setPage(1); setSearch(e.target.value); }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-2 py-2 text-[13px] outline-none placeholder-slate-400 transition-colors"
                  style={{ fontFamily: "inherit" }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <select
                value={status}
                onChange={(e) => { setPage(1); setStatus(e.target.value); }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[13px] outline-none cursor-pointer text-slate-700 min-w-30 transition-colors"
                style={{ fontFamily: "inherit" }}
              >
                <option value="all">All Status</option>
                <option value="new">New</option>
                <option value="read">Read</option>
                <option value="replied">Replied</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-6">
              <div>
                <h2 className="text-[15px] font-bold">Inquiries</h2>
                <p className="text-xs text-slate-400 mt-0.5">Messages sent via the public Contact Us page</p>
              </div>
              <span className="text-xs bg-indigo-50 text-indigo-600 font-semibold px-3 py-1 rounded-full">{total} total</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    {["Name", "Email", "Subject", "Status", "Date", "Action"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[12px] font-semibold text-slate-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400 text-sm">Loading messages...</td></tr>
                  )}
                  {!loading && messages.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400 text-sm">No contact messages found.</td></tr>
                  )}
                  {!loading && messages.map((msg, i) => (
                    <tr key={msg.id} className={`hover:bg-slate-50 text-sm cursor-pointer ${i < messages.length - 1 ? "border-b border-slate-100" : ""}`}
                      onClick={() => navigate(`/contact-messages/${msg.id}`)}>
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{msg.name}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{msg.email}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{msg.subject}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs rounded-full capitalize font-medium ${STATUS_STYLES[msg.status] || "bg-gray-100 text-gray-600"}`}>
                          {msg.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{new Date(msg.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/contact-messages/${msg.id}`); }}
                          className="text-[12px] font-semibold text-[#6c63ff] hover:underline"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 sm:px-6">
                <p className="text-xs text-slate-400">Page {page} of {totalPages}</p>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#6c63ff]"
                  >
                    Previous
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#6c63ff]"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
