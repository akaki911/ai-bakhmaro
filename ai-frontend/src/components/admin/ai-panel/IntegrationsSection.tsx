
import { motion } from 'framer-motion';
import { Download, FileCode2, Flame, KeyRound, RefreshCw, SlidersHorizontal, Sparkles, Copy, Eye, EyeOff, Trash2 } from 'lucide-react';
import { cardVariants } from './constants';
import { useState, useEffect } from 'react';
import { apiKeysService, type ApiKey } from '../../../services/apiKeysService';

interface IntegrationsSectionProps {
  apiKey: string;
  onApiKeyChange: (value: string) => void;
  isRotatingKey: boolean;
  onRotateKey: () => Promise<void>;
  onQuickAction: (message: string) => void;
}

export function IntegrationsSection({ apiKey, onApiKeyChange, isRotatingKey, onRotateKey, onQuickAction }: IntegrationsSectionProps) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [showGeneratedKey, setShowGeneratedKey] = useState(false);

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    try {
      setLoading(true);
      const fetchedKeys = await apiKeysService.listKeys();
      setKeys(fetchedKeys);
    } catch (error) {
      console.error('Failed to load API keys:', error);
      onQuickAction('❌ API გასაღებების ჩატვირთვა ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      onQuickAction('⚠️ გთხოვთ შეიყვანოთ გასაღების სახელი');
      return;
    }

    try {
      setCreatingKey(true);
      const result = await apiKeysService.createKey({
        name: newKeyName,
        scopes: ['mail:send'],
      });
      
      setGeneratedKey(result.apiKey);
      setShowGeneratedKey(true);
      setNewKeyName('');
      onQuickAction('✅ ახალი API გასაღები შექმნილია');
      
      // Reload the keys list
      await loadKeys();
    } catch (error) {
      console.error('Failed to create API key:', error);
      onQuickAction('❌ API გასაღების შექმნა ვერ მოხერხდა');
    } finally {
      setCreatingKey(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm('დარწმუნებული ხართ, რომ გსურთ ამ გასაღების გაუქმება?')) {
      return;
    }

    try {
      await apiKeysService.revokeKey(keyId);
      onQuickAction('✅ გასაღები გაუქმებულია');
      await loadKeys();
    } catch (error) {
      console.error('Failed to revoke API key:', error);
      onQuickAction('❌ გასაღების გაუქმება ვერ მოხერხდა');
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    onQuickAction('✅ გასაღები დაკოპირებულია');
  };

  return (
    <section id="gurulo-section-integrations" className="grid gap-6 scroll-mt-28 lg:grid-cols-2">
      <motion.div variants={cardVariants} initial="hidden" animate="visible" className="glass-elevated p-6 text-white">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-semibold">API გასაღებები</h3>
          <KeyRound className="h-5 w-5 text-[#7C6CFF]" />
        </div>

        {/* Create new key section */}
        <div className="mt-6 space-y-4">
          <label className="block text-xs uppercase tracking-[0.3em] text-[#6F7280]">ახალი გასაღების შექმნა</label>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="გასაღების სახელი (მაგ: Production Key)"
              className="flex-1 rounded-2xl border border-[#7C6CFF33] bg-[#1A1F2F]/80 px-3 py-2 text-sm text-[#E6E8EC] focus:outline-none focus:ring-2 focus:ring-[#7C6CFF80]"
            />
            <button
              onClick={handleCreateKey}
              disabled={creatingKey || !newKeyName.trim()}
              className="inline-flex items-center rounded-full border border-[#7C6CFF33] bg-[#7C6CFF]/20 px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#7C6CFF]/30 disabled:opacity-50"
            >
              <KeyRound className="mr-2 h-4 w-4" /> {creatingKey ? 'შექმნა...' : 'შექმნა'}
            </button>
          </div>

          {/* Show generated key */}
          {generatedKey && (
            <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-4">
              <p className="text-sm font-semibold text-green-400 mb-2">⚠️ შეინახეთ ეს გასაღები უსაფრთხო ადგილას!</p>
              <div className="flex items-center gap-2">
                <input
                  type={showGeneratedKey ? 'text' : 'password'}
                  value={generatedKey}
                  readOnly
                  className="flex-1 rounded-lg border border-green-500/30 bg-[#1A1F2F]/80 px-3 py-2 text-sm text-[#E6E8EC] font-mono"
                />
                <button
                  onClick={() => setShowGeneratedKey(!showGeneratedKey)}
                  className="p-2 rounded-lg border border-green-500/30 bg-[#1A1F2F]/80 hover:bg-[#242B3F]"
                >
                  {showGeneratedKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => handleCopyKey(generatedKey)}
                  className="p-2 rounded-lg border border-green-500/30 bg-[#1A1F2F]/80 hover:bg-[#242B3F]"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-green-300/70 mt-2">ეს გასაღები მხოლოდ ერთხელ ჩანს. შემდეგ აღარ შეძლებთ მის ნახვას.</p>
            </div>
          )}
        </div>

        {/* Keys list */}
        <div className="mt-6 space-y-3">
          <label className="block text-xs uppercase tracking-[0.3em] text-[#6F7280]">
            არსებული გასაღებები ({keys.length})
          </label>
          
          {loading ? (
            <div className="text-center py-4 text-[#A0A4AD]">იტვირთება...</div>
          ) : keys.length === 0 ? (
            <div className="text-center py-4 text-[#A0A4AD]">გასაღებები არ არის</div>
          ) : (
            <div className="space-y-2">
              {keys.map((key) => (
                <div
                  key={key.keyId}
                  className="rounded-2xl border border-[#7C6CFF26] bg-[#181C2A]/80 p-3 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{key.name}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-[#A0A4AD]">
                      <span>შექმნილია: {key.createdAt.toLocaleDateString('ka-GE')}</span>
                      {key.lastUsedAt && (
                        <span>გამოყენებული: {key.lastUsedAt.toLocaleDateString('ka-GE')}</span>
                      )}
                      <span>გამოყენების რაოდენობა: {key.usageCount}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {key.isActive ? (
                      <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">აქტიური</span>
                    ) : (
                      <span className="px-2 py-1 rounded-full bg-gray-500/20 text-gray-400 text-xs">გაუქმებული</span>
                    )}
                    {key.isActive && (
                      <button
                        onClick={() => handleRevokeKey(key.keyId)}
                        className="p-2 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400"
                        title="გაუქმება"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 rounded-2xl border border-[#7C6CFF26] bg-[#181C2A]/80 p-4 text-sm text-[#E6E8EC]">
          <p className="font-semibold text-white">დაცვა</p>
          <p className="mt-1 text-[#A0A4AD]">
            გასაღებები ინახება დაშიფრული სახით. გაუქმებული გასაღებები მაშინვე წყვეტს მუშაობას.
          </p>
        </div>
      </motion.div>

      <motion.div variants={cardVariants} initial="hidden" animate="visible" className="glass-elevated p-6 text-white">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-semibold">სწრაფი მოქმედებები</h3>
          <FileCode2 className="h-5 w-5 text-[#7C6CFF]" />
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <QuickActionButton
            label="SDK სინქი"
            description="განაახლეთ კლიენტის SDK-ები ბოლოს დაყენებული კონფიგურაციით"
            icon={<RefreshCw className="h-4 w-4" />}
            onClick={() => onQuickAction('SDK სინქრონიზაცია ინიცირებულია')}
          />
          <QuickActionButton
            label="Shadow Deploy"
            description="ტესტური გარემოში ჩართეთ ახალი მოდელები მომხმარებლის გარეშე"
            icon={<Sparkles className="h-4 w-4" />}
            onClick={() => onQuickAction('Shadow deployment მოდული გააქტიურდა')}
          />
          <QuickActionButton
            label="Voice Blueprint"
            description="ჩატვირთეთ რეკომენდებული ხმის პარამეტრები"
            icon={<Download className="h-4 w-4" />}
            onClick={() => onQuickAction('Voice blueprint გადმოწერილია')}
          />
          <QuickActionButton
            label="Cloud Profiler"
            description="გაანალიზეთ ანიმაციების შესრულება რეალურ დროში"
            icon={<Flame className="h-4 w-4" />}
            onClick={() => onQuickAction('Cloud Drift profiler ჩაირთო')}
          />
        </div>
      </motion.div>
    </section>
  );
}

interface QuickActionButtonProps {
  label: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}

function QuickActionButton({ label, description, icon, onClick }: QuickActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border border-[#7C6CFF26] bg-[#181C2A]/80 px-4 py-3 text-left text-sm text-white transition hover:-translate-y-1 hover:bg-[#1F2435]"
    >
      <div className="flex items-center justify-between">
        <span>{label}</span>
        {icon}
      </div>
      <p className="mt-2 text-xs text-[#A0A4AD]">{description}</p>
    </button>
  );
}
