import { Routes, Route, Navigate } from 'react-router-dom';
import NewRoomPage from './pages/NewRoomPage';
import RoomPage from './pages/RoomPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/new" replace />} />
      <Route path="/new" element={<NewRoomPage />} />
      <Route path="/r/:roomId" element={<RoomPage />} />
    </Routes>
  );
}