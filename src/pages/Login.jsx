import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { onAuthChange, loginUser } from '../firebase/auth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
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
      if (user) {
        navigate('/dashboard');
      }
    });
    return () => unsubscribe();
  }, [navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await loginUser(email, password);
    if (result.error) {
      if (result.error.includes('auth/invalid-credential')) {
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

  return (
    <div className="fantasy-container py-8">
      <div className="fantasy-card max-w-md mx-auto">
        <h1 className="fantasy-title text-center">Login</h1>
        
        {message && (
          <div className="bg-green-900/20 border border-green-600 text-green-200 px-4 py-3 rounded-lg mb-4">
            {message}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="fantasy-input"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="fantasy-input"
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