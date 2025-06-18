import HeroSection from '../components/HeroSection';

export default function Home() {
  return (
    <div>
      <HeroSection />
      <div className="fantasy-container py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="fantasy-card">
            <h3 className="text-xl font-bold text-stone-800 mb-4">Create Parties</h3>
            <p className="text-stone-600">
              Form adventuring parties with your friends and manage your campaign together in a shared space.
            </p>
          </div>
          <div className="fantasy-card">
            <h3 className="text-xl font-bold text-stone-800 mb-4">Track Objectives</h3>
            <p className="text-stone-600">
              Keep track of your party's quests, storylines, and achievements in an organized magical tome.
            </p>
          </div>
          <div className="fantasy-card">
            <h3 className="text-xl font-bold text-stone-800 mb-4">Share Stories</h3>
            <p className="text-stone-600">
              Document your adventures and share them with your fellow party members in an immersive fantasy setting.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 