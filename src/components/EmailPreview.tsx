import React from "react";

export default function EmailPreview() {
  return (
    <div className="p-8 bg-slate-900 text-white rounded-xl">
      <h2 className="text-xl font-bold mb-4">Email Preview</h2>
      <div className="space-y-6">
        <div className="border p-4 rounded">
            <h3 className="font-bold">Welcome Email</h3>
            <p className="text-sm text-slate-300">Subject: Welcome to EncureIT ATS</p>
            <p className="text-sm mt-2">Welcome to EncureIT ATS...</p>
        </div>
        <div className="border p-4 rounded">
            <h3 className="font-bold">Reset Password Email</h3>
            <p className="text-sm text-slate-300">Subject: Reset Your Password</p>
            <p className="text-sm mt-2">Click the button below...</p>
        </div>
      </div>
    </div>
  );
}
