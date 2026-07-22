import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, Eye, RefreshCw, X, AlertTriangle, Search } from "lucide-react";
import toast from "react-hot-toast";
import { getPosts, deletePost, updatePost, syncWordPressPosts } from "../services/blogService";
import ConfirmModal from "../components/ConfirmModal";

const SYNC_STAT_LABELS = [
  ["postsCreated", "Created"],
  ["postsUpdated", "Updated"],
  ["postsUnchanged", "Unchanged"],
  ["postsSkipped", "Skipped"],
  ["categoriesCreated", "Categories"],
  ["authorsCreated", "Authors"],
  ["imagesImported", "Images"],
];

export default function Blog() {
  const [posts, setPosts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const [syncConfirmOpen, setSyncConfirmOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncReport, setSyncReport] = useState(null);
  const [syncError, setSyncError] = useState(null);

  const loadPosts = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = { page, limit: pagination.limit };
        if (searchTerm.trim()) params.search = searchTerm.trim();
        if (statusFilter) params.status = statusFilter;

        const data = await getPosts(params);
        setPosts(Array.isArray(data.posts) ? data.posts : []);
        setPagination(data.pagination);
      } catch (err) {
        toast.error(err.response?.data?.error || "Failed to load posts");
        setPosts([]);
      } finally {
        setLoading(false);
      }
    },
    [pagination.limit, searchTerm, statusFilter]
  );

  useEffect(() => {
    loadPosts(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, statusFilter]);

  async function togglePublish(post) {
    try {
      const nextStatus = post.status === "published" ? "draft" : "published";
      await updatePost(post.id, { ...post, status: nextStatus, content: post.content, tags: post.tags, category_id: post.category_id, author_id: post.author_id });
      toast.success(nextStatus === "published" ? "Post published" : "Post moved to draft");
      loadPosts(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update status");
    }
  }

  async function handleSync() {
    setSyncConfirmOpen(false);
    setSyncing(true);
    setSyncReport(null);
    setSyncError(null);
    try {
      const data = await syncWordPressPosts();
      setSyncReport(data.report);
      toast.success(`Sync complete: ${data.report.postsCreated} new, ${data.report.postsUpdated} updated`);
      loadPosts(1);
    } catch (err) {
      const data = err.response?.data;
      setSyncError(data?.message || err.message);
      if (data?.report) setSyncReport(data.report);
      toast.error(data?.message || "Blog sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function confirmDelete() {
    setIsBusy(true);
    try {
      await deletePost(pendingDelete.id);
      toast.success("Post deleted");
      setPendingDelete(null);
      // Deleting the last post on a page would otherwise leave a stale
      // total/empty page — refetch the current page instead of splicing
      // the local array.
      loadPosts(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.error || "Delete failed");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Blog</h1>
          <p className="text-sm text-slate-500">Manage blog posts shown on the storefront.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSyncConfirmOpen(true)}
            disabled={syncing}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing…" : "Sync Blogs"}
          </button>
          <Link
            to="/blog/add"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Add Post
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search posts by title..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
        >
          <option value="">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      {syncing && (
        <div className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 px-5 py-4 text-sm text-indigo-700">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Importing posts from WordPress — this can take a minute while images download. Keep this page open.
        </div>
      )}

      {(syncReport || syncError) && !syncing && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">WordPress Sync Report</h2>
            <button
              type="button"
              onClick={() => { setSyncReport(null); setSyncError(null); }}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              aria-label="Dismiss sync report"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {syncError && (
            <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{syncError}</p>
          )}
          {syncReport && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                {SYNC_STAT_LABELS.map(([key, label]) => (
                  <div key={key} className="rounded-xl bg-slate-50 px-3 py-2.5">
                    <p className="text-lg font-bold text-slate-900">{syncReport[key] ?? 0}</p>
                    <p className="text-xs text-slate-500">{label}</p>
                  </div>
                ))}
              </div>
              {syncReport.errors?.length > 0 && (
                <div className="mt-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-700">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {syncReport.errors.length} item(s) had issues
                  </div>
                  <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                    {syncReport.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Author</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Views</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Loading…</td></tr>
            ) : posts.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">No posts yet. Add your first post.</td></tr>
            ) : (
              posts.map((post) => (
                <tr key={post.id} className="hover:bg-indigo-50/60">
                  <td className="px-4 py-3 font-medium text-slate-800">{post.title}</td>
                  <td className="px-4 py-3 text-slate-600">{post.category?.name || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{post.author?.name || "—"}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => togglePublish(post)}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                        post.status === "published"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-50 text-slate-600"
                      }`}
                    >
                      {post.status === "published" ? "Published" : "Draft"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {post.views}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link to={`/blog/edit/${post.id}`} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button type="button" onClick={() => setPendingDelete(post)} className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && pagination.total > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm sm:flex-row">
          <p className="text-sm text-slate-500">
            Showing <span className="font-semibold">{(pagination.page - 1) * pagination.limit + 1}</span> to{" "}
            <span className="font-semibold">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{" "}
            <span className="font-semibold">{pagination.total}</span> posts
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadPosts(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-slate-500">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => loadPosts(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        open={syncConfirmOpen}
        title="Sync blogs from WordPress?"
        message="This imports every published WordPress post into the blog. Already-imported posts are updated in place, manually created posts are never deleted, and locally deleted posts stay deleted."
        confirmLabel="Start Sync"
        tone="primary"
        onConfirm={handleSync}
        onCancel={() => setSyncConfirmOpen(false)}
      />

      <ConfirmModal
        open={!!pendingDelete}
        title="Delete this post?"
        message="This will remove the post from the blog."
        confirmLabel="Delete"
        tone="danger"
        isBusy={isBusy}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
