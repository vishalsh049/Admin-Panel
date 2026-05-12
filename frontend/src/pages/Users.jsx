import { useEffect, useState } from "react";
import axios from "axios";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { BASE_URL } from "../utils/api";

export default function Users() {

const [users,setUsers] = useState([]);
const [showPassword, setShowPassword] = useState({});
const [resetUser,setResetUser] = useState(null);
const [newPassword,setNewPassword] = useState("");
const [showAddModal,setShowAddModal] = useState(false);
const [customRole,setCustomRole] = useState("");
const [editUser,setEditUser] = useState(null);
const [editCustomRole,setEditCustomRole] = useState("");

const [newUser,setNewUser] = useState({
  name:"",
  email:"",
  password:"",
  role:"user"
});

const fetchUsers = async()=>{
const res = await axios.get(`${BASE_URL}/api/users`);
setUsers(res.data);
};

useEffect(()=>{
fetchUsers();
},[]);

const deleteUser = async(id)=>{
if(!window.confirm("Delete this user?")) return;

await axios.delete(`${BASE_URL}/api/users/${id}`);
fetchUsers();
};

const openResetModal = (user)=>{
  setResetUser(user);
  setNewPassword("");
};

const addUser = async()=>{

  if(!newUser.name || !newUser.email || !newUser.password){
    alert("Fill all fields");
    return;
  }

  try{

    await axios.post(`${BASE_URL}/api/users`,{
name:newUser.name,
email:newUser.email,
password:newUser.password,
role:newUser.role === "custom" ? customRole : newUser.role
});

    alert("User created successfully");

    setShowAddModal(false);

    setNewUser({
name:"",
email:"",
password:"",
role:"sales"
});

setCustomRole("");

    fetchUsers();

}catch(error){

console.log(error.response?.data || error);
alert(error.response?.data?.message || "Failed to create user");

}

};

const resetPassword = async()=>{

  if(!newPassword){
    alert("Enter new password");
    return;
  }

  try{

    await axios.put(
     `${BASE_URL}/api/users/reset-password/${resetUser.id}`,
      { password:newPassword }
    );

    alert("Password updated successfully");

    setResetUser(null);
    setNewPassword("");

    fetchUsers();   // ⭐ THIS LINE IS IMPORTANT

  }catch(error){

    console.log(error);
    alert("Failed to update password");

  }

};

const updateUser = async()=>{

try{

await axios.put(
`${BASE_URL}/api/users/${editUser.id}`,
{
name: editUser.name,
email: editUser.email,
role: editUser.role === "custom" ? editCustomRole : editUser.role,
password: editUser.password || undefined
}
);

alert("User updated successfully");

setEditUser(null);

fetchUsers();

}catch(error){

console.log(error.response?.data || error);
alert(error.response?.data?.message || "Failed to update user");

}

};

return(

<div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">

{/* Header */}

<div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
<h2 className="text-xl font-semibold text-gray-800">Users</h2>

<button
onClick={()=>{
setNewUser({
name:"",
email:"",
password:"",
role:"sales"
});
setCustomRole("");
setShowAddModal(true);
}}
className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm w-full sm:w-auto"
>
+ Add User
</button>
</div>

{/* Table */}

<div className="overflow-x-auto">

<table className="w-full min-w-[760px] text-sm">

<thead>
<tr className="text-left text-gray-500 border-b">

<th className="py-3 w-[260px]">User</th>
<th className="w-[320px]">Email</th>
<th className="w-[140px] text-center">Password</th>
<th className="w-[140px] text-center">Role</th>
<th className="w-[180px] text-right">Action</th>

</tr>
</thead>

<tbody>

{users.map((u)=>(

<tr key={u.id} className="border-b hover:bg-gray-50 transition">

<td className="py-4">
<div className="flex items-center gap-3">

<div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold">
{u.name.charAt(0).toUpperCase()}
</div>

<div>
<p className="font-medium text-gray-800">{u.name}</p>
</div>

</div>
</td>

<td className="text-gray-600 py-4">{u.email}</td>

<td className="py-4 text-center align-middle">

<span className="text-gray-400 text-lg font-semibold">
••••••
</span>

</td>

<td className="text-center">

<span className={`px-3 py-1 rounded-full text-xs font-medium
${u.role === "admin"
? "bg-green-100 text-green-700"
: "bg-blue-100 text-blue-700"
}`}>

{u.role}

</span>

</td>

<td className="py-4">
<div className="flex justify-end gap-2">

<button
onClick={()=>{
setEditUser(u);

const roles = ["admin","sales","inventory","accounts"];

if(!roles.includes(u.role)){
setEditCustomRole(u.role);
setEditUser({...u, role:"custom"});
}else{
setEditCustomRole("");
}
}}
className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded-lg text-xs"
>
Edit
</button>

<button
onClick={()=>deleteUser(u.id)}
className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-xs"
>
Delete
</button>

</div>
</td>

</tr>

))}

</tbody>

</table>

</div>

{resetUser && (

<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">

<div className="responsive-modal-panel bg-white p-6 rounded-xl w-full max-w-md shadow-lg">

<h2 className="text-lg font-semibold mb-4">
Reset Password
</h2>

<p className="text-sm text-gray-500 mb-3">
User: {resetUser.name}
</p>

<input
type="password"
placeholder="Enter new password"
value={newPassword}
onChange={(e)=>setNewPassword(e.target.value)}
className="w-full border rounded px-3 py-2 mb-4"
/>

<div className="flex justify-end gap-2">

<button
onClick={()=>setResetUser(null)}
className="px-4 py-1 border rounded"
>
Cancel
</button>

<button
onClick={resetPassword}
className="bg-indigo-600 text-white px-4 py-1 rounded"
>
Update
</button>

</div>

</div>

</div>

)}

{showAddModal && (

<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">

<div className="responsive-modal-panel bg-white w-full max-w-[420px] p-6 rounded-xl shadow-xl">

<h2 className="text-lg font-semibold mb-4">
Add New User
</h2>

<div className="space-y-3">

<input
type="text"
placeholder="Full Name"
autoComplete="off"
value={newUser.name}
onChange={(e)=>setNewUser({...newUser,name:e.target.value})}
className="w-full border rounded-lg px-3 py-2"
/>

<input
type="email"
placeholder="Email"
autoComplete="new-email"
value={newUser.email}
onChange={(e)=>setNewUser({...newUser,email:e.target.value})}
className="w-full border rounded-lg px-3 py-2"
/>

<input
type="password"
placeholder="Password"
autoComplete="new-password"
value={newUser.password}
onChange={(e)=>setNewUser({...newUser,password:e.target.value})}
className="w-full border rounded-lg px-3 py-2"
/>

<select
value={newUser.role}
onChange={(e)=>setNewUser({...newUser,role:e.target.value})}
className="w-full border rounded-lg px-3 py-2"
>

<option value="sales">Sales</option>
<option value="inventory">Inventory</option>
<option value="accounts">Accounts</option>
<option value="custom">Other Role</option>

</select>

{newUser.role === "custom" && (

<input
type="text"
placeholder="Enter custom role"
className="w-full border rounded-lg px-3 py-2"
value={customRole}
onChange={(e)=>setCustomRole(e.target.value)}
/>

)}

</div>

<div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">

<button
onClick={()=>setShowAddModal(false)}
className="px-4 py-2 border rounded-lg"
>
Cancel
</button>

<button
onClick={addUser}
className="bg-indigo-600 text-white px-4 py-2 rounded-lg"
>
Create User
</button>

</div>

</div>

</div>

)}

{editUser && (

<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">

<div className="responsive-modal-panel bg-white w-full max-w-[420px] p-6 rounded-xl shadow-xl">

<h2 className="text-lg font-semibold mb-4">
Edit User
</h2>

<div className="space-y-3">

<input
value={editUser.name}
onChange={(e)=>setEditUser({...editUser,name:e.target.value})}
className="w-full border rounded-lg px-3 py-2"
/>

<input
value={editUser.email}
onChange={(e)=>setEditUser({...editUser,email:e.target.value})}
className="w-full border rounded-lg px-3 py-2"
/>

<input
type="password"
placeholder="New Password (optional)"
onChange={(e)=>setEditUser({...editUser,password:e.target.value})}
className="w-full border rounded-lg px-3 py-2"
/>

<select
value={editUser.role}
onChange={(e)=>setEditUser({...editUser,role:e.target.value})}
className="w-full border rounded-lg px-3 py-2"
>

<option value="admin">Admin</option>
<option value="sales">Sales</option>
<option value="inventory">Inventory</option>
<option value="accounts">Accounts</option>
<option value="custom">Other Role</option>

</select>

{editUser.role === "custom" && (

<input
type="text"
placeholder="Enter custom role"
value={editCustomRole}
onChange={(e)=>setEditCustomRole(e.target.value)}
className="w-full border rounded-lg px-3 py-2"
/>

)}

</div>

<div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">

<button
onClick={()=>setEditUser(null)}
className="px-4 py-2 border rounded-lg"
>
Cancel
</button>

<button
onClick={updateUser}
className="bg-indigo-600 text-white px-4 py-2 rounded-lg"
>
Update User
</button>

</div>

</div>

</div>

)}


</div>

);

}
