import React from "react";
import { EmailContainer } from "./EmailContainer";

interface Props {
  name: string;
}

export const ResetPasswordEmailTemplate = ({ name }: Props) => (
  <EmailContainer>
    <h1 className="text-xl font-bold mb-4">Password Reset Request</h1>
    <p className="text-sm mb-4">Dear {name},</p>
    <p className="text-sm mb-4">We received a request to reset your password for your EncureIT ATS account.</p>
    
    <div className="text-center py-6">
      <a href="#" className="inline-block px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-lg text-sm">
        Reset Password
      </a>
    </div>

    <p className="text-xs text-slate-500 mb-4">This link will expire in 30 minutes.</p>
    <p className="text-sm">If you did not request a password reset, you can safely ignore this email.</p>
  </EmailContainer>
);
