import React, { useState } from "react";
import { X } from "lucide-react";
import { WelcomeEmailTemplate } from "./EmailTemplates/WelcomeEmail";

interface Props {
  onClose: () => void;
}

export default function CreateUserDialog({ onClose }: Props) {
  const [view, setView] = useState<"form" | "preview">("form");
  const [userData, setUserData] = useState({ name: "Jane Doe", email: "jane@encureit.com", password: "TempPassword123!" });

  const handleSave = () => {
    setView("preview");
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-[500px] text-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold">
            {view === "form" ? "Add User" : "Welcome Email Preview"}
          </h3>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        
        {view === "form" ? (
          <div className="space-y-4">
            <input type="text" placeholder="Name" className="w-full p-2 bg-slate-800 rounded" value={userData.name} onChange={e => setUserData({...userData, name: e.target.value})} />
            <input type="email" placeholder="Email" className="w-full p-2 bg-slate-800 rounded" value={userData.email} onChange={e => setUserData({...userData, email: e.target.value})} />
            <button onClick={handleSave} className="w-full py-2 bg-indigo-600 rounded">Save</button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-emerald-400">Recruiter account created successfully. Email will be sent automatically after backend integration.</p>
            <WelcomeEmailTemplate name={userData.name} email={userData.email} tempPassword={userData.password} />
            <button onClick={onClose} className="w-full py-2 bg-indigo-600 rounded">Close</button>
          </div>
        )}
      </div>
    </div>
  );
}
