// SOL-947 — Emotional Gurulo Chat UI
import AiDeveloperPanel from '../components/AiDeveloperPanel';
import AdminChatSurface from '../components/AdminChatSurface';

const AdminChat = () => {
  return (
    <AdminChatSurface className="min-h-screen" contentClassName="min-h-screen">
      {({ onEmotionalStateChange }) => (
        <AiDeveloperPanel onEmotionalStateChange={onEmotionalStateChange} />
      )}
    </AdminChatSurface>
  );
};

export default AdminChat;
