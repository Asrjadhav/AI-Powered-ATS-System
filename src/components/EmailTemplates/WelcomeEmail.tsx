import React from "react";
import { EmailContainer } from "./EmailContainer";

interface Props {
  name: string;
  email: string;
  tempPassword: string;
}

export const WelcomeEmailTemplate = ({ name, email, tempPassword }: Props) => (
  <EmailContainer>
    <h1 className="text-xl font-bold mb-4">Welcome to EncureIT ATS</h1>
    <p className="text-sm mb-4">Dear {name},</p>
    <p className="text-sm mb-4">Welcome to the EncureIT Applicant Tracking System.</p>
    <p className="text-sm mb-4">Your recruiter account has been created successfully.</p>
    
    <div className="bg-slate-50 p-4 rounded border border-slate-200 mb-6 font-mono text-xs space-y-2">
      <p><strong>Email:</strong> {email}</p>
      <p><strong>Temporary Password:</strong> {tempPassword}</p>
      <p><strong>Login Link:</strong> <a href="https://ats.encureit.com/login" className="text-indigo-600 underline">https://ats.encureit.com/login</a></p>
    </div>

    <p className="text-sm mb-6">For security reasons, you will be required to change your password after your first login.</p>
    
    <a href="https://ats.encureit.com/login" className="inline-block px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-lg text-sm">
      Login to ATS
    </a>
  </EmailContainer>
);
