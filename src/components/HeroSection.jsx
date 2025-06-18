import { Link } from 'react-router-dom';

export default function HeroSection() {
  return (
    <div className="relative overflow-hidden">
      <div className="fantasy-container">
        <div className="relative z-10 py-8 sm:py-16 lg:py-24 text-center">
          <h1 className="fantasy-title text-5xl sm:text-6xl lg:text-7xl">
            Manage your D&D world like a real adventurer's tome
          </h1>
          <p className="fantasy-subtitle max-w-2xl mx-auto">
            Create parties, invite friends, and share story objectives in a beautifully crafted digital environment that feels like a magical grimoire.
          </p>
          <div className="mt-8 flex justify-center space-x-6">
            <Link to="/register" className="fantasy-button text-lg px-8 py-3">
              Start Your Journey
            </Link>
            <Link to="/login" className="fantasy-button text-lg px-8 py-3 bg-stone-600 hover:bg-stone-700">
              Return to Campaign
            </Link>
          </div>
        </div>
      </div>
      <div className="absolute inset-0 bg-stone-200/10 pattern-grid-lg"></div>
    </div>
  );
} 