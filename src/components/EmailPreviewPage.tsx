import React, { useState } from "react";
import { WelcomeEmailTemplate } from "./EmailTemplates/WelcomeEmail";
import { ResetPasswordEmailTemplate } from "./EmailTemplates/ResetPasswordEmail";
import { LoginAlertEmailTemplate } from "./EmailTemplates/LoginAlertEmail";

export default function EmailPreviewPage() {
  const [selected, setSelected] = useState<"welcome" | "reset" | "login">("welcome");

  return (
    <div className="p-8">
      <div className="flex gap-4 mb-8">
        <button onClick={() => setSelected("welcome")} className={`px-4 py-2 rounded ${selected === "welcome" ? "bg-indigo-600" : "bg-slate-700"}`}>Welcome</button>
        <button onClick={() => setSelected("reset")} className={`px-4 py-2 rounded ${selected === "reset" ? "bg-indigo-600" : "bg-slate-700"}`}>Reset Password</button>
        <button onClick={() => setSelected("login")} className={`px-4 py-2 rounded ${selected === "login" ? "bg-indigo-600" : "bg-slate-700"}`}>Login Alert</button>
      </div>
      
      {selected === "welcome" && <WelcomeEmailTemplate name="Jane Doe" email="jane@encureit.com" tempPassword="TempPassword123!" />}
      {selected === "reset" && <ResetPasswordEmailTemplate name="Jane Doe" />}
      {selected === "login" && <LoginAlertEmailTemplate name="Jane Doe" dateTime="2026-07-15 04:50:00" browser="Chrome" os="Windows 11" ip="192.168.1.1" location="New York, USA" />}
    </div>
  );
}
