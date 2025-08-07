// src/App.tsx
//import React from 'react';
import Circumplex from './components/Circumplex';
import './index.css';

export default function App() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <h1 className="text-3xl mb-4"
      style={{
        fontFamily: 'Helvetica, Arial, sans-serif',
        textAlign:  'center',
        margin:     '1rem 0'}}>
        😍 Welcome to Mood Map!<br></br>
        🤔 How are you feeling today?
      </h1>
      {/* Either omit width/height to use the 600×600 defaults: */}
      {/* <Circumplex /> */}

      {/* Or explicitly ask for 600×600: */}
      <Circumplex width={600} height={600} />
    </main>
  );
}
