import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser, testFirebaseConnection } from '../firebase/auth';

export default function Register() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Test Firebase connection on component mount
    testFirebaseConnection();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!username.trim()) {
      setError('Username is required');
      return;
    }

    if (username.length < 3) {
      setError('Username must be at least 3 characters long');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username can only contain letters, numbers, and underscores');
      return;
    }

    const { user, error, success } = await registerUser(email, password, username);
    
    if (error) {
      setError(error);
      return;
    }

    if (success) {
      navigate('/login', { 
        state: { 
          message: 'Registration successful! Please check your email and click the verification link before logging in. If you don\'t see the email, check your spam folder.' 
        } 
      });
    }
  };

  return (
    <div className="fantasy-container min-h-screen flex items-center justify-center">
      <div className="fantasy-card w-full max-w-md">
        <h2 className="fantasy-title text-center">Begin Your Adventure</h2>
        {error && (
          <div className="bg-red-900/20 border border-red-600 text-red-200 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        {message && (
          <div className="bg-green-900/20 border border-green-600 text-green-200 px-4 py-3 rounded mb-4">
            {message}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-200">
              Username
            </label>
            <input
              id="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="fantasy-input mt-1"
              placeholder="Choose a unique username"
            />
            <p className="text-xs text-gray-400 mt-1">
              Letters, numbers, and underscores only. 3+ characters.
            </p>
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-200">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="fantasy-input mt-1"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-200">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="fantasy-input mt-1"
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-200">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="fantasy-input mt-1"
            />
          </div>
          <button type="submit" className="fantasy-button w-full">
            Register
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-300">
          Already have an account?{' '}
          <Link to="/login" className="text-amber-400 hover:text-amber-300">
            Return to your campaign
          </Link>
        </p>
      </div>
    </div>
  );
} 