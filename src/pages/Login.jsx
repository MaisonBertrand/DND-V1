import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { onAuthChange, loginUser, resendVerificationEmail } from '../firebase/auth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check for success message from registration
    if (location.state?.message) {
      setMessage(location.state.message);
      // Clear the state to prevent showing the message again on refresh
      navigate(location.pathname, { replace: true });
    }

    const unsubscribe = onAuthChange((user) => {
      if (user && user.emailVerified) {
        navigate('/dashboard');
      }
    });
    return () => unsubscribe();
  }, [navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setNeedsVerification(false);

    const result = await loginUser(email, password);
    if (result.error) {
      if (result.needsVerification) {
        setNeedsVerification(true);
        setError(result.error);
      } else if (result.error.includes('auth/invalid-credential')) {
        setError('Invalid email or password. Please check your credentials or register a new account.');
      } else if (result.error.includes('auth/user-not-found')) {
        setError('No account found with this email. Please register first.');
      } else if (result.error.includes('auth/wrong-password')) {
        setError('Incorrect password. Please try again.');
      } else if (result.error.includes('auth/user-disabled')) {
        setError('This account has been disabled. Please contact support.');
      } else if (result.error.includes('auth/too-many-requests')) {
        setError('Too many failed login attempts. Please try again later.');
      } else {
        setError(result.error);
      }
    }
    setLoading(false);
  };

  const handleResendVerification = async () => {
    setResendingEmail(true);
    setError('');
    
    const result = await resendVerificationEmail();
    if (result.error) {
      setError(result.error);
    } else {
      setMessage('Verification email sent! Please check your inbox.');
    }
    
    setResendingEmail(false);
  };

  return (
    <div className="fantasy-container py-8">
      <div className="fantasy-card max-w-md mx-auto">
        <h1 className="fantasy-title text-center">Login</h1>
        
        {message && (
          <div className="bg-green-900/20 border border-green-600 text-green-200 px-4 py-3 rounded-lg mb-4">
            {message}
          </div>
        )}
        
        {needsVerification && (
          <div className="bg-amber-900/20 border border-amber-600 text-amber-200 px-4 py-3 rounded-lg mb-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <span className="text-lg">⚠️</span>
              </div>
              <div className="flex-1">
                <p className="font-medium mb-2">Email Verification Required</p>
                <p className="text-sm mb-3">
                  Please check your email and click the verification link before logging in.
                </p>
                <button
                  onClick={handleResendVerification}
                  disabled={resendingEmail}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1 rounded text-sm font-medium disabled:opacity-50"
                >
                  {resendingEmail ? 'Sending...' : 'Resend Verification Email'}
                </button>
              </div>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="fantasy-input"
              autoComplete="email"
              required
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="fantasy-input"
              autoComplete="current-password"
              required
            />
          </div>
          
          {error && (
            <div className="bg-red-900/20 border border-red-600 text-red-200 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="fantasy-button w-full"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-gray-300">
            Don't have an account?{' '}
            <button
              onClick={() => navigate('/register')}
              className="text-amber-400 hover:text-amber-300 font-medium"
            >
              Register here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
} 