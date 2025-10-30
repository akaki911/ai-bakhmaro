
import React from 'react';
import ReplitAssistantPanel from '../../ReplitAssistantPanel';

const gradientStyle = {
  background: 'linear-gradient(160deg, #0b0f29, #131b40, #1a1448)',
};

const GuruloAvatar: React.FC = () => (
  <div className="pointer-events-none select-none">
    <style>
      {`
        @keyframes guruloHaloPulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.1); opacity: 1; }
        }

        @keyframes guruloCoreGlow {
          0%, 100% { box-shadow: 0 0 30px rgba(126, 182, 255, 0.4), 0 0 60px rgba(145, 104, 255, 0.35); }
          50% { box-shadow: 0 0 50px rgba(126, 182, 255, 0.6), 0 0 80px rgba(145, 104, 255, 0.55); }
        }

        @keyframes guruloEyeBlink {
          0%, 46%, 100% { transform: scaleY(1); opacity: 1; }
          48%, 52% { transform: scaleY(0.2); opacity: 0.6; }
        }

        @keyframes guruloRingDrift {
          0% { transform: rotate(0deg) scale(1); opacity: 0.25; }
          50% { transform: rotate(180deg) scale(1.05); opacity: 0.45; }
          100% { transform: rotate(360deg) scale(1); opacity: 0.25; }
        }

        .gurulo-orbit-avatar {
          position: relative;
          width: clamp(200px, 25vw, 280px);
          height: clamp(200px, 25vw, 280px);
          display: flex;
          align-items: center;
          justify-content: center;
          filter: drop-shadow(0 0 45px rgba(78, 124, 255, 0.35));
        }

        .gurulo-orbit-avatar__halo {
          position: absolute;
          width: 78%;
          height: 78%;
          border-radius: 9999px;
          background: radial-gradient(circle at 30% 30%, rgba(138, 206, 255, 0.55), rgba(73, 36, 153, 0.4));
          animation: guruloHaloPulse 6s ease-in-out infinite;
          filter: blur(0.5px);
        }

        .gurulo-orbit-avatar__ring {
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          border: 1px solid rgba(138, 206, 255, 0.2);
          box-shadow: 0 0 40px rgba(96, 164, 255, 0.25);
          animation: guruloRingDrift 12s linear infinite;
        }

        .gurulo-orbit-avatar__core {
          position: relative;
          width: 62%;
          height: 62%;
          border-radius: 9999px;
          background: radial-gradient(circle at 40% 35%, rgba(180, 226, 255, 0.9), rgba(93, 66, 200, 0.75));
          display: flex;
          align-items: center;
          justify-content: center;
          animation: guruloCoreGlow 7s ease-in-out infinite;
        }

        .gurulo-orbit-avatar__eye {
          position: absolute;
          top: 48%;
          width: 18px;
          height: 18px;
          border-radius: 9999px;
          background: linear-gradient(135deg, #f4fbff, #a4d3ff);
          box-shadow: 0 0 16px rgba(137, 221, 255, 0.75);
          animation: guruloEyeBlink 8s ease-in-out infinite;
        }

        .gurulo-orbit-avatar__eye--left {
          left: 34%;
        }

        .gurulo-orbit-avatar__eye--right {
          right: 34%;
          animation-delay: 0.8s;
        }

        .gurulo-orbit-avatar__halo-ring {
          position: absolute;
          width: 92%;
          height: 92%;
          border-radius: 9999px;
          border: 1px solid rgba(146, 199, 255, 0.18);
          box-shadow: 0 0 30px rgba(146, 199, 255, 0.3);
          animation: guruloRingDrift 9s ease-in-out infinite;
          animation-direction: reverse;
        }

        .gurulo-orbit-avatar__smile {
          position: absolute;
          bottom: 32%;
          width: 38%;
          height: 28%;
          border-bottom: 4px solid rgba(212, 230, 255, 0.85);
          border-radius: 0 0 120px 120px;
          opacity: 0.8;
        }
      `}
    </style>
    <div className="gurulo-orbit-avatar">
      <div className="gurulo-orbit-avatar__ring" />
      <div className="gurulo-orbit-avatar__halo" />
      <div className="gurulo-orbit-avatar__halo-ring" />
      <div className="gurulo-orbit-avatar__core">
        <div className="gurulo-orbit-avatar__eye gurulo-orbit-avatar__eye--left" />
        <div className="gurulo-orbit-avatar__eye gurulo-orbit-avatar__eye--right" />
        <div className="gurulo-orbit-avatar__smile" />
      </div>
    </div>
  </div>
);

interface ChatTabProps {
  isAuthenticated: boolean;
}

const ChatTab: React.FC<ChatTabProps> = ({ isAuthenticated }) => {
  if (!isAuthenticated) {
    return (
      <div
        className="relative h-full text-[#E6E8EC] flex items-center justify-center px-6 overflow-hidden"
        style={gradientStyle}
      >
        <div className="absolute inset-0 flex items-center justify-center opacity-70">
          <GuruloAvatar />
        </div>
        <div className="relative z-10 max-w-md w-full rounded-3xl border border-white/15 bg-[rgba(16,22,42,0.65)] backdrop-blur-2xl px-10 py-12 text-center shadow-[0_28px_80px_rgba(8,10,26,0.7)]">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-[#121622]/80 shadow-[0_16px_36px_rgba(60,32,128,0.35)]">
            <span className="text-2xl">🔐</span>
          </div>
          <div className="text-lg font-semibold tracking-wide">ავთენტიფიკაცია საჭიროა</div>
          <div className="mt-2 text-sm text-[#A0A4AD]">
            გთხოვთ, გაიარეთ ავტორიზაცია AI ჩატის გამოსაყენებლად
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative h-full text-[#E6E8EC] overflow-hidden"
      style={gradientStyle}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <GuruloAvatar />
      </div>
      <div className="relative z-10 h-full px-6 pb-6 pt-4">
        <div className="relative h-full rounded-3xl border border-white/15 bg-[rgba(12,18,38,0.62)] backdrop-blur-[36px] shadow-[0_45px_120px_rgba(5,10,35,0.65)]">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/4 via-white/2 to-transparent pointer-events-none" />
          <div className="relative h-full">
            <ReplitAssistantPanel />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatTab;
