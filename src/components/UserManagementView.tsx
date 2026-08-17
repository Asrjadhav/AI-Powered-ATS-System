import React, { useState } from "react";
import { Plus, Edit, Trash2, RotateCcw, ShieldAlert } from "lucide-react";
import CreateUserDialog from "./CreateUserDialog";

export default function UserManagementView() {
  const [users, setUsers] = useState([
    { id: "1", name: "John Doe", email: "john@encureit.com", role: "ADMIN", department: "Engineering", status: "ACTIVE", lastLogin: "2026-07-14" },
    { id: "2", name: "Jane Smith", email: "jane@encureit.com", role: "HR", department: "HR", status: "ACTIVE", lastLogin: "2026-07-15" }
  ]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">User Management</h2>
        <button onClick={() => setIsDialogOpen(true)} className="px-4 py-2 bg-indigo-600 rounded-xl text-white font-bold text-xs flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add User
        </button>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-xs text-white">
          <thead className="bg-white/5 text-slate-400 uppercase">
            <tr>
              <th className="p-4 text-left">Name</th>
              <th className="p-4 text-left">Email</th>
              <th className="p-4 text-left">Role</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-t border-white/10">
                <td className="p-4">{user.name}</td>
                <td className="p-4">{user.email}</td>
                <td className="p-4">{user.role}</td>
                <td className="p-4">{user.status}</td>
                <td className="p-4 flex gap-2">
                    <button className="text-indigo-400"><Edit className="h-4 w-4" /></button>
                    <button className="text-rose-400"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isDialogOpen && <CreateUserDialog onClose={() => setIsDialogOpen(false)} />}
    </div>
  );
}
