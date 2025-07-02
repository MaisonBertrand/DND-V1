import React from 'react';

const version = import.meta.env.VITE_APP_VERSION || '3.1.4';

export default function VersionDisplay() {
  return (
    <div className="text-xs text-gray-400 text-center mt-2">
      Version {version}
    </div>
  );
} 