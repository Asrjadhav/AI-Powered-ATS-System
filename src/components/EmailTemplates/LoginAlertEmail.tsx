import React from "react";
import { EmailContainer } from "./EmailContainer";
import { AlertCircle } from "lucide-react";

interface Props {
  name: string;
  dateTime: string;
  browser: string;
  os: string;
  ip: string;
  location: string;
}

export const LoginAlertEmailTemplate = ({ name, dateTime, browser, os, ip, location }: Props) => (
  <EmailContainer>
    <div className="flex items-center gap-2 text-amber-600 mb-4">
      <AlertCircle className="h-6 w-6" />
      <h1 className="text-xl font-bold">New Login Detected</h1>
    </div>
    <p className="text-sm mb-4">Dear {name},</p>
    <p className="text-sm mb-6">Your ATS account was accessed successfully.</p>
    
    <div className="bg-slate-50 p-4 rounded border border-slate-200 mb-6 font-mono text-xs space-y-2">
      <p><strong>Date & Time:</strong> {dateTime}</p>
      <p><strong>Browser:</strong> {browser}</p>
      <p><strong>OS:</strong> {os}</p>
      <p><strong>IP Address:</strong> {ip}</p>
      <p><strong>Location:</strong> {location}</p>
    </div>

    <p className="text-sm">If this login was you, no action is required.</p>
    <p className="text-sm mt-2">If you do not recognize this login, please reset your password immediately and contact the ATS Administrator.</p>
  </EmailContainer>
);
