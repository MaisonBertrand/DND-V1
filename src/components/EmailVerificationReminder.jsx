import React, { useState } from 'react';
import { resendVerificationEmail } from '../firebase/auth';

export default function EmailVerificationReminder() {
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState('');

  const handleResendVerification = async () => {
    setResending(true);
    setMessage('');
    
    const result = await resendVerificationEmail();
    if (result.error) {
      setMessage(`Error: ${result.error}`);
    } else {
      setMessage('Verification email sent! Please check your inbox.');
    }
    
    setResending(false);
  };

  return (
    <div className="bg-amber-900/20 border border-amber-600 text-amber-200 px-4 py-3 rounded-lg mb-4">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <span className="text-lg">⚠️</span>
        </div>
        <div className="flex-1">
          <p className="font-medium mb-2">Email Verification Required</p>
          <p className="text-sm mb-3">
            Please verify your email address to access all features. Check your inbox for a verification link.
          </p>
          {message && (
            <div className={`text-sm mb-3 ${message.includes('Error') ? 'text-red-300' : 'text-green-300'}`}>
              {message}
            </div>
          )}
          <button
            onClick={handleResendVerification}
            disabled={resending}
            className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1 rounded text-sm font-medium disabled:opacity-50"
          >
            {resending ? 'Sending...' : 'Resend Verification Email'}
          </button>
        </div>
      </div>
    </div>
  );
} 