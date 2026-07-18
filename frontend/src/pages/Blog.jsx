import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, Eye } from "lucide-react";
import toast from "react-hot-toast";
import { getPosts, deletePost, updatePost } from "../services/blogService";
import ConfirmModal from "../components/ConfirmModal";

export default function Blog() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    loadPosts();
  }, []);

  async function loadPosts() {
    setLoading(true);
    try {
      const data = await getPosts();
      setPosts(data);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to load posts");
    } finally {
      setLoading(false);
    }
  }

  async function togglePublish(post) {
    try {
      const nextStatus = post.status === "published" ? "draft" : "published";
      await updatePost(post.id, { ...post, status: nextStatus, content: post.content, tags: post.tags, category_id: post.category_id, author_id: post.author_id });
      toast.success(nextStatus === "published" ? "Post published" : "Post moved to draft");
      loadPosts();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update status");
    }
  }

  async function confirmDelete() {
    setIsBusy(true);
    try {
      await deletePost(pendingDelete.id);
      setPosts((prev) => prev.filter((p) => p.id !== pendingDelete.id));
      toast.success("Post deleted");
      setPendingDelete(null);
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
        <Link
          to="/blog/add"
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Add Post
        </Link>
      </div>

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
