import React from 'react';
import { AuthProvider } from './AuthContext';
import { PartyProvider } from './PartyContext';
import { MapProvider } from './MapContext';

export const AppProvider = ({ children }) => {
  return (
    <AuthProvider>
      <PartyProvider>
        <MapProvider>
          {children}
        </MapProvider>
      </PartyProvider>
    </AuthProvider>
  );
}; 