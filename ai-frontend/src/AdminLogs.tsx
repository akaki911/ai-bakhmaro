import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, deleteDoc, doc } from '@/lib/firebase/firestore';
import { db } from './firebaseConfig';
import { motion } from 'framer-motion';
import {
  FileText,
  Search,
  Trash2,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
  Clock,
  User,
  Database,
} from 'lucide-react';

interface Log {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  resourceId?: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  timestamp: Date;
  userAgent?: string;
  ipAddress?: string;
}

const AdminLogs: React.FC = () => {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<'all' | 'info' | 'warning' | 'error' | 'success'>('all');
  const [resourceFilter, setResourceFilter] = useState<'all' | 'system' | 'integration' | 'security' | 'user'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'logs'), orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
      const logsData = querySnapshot.docs.map((logDoc) => ({
        id: logDoc.id,
        ...logDoc.data(),
        timestamp: logDoc.data().timestamp?.toDate() || new Date(),
      })) as Log[];
      setLogs(logsData);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteLog = async (logId: string) => {
    if (window.confirm('დარწმუნებული ხართ რომ გსურთ ლოგის წაშლა?')) {
      try {
        await deleteDoc(doc(db, 'logs', logId));
        fetchLogs();
      } catch (error) {
        console.error('Error deleting log:', error);
      }
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <AlertCircle className="h-4 w-4" aria-hidden="true" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" aria-hidden="true" />;
      case 'success':
        return <CheckCircle className="h-4 w-4" aria-hidden="true" />;
      default:
        return <Info className="h-4 w-4" aria-hidden="true" />;
    }
  };

  const getLevelTone = (level: string) => {
    switch (level) {
      case 'error':
        return 'border border-rose-400/60 bg-rose-500/15 text-rose-200 shadow-[0_0_22px_rgba(244,63,94,0.35)]';
      case 'warning':
        return 'border border-amber-400/50 bg-amber-500/15 text-amber-100 shadow-[0_0_22px_rgba(251,191,36,0.3)]';
      case 'success':
        return 'border border-emerald-400/50 bg-emerald-500/15 text-emerald-100 shadow-[0_0_22px_rgba(16,185,129,0.35)]';
      default:
        return 'border border-sky-400/50 bg-sky-500/15 text-sky-100 shadow-[0_0_22px_rgba(14,165,233,0.3)]';
    }
  };

  const getLevelText = (level: string) => {
    switch (level) {
      case 'error':
        return 'შეცდომა';
      case 'warning':
        return 'გაფრთხილება';
      case 'success':
        return 'წარმატება';
      case 'info':
        return 'ინფორმაცია';
      default:
        return level;
    }
  };

  const getResourceIcon = (resource: string) => {
    switch (resource) {
      case 'system':
        return '🖥️';
      case 'integration':
        return '🔗';
      case 'security':
        return '🛡️';
      case 'user':
        return '👤';
      default:
        return '📄';
    }
  };

  const getResourceText = (resource: string) => {
    switch (resource) {
      case 'system':
        return 'სისტემა';
      case 'integration':
        return 'ინტეგრაცია';
      case 'security':
        return 'უსაფრთხოება';
      case 'user':
        return 'მომხმარებელი';
      default:
        return resource;
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = levelFilter === 'all' || log.level === levelFilter;
    const matchesResource = resourceFilter === 'all' || log.resource === resourceFilter;
    return matchesSearch && matchesLevel && matchesResource;
  });

  const logContainerClass =
    viewMode === 'grid'
      ? 'grid grid-cols-1 gap-5 xl:grid-cols-2 2xl:grid-cols-3'
      : 'flex flex-col gap-5';

  const errorCount = logs.filter((log) => log.level === 'error').length;
  const successCount = logs.filter((log) => log.level === 'success').length;
  const warningCount = logs.filter((log) => log.level === 'warning').length;
  const totalCount = logs.length;

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#05070d] p-6 text-slate-200">
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-white/5 px-12 py-10 text-center shadow-[0_35px_120px_rgba(2,6,23,0.6)] backdrop-blur-xl">
          <div className="relative">
            <div className="h-12 w-12 animate-spin rounded-full border-2 border-transparent border-t-cyan-400"></div>
            <div className="absolute inset-1 rounded-full border border-cyan-400/40"></div>
          </div>
          <p className="font-jetbrains text-xs uppercase tracking-[0.32em] text-slate-400">ლოგების ჩატვირთვა...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#05070d] p-6 text-slate-100">
      <div className="mx-auto flex h-full max-w-7xl flex-col gap-10">
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-[0_45px_120px_rgba(2,6,23,0.65)] backdrop-blur-2xl">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-500/40 via-fuchsia-500/30 to-emerald-400/40 text-white shadow-[0_20px_60px_rgba(59,130,246,0.35)]">
                  <FileText className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-white">სიტემის ლოგები</h1>
                  <p className="text-sm text-slate-300">მონიტორინგი და აუდიტი</p>
                </div>
              </div>
            </div>
            <div className="living-ai-divider" aria-hidden="true" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-200 shadow-[0_25px_80px_rgba(2,6,23,0.45)] transition-all duration-300 backdrop-blur-xl"
              >
                <div className="absolute inset-x-0 top-0 h-px living-ai-divider opacity-70" aria-hidden="true" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.32em] text-rose-200/80">შეცდომები</p>
                    <p className="mt-2 text-3xl font-jetbrains text-white">{errorCount}</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-rose-400/50 bg-rose-500/15 text-rose-100 shadow-[0_0_30px_rgba(244,63,94,0.28)]">
                    <AlertCircle className="h-6 w-6" aria-hidden="true" />
                  </div>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-200 shadow-[0_25px_80px_rgba(2,6,23,0.45)] transition-all duration-300 backdrop-blur-xl"
              >
                <div className="absolute inset-x-0 top-0 h-px living-ai-divider opacity-70" aria-hidden="true" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-200/80">წარმატება</p>
                    <p className="mt-2 text-3xl font-jetbrains text-white">{successCount}</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-400/50 bg-emerald-500/15 text-emerald-100 shadow-[0_0_30px_rgba(16,185,129,0.28)]">
                    <CheckCircle className="h-6 w-6" aria-hidden="true" />
                  </div>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-200 shadow-[0_25px_80px_rgba(2,6,23,0.45)] transition-all duration-300 backdrop-blur-xl"
              >
                <div className="absolute inset-x-0 top-0 h-px living-ai-divider opacity-70" aria-hidden="true" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-200/80">გაფრთხილებები</p>
                    <p className="mt-2 text-3xl font-jetbrains text-white">{warningCount}</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-400/50 bg-amber-500/15 text-amber-100 shadow-[0_0_30px_rgba(251,191,36,0.28)]">
                    <AlertTriangle className="h-6 w-6" aria-hidden="true" />
                  </div>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-200 shadow-[0_25px_80px_rgba(2,6,23,0.45)] transition-all duration-300 backdrop-blur-xl"
              >
                <div className="absolute inset-x-0 top-0 h-px living-ai-divider opacity-70" aria-hidden="true" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.32em] text-indigo-200/80">სულ ლოგები</p>
                    <p className="mt-2 text-3xl font-jetbrains text-white">{totalCount}</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-indigo-400/50 bg-indigo-500/15 text-indigo-100 shadow-[0_0_30px_rgba(99,102,241,0.28)]">
                    <Database className="h-6 w-6" aria-hidden="true" />
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        <div className="flex-1 rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-[0_45px_120px_rgba(2,6,23,0.6)] backdrop-blur-2xl">
          <div className="space-y-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative flex w-full max-w-xl items-center">
                <Search className="pointer-events-none absolute left-4 h-5 w-5 text-slate-400/80" aria-hidden="true" />
                <input
                  type="text"
                  placeholder="ძებნა შეტყობინებით, მომხმარებლით ან მოქმედებით..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/10 py-3 pl-12 pr-4 font-jetbrains text-sm text-white placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={levelFilter}
                  onChange={(event) => setLevelFilter(event.target.value as typeof levelFilter)}
                  className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm text-slate-100 transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                >
                  <option value="all">ყველა დონე</option>
                  <option value="info">ინფორმაცია</option>
                  <option value="success">წარმატება</option>
                  <option value="warning">გაფრთხილება</option>
                  <option value="error">შეცდომა</option>
                </select>

                <select
                  value={resourceFilter}
                  onChange={(event) => setResourceFilter(event.target.value as typeof resourceFilter)}
                  className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm text-slate-100 transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                >
                  <option value="all">ყველა რესურსი</option>
                  <option value="system">სისტემები</option>
                  <option value="integration">ინტეგრაციები</option>
                  <option value="security">უსაფრთხოება</option>
                  <option value="user">მომხმარებლები</option>
                </select>

                <div className="flex overflow-hidden rounded-2xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`flex h-11 w-11 items-center justify-center border transition ${
                      viewMode === 'grid'
                        ? 'border-cyan-400/60 bg-cyan-500/20 text-cyan-100 shadow-[0_0_25px_rgba(34,211,238,0.35)]'
                        : 'border-transparent text-slate-400 hover:border-cyan-400/40 hover:text-cyan-100'
                    }`}
                    aria-label="Grid view"
                  >
                    <div className="grid h-4 w-4 grid-cols-2 gap-1 text-current">
                      <span className="h-2 w-2 rounded-sm bg-current" />
                      <span className="h-2 w-2 rounded-sm bg-current" />
                      <span className="h-2 w-2 rounded-sm bg-current" />
                      <span className="h-2 w-2 rounded-sm bg-current" />
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`flex h-11 w-11 items-center justify-center border transition ${
                      viewMode === 'list'
                        ? 'border-cyan-400/60 bg-cyan-500/20 text-cyan-100 shadow-[0_0_25px_rgba(34,211,238,0.35)]'
                        : 'border-transparent text-slate-400 hover:border-cyan-400/40 hover:text-cyan-100'
                    }`}
                    aria-label="List view"
                  >
                    <div className="flex h-4 w-4 flex-col justify-center gap-1 text-current">
                      <span className="h-0.5 rounded-full bg-current" />
                      <span className="h-0.5 rounded-full bg-current" />
                      <span className="h-0.5 rounded-full bg-current" />
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div className="living-ai-divider" aria-hidden="true" />

            {filteredLogs.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-white/10 bg-white/5 p-12 text-center text-slate-300 shadow-[0_35px_110px_rgba(2,6,23,0.55)] backdrop-blur-xl"
              >
                <FileText className="h-16 w-16 text-slate-400/70" aria-hidden="true" />
                <div>
                  <h3 className="text-lg font-semibold text-white">ლოგები ვერ მოიძებნა</h3>
                  <p className="mt-2 text-sm text-slate-400">შეცვალეთ ძებნის ან ფილტრის პარამეტრები</p>
                </div>
              </motion.div>
            ) : (
              <div className={logContainerClass}>
                {filteredLogs.map((log, index) => (
                  <motion.article
                    key={log.id}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: index * 0.04 }}
                    className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 text-sm text-slate-200 shadow-[0_35px_120px_rgba(2,6,23,0.6)] backdrop-blur-2xl transition-all duration-300 hover:border-cyan-400/50 hover:shadow-[0_40px_140px_rgba(14,165,233,0.45)]"
                  >
                    <div className="absolute inset-x-0 top-0 h-px living-ai-divider opacity-80" aria-hidden="true" />
                    <div className="flex flex-wrap items-center justify-between gap-4 px-6 pt-5 text-[0.68rem] uppercase tracking-[0.28em] text-slate-400/80">
                      <div className="flex items-center gap-3">
                        <span className="text-xl" aria-hidden="true">
                          {getResourceIcon(log.resource)}
                        </span>
                        <span className="font-jetbrains text-[0.68rem] tracking-[0.28em] text-slate-300/90">
                          {getResourceText(log.resource)}
                        </span>
                      </div>
                      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[0.62rem] font-semibold ${getLevelTone(log.level)}`}>
                        {getLevelIcon(log.level)}
                        <span>{getLevelText(log.level)}</span>
                      </span>
                    </div>
                    <div className="px-6">
                      <div className="living-ai-divider my-4" aria-hidden="true" />
                      <p className="font-jetbrains text-[0.9rem] leading-relaxed text-slate-100/95">{log.message}</p>
                      <div className="mt-4 flex flex-wrap items-center gap-4 text-[0.7rem] uppercase tracking-[0.24em] text-slate-400/80">
                        <span className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-slate-400/80" aria-hidden="true" />
                          {log.timestamp.toLocaleString('ka-GE')}
                        </span>
                        <span className="flex items-center gap-2">
                          <User className="h-4 w-4 text-slate-400/80" aria-hidden="true" />
                          {log.userName}
                        </span>
                        {log.resourceId && (
                          <span className="rounded-full border border-white/10 px-3 py-1 font-jetbrains text-[0.62rem] tracking-[0.2em] text-slate-300/80">
                            ID: {log.resourceId}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="px-6 pb-5 pt-4">
                      <div className="living-ai-divider mb-4" aria-hidden="true" />
                      <div className="flex flex-wrap items-center justify-between gap-3 text-[0.68rem] uppercase tracking-[0.24em] text-slate-400/80">
                        <span className="font-jetbrains text-slate-300/80">{log.action}</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => deleteLog(log.id)}
                            className="inline-flex items-center gap-2 rounded-full border border-rose-400/60 bg-rose-500/15 px-3 py-1 text-[0.62rem] font-semibold tracking-[0.24em] text-rose-100 transition hover:border-rose-300/60 hover:text-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            წაშლა
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </div>
            )}

            {filteredLogs.length > 0 && (
              <div className="flex justify-center">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/10 px-8 py-3 font-jetbrains text-xs uppercase tracking-[0.28em] text-slate-200 transition hover:border-cyan-400/50 hover:text-cyan-100"
                >
                  მეტის ჩატვირთვა
                </motion.button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogs;
