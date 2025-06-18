import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthChange } from '../firebase/auth';

export default function Navbar() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  return (
    <nav className="bg-stone-800 text-white shadow-lg">
      <div className="fantasy-container">
        <div className="flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold font-['Cinzel']">
            DND-V1
          </Link>
          <div className="space-x-4">
            {!user ? (
              <Link to="/login" className="fantasy-button">
                Login
              </Link>
            ) : (
              <>
                <Link to="/dashboard" className="fantasy-button">
                  Dashboard
                </Link>
                <Link to="/objectives" className="fantasy-button">
                  Objectives
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
} 