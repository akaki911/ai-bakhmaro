import { Mail, Inbox, Send, Settings } from 'lucide-react';
import { useAuth } from '../contexts/useAuth';

const MailShell: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#050914] text-slate-100">
      <header className="flex items-center justify-between border-b border-white/5 bg-white/5 px-6 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-cyan-500/10 p-2 text-cyan-300">
            <Mail className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">Mail Demo</p>
            <h1 className="text-xl font-semibold text-white">Inbox Overview</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/80">
            {user?.displayName || user?.email || 'Guest'}
          </span>
          <Settings className="h-5 w-5 text-slate-400" />
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8">
        <section className="rounded-2xl border border-white/5 bg-white/5 p-6 shadow-xl shadow-cyan-500/5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">Status</p>
              <h2 className="text-lg font-semibold text-white">Connected to demo inbox</h2>
              <p className="text-sm text-slate-400">
                This shell prepares the layout for an authenticated mail experience.
              </p>
            </div>
            <div className="flex gap-2 text-sm text-white/80">
              <button className="flex items-center gap-2 rounded-full bg-cyan-500/10 px-4 py-2 font-medium text-cyan-200 transition hover:bg-cyan-500/20">
                <Send className="h-4 w-4" /> Compose
              </button>
              <button className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 font-medium transition hover:bg-white/20">
                <Inbox className="h-4 w-4" /> Refresh
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/5 bg-white/5 p-5 shadow-lg shadow-cyan-500/5">
            <div className="flex items-center justify-between pb-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200/80">Inbox</h3>
              <span className="text-xs text-slate-400">demo-feed</span>
            </div>
            <div className="space-y-3 text-sm text-slate-300">
              <p className="rounded-lg border border-white/5 bg-black/20 px-4 py-3">
                <span className="font-semibold text-white">System</span> → Account provisioning completed for the demo mailbox.
              </p>
              <p className="rounded-lg border border-white/5 bg-black/20 px-4 py-3">
                <span className="font-semibold text-white">Assistant</span> → AI triage is ready to summarize new threads.
              </p>
              <p className="rounded-lg border border-white/5 bg-black/20 px-4 py-3">
                <span className="font-semibold text-white">Security</span> → Zero-trust checks active for outbound replies.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-white/5 p-5 shadow-lg shadow-cyan-500/5">
            <div className="flex items-center justify-between pb-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200/80">Activity</h3>
              <span className="text-xs text-slate-400">live</span>
            </div>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="rounded-lg border border-white/5 bg-black/20 px-4 py-3">Smart routing ready to prioritize important senders.</li>
              <li className="rounded-lg border border-white/5 bg-black/20 px-4 py-3">Auto-replies will appear here once configured.</li>
              <li className="rounded-lg border border-white/5 bg-black/20 px-4 py-3">Mail sync runs in the background to keep threads fresh.</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
};

export default MailShell;
