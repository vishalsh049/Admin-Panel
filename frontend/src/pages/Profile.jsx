import { useState, useEffect } from "react";
import { User, Lock, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Profile = () => {

  /* ================= STATES ================= */
  const [profileImage, setProfileImage] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const navigate = useNavigate();

const [profileData, setProfileData] = useState({
  name: "",
  email: "",
  phone: "",
  address: "",
  dob: "",
  country: "India",
  postalCode: "",
  role: "Admin Panel",
  password: "", 
});

  const [backupData, setBackupData] = useState(profileData);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  /* ================= LOAD DATA ================= */
  useEffect(() => {
  const storedUser = localStorage.getItem("user");

  if (storedUser) {
    const user = JSON.parse(storedUser);

    setProfileData(user);

    if (user.profileImage) {
      setProfileImage(user.profileImage);
    }
  }
}, []);

 
/* ================= HANDLERS ================= */

// IMAGE
const handleImageChange = (e) => {
  const file = e.target.files[0];

  if (file) {
    const reader = new FileReader();

    reader.onloadend = () => {
      const base64Image = reader.result;

      // ✅ update state properly
      setProfileData((prev) => {
        const updatedUser = {
          ...prev,
          profileImage: base64Image,
        };

        // ✅ save correct updated data
        localStorage.setItem("user", JSON.stringify(updatedUser));

        return updatedUser;
      });

      // ✅ update image preview
      setProfileImage(base64Image);
    };

    reader.readAsDataURL(file);
  }
};

// INPUT CHANGE
const handleChange = (e) => {
  const { name, value } = e.target;

  setProfileData((prev) => ({
    ...prev,
    [name]: value,
  }));
};

// ENABLE EDIT
const handleEdit = () => {
  setBackupData(profileData); // backup current data
  setIsEditing(true);
};

// DISCARD CHANGES (FIXED)
const handleCancel = () => {
  const storedUser = localStorage.getItem("user");

  if (storedUser) {
    setProfileData(JSON.parse(storedUser));
  } else {
    setProfileData(backupData);
  }

  setIsEditing(false);
};

// SAVE DATA (FIXED)
const handleSave = () => {
  // VALIDATION
  if (!profileData.name.trim()) {
    alert("Name is required ❌");
    return;
  }

  if (!profileData.email.trim()) {
    alert("Email is required ❌");
    return;
  }

  if (!profileData.phone.trim()) {
    alert("Phone number is required ❌");
    return;
  }

  if (!profileData.address.trim()) {
    alert("Address is required ❌");
    return;
  }

  if (!profileData.dob) {
    alert("Date of Birth is required ❌");
    return;
  }

  if (!profileData.postalCode.trim()) {
    alert("Postal Code is required ❌");
    return;
  }

  // SAVE
  localStorage.setItem("user", JSON.stringify(profileData));
  setBackupData(profileData);
  setIsEditing(false);

  alert("Profile Saved Successfully ✅");
};
// PASSWORD INPUT
const handlePasswordChange = (e) => {
  const { name, value } = e.target;

  setPasswordData((prev) => ({
    ...prev,
    [name]: value,
  }));
};

// PASSWORD SAVE
const handlePasswordSave = () => {
  if (!passwordData.oldPassword || !passwordData.newPassword) {
    alert("Please fill all fields");
    return;
  }

  if (passwordData.newPassword !== passwordData.confirmPassword) {
    alert("Passwords do not match ❌");
    return;
  }

  const storedUser = JSON.parse(localStorage.getItem("user"));

  // ❌ check old password
 if (!storedUser.password || storedUser.password !== passwordData.oldPassword) {
    alert("Old password is incorrect ❌");
    return;
  }

  // ✅ update password
  const updatedUser = {
    ...storedUser,
    password: passwordData.newPassword,
  };

  // ✅ update state
  setProfileData(updatedUser);

  // ✅ save to localStorage
  localStorage.setItem("user", JSON.stringify(updatedUser));

  alert("Password Changed Successfully ✅");
  setShowPasswordModal(false);

  setPasswordData({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
};

// LOGOUT
const handleLogout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");

 window.dispatchEvent(new Event("storage")); // 🔥 trigger update
navigate("/login");
};

  /* ================= UI ================= */

return (
  <div className="p-6">

    <div className="flex gap-6">

{/* LEFT PANEL */}
<div className="w-72 bg-white rounded-3xl p-8 shadow-md flex flex-col items-center">

  {/* IMAGE */}
  <div className="relative flex flex-col items-center">
    <img
      src={profileImage || `https://ui-avatars.com/api/?name=${profileData.name}&background=2563eb&color=fff`}
      className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg bg-gray-100"
    />

    {/* EDIT ICON */}
    <label
      htmlFor="profileUpload"
      className="absolute bottom-2 right-2 bg-blue-600 p-2 rounded-full cursor-pointer text-white text-xs shadow-md hover:bg-blue-700 transition"
    >
      ✏️
    </label>

    <input
      type="file"
      accept="image/*"
      onChange={handleImageChange}
      id="profileUpload"
      className="hidden"
    />
  </div>

  {/* NAME */}
  <h2 className="mt-5 font-semibold text-lg text-gray-800 text-center">
    {profileData.name || "Your Name"}
  </h2>

  <p className="text-sm text-gray-500 capitalize text-center">
    {profileData.role}
  </p>

  {/* MENU */}
  <div className="mt-8 w-full space-y-2">

    {/* ACTIVE */}
    <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50 text-blue-600 font-medium shadow-sm">
      <User size={18} />
      Personal Information
    </button>

    {/* NORMAL */}
    <button
      onClick={() => setShowPasswordModal(true)}
      className="group w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition"
    >
     <Lock size={18} className="text-gray-500 group-hover:text-blue-600" />
      Login & Password
    </button>

    {/* LOGOUT */}
    <button
      onClick={handleLogout}
     className="group w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition"
    >
      <LogOut size={18} className="text-gray-500 group-hover:text-blue-600" />
      Log Out
    </button>

  </div>

</div>


{/* RIGHT PANEL */}
<div className="flex-1 bg-white rounded-2xl p-8 shadow-md">
  {/* HEADER */}
  <div className="flex justify-between items-center mb-6">
   <h3 className="text-2xl font-semibold text-gray-800">Personal Information</h3>

    <button
      onClick={handleEdit}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
    >
      Edit Profile
    </button>
  </div>

  {/* FORM */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

    {/* FIRST NAME */}
    <div>
      <label className="text-sm text-gray-500">First Name</label>
      <input
        name="name"
        value={profileData.name}
        onChange={handleChange}
        readOnly={!isEditing}
        className={`w-full mt-2 px-4 py-3 rounded-xl border transition 
${isEditing 
  ? "bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100" 
  : "bg-gray-100 cursor-not-allowed"
}`}
      />
    </div>

    {/* LAST NAME */}
    <div>
      <label className="text-sm text-gray-500">Last Name</label>
      <input
        name="lastName"
        value={profileData.lastName || ""}
        onChange={handleChange}
        readOnly={!isEditing}
        className={`w-full mt-2 px-4 py-3 rounded-xl border transition 
${isEditing 
  ? "bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100" 
  : "bg-gray-100 cursor-not-allowed"
}`}
      />
    </div>

    {/* EMAIL */}
    <div className="col-span-2">
      <label className="text-sm text-gray-500">Email</label>
      <input
        value={profileData.email}
        readOnly
        className="w-full mt-2 px-4 py-3 rounded-xl border bg-gray-100 outline-none"
      />
      <span className="inline-block mt-2 px-3 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
  ✔ Verified
</span>
    </div>

    {/* ADDRESS */}
    <div className="col-span-2">
      <label className="text-sm text-gray-500">Address</label>
      <input
        name="address"
        value={profileData.address}
        onChange={handleChange}
        readOnly={!isEditing}
        className="w-full mt-2 px-4 py-3 rounded-xl border bg-white outline-none"
      />
    </div>

    {/* PHONE */}
    <div>
      <label className="text-sm text-gray-500">Phone Number</label>
      <input
        name="phone"
        value={profileData.phone}
        onChange={handleChange}
        readOnly={!isEditing}
        className="w-full mt-2 px-4 py-3 rounded-xl border bg-white outline-none"
      />
    </div>

    {/* DOB */}
    <div>
      <label className="text-sm text-gray-500">Date of Birth</label>
      <input
        type="date"
        name="dob"
        value={profileData.dob}
        onChange={handleChange}
        readOnly={!isEditing}
        className="w-full mt-2 px-4 py-3 rounded-xl border bg-white outline-none"
      />
    </div>

    {/* LOCATION */}
    <div>
      <label className="text-sm text-gray-500">Location</label>
      <select
        name="country"
        value={profileData.country}
        onChange={handleChange}
        disabled={!isEditing}
        className="w-full mt-2 px-4 py-3 rounded-xl border bg-white outline-none"
      >
        <option>India</option>
        <option>USA</option>
      </select>
    </div>

    {/* POSTAL */}
    <div>
      <label className="text-sm text-gray-500">Postal Code</label>
      <input
        name="postalCode"
        value={profileData.postalCode}
        onChange={handleChange}
        readOnly={!isEditing}
        className="w-full mt-2 px-4 py-3 rounded-xl border bg-white outline-none"
      />
    </div>

  </div>

  {/* BUTTONS */}
  <div className="flex justify-end gap-4 mt-10">

    {/* DISCARDS */}
<button
  onClick={handleCancel}
  disabled={!isEditing}
  className="px-6 py-3 rounded-xl bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50 transition"
>
  Discard Changes
</button>

{/* SAVE */}
<button
  onClick={handleSave}
  disabled={!isEditing}
  className="px-6 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md disabled:opacity-50 transition"
>
  Save Changes
</button>

  </div>

</div>
    </div>

    {/* PASSWORD MODAL SAME AS YOURS */}
    {showPasswordModal && (
      <div className="fixed inset-0 bg-black/40 flex justify-center items-center">
        <div className="bg-white p-6 rounded-xl w-full max-w-md">
          <h2 className="mb-4 font-semibold">Change Password</h2>

          <input
            type="password"
            name="oldPassword"
            placeholder="Old Password"
            className="w-full border p-2 rounded mb-2"
            onChange={handlePasswordChange}
          />
          <input
            type="password"
            name="newPassword"
            placeholder="New Password"
            className="w-full border p-2 rounded mb-2"
            onChange={handlePasswordChange}
          />
          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password"
            className="w-full border p-2 rounded"
            onChange={handlePasswordChange}
          />

          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowPasswordModal(false)}>
              Cancel
            </button>
            <button
              onClick={handlePasswordSave}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    )}
  </div>

);

};

export default Profile;