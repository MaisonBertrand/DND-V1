import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser } from '../firebase/auth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const { user, error } = await loginUser(email, password);
    if (error) {
      setError(error);
      return;
    }
    
    navigate('/dashboard');
  };

  return (
    <div className="fantasy-container min-h-screen flex items-center justify-center">
      <div className="fantasy-card w-full max-w-md">
        <h2 className="fantasy-title text-center">Return to Your Campaign</h2>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-stone-700">
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
            <label htmlFor="password" className="block text-sm font-medium text-stone-700">
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
          <button type="submit" className="fantasy-button w-full">
            Login
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-stone-600">
          Don't have an account?{' '}
          <Link to="/register" className="text-amber-700 hover:text-amber-800">
            Start your journey
          </Link>
        </p>
      </div>
    </div>
  );
} 