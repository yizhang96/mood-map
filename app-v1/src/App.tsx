// src/App.tsx
//import React from 'react';
import Circumplex from './components/Circumplex';
import './index.css';

export default function App() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <h1
        className="text-center font-extrabold text-2xl sm:text-3xl md:text-4xl leading-tight"
        style={{ fontFamily: 'Helvetica, Arial, sans-serif', marginBottom: '1rem' }}
      >
      💬 How are you feeling today?
    </h1>
    <p
      className="text-center text-lg sm:text-xl text-gray-700"
      style={{ fontFamily: 'Helvetica, Arial, sans-serif', marginTop: '0' }}
    >
      Double-click anywhere to map your mood below.
    </p>

      {/* Either omit width/height to use the 600×600 defaults: */}
      {/* <Circumplex /> */}

      {/* Or explicitly ask for 600×600: */}
      <Circumplex width={600} height={600} />
    </main>
  );
}
