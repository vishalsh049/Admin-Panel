import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import toast from "react-hot-toast";
import { BASE_URL } from "../utils/api";

const STATUS_OPTIONS = ["new", "read", "replied", "closed"];

function authHeaders(extra = {}) {
  return { Authorization: `Bearer ${localStorage.getItem("token")}`, ...extra };
}

export default function ContactMessageDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchMessage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchMessage = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/store/contact/admin/${id}`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setMessage(data.data);
      else toast.error(data.message || "Message not found");
    } catch (err) {
      console.error("Contact message fetch error:", err);
      toast.error("Failed to load message");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`${BASE_URL}/api/store/contact/admin/${id}/status`, {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(data.data);
        toast.success("Status updated");
      } else {
        toast.error(data.message || "Failed to update status");
      }
    } catch (err) {
      console.error("Status update error:", err);
      toast.error("Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`${BASE_URL}/api/store/contact/admin/${id}/reply`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ message: reply.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(data.data);
        setReply("");
        toast.success("Reply sent");
      } else {
        toast.error(data.message || "Failed to send reply");
      }
    } catch (err) {
      console.error("Reply error:", err);
      toast.error("Failed to send reply");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this message? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`${BASE_URL}/api/store/contact/admin/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Message deleted");
        navigate("/contact-messages");
      } else {
        toast.error(data.message || "Failed to delete message");
      }
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete message");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <p className="text-gray-500">Loading message...</p>;
  if (!message) return <p className="text-gray-500">Message not found.</p>;

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <Link to="/contact-messages" className="flex items-center gap-2 text-blue-600">
          <FaArrowLeft /> Back to Contact Messages
        </Link>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Delete Message"}
        </button>
      </div>

      <h2 className="text-3xl font-semibold mb-4">Contact Message</h2>

      <div className="bg-white p-6 rounded-xl shadow mb-4">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <p><b>Subject:</b> {message.subject}</p>
            <p className="text-xs text-slate-400 mt-1">Received {new Date(message.created_at).toLocaleString()}</p>
          </div>
          <select
            value={message.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={updatingStatus}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm capitalize outline-none cursor-pointer"
          >
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-12 border-t pt-4">
          <div>
            <p className="font-semibold">Name:</p>
            <p>{message.name}</p>
          </div>
          <div>
            <p className="font-semibold">Email:</p>
            <p><a href={`mailto:${message.email}`} className="text-blue-600 hover:underline">{message.email}</a></p>
          </div>
          <div>
            <p className="font-semibold">Phone:</p>
            <p>{message.phone || "—"}</p>
          </div>
          <div>
            <p className="font-semibold">Submitted By:</p>
            <p>{message.customerId ? `Registered Customer (#${message.customerId})` : "Guest"}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow mb-4">
        <h3 className="text-lg font-semibold mb-2">Message</h3>
        <p className="whitespace-pre-wrap text-slate-700">{message.message}</p>
      </div>

      {message.adminReply && (
        <div className="bg-green-50 border border-green-100 p-6 rounded-xl shadow mb-4">
          <h3 className="text-lg font-semibold mb-2 text-green-700">
            Reply sent {message.repliedBy ? `by ${message.repliedBy}` : ""}
            {message.repliedAt ? ` on ${new Date(message.repliedAt).toLocaleString()}` : ""}
          </h3>
          <p className="whitespace-pre-wrap text-slate-700">{message.adminReply}</p>
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow">
        <h3 className="text-lg font-semibold mb-3">{message.adminReply ? "Send Another Reply" : "Reply to this Inquiry"}</h3>
        <form onSubmit={handleReply} className="space-y-3">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={5}
            placeholder="Type your reply — this will be emailed to the customer..."
            className="w-full border border-slate-200 rounded-lg p-3 text-sm outline-none focus:border-[#6c63ff]"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !reply.trim()}
            className="px-6 py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: "#6c63ff" }}
          >
            {sending ? "Sending..." : "Send Reply"}
          </button>
        </form>
      </div>
    </>
  );
}
