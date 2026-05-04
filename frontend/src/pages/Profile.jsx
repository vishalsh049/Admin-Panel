import { useState, useEffect } from "react";
import { User, Lock, LogOut, Pencil, Save, Trash2, X, Eye, EyeOff, CheckCircle2, ChevronDown } from "lucide-react";

const COUNTRIES = [
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "US", name: "USA", flag: "🇺🇸" },
  { code: "GB", name: "UK", flag: "🇬🇧" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
];

const inputBase =
  "w-full px-4 py-3 rounded-xl border text-sm text-gray-800 outline-none transition-all duration-200 placeholder-gray-300";
const inputReadonly = "bg-gray-50 border-gray-100 cursor-not-allowed text-gray-500";
const inputEditable = "bg-white border-gray-200 focus:border-blue-400 focus:ring-3 focus:ring-blue-50";

export default function Profile() {
  const [profileImage, setProfileImage] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [profileData, setProfileData] = useState({
    name: "admin",
    lastName: "",
    email: "admin@gmail.com",
    phone: "",
    address: "",
    dob: "",
    country: "India",
    postalCode: "",
    role: "Administrator",
    password: "admin123",
    profileImage: "",
  });

  const [backupData, setBackupData] = useState(profileData);

  const [passwordData, setPasswordData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setProfileData(user);
      if (user.profileImage) setProfileImage(user.profileImage);
    }
  }, []);

  const getInitials = () => {
    const first = profileData.name?.charAt(0) || "";
    const last = profileData.lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || "AD";
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Image = reader.result;
        setProfileData((prev) => {
          const updated = { ...prev, profileImage: base64Image };
          localStorage.setItem("user", JSON.stringify(updated));
          return updated;
        });
        setProfileImage(base64Image);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEdit = () => {
    setBackupData(profileData);
    setIsEditing(true);
  };

  const handleCancel = () => {
    const storedUser = localStorage.getItem("user");
    setProfileData(storedUser ? JSON.parse(storedUser) : backupData);
    setIsEditing(false);
  };

  const handleSave = () => {
    if (!profileData.name.trim()) return alert("Name is required ❌");
    if (!profileData.email.trim()) return alert("Email is required ❌");
    localStorage.setItem("user", JSON.stringify(profileData));
    setBackupData(profileData);
    setIsEditing(false);
    alert("Profile Saved Successfully ✅");
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordSave = () => {
    if (!passwordData.oldPassword || !passwordData.newPassword) return alert("Please fill all fields");
    if (passwordData.newPassword !== passwordData.confirmPassword) return alert("Passwords do not match ❌");
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    if (storedUser.password && storedUser.password !== passwordData.oldPassword) return alert("Old password is incorrect ❌");
    const updatedUser = { ...storedUser, password: passwordData.newPassword };
    setProfileData(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));
    alert("Password Changed Successfully ✅");
    setShowPasswordModal(false);
    setPasswordData({ oldPassword: "", newPassword: "", confirmPassword: "" });
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("storage"));
    alert("Logged out!");
  };

  const countryFlag = COUNTRIES.find((c) => c.name === profileData.country)?.flag || "🌐";

  return (
    <div className="min-h-screen p-4 md:p-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        * { font-family: 'DM Sans', sans-serif; }
        .focus\\:ring-3:focus { box-shadow: 0 0 0 3px rgba(59,130,246,0.12); }
        select { -webkit-appearance: none; appearance: none; }
        input[type="date"]::-webkit-calendar-picker-indicator { opacity: 0.5; cursor: pointer; }
      `}</style>

      <div className=" mx-auto flex gap-4 items-start">

        {/* ── LEFT PANEL ── */}
        <div className="w-72 flex-shrink-0 bg-white rounded-3xl p-8 shadow-sm flex flex-col items-center">
          
          {/* Avatar */}
          <div className="relative mb-5">
            {profileImage ? (
              <img src={profileImage} alt="avatar"
                className="w-28 h-28 rounded-full object-cover border-4 border-white shadow-lg" />
            ) : (
              <div className="w-28 h-28 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg border-4 border-white"
                style={{ background: "linear-gradient(135deg, #4f6ef7, #2563eb)" }}>
                {getInitials()}
              </div>
            )}
            <label htmlFor="profileUpload"
              className="absolute bottom-1 right-1 w-8 h-8 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center cursor-pointer shadow-md transition-colors">
              <Pencil size={13} color="white" />
            </label>
            <input type="file" accept="image/*" onChange={handleImageChange} id="profileUpload" className="hidden" />
          </div>

          {/* Name & role */}
          <h2 className="text-lg font-bold text-gray-900 text-center leading-tight">
            {[profileData.name, profileData.lastName].filter(Boolean).join(" ") || "Your Name"}
          </h2>
          <p className="text-sm text-gray-400 mt-1 text-center">{profileData.role}</p>

          {/* Menu */}
          <div className="mt-8 w-full space-y-1">
            <button
              onClick={() => { setActiveTab("personal"); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === "personal"
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              }`}>
              <User size={17} />
              Personal Information
            </button>

            <button
              onClick={() => { setActiveTab("personal"); setShowPasswordModal(true); }}
              className="group w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-all">
              <Lock size={17} />
              Login &amp; Password
            </button>

            <button
              onClick={handleLogout}
              className="group w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-500 transition-all">
              <LogOut size={17} />
              Log Out
            </button>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="flex-1 bg-white rounded-3xl p-8 shadow-sm">

          {/* Header */}
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Personal Information</h3>
              <p className="text-sm text-gray-400 mt-1">Update your personal details and keep your account information up to date.</p>
            </div>
            <button
              onClick={handleEdit}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-blue-100">
              <Pencil size={14} />
              Edit Profile
            </button>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-100 my-6" />

          {/* Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">

            {/* First Name */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">First Name</label>
              <input name="name" value={profileData.name} onChange={handleChange} readOnly={!isEditing}
                placeholder="Enter first name"
                className={`${inputBase} ${isEditing ? inputEditable : inputReadonly}`} />
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">Last Name</label>
              <input name="lastName" value={profileData.lastName || ""} onChange={handleChange} readOnly={!isEditing}
                placeholder="Last Name"
                className={`${inputBase} ${isEditing ? inputEditable : inputReadonly}`} />
            </div>

            {/* Email — full width */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-600 mb-2">Email Address</label>
              <div className="relative">
                <input value={profileData.email} readOnly
                  className={`${inputBase} ${inputReadonly} pr-28`} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-600 text-xs font-semibold rounded-full border border-green-100">
                  <CheckCircle2 size={12} />
                  Verified
                </span>
              </div>
            </div>

            {/* Address — full width */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-600 mb-2">Address</label>
              <input name="address" value={profileData.address} onChange={handleChange} readOnly={!isEditing}
                placeholder="Enter your full address"
                className={`${inputBase} ${isEditing ? inputEditable : inputReadonly}`} />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">Phone Number</label>
              <input name="phone" value={profileData.phone} onChange={handleChange} readOnly={!isEditing}
                placeholder="Enter phone number"
                className={`${inputBase} ${isEditing ? inputEditable : inputReadonly}`} />
            </div>

            {/* DOB */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">Date of Birth</label>
              <input type="date" name="dob" value={profileData.dob} onChange={handleChange} readOnly={!isEditing}
                className={`${inputBase} ${isEditing ? inputEditable : inputReadonly}`} />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">Location</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base pointer-events-none">{countryFlag}</span>
                <select name="country" value={profileData.country} onChange={handleChange} disabled={!isEditing}
                  className={`${inputBase} pl-10 pr-10 ${isEditing ? inputEditable : inputReadonly}`}>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.name}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Postal Code */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">Postal Code</label>
              <input name="postalCode" value={profileData.postalCode} onChange={handleChange} readOnly={!isEditing}
                placeholder="Enter postal code"
                className={`${inputBase} ${isEditing ? inputEditable : inputReadonly}`} />
            </div>

          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
            <button onClick={handleCancel} disabled={!isEditing}
              className="flex items-center gap-2 px-6 py-3 rounded-xl border border-gray-200 bg-white text-gray-600 text-sm font-semibold hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
              <Trash2 size={14} />
              Discard Changes
            </button>
            <button onClick={handleSave} disabled={!isEditing}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shadow-blue-100">
              <Save size={14} />
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {/* ── PASSWORD MODAL ── */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.35)" }}>
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-7">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Change Password</h2>
                <p className="text-xs text-gray-400 mt-0.5">Enter your old password to set a new one</p>
              </div>
              <button onClick={() => setShowPasswordModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              {[
                { label: "Old Password", key: "oldPassword", show: showOld, toggle: () => setShowOld(p => !p) },
                { label: "New Password", key: "newPassword", show: showNew, toggle: () => setShowNew(p => !p) },
                { label: "Confirm Password", key: "confirmPassword", show: showConfirm, toggle: () => setShowConfirm(p => !p) },
              ].map(({ label, key, show, toggle }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-600 mb-2">{label}</label>
                  <div className="relative">
                    <input
                      type={show ? "text" : "password"}
                      name={key}
                      placeholder={`Enter ${label.toLowerCase()}`}
                      onChange={handlePasswordChange}
                      className={`${inputBase} ${inputEditable} pr-11`}
                    />
                    <button type="button" onClick={toggle}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                      {show ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 mt-7">
              <button onClick={() => setShowPasswordModal(false)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={handlePasswordSave}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors">
                <Save size={14} />
                Save Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
