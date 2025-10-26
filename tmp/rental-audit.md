# Rental Domain Audit

Search keywords: ``booking|bookings|calendar|cottage|hotel|vehicle|horse|snowmobile|provider|providers|finance|bank|commission|notification|rental``

## .github/workflows/ci-cd-pipeline.yml
- Line 70: (notification) echo "📣 Deployment notifications can be added here (Slack, Email, etc.)."

## .github/workflows/firebase-deploy.yml
- Line 58: (notification) echo "📢 Deployment notification..."

## .github/workflows/firebase-hosting-merge.yml
- Line 53: (notification) echo "📢 Deployment notification..."

## README.md
- Line 17: (booking, cottage, hotel, provider) All booking, cottage, hotel, and provider modules were removed. Any remaining references to those domains should be treated as bugs and reported.
- Line 77: (cottage) > ⚠️ Production deployments must source every `VITE_FIREBASE_*` value from environment variables. The repository now ships only placeholder fallbacks to support local scaffolding, and the retired `bakhmaro-cottages` project identifiers are forbidden in production bundles.

## ai-frontend/.env.example
- Line 52: (provider) VITE_AI_PROVIDER=groq

## ai-frontend/pages/api/auth/me.ts
- Line 7: (provider) role: 'CUSTOMER' | 'PROVIDER' | 'SUPER_ADMIN';
- Line 81: (provider) // Check for session cookies (Provider/Customer sessions)
- Line 92: (provider) email: 'provider@bakhmaro.ge',
- Line 93: (provider) role: 'PROVIDER',
- Line 94: (provider) displayName: 'Provider User'

## ai-frontend/src/AdminLogs.tsx
- Line 15: (calendar) Calendar,
- Line 39: (booking, cottage, hotel, vehicle) const [resourceFilter, setResourceFilter] = useState<'all' | 'cottage' | 'hotel' | 'vehicle' | 'user' | 'booking'>('all');
- Line 105: (cottage) case 'cottage': return '🏠';
- Line 106: (hotel) case 'hotel': return '🏨';
- Line 107: (vehicle) case 'vehicle': return '🚗';
- Line 109: (booking) case 'booking': return '📅';
- Line 116: (cottage) case 'cottage': return 'კოტეჯი';
- Line 117: (hotel) case 'hotel': return 'სასტუმრო';
- Line 118: (vehicle) case 'vehicle': return 'ტრანსპორტი';
- Line 120: (booking) case 'booking': return 'ჯავშანი';
- Line 269: (cottage) <option value="cottage">კოტეჯები</option>
- Line 270: (hotel) <option value="hotel">სასტუმროები</option>
- Line 271: (vehicle) <option value="vehicle">ტრანსპორტი</option>
- Line 273: (booking) <option value="booking">ჯავშნები</option>
- Line 348: (calendar) <Calendar className="w-4 h-4 text-gray-400 mr-2" />

## ai-frontend/src/AdminMyProfile.tsx
- Line 12: (calendar) CalendarCheck,
- Line 69: (provider) : user?.role === 'PROVIDER_ADMIN'
- Line 71: (provider) : user?.role === 'PROVIDER'
- Line 146: (calendar) icon: CalendarCheck,

## ai-frontend/src/AdminPanel.tsx
- Line 10: (calendar) Calendar,
- Line 65: (provider) if (!isAuthenticated || !user || (user.role !== 'SUPER_ADMIN' && user.role !== 'PROVIDER')) {
- Line 360: (calendar) <Calendar className="w-10 h-10 text-green-200" />
- Line 407: (calendar) <Calendar className="w-8 h-8 text-green-200" />
- Line 502: (booking) onClick={() => navigateToSection('bookings')}
- Line 512: (cottage) onClick={() => navigateToSection('cottages')}
- Line 522: (vehicle) onClick={() => navigateToSection('vehicles')}
- Line 532: (calendar) onClick={() => navigateToSection('calendar')}
- Line 535: (calendar) <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400 mx-auto mb-2" />

## ai-frontend/src/App.tsx
- Line 9: (provider) import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
- Line 12: (provider) import { AuthProvider } from './contexts/AuthContext';
- Line 13: (provider) import { ThemeProvider } from './contexts/ThemeContext';
- Line 113: (provider) <QueryClientProvider client={queryClient}>
- Line 114: (provider) <AuthProvider>
- Line 115: (provider) <ThemeProvider>
- Line 121: (provider) </ThemeProvider>
- Line 122: (provider) </AuthProvider>
- Line 123: (provider) </QueryClientProvider>

## ai-frontend/src/HorseForm.tsx
- Line 9: (horse) interface Horse {
- Line 29: (horse) interface HorseFormProps {
- Line 30: (horse) editingHorse?: Horse | null;
- Line 35: (horse) export default function HorseForm({ editingHorse, onSave, onCancel }: HorseFormProps) {
- Line 57: (horse) if (editingHorse) {
- Line 59: (horse) name: editingHorse.name || '',
- Line 60: (horse) breed: editingHorse.breed || '',
- Line 61: (horse) pricePerDay: editingHorse.pricePerDay || 0,
- Line 62: (horse) pricePerHour: editingHorse.pricePerHour || 0,
- Line 63: (horse) age: editingHorse.age || 0,
- Line 64: (horse) color: editingHorse.color || '',
- Line 65: (horse) height: editingHorse.height || '',
- Line 66: (horse) temperament: editingHorse.temperament || '',
- Line 67: (horse) experience: editingHorse.experience || '',
- Line 68: (horse) location: editingHorse.location || '',
- Line 69: (horse) description: editingHorse.description || '',
- Line 70: (horse) isAvailable: editingHorse.isAvailable ?? true
- Line 72: (horse) setExistingImages(editingHorse.images || []);
- Line 74: (horse) }, [editingHorse]);
- Line 107: (horse) const imageRef = ref(storage, `horses/${Date.now()}_${image.name}`);
- Line 129: (horse) const horseData = {
- Line 136: (horse) if (editingHorse?.id) {
- Line 137: (horse) await updateDoc(doc(db, 'horses', editingHorse.id), horseData);
- Line 140: (horse) await addDoc(collection(db, 'horses'), {
- Line 141: (horse) ...horseData,
- Line 149: (horse) console.error('Error saving horse:', error);
- Line 174: (horse) {editingHorse ? 'ცხენის რედაქტირება' : 'ახალი ცხენის დამატება'}
- Line 420: (horse) {editingHorse ? 'განახლება' : 'შენახვა'}

## ai-frontend/src/HotelBookingForm.tsx
- Line 3: (booking, hotel) export default function HotelBookingForm() {
- Line 6: (booking, hotel) <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Hotel bookings unavailable</h1>
- Line 8: (hotel) Direct hotel reservations are no longer managed here. Transition to the AI workspace dashboards to coordinate partner

## ai-frontend/src/SnowmobileForm.tsx
- Line 10: (snowmobile) interface Snowmobile {
- Line 32: (snowmobile) interface SnowmobileFormProps {
- Line 33: (snowmobile) editingSnowmobile?: Snowmobile | null;
- Line 38: (snowmobile) export default function SnowmobileForm({ editingSnowmobile, onSave, onCancel }: SnowmobileFormProps) {
- Line 62: (snowmobile) if (editingSnowmobile) {
- Line 64: (snowmobile) name: editingSnowmobile.name || '',
- Line 65: (snowmobile) brand: editingSnowmobile.brand || '',
- Line 66: (snowmobile) model: editingSnowmobile.model || '',
- Line 67: (snowmobile) year: editingSnowmobile.year || new Date().getFullYear(),
- Line 68: (snowmobile) pricePerDay: editingSnowmobile.pricePerDay || 0,
- Line 69: (snowmobile) pricePerHour: editingSnowmobile.pricePerHour || 0,
- Line 70: (snowmobile) engineSize: editingSnowmobile.engineSize || '',
- Line 71: (snowmobile) trackLength: editingSnowmobile.trackLength || '',
- Line 72: (snowmobile) maxSpeed: editingSnowmobile.maxSpeed || '',
- Line 73: (snowmobile) capacity: editingSnowmobile.capacity || 1,
- Line 74: (snowmobile) isAvailable: editingSnowmobile.isAvailable ?? true,
- Line 75: (snowmobile) location: editingSnowmobile.location || '',
- Line 76: (snowmobile) description: editingSnowmobile.description || '',
- Line 77: (snowmobile) fuelType: editingSnowmobile.fuelType || 'ბენზინი',
- Line 78: (snowmobile) images: editingSnowmobile.images || []
- Line 81: (snowmobile) }, [editingSnowmobile]);
- Line 98: (snowmobile) const snowmobileData = {
- Line 104: (snowmobile) if (editingSnowmobile) {
- Line 105: (snowmobile) await updateDoc(doc(db, 'snowmobiles', editingSnowmobile.id), snowmobileData);
- Line 108: (snowmobile) await addDoc(collection(db, 'snowmobiles'), {
- Line 109: (snowmobile) ...snowmobileData,
- Line 117: (snowmobile) console.error('Error saving snowmobile:', error);
- Line 135: (snowmobile) {editingSnowmobile ? 'თოვლმავლის რედაქტირება' : 'ახალი თოვლმავალი'}
- Line 162: (snowmobile) placeholder="მაგ: Arctic Cat Snowmobile"

## ai-frontend/src/VehicleBookingForm.tsx
- Line 3: (booking, vehicle) export default function VehicleBookingForm() {
- Line 6: (booking, vehicle) <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Vehicle bookings unavailable</h1>
- Line 8: (vehicle) The legacy vehicle reservation form has been retired. Please coordinate logistics through the AI workspace tools instead.

## ai-frontend/src/components/AIAssistantEnhanced.tsx
- Line 704: (provider) const AUTHORIZED_AI_ROLES = ["SUPER_ADMIN", "PROVIDER_ADMIN", "ADMIN"]; // Authorized roles
- Line 1573: (booking) 💡 მაგალითი: "რა ფუნქციებია BookingService-ში?" ან "როგორ მუშაობს ბრონირების სისტემა?"

## ai-frontend/src/components/AIDashboardShell.tsx
- Line 4: (provider) import { AIModeProvider } from '../contexts/AIModeContext';
- Line 5: (provider) import { AssistantModeProvider } from '../contexts/AssistantModeContext';
- Line 6: (provider) import { PermissionsProvider } from '../contexts/PermissionsContext';
- Line 7: (provider) import { FilePreviewProvider } from '../contexts/FilePreviewProvider';
- Line 30: (provider) <AIModeProvider>
- Line 31: (provider) <AssistantModeProvider>
- Line 32: (provider) <PermissionsProvider>
- Line 33: (provider) <FilePreviewProvider>
- Line 44: (provider) </FilePreviewProvider>
- Line 45: (provider) </PermissionsProvider>
- Line 46: (provider) </AssistantModeProvider>
- Line 47: (provider) </AIModeProvider>

## ai-frontend/src/components/AIDeveloper/tabs/ConsoleTab.tsx
- Line 4: (provider) import { DevConsoleProvider } from '../../../contexts/DevConsoleContext';
- Line 30: (provider) <DevConsoleProvider>
- Line 32: (provider) </DevConsoleProvider>

## ai-frontend/src/components/AIDeveloperPanel.tsx
- Line 41: (provider) import { DevConsoleProvider } from "../contexts/DevConsoleContext";
- Line 1110: (provider) <DevConsoleProvider>
- Line 1460: (provider) </DevConsoleProvider>

## ai-frontend/src/components/AIMemoryManager/ContextActions.tsx
- Line 4: (calendar) Calendar,
- Line 39: (calendar) case 'system': return <Calendar className="w-4 h-4 text-yellow-400" />;

## ai-frontend/src/components/AdminMessagingDashboard.tsx
- Line 21: (calendar) Calendar,
- Line 68: (provider) const isAdmin = user && ['SUPER_ADMIN', 'ADMIN', 'PROVIDER_ADMIN'].includes(user.role);
- Line 125: (provider) if (user && (['SUPER_ADMIN', 'ADMIN', 'PROVIDER_ADMIN'].includes(user.role) || user.role === 'CUSTOMER')) {
- Line 171: (booking) bookingId: data.bookingId,
- Line 275: (booking) if (conversation.bookingId) {
- Line 287: (booking) if (conversation.metadata?.bookingReference) {
- Line 288: (booking) adminConversation.tags.push(conversation.metadata.bookingReference);
- Line 759: (calendar) <Calendar className="w-3 h-3" />
- Line 761: (booking) {selectedConversation.bookingId && (
- Line 764: (booking) <span>ბრონირება: {selectedConversation.bookingId}</span>
- Line 1220: (booking) {conversation.bookingId && `ჯავშანი: ${conversation.bookingId}`}
- Line 1231: (booking) {conversation.type === 'booking' ? 'ჯავშანი' :

## ai-frontend/src/components/AdvancedSearch.tsx
- Line 50: (provider) // Preview functionality using unified provider

## ai-frontend/src/components/AutoUpdateControl.tsx
- Line 269: (notification) {/* Toast Notification */}

## ai-frontend/src/components/Backup/BackupTab.tsx
- Line 363: (provider) {t('backup.enableHint', 'Enable the backup provider from Settings to restore automated snapshots.')}

## ai-frontend/src/components/BankInfoForm.tsx
- Line 5: (bank) interface BankInfo {
- Line 6: (bank) bankName: string;
- Line 7: (bank) bankAccount: string;
- Line 10: (bank) interface BankInfoFormProps {
- Line 11: (bank) bankInfo: BankInfo;
- Line 12: (bank) onChange: (bankInfo: BankInfo) => void;
- Line 17: (bank) const georgianBanks = [
- Line 19: (bank) { value: 'საქართველოს ბანკი (Bank of Georgia)', label: '🏦 საქართველოს ბანკი (Bank of Georgia)' },
- Line 28: (bank) export default function BankInfoForm({
- Line 29: (bank) bankInfo,
- Line 33: (bank) }: BankInfoFormProps) {
- Line 35: (bank) const [customBankName, setCustomBankName] = useState('');
- Line 37: (bank) const handleBankChange = (field: keyof BankInfo, value: string) => {
- Line 39: (bank) ...bankInfo,
- Line 98: (bank) value={bankInfo.bankName}
- Line 100: (bank) handleBankChange('bankName', e.target.value);
- Line 102: (bank) setCustomBankName('');
- Line 109: (bank) {georgianBanks.map((bank) => (
- Line 110: (bank) <option key={bank.value} value={bank.value}>
- Line 111: (bank) {bank.label}
- Line 118: (bank) {bankInfo.bankName === 'სხვა' && (
- Line 125: (bank) value={customBankName}
- Line 127: (bank) setCustomBankName(e.target.value);
- Line 128: (bank) handleBankChange('bankName', e.target.value);
- Line 145: (bank) value={bankInfo.bankAccount}
- Line 146: (bank) onChange={(e) => handleBankChange('bankAccount', e.target.value)}
- Line 176: (bank) export type { BankInfo };

## ai-frontend/src/components/BookingModal.tsx
- Line 3: (booking) interface BookingModalProps {
- Line 4: (cottage) cottageId?: string;
- Line 5: (cottage) cottageName?: string;
- Line 8: (booking) booking?: unknown;
- Line 10: (booking) onBookingUpdated?: () => void;
- Line 13: (booking) export default function BookingModal({
- Line 14: (cottage) cottageName,
- Line 17: (booking) }: BookingModalProps) {
- Line 27: (booking) Legacy booking disabled
- Line 29: (cottage) {cottageName ? (
- Line 31: (booking, cottage) The historic booking workflow for <span className="font-medium">{cottageName}</span> has been retired as part of the
- Line 36: (booking, cottage) Cottage bookings are no longer available in this environment.
- Line 43: (rental) To manage AI workspace resources, please use the new admin surfaces instead of the legacy rental forms.

## ai-frontend/src/components/Calendar.tsx
- Line 4: (calendar) interface CalendarProps {
- Line 16: (calendar) const Calendar: React.FC<CalendarProps> = ({
- Line 54: (calendar) // Generate calendar days
- Line 55: (calendar) const calendarDays = [];
- Line 59: (calendar) calendarDays.push(null);
- Line 64: (calendar) calendarDays.push(day);
- Line 131: (calendar) {/* Calendar Header */}
- Line 171: (calendar) {/* Calendar Body */}
- Line 185: (calendar) {/* Calendar Grid */}
- Line 187: (calendar) {calendarDays.map((day, index) => {
- Line 278: (calendar) export default Calendar;

## ai-frontend/src/components/ChatPanel.tsx
- Line 974: (cottage) 'Bakhmaro Cottages Platform',

## ai-frontend/src/components/CheckpointManager.tsx
- Line 5: (calendar) Calendar, User, FileText, Info, Archive,
- Line 197: (calendar) <Calendar className="w-3 h-3" />

## ai-frontend/src/components/EnhancedMessagingSystem.tsx
- Line 29: (provider) senderRole: 'CUSTOMER' | 'PROVIDER_ADMIN' | 'SUPER_ADMIN';
- Line 50: (booking) bookingId?: string;
- Line 51: (booking) bookingContext?: {
- Line 53: (cottage, horse, hotel, snowmobile, vehicle) listingType: 'cottage' | 'hotel' | 'vehicle' | 'horse' | 'snowmobile';
- Line 95: (booking) const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'support' | 'bookings' | 'urgent'>('all');
- Line 152: (booking) bookingId: 'booking-123',
- Line 153: (booking) bookingContext: {
- Line 155: (cottage) listingType: 'cottage',
- Line 275: (booking) if (selectedConversation?.bookingContext && quickReply.placeholders) {
- Line 282: (booking) content = content.replace(`{${placeholder}}`, selectedConversation.bookingContext?.listingName || '');
- Line 285: (booking) content = content.replace(`{${placeholder}}`, selectedConversation.bookingContext?.checkIn || '');
- Line 345: (booking) ) || conversation.bookingContext?.listingName.toLowerCase().includes(searchTerm.toLowerCase());
- Line 351: (booking) case 'bookings': return !conversation.isSupport && conversation.bookingId;
- Line 362: (cottage) case 'cottage': return '🏡';
- Line 363: (hotel) case 'hotel': return '🏨';
- Line 364: (vehicle) case 'vehicle': return '🚙';
- Line 365: (horse) case 'horse': return '🐎';
- Line 366: (snowmobile) case 'snowmobile': return '🛷';
- Line 455: (booking) { key: 'bookings', label: 'ჯავშნები' },
- Line 488: (booking) {conversation.bookingContext && (
- Line 490: (booking) {getListingIcon(conversation.bookingContext.listingType)}
- Line 499: (booking) : conversation.bookingContext?.listingName ||
- Line 506: (booking) {conversation.bookingContext && (
- Line 508: (booking) {conversation.bookingContext.checkIn} - {conversation.bookingContext.checkOut}
- Line 561: (booking) {selectedConversation.bookingContext && (
- Line 563: (booking) {selectedConversation.bookingContext.listingName} •
- Line 564: (booking) {selectedConversation.bookingContext.checkIn} - {selectedConversation.bookingContext.checkOut}

## ai-frontend/src/components/FilePreview.tsx
- Line 3: (provider) * Uses FilePreviewProvider for centralized state management
- Line 19: (calendar) IconCalendar,
- Line 329: (calendar) <IconCalendar size={14} className="text-gray-500" />

## ai-frontend/src/components/GitHubManagement/GitHubAnalyticsTab.tsx
- Line 8: (calendar) Calendar,

## ai-frontend/src/components/GitHubManagement/GitHubVersionTab.tsx
- Line 7: (calendar) Calendar,
- Line 636: (calendar) <Calendar size={12} />

## ai-frontend/src/components/HorseCard.tsx
- Line 3: (calendar) import { Activity, MapPin, Calendar, DollarSign, Edit, Trash2, Eye, Clock, Users } from 'lucide-react';
- Line 5: (horse) interface Horse {
- Line 25: (horse) interface HorseCardProps {
- Line 26: (horse) horse: Horse;
- Line 33: (horse) export default function HorseCard({ horse, viewMode, onEdit, onDelete, onView }: HorseCardProps) {
- Line 51: (horse) {horse.images && horse.images.length > 0 ? (
- Line 53: (horse) src={horse.images[0]}
- Line 54: (horse) alt={horse.name}
- Line 66: (horse) <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">{horse.name}</h3>
- Line 68: (horse) horse.isAvailable
- Line 72: (horse) {horse.isAvailable ? 'ხელმისაწვდომი' : 'დაკავებული'}
- Line 77: (horse) <span>{horse.breed}</span>
- Line 78: (horse) {horse.age > 0 && <span>{horse.age} წლის</span>}
- Line 79: (horse) {horse.color && <span>{horse.color}</span>}
- Line 82: (horse) <span>{horse.location}</span>
- Line 90: (horse) {horse.pricePerHour > 0 && (
- Line 92: (horse) {horse.pricePerHour}₾/საათი
- Line 96: (horse) {horse.pricePerDay}₾/დღე
- Line 141: (horse) {horse.images && horse.images.length > 0 ? (
- Line 143: (horse) src={horse.images[0]}
- Line 144: (horse) alt={horse.name}
- Line 155: (horse) horse.isAvailable
- Line 159: (horse) {horse.isAvailable ? 'ხელმისაწვდომი' : 'დაკავებული'}
- Line 163: (horse) {horse.pricePerDay > 0 && (
- Line 167: (horse) {horse.pricePerDay}₾/დღე
- Line 175: (horse) <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{horse.name}</h3>
- Line 177: (horse) <span className="font-medium">{horse.breed}</span>
- Line 178: (horse) {horse.age > 0 && <span>{horse.age} წლის</span>}
- Line 179: (horse) {horse.color && <span>{horse.color}</span>}
- Line 183: (horse) {horse.description && (
- Line 185: (horse) {horse.description}
- Line 192: (horse) <span>{horse.location}</span>
- Line 195: (horse) {horse.height && (
- Line 198: (horse) <span>სიმაღლე: {horse.height}</span>
- Line 202: (horse) {horse.temperament && (
- Line 205: (horse) <span>{horse.temperament}</span>
- Line 209: (horse) {horse.experience && (
- Line 212: (horse) <span>{horse.experience}</span>
- Line 217: (horse) {horse.pricePerHour > 0 && (
- Line 222: (horse) <span className="font-medium">{horse.pricePerHour}₾/საათი</span>
- Line 225: (calendar) <Calendar className="w-4 h-4 mr-1" />
- Line 226: (horse) <span className="font-medium">{horse.pricePerDay}₾/დღე</span>
- Line 233: (horse) <span>დამატებული: {formatDate(horse.createdAt)}</span>
- Line 234: (horse) <span>განახლდა: {formatDate(horse.updatedAt)}</span>

## ai-frontend/src/components/MessagingNotificationSystem.tsx
- Line 7: (notification) interface NotificationData {
- Line 20: (notification) const MessagingNotificationSystem: React.FC = () => {
- Line 23: (notification) const [notifications, setNotifications] = useState<NotificationData[]>([]);
- Line 24: (notification) const [showNotifications, setShowNotifications] = useState(false);
- Line 28: (notification) // Mock notifications - replace with real-time Firebase listener
- Line 29: (notification) const mockNotifications: NotificationData[] = [
- Line 56: (notification) setNotifications(mockNotifications);
- Line 59: (notification) // Play notification sound
- Line 60: (notification) const playNotificationSound = () => {
- Line 69: (notification) // Send email notification for unread messages
- Line 70: (notification) const sendEmailNotification = async (notification: NotificationData) => {
- Line 72: (notification) console.log('Sending email notification:', notification);
- Line 76: (notification) // Check for new notifications and send alerts
- Line 77: (notification) const unreadNotifications = notifications.filter(n => !n.isRead);
- Line 79: (notification) if (unreadNotifications.length > 0) {
- Line 80: (notification) // Play sound for urgent notifications
- Line 81: (notification) const urgentNotifications = unreadNotifications.filter(n => n.priority === 'urgent');
- Line 82: (notification) if (urgentNotifications.length > 0) {
- Line 83: (notification) playNotificationSound();
- Line 86: (notification) // Send browser notification if permission granted
- Line 87: (notification) if (Notification.permission === 'granted') {
- Line 88: (notification) unreadNotifications.forEach(notification => {
- Line 89: (notification) new Notification(notification.title, {
- Line 90: (notification) body: notification.message,
- Line 92: (notification) tag: notification.id
- Line 97: (notification) // Send email notifications after 15 minutes for unread messages
- Line 98: (notification) unreadNotifications.forEach(notification => {
- Line 99: (notification) const timeSinceReceived = Date.now() - notification.timestamp.getTime();
- Line 101: (notification) sendEmailNotification(notification);
- Line 105: (notification) }, [notifications, soundEnabled]);
- Line 107: (notification) // Request notification permission
- Line 109: (notification) if (Notification.permission === 'default') {
- Line 110: (notification) Notification.requestPermission();
- Line 114: (notification) const markAsRead = (notificationId: string) => {
- Line 115: (notification) setNotifications(prev =>
- Line 116: (notification) prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
- Line 120: (notification) const clearAllNotifications = () => {
- Line 121: (notification) setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
- Line 124: (notification) const unreadCount = notifications.filter(n => !n.isRead).length;
- Line 126: (notification) const getNotificationIcon = (type: string, priority: string) => {
- Line 145: (notification) {/* Notification Bell */}
- Line 147: (notification) onClick={() => setShowNotifications(!showNotifications)}
- Line 162: (notification) {/* Notifications Dropdown */}
- Line 163: (notification) {showNotifications && (
- Line 179: (notification) onClick={clearAllNotifications}
- Line 190: (notification) onClick={() => setShowNotifications(false)}
- Line 202: (notification) {/* Notifications List */}
- Line 204: (notification) {notifications.length === 0 ? (
- Line 214: (notification) notifications.map((notification) => (
- Line 216: (notification) key={notification.id}
- Line 217: (notification) onClick={() => markAsRead(notification.id)}
- Line 219: (notification) getPriorityColor(notification.priority)
- Line 223: (notification) !notification.isRead ? 'font-medium' : 'opacity-75'
- Line 228: (notification) {getNotificationIcon(notification.type, notification.priority)}
- Line 235: (notification) {notification.title}
- Line 237: (notification) {!notification.isRead && (
- Line 244: (notification) {notification.message}
- Line 249: (notification) {notification.timestamp.toLocaleString('ka-GE', {
- Line 283: (notification) export default MessagingNotificationSystem;

## ai-frontend/src/components/MessagingSystem.tsx
- Line 2: (calendar) import { MessageSquare, Send, X, User, Calendar, Paperclip, Phone, Mail, Search, MoreVertical, Image, File, CheckCheck, Check, Clock } from 'lucide-react';
- Line 22: (booking) bookingId: string;
- Line 39: (booking) selectedBooking?: any | null;
- Line 42: (booking) export default function MessagingSystem({ isOpen, onClose, selectedBooking }: MessagingSystemProps) {
- Line 56: (booking) // If specific booking is selected, create or find conversation
- Line 57: (booking) if (selectedBooking) {
- Line 58: (booking) handleBookingConversation();
- Line 60: (booking) // If no booking selected, create/find support conversation
- Line 64: (booking) }, [user, isOpen, selectedBooking]);
- Line 66: (booking) const handleBookingConversation = async () => {
- Line 67: (booking) if (!selectedBooking || !user) return;
- Line 69: (booking) // Find existing conversation for this booking
- Line 71: (booking) conv.bookingId === selectedBooking.id
- Line 78: (booking) // Create new conversation for this booking
- Line 80: (booking) selectedBooking.id,
- Line 81: (booking) selectedBooking.hostInfo?.name || 'მეპატრონე',
- Line 82: (booking) selectedBooking.hostInfo?.phone || 'მეპატრონე',
- Line 83: (booking) selectedBooking.property
- Line 143: (booking) bookingId: data.bookingId || '',
- Line 258: (booking) const createConversation = async (bookingId: string, otherUserId: string, otherUserName: string, listingTitle: string) => {
- Line 262: (booking) const isSupport = bookingId.startsWith('support-');
- Line 265: (booking) bookingId,
- Line 267: (booking) listingType: isSupport ? 'support' : 'booking',
- Line 534: (calendar) <Calendar className="w-3 h-3" />
- Line 535: (booking) <span>ბრონირება #{selectedConversation.bookingId}</span>

## ai-frontend/src/components/ReplitInterface.tsx
- Line 123: (provider) // Preview functionality using unified provider

## ai-frontend/src/components/SecurityAuditTab.tsx
- Line 17: (calendar) Calendar,
- Line 65: (provider) const availableRoles = ['SUPER_ADMIN', 'PROVIDER', 'CUSTOMER'];
- Line 186: (provider) 'PROVIDER': 'მომწოდებელი',
- Line 434: (calendar) <Calendar className="w-3 h-3" />

## ai-frontend/src/components/SnowmobileCard.tsx
- Line 9: (calendar) Calendar,
- Line 17: (snowmobile) interface Snowmobile {
- Line 39: (snowmobile) interface SnowmobileCardProps {
- Line 40: (snowmobile) snowmobile: Snowmobile;
- Line 46: (snowmobile) export default function SnowmobileCard({ snowmobile, viewMode, onEdit, onDelete }: SnowmobileCardProps) {
- Line 63: (snowmobile) <h3 className="text-xl font-bold text-gray-900 dark:text-white">{snowmobile.name}</h3>
- Line 65: (snowmobile) snowmobile.isAvailable
- Line 69: (snowmobile) {snowmobile.isAvailable ? (
- Line 86: (snowmobile) {snowmobile.brand} {snowmobile.model} ({snowmobile.year})
- Line 90: (snowmobile) {snowmobile.capacity} მგზავრი
- Line 94: (snowmobile) {snowmobile.location}
- Line 96: (snowmobile) {snowmobile.engineSize && (
- Line 99: (snowmobile) {snowmobile.engineSize}
- Line 109: (snowmobile) {snowmobile.pricePerDay}₾
- Line 112: (snowmobile) {snowmobile.pricePerHour > 0 && (
- Line 114: (snowmobile) {snowmobile.pricePerHour}₾/სთ
- Line 160: (snowmobile) <h3 className="text-lg font-bold text-gray-900 dark:text-white">{snowmobile.name}</h3>
- Line 162: (snowmobile) {snowmobile.brand} {snowmobile.model}
- Line 168: (snowmobile) snowmobile.isAvailable
- Line 172: (snowmobile) {snowmobile.isAvailable ? (
- Line 189: (snowmobile) {snowmobile.pricePerDay}₾
- Line 192: (snowmobile) {snowmobile.pricePerHour > 0 && (
- Line 194: (snowmobile) {snowmobile.pricePerHour}₾ საათში
- Line 202: (calendar) <Calendar className="w-4 h-4 mr-2 text-gray-400" />
- Line 203: (snowmobile) <span>წელი: {snowmobile.year}</span>
- Line 208: (snowmobile) <span>მგზავრები: {snowmobile.capacity}</span>
- Line 213: (snowmobile) <span>მდებარეობა: {snowmobile.location}</span>
- Line 216: (snowmobile) {snowmobile.engineSize && (
- Line 219: (snowmobile) <span>ძრავა: {snowmobile.engineSize}</span>
- Line 223: (snowmobile) {snowmobile.maxSpeed && (
- Line 226: (snowmobile) <span>მაქს. სიჩქარე: {snowmobile.maxSpeed}</span>
- Line 230: (snowmobile) {snowmobile.trackLength && (
- Line 233: (snowmobile) <span>ლენტის სიგრძე: {snowmobile.trackLength}</span>
- Line 239: (snowmobile) {snowmobile.description && (
- Line 242: (snowmobile) {snowmobile.description}

## ai-frontend/src/components/UserProfile.tsx
- Line 7: (booking) onNavigate: (section: 'bookings' | 'favorites' | 'reviews') => void;
- Line 34: (booking) const handleMenuClick = (section: 'bookings' | 'favorites' | 'reviews') => {
- Line 58: (booking) onClick={() => handleMenuClick('bookings')}

## ai-frontend/src/components/admin/AIDeveloperManagementPanel.tsx
- Line 81: (provider) provider: string;
- Line 421: (provider) provider: fallbackStatus?.provider ?? 'offline',

## ai-frontend/src/components/admin/ai-panel/AnalyticsPanel.tsx
- Line 14: (provider) provider: string;

## ai-frontend/src/components/admin/ai-panel/FallbackControlCard.tsx
- Line 8: (provider) provider: string;
- Line 13: (provider) export function FallbackControlCard({ enabled, forced, provider, isUpdating, onToggle }: FallbackControlCardProps) {
- Line 16: (provider) const providerLabel = provider === 'openai' ? 'OpenAI' : 'ლოკალური';
- Line 32: (provider) როდესაც backup რეჟიმი ჩართულია, პასუხებს იღებთ {providerLabel} მოდელიდან, რათა გურულოსგან ელოდოთ თანმიმდევრულ პასუხებს Groq-ის შეფერხებების დროს.

## ai-frontend/src/components/futuristic-chat/AIChatInterface.tsx
- Line 160: (booking) 'booking',
- Line 161: (cottage) 'cottage',
- Line 320: (cottage) en: "I'm here to help with guest topics only—Bakhmaro cottages, pricing, weather, routes, and tours. I can't assist with technical questions.",
- Line 953: (cottage) 'Which cottages are free in Bakhmaro this month?',
- Line 954: (cottage) 'What is the nightly rate for a cottage for 4 guests?',
- Line 973: (cottage) 'Which cottage fits 6 guests and what are the prices?',
- Line 974: (rental) 'Which local attractions do you recommend during a rental?',
- Line 1538: (calendar) 'Style: Short sentences with UI navigation steps (e.g., "Go to: Menu → Calendar → +").',

## ai-frontend/src/components/futuristic-chat/FuturisticChatPanel.tsx
- Line 617: (cottage) onClick={() => onSuggestionSelect(language === 'ka' ? 'შეამოწმე ბახმაროს კოტეჯები' : 'Check cottages in Bakhmaro')}
- Line 624: (cottage) {language === 'ka' ? 'შეამოწმე კოტეჯები' : 'Check cottages'}

## ai-frontend/src/contexts/AIModeContext.tsx
- Line 44: (provider) export const AIModeProvider = ({ children }: { children: ReactNode }) => {
- Line 83: (provider) return <AIModeContext.Provider value={value}>{children}</AIModeContext.Provider>;

## ai-frontend/src/contexts/AssistantModeContext.tsx
- Line 116: (provider) export const AssistantModeProvider = ({ children }: { children: ReactNode }) => {
- Line 257: (provider) return <AssistantModeContext.Provider value={value}>{children}</AssistantModeContext.Provider>;

## ai-frontend/src/contexts/AuthContext.tsx
- Line 24: (booking) import type { AuthContextType, BookingUserData, User, UserRole } from './AuthContext.types';
- Line 25: (booking) export type { UserRole, AuthContextType, BookingUserData, User } from './AuthContext.types';
- Line 47: (provider) export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
- Line 345: (booking) const createUserDocument = async (firebaseUser: FirebaseUser, role: UserRole = 'CUSTOMER', additionalData?: BookingUserData) => {
- Line 362: (notification) notifications: { email: true, sms: !!additionalData?.phoneNumber, push: false },
- Line 366: (booking) totalBookings: 0,
- Line 368: (booking) registrationSource: 'booking_form'
- Line 678: (booking) const register = async (email: string, password: string, role: UserRole = 'CUSTOMER', additionalData?: BookingUserData) => {
- Line 868: (provider) } else if (currentUserRole === 'PROVIDER') {
- Line 869: (provider) logoutTarget = '/login/provider';
- Line 870: (provider) console.log('🔧 [AUTH] PROVIDER logout - redirecting to provider login');
- Line 963: (booking) // Booking integration methods - simplified
- Line 964: (booking) const registerFromBookingForm = async (userData: BookingUserData): Promise<User> => {
- Line 982: (booking) // SOL-431: Update route advice after registration from booking form
- Line 1329: (booking) registerFromBookingForm,
- Line 1361: (provider) return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;

## ai-frontend/src/contexts/AuthContext.types.ts
- Line 1: (provider) export type UserRole = 'CUSTOMER' | 'PROVIDER' | 'PROVIDER_ADMIN' | 'SUPER_ADMIN';
- Line 22: (booking) export interface BookingUserData {
- Line 36: (booking) register: (email: string, password: string, role?: UserRole, additionalData?: BookingUserData) => Promise<void>;
- Line 44: (booking) registerFromBookingForm: (userData: BookingUserData) => Promise<User>;

## ai-frontend/src/contexts/DebugContext.tsx
- Line 7: (provider) interface DebugProviderProps {
- Line 11: (provider) export const DebugProvider: React.FC<DebugProviderProps> = ({ children }) => {
- Line 50: (provider) <DebugContext.Provider value={value}>
- Line 52: (provider) </DebugContext.Provider>

## ai-frontend/src/contexts/DevConsoleContext.tsx
- Line 6: (provider) // Provider component props
- Line 7: (provider) interface DevConsoleProviderProps {
- Line 11: (provider) // Provider component
- Line 12: (provider) export const DevConsoleProvider: React.FC<DevConsoleProviderProps> = ({ children }) => {
- Line 55: (provider) <DevConsoleContext.Provider value={contextValue}>
- Line 57: (provider) </DevConsoleContext.Provider>

## ai-frontend/src/contexts/FilePreviewProvider.tsx
- Line 2: (provider) * Unified File Preview Provider
- Line 13: (provider) interface FilePreviewProviderProps {
- Line 19: (provider) export const FilePreviewProvider: React.FC<FilePreviewProviderProps> = ({
- Line 230: (provider) <FilePreviewContext.Provider value={value}>
- Line 232: (provider) </FilePreviewContext.Provider>
- Line 236: (provider) export default FilePreviewProvider;

## ai-frontend/src/contexts/PermissionsContext.tsx
- Line 30: (provider) interface PermissionsProviderProps {
- Line 44: (provider) export const PermissionsProvider: React.FC<PermissionsProviderProps> = ({ children }) => {
- Line 83: (provider) <PermissionsContext.Provider value={contextValue}>
- Line 85: (provider) </PermissionsContext.Provider>

## ai-frontend/src/contexts/ThemeContext.tsx
- Line 7: (provider) interface ThemeProviderProps {
- Line 11: (provider) export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
- Line 73: (provider) <ThemeContext.Provider value={value}>
- Line 75: (provider) </ThemeContext.Provider>

## ai-frontend/src/contexts/useAIMode.ts
- Line 8: (provider) throw new Error('useAIMode must be used within an AIModeProvider');

## ai-frontend/src/contexts/useAssistantMode.ts
- Line 8: (provider) throw new Error('useAssistantMode must be used within an AssistantModeProvider');

## ai-frontend/src/contexts/useAuth.ts
- Line 7: (provider) console.error('❌ [AUTH] useAuth must be used within an AuthProvider');
- Line 8: (provider) console.error('❌ [AUTH] Make sure App is wrapped with AuthProvider');
- Line 15: (provider) login: async () => ({ success: false, error: 'AuthProvider not found' }),
- Line 36: (provider) reason: 'AuthProvider not found',
- Line 56: (booking) registerFromBookingForm: async () => ({ id: '', email: '', role: 'CUSTOMER', authMethod: 'firebase' }),

## ai-frontend/src/contexts/useDebug.ts
- Line 7: (provider) throw new Error('useDebug must be used within a DebugProvider');

## ai-frontend/src/contexts/useDevConsole.ts
- Line 7: (provider) throw new Error('useDevConsole must be used within a DevConsoleProvider');

## ai-frontend/src/contexts/useFilePreview.ts
- Line 7: (provider) throw new Error('useFilePreview must be used within a FilePreviewProvider');

## ai-frontend/src/contexts/usePermissions.ts
- Line 7: (provider) throw new Error('usePermissions must be used within a PermissionsProvider');

## ai-frontend/src/contexts/useTheme.ts
- Line 7: (provider) throw new Error('useTheme must be used within a ThemeProvider');

## ai-frontend/src/features/devconsole-v2/components/AdvancedFilters.tsx
- Line 48: (booking) { value: '/api/booking/*', label: '📅 Booking APIs', color: 'bg-blue-100 text-blue-800' },

## ai-frontend/src/features/devconsole-v2/components/RealTimeErrorMonitor.tsx
- Line 205: (notification) {language === 'ka' ? 'ხმის შეტყობინებები' : 'Sound Notifications'}
- Line 347: (notification) {/* Toast Notifications for Critical Errors */}

## ai-frontend/src/hooks/useBackupService.ts
- Line 53: (provider) provider: string | null;
- Line 95: (provider) provider: (data as any).provider ?? null,
- Line 107: (provider) provider: null,
- Line 118: (provider) provider: null,

## ai-frontend/src/hooks/useStubData.ts
- Line 4: (provider) // No stub data - all providers should be real
- Line 6: (provider) export const useStubData = (providerId: string | undefined) => {
- Line 7: (provider) const [provider, setProvider] = useState<User | null>(null);
- Line 12: (provider) console.time('STUB: Provider data fetch');
- Line 16: (provider) setProvider(null);
- Line 17: (provider) setError('No stub data available - use real providers only');
- Line 19: (provider) console.timeEnd('STUB: Provider data fetch');
- Line 23: (provider) }, [providerId]);
- Line 25: (provider) const updateProvider = async (updates: Partial<User>) => {
- Line 26: (provider) console.time('STUB: Provider update');
- Line 30: (provider) console.timeEnd('STUB: Provider update');
- Line 37: (provider) provider,
- Line 40: (provider) updateProvider

## ai-frontend/src/i18n/locales/en.json
- Line 677: (cottage) "text": "Hi! I'm Gurulo, your Bakhmaro trip guide. Share when you're visiting and I'll line up cozy cottages and ideas.",
- Line 679: (cottage) { "label": "Next weekend availability", "value": "Check Bakhmaro cottages next weekend" },
- Line 685: (cottage) "onlyConsumerTopics": "I'm here to help with guest topics only—Bakhmaro cottages, pricing, weather, routes, and tours. I can't assist with technical questions.",

## ai-frontend/src/index.css
- Line 372: (provider) .admin-role-badge--provider {
- Line 385: (provider) .dark .admin-role-badge--provider {
- Line 2682: (calendar) /* Calendar dark mode improvements */
- Line 2683: (calendar) .dark .calendar-day {
- Line 2688: (calendar) .dark .calendar-day:hover {
- Line 2743: (booking) /* Custom animations for booking completion glow effects */
- Line 2906: (cottage) /* Consistent aspect ratios for cottage images */
- Line 2907: (cottage) .cottage-image {
- Line 3038: (calendar) /* Custom Calendar Styles */
- Line 3039: (calendar) .custom-calendar {
- Line 3043: (calendar) .custom-calendar .calendar-day {
- Line 3047: (calendar) .custom-calendar .calendar-day:hover {
- Line 3059: (calendar) input[type="date"]::-webkit-calendar-picker-indicator {
- Line 3066: (calendar) .georgian-calendar {
- Line 3070: (calendar) .georgian-calendar .month-name {
- Line 3075: (calendar) .georgian-calendar .day-name {
- Line 3081: (calendar) /* Smooth animations for calendar navigation */
- Line 3082: (calendar) .calendar-fade-enter {
- Line 3087: (calendar) .calendar-fade-enter-active {
- Line 3093: (calendar) .calendar-fade-exit {
- Line 3098: (calendar) .calendar-fade-exit-active {
- Line 3264: (calendar) /* Compact calendar specific styles */
- Line 3265: (calendar) .compact-calendar {
- Line 3270: (calendar) .compact-calendar .calendar-day {
- Line 3276: (calendar) .compact-calendar .calendar-header {
- Line 3280: (calendar) .compact-calendar .calendar-body {
- Line 3411: (booking) /* Booking card responsive fixes */

## ai-frontend/src/lib/firebase/auth.ts
- Line 15: (provider) PhoneAuthProvider,
- Line 38: (provider) PhoneAuthProvider,
- Line 54: (provider) AuthProvider,

## ai-frontend/src/pages/AdminPasskeyLogin.tsx
- Line 32: (provider) const oauthProviders = [
- Line 261: (provider) {oauthProviders.map(({ name, Icon }) => (

## ai-frontend/src/pages/DeviceManagement.tsx
- Line 3: (calendar) import { Shield, Smartphone, Monitor, Trash2, Calendar, MapPin, Info, CheckCircle, AlertTriangle } from 'lucide-react';
- Line 110: (provider) case 'PROVIDER': return 'bg-blue-100 text-blue-800 border-blue-200';
- Line 259: (provider) device.registeredRole === 'PROVIDER' ? 'პროვაიდერი' :
- Line 263: (calendar) <Calendar className="h-4 w-4 mr-1" />

## ai-frontend/src/pages/ProviderLogin.tsx
- Line 7: (provider) const ProviderLogin: React.FC = () => {
- Line 23: (provider) navigate('/provider/dashboard');
- Line 101: (provider) onClick={() => navigate('/register?role=provider')}
- Line 122: (provider) export default ProviderLogin;

## ai-frontend/src/pages/RoleSelection.tsx
- Line 99: (provider) const ProviderModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
- Line 123: (provider) navigate('/register?role=provider');
- Line 373: (provider) {/* Provider */}
- Line 375: (provider) onClick={() => handleRoleSelect('provider')}
- Line 426: (provider) <ProviderModal isOpen={selectedModal === 'provider'} onClose={closeModal} />

## ai-frontend/src/schemas/validationSchemas.ts
- Line 4: (booking) // Booking validation schema
- Line 5: (booking) export const bookingSchema = z.object({
- Line 13: (provider) providerId: z.string().min(1, 'პროვაიდერი აუცილებელია'),
- Line 15: (cottage, hotel, vehicle) resourceType: z.enum(['cottage', 'hotel', 'vehicle'], {
- Line 25: (cottage) // Cottage validation schema
- Line 26: (cottage) export const cottageSchema = z.object({
- Line 39: (provider) providerId: z.string().min(1, 'პროვაიდერი აუცილებელია'),
- Line 48: (vehicle) // Vehicle validation schema
- Line 49: (vehicle) export const vehicleSchema = z.object({
- Line 57: (provider) providerId: z.string().min(1, 'პროვაიდერი აუცილებელია'),
- Line 70: (provider) role: z.enum(['CUSTOMER', 'PROVIDER', 'ADMIN', 'SUPER_ADMIN'])
- Line 73: (commission) // Commission validation schema
- Line 74: (commission) export const commissionSchema = z.object({
- Line 75: (booking) bookingId: z.string().min(1, 'ჯავშნის ID აუცილებელია'),
- Line 78: (commission) commissionAmount: z.number().positive('კომისიის თანხა უნდა იყოს დადებითი'),
- Line 82: (hotel) // Hotel validation schema
- Line 83: (hotel) export const hotelSchema = z.object({
- Line 91: (provider) providerId: z.string().min(1, 'პროვაიდერი აუცილებელია'),
- Line 99: (booking) export const validateBooking = (data: unknown) => bookingSchema.safeParse(data);
- Line 100: (cottage) export const validateCottage = (data: unknown) => cottageSchema.safeParse(data);
- Line 101: (vehicle) export const validateVehicle = (data: unknown) => vehicleSchema.safeParse(data);
- Line 103: (commission) export const validateCommission = (data: unknown) => commissionSchema.safeParse(data);
- Line 104: (hotel) export const validateHotel = (data: unknown) => hotelSchema.safeParse(data);

## ai-frontend/src/services/adminAiApi.ts
- Line 78: (provider) provider: string;
- Line 83: (provider) const payload = await request<{ backupMode: boolean; forced: boolean; provider: string; updatedAt: string }>('/fallback');
- Line 87: (provider) provider: payload.provider ?? 'offline',
- Line 93: (provider) const payload = await request<{ backupMode: boolean; forced?: boolean; provider?: string; updatedAt?: string }>(
- Line 104: (provider) provider: payload.provider ?? 'offline',

## ai-frontend/src/services/globalValidationService.ts
- Line 40: (cottage) validateCottageForm(data: any): ValidationResult {
- Line 41: (cottage) return this.validateForm(data, 'cottage');
- Line 44: (booking) validateBookingForm(data: any): ValidationResult {
- Line 45: (booking) return this.validateForm(data, 'booking');
- Line 48: (vehicle) validateVehicleForm(data: any): ValidationResult {
- Line 49: (vehicle) return this.validateForm(data, 'vehicle');
- Line 52: (hotel) validateHotelForm(data: any): ValidationResult {
- Line 53: (hotel) return this.validateForm(data, 'hotel');

## ai-frontend/src/services/messagingService.ts
- Line 70: (booking) bookingReference: subject
- Line 82: (booking, provider) // Helper function to get provider's limited conversations (only their bookings and support)
- Line 83: (provider) export const getProviderConversations = async (providerId: string): Promise<Conversation[]> => {
- Line 87: (provider) // Get conversations where provider is a participant
- Line 88: (provider) const providerConversationsQuery = query(
- Line 90: (provider) where('participantIds', 'array-contains', providerId),
- Line 94: (provider) const snapshot = await getDocs(providerConversationsQuery);
- Line 97: (booking, provider) // Get provider's own bookings to validate conversation access
- Line 98: (booking) const bookingsRef = collection(db, 'bookings');
- Line 99: (booking, provider) const providerBookingsQuery = query(
- Line 100: (booking) bookingsRef,
- Line 101: (provider) where('providerId', '==', providerId)
- Line 103: (booking, provider) const providerBookings = await getDocs(providerBookingsQuery);
- Line 104: (booking, provider) const providerBookingIds = new Set(providerBookings.docs.map(doc => doc.id));
- Line 109: (provider) // Provider can only see:
- Line 111: (booking) // 2. Booking conversations for their own bookings
- Line 114: (booking, provider) (data.type === 'booking' && data.bookingId && providerBookingIds.has(data.bookingId));
- Line 120: (booking) bookingId: data.bookingId,
- Line 143: (provider) console.error('Error fetching provider conversations:', error);
- Line 176: (booking) type: 'booking' | 'support' | 'general';
- Line 177: (booking) bookingId?: string;
- Line 190: (booking) bookingReference?: string;
- Line 263: (provider) // For provider admins, use the restricted function with fallback
- Line 264: (provider) if (userRole === 'PROVIDER_ADMIN') {
- Line 266: (provider) return await getProviderConversations(userId);
- Line 268: (provider) console.warn('⚠️ Provider conversations failed, using fallback:', error);
- Line 290: (booking) bookingId: data.bookingId,
- Line 323: (provider) // This is also the fallback for failed provider/admin queries
- Line 351: (booking) bookingId: data.bookingId,
- Line 651: (booking) type: 'booking' | 'support' | 'general',
- Line 656: (booking) bookingId?: string;
- Line 658: (booking) bookingReference?: string;
- Line 831: (booking) bookingId: data.bookingId,
- Line 902: (provider) if (!userData || !['SUPER_ADMIN', 'ADMIN', 'PROVIDER_ADMIN'].includes(userData.role)) {
- Line 1137: (provider) const isAdmin = userData && ['SUPER_ADMIN', 'ADMIN', 'PROVIDER_ADMIN'].includes(userData.role);
- Line 1325: (provider) if (userRole === 'PROVIDER_ADMIN') {
- Line 1326: (provider) // Provider admins see only conversations related to their properties
- Line 1340: (booking) bookingId: data.bookingId,
- Line 1367: (provider) console.error('Error fetching provider conversations:', error);

## ai-frontend/src/types/autoImprove.ts
- Line 114: (notification) export interface AutoImproveNotificationSettings {
- Line 128: (notification) notificationSettings: AutoImproveNotificationSettings;
- Line 142: (notification) notificationSettings: {

## ai-frontend/src/types/user.ts
- Line 1: (provider) export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'PROVIDER_ADMIN' | 'CUSTOMER';

## ai-frontend/src/utils/createTestLogs.ts
- Line 67: (cottage) await logger.logAPI('TestModule', 'GET /api/cottages', 200, undefined, 'test-user-id', 'test@example.com');
- Line 68: (booking) await logger.logAPI('TestModule', 'POST /api/bookings', 201, undefined, 'test-user-id', 'test@example.com');
- Line 71: (cottage) await logger.logAPI('TestModule', 'PUT /api/cottages/1', 500, undefined, 'test-user-id', 'test@example.com');

## ai-frontend/src/utils/georgianCulturalAdapter.ts
- Line 227: (bank) class GeorgianBankPaymentService {
- Line 231: (bank) ? 'https://api.libertybank.ge'
- Line 232: (bank) : 'https://sandbox.libertybank.ge';

## ai-frontend/src/utils/validation.ts
- Line 300: (bank) const bankAndAccount = cleanIban.substring(4);
- Line 301: (bank) if (bankAndAccount.length !== 18) {
- Line 305: (bank) if (!/^[A-Z0-9]{18}$/.test(bankAndAccount)) {

## ai-frontend/tsconfig.app.tsbuildinfo
- Line 1: (bank, booking, calendar, horse, hotel, notification, provider, snowmobile, vehicle) {"root":["./src/adminlogs.tsx","./src/adminmyprofile.tsx","./src/adminpanel.tsx","./src/app.tsx","./src/horseform.tsx","./src/hotelbookingform.tsx","./src/layout.tsx","./src/login.tsx","./src/snowmobileform.tsx","./src/vehiclebookingform.tsx","./src/firebase.ts","./src/firebaseconfig.ts","./src/global.d.ts","./src/main.tsx","./src/setupeventsource.ts","./src/setupfetch.ts","./src/vite-env.d.ts","./src/api/autoimprove.ts","./src/components/aiassistantenhanced.tsx","./src/components/aidashboardshell.tsx","./src/components/aideveloperpanel.tsx","./src/components/aimemorymanager.tsx","./src/components/airolloutmanager.tsx","./src/components/aiservicestatus.tsx","./src/components/activitylog.tsx","./src/components/adminmessagingdashboard.tsx","./src/components/advancedsearch.tsx","./src/components/autoupdatecontrol.tsx","./src/components/autoupdatemonitoringdashboard.tsx","./src/components/backupsystemdashboard.tsx","./src/components/bankinfoform.tsx","./src/components/bookingmodal.tsx","./src/components/calendar.tsx","./src/components/canarydeploymentpanel.tsx","./src/components/chatpanel.tsx","./src/components/checkpointmanager.tsx","./src/components/codeeditor.tsx","./src/components/consolelogger.ts","./src/components/devconsolepanel.tsx","./src/components/emptystate.tsx","./src/components/enhancedmessagerenderer.tsx","./src/components/enhancedmessagingsystem.tsx","./src/components/enterprisecollaboration.tsx","./src/components/errorboundary.tsx","./src/components/errortoastcontainer.tsx","./src/components/explorerpanel.tsx","./src/components/fallbackfilelist.tsx","./src/components/filepreview.tsx","./src/components/filetree.tsx","./src/components/fileviewer.tsx","./src/components/footer.tsx","./src/components/georgianprogrammingterminology.tsx","./src/components/header.tsx","./src/components/horsecard.tsx","./src/components/liveagentview.tsx","./src/components/liveprogresspanel.tsx","./src/components/messagerenderer.tsx","./src/components/messagingnotificationsystem.tsx","./src/components/messagingsystem.tsx","./src/components/ownerfilter.tsx","./src/components/performancedashboard.tsx","./src/components/performancemetrics.tsx","./src/components/planbuildtoggle.tsx","./src/components/postapplyhealthcheck.tsx","./src/components/postapplyverification.tsx","./src/components/protectedroute.tsx","./src/components/reactdevtoolsdebugger.tsx","./src/components/replitassistantpanel.tsx","./src/components/replitinterface.tsx","./src/components/roleselectionwithdebug.tsx","./src/components/searchinput.tsx","./src/components/securecopybutton.tsx","./src/components/securityaudittab.tsx","./src/components/sessionsidebar.tsx","./src/components/snowmobilecard.tsx","./src/components/statusfilter.tsx","./src/components/switch.tsx","./src/components/systemmonitoringdashboard.tsx","./src/components/termsagreementmodal.tsx","./src/components/themetoggle.tsx","./src/components/userprofile.tsx","./src/components/validationmodal.tsx","./src/components/viewtoggle.tsx","./src/components/warningtoast.tsx","./src/components/aideveloper/autoimprove/aiassistantactivitycard.tsx","./src/components/aideveloper/autoimprove/autoimproveemptystate.tsx","./src/components/aideveloper/autoimprove/brainstatuscard.tsx","./src/components/aideveloper/autoimprove/filterbar.tsx","./src/components/aideveloper/autoimprove/gurulogauge.tsx","./src/components/aideveloper/autoimprove/gurulometricbadge.tsx","./src/components/aideveloper/autoimprove/improvesidebar.tsx","./src/components/aideveloper/autoimprove/metriccard.tsx","./src/components/aideveloper/autoimprove/metricstrip.tsx","./src/components/aideveloper/autoimprove/theme.ts","./src/components/aideveloper/autoimprove/types.ts","./src/components/aideveloper/autoimprove/brain/controls.tsx","./src/components/aideveloper/autoimprove/brain/history.tsx","./src/components/aideveloper/autoimprove/brain/lastoutcome.tsx","./src/components/aideveloper/autoimprove/brain/livefeed.tsx","./src/components/aideveloper/autoimprove/brain/metrics.tsx","./src/components/aideveloper/autoimprove/brain/nextaction.tsx","./src/components/aideveloper/autoimprove/brain/statusstrip.tsx","./src/components/aideveloper/autoimprove/brain/thinkingnow.tsx","./src/components/aideveloper/autoimprove/brain/types.ts","./src/components/aideveloper/helpers/checklistbadge.tsx","./src/components/aideveloper/helpers/diffviewer.tsx","./src/components/aideveloper/helpers/riskbadge.tsx","./src/components/aideveloper/helpers/statusindicators.tsx","./src/components/aideveloper/helpers/index.ts","./src/components/aideveloper/memory/memorycontrolspanel.tsx","./src/components/aideveloper/tabs/autoimprovetab.tsx","./src/components/aideveloper/tabs/backuptab.tsx","./src/components/aideveloper/tabs/chattab.tsx","./src/components/aideveloper/tabs/consoletab.tsx","./src/components/aideveloper/tabs/explorertab.tsx","./src/components/aideveloper/tabs/githubtab.tsx","./src/components/aideveloper/tabs/logstab.tsx","./src/components/aideveloper/tabs/memorytab.tsx","./src/components/aideveloper/tabs/settingstab.tsx","./src/components/aideveloper/tabs/index.ts","./src/components/aideveloper/tabs/autoimprove/brainpage.tsx","./src/components/aideveloper/tabs/autoimprove/constants/metrictonemap.ts","./src/components/aideveloper/tabs/autoimprove/hooks/useautoimprovemetrics.ts","./src/components/aideveloper/tabs/autoimprove/hooks/usemonitorstatus.ts","./src/components/aideveloper/tabs/secrets/confirmdelete.tsx","./src/components/aideveloper/tabs/secrets/scannerpanel.tsx","./src/components/aideveloper/tabs/secrets/secreteditormodal.tsx","./src/components/aideveloper/tabs/secrets/secretlist.tsx","./src/components/aideveloper/tabs/secrets/secretspage.tsx","./src/components/aideveloper/tabs/secrets/usagesdrawer.tsx","./src/components/aideveloper/tabs/secrets/index.ts","./src/components/aideveloper/tabs/secrets/types.ts","./src/components/aideveloper/tabs/tests/newtestmodal.tsx","./src/components/aideveloper/tabs/tests/testlist.tsx","./src/components/aideveloper/tabs/tests/testrunnerpanel.tsx","./src/components/aideveloper/tabs/tests/testspage.tsx","./src/components/aideveloper/tabs/tests/types.ts","./src/components/aimemorymanager/codepreferences.tsx","./src/components/aimemorymanager/contextactions.tsx","./src/components/aimemorymanager/errorregistry.tsx","./src/components/aimemorymanager/personalinfoeditor.tsx","./src/components/aimemorymanager/rulesmanager.tsx","./src/components/aimemorymanager/statsviewer.tsx","./src/components/aimemorymanager/index.tsx","./src/components/autoimprove/autoimprovetracemonitor.tsx","./src/components/backup/backuptab.tsx","./src/components/chat/composer.tsx","./src/components/chat/diffcard.tsx","./src/components/chat/message.tsx","./src/components/chat/settingsmenu.tsx","./src/components/chat/activity/activitytimeline.tsx","./src/components/chat/activity/commandcard.tsx","./src/components/chat/activity/filechangecard.tsx","./src/components/chat/activity/scancard.tsx","./src/components/gitinterface/gitinterface.tsx","./src/components/gitinterface/index.ts","./src/components/safetyswitch/actionpreviewmodal.tsx","./src/components/safetyswitch/progresstracker.tsx","./src/components/safetyswitch/safetyswitch.tsx","./src/components/safetyswitch/index.ts","./src/components/safetyswitch/types.ts","./src/components/shared/errorcard.tsx","./src/components/admin/aidevelopermanagementpanel.tsx","./src/components/admin/aidiagnosticscenter.tsx","./src/components/admin/ai-panel/analyticspanel.tsx","./src/components/admin/ai-panel/analyticssection.tsx","./src/components/admin/ai-panel/chatconfigsection.tsx","./src/components/admin/ai-panel/fallbackcontrolcard.tsx","./src/components/admin/ai-panel/integrationssection.tsx","./src/components/admin/ai-panel/overviewsection.tsx","./src/components/admin/ai-panel/promptspanel.tsx","./src/components/admin/ai-panel/trendcharts.tsx","./src/components/admin/ai-panel/uicustomizationsection.tsx","./src/components/admin/ai-panel/usermanagementsection.tsx","./src/components/admin/ai-panel/userspanel.tsx","./src/components/admin/ai-panel/constants.ts","./src/components/admin/ai-panel/types.ts","./src/components/file-tree/fileoperations.tsx","./src/components/file-tree/filesearch.tsx","./src/components/file-tree/filetreecore.tsx","./src/components/file-tree/filetreenode.tsx","./src/components/file-tree/tabmanager.tsx","./src/components/file-tree/index.ts","./src/components/futuristic-chat/aichatinterface.tsx","./src/components/futuristic-chat/chatcloud.tsx","./src/components/futuristic-chat/futuristicchatpanel.tsx","./src/components/illustrations/gurulofsqillustration.tsx","./src/components/layout/diagnosticbanner.tsx","./src/components/layout/headertokens.ts","./src/components/ui/card.tsx","./src/config/gurulocore.ts","./src/contexts/aimodecontext.tsx","./src/contexts/assistantmodecontext.tsx","./src/contexts/authcontext.tsx","./src/contexts/authcontext.types.ts","./src/contexts/authcontextobject.ts","./src/contexts/debugcontext.tsx","./src/contexts/debugcontext.types.ts","./src/contexts/debugcontextobject.ts","./src/contexts/devconsolecontext.tsx","./src/contexts/devconsolecontext.types.ts","./src/contexts/devconsolecontextobject.ts","./src/contexts/filepreviewcontext.types.ts","./src/contexts/filepreviewcontextobject.ts","./src/contexts/filepreviewprovider.tsx","./src/contexts/permissionscontext.tsx","./src/contexts/permissionscontext.types.ts","./src/contexts/permissionscontextobject.ts","./src/contexts/themecontext.tsx","./src/contexts/themecontext.types.ts","./src/contexts/themecontextobject.ts","./src/contexts/useaimode.ts","./src/contexts/useassistantmode.ts","./src/contexts/useauth.ts","./src/contexts/usedebug.ts","./src/contexts/usedevconsole.ts","./src/contexts/usefilepreview.ts","./src/contexts/usepermissions.ts","./src/contexts/usetheme.ts","./src/features/browsertesting/testingdashboard.tsx","./src/features/connectors/connectormanager.tsx","./src/features/devconsole/commandpalette.tsx","./src/features/devconsole/consolestream.tsx","./src/features/devconsole/devconsolepage.tsx","./src/features/devconsole/jobspanel.tsx","./src/features/devconsole/metricspanel.tsx","./src/features/devconsole/sidebar.tsx","./src/features/devconsole/statusbar.tsx","./src/features/devconsole/testspanel.tsx","./src/features/devconsole/store.ts","./src/features/devconsole-v2/devconsolev2container.tsx","./src/features/devconsole-v2/consolestore.ts","./src/features/devconsole-v2/promptconfig.ts","./src/features/devconsole-v2/storage.ts","./src/features/devconsole-v2/types.ts","./src/features/devconsole-v2/useconsolestream.ts","./src/features/devconsole-v2/components/advancedfilters.tsx","./src/features/devconsole-v2/components/consoletoolbar.tsx","./src/features/devconsole-v2/components/exportmenu.tsx","./src/features/devconsole-v2/components/livemetrics.tsx","./src/features/devconsole-v2/components/logline.tsx","./src/features/devconsole-v2/components/loglist.tsx","./src/features/devconsole-v2/components/metaviewer.tsx","./src/features/devconsole-v2/components/multitabterminal.tsx","./src/features/devconsole-v2/components/realtimeerrormonitor.tsx","./src/features/devconsole-v2/components/servicepanel.tsx","./src/features/devconsole-v2/components/servicesview.tsx","./src/features/devconsole-v2/components/shortcutshelp.tsx","./src/features/devconsole-v2/hooks/userealtimeerrors.ts","./src/features/devconsole-v2/hooks/useterminalstore.ts","./src/features/devconsole-v2/types/terminal.ts","./src/features/devconsole-v2/utils/serviceurls.d.ts","./src/features/file-tree/types.ts","./src/features/file-tree/hooks/usefiletree.ts","./src/features/file-tree/hooks/usefiletreecore.ts","./src/features/secrets/secretsadminpanel.tsx","./src/hooks/useaiservicestate.ts","./src/hooks/useasyncaction.ts","./src/hooks/useattachments.ts","./src/hooks/usebackupservice.ts","./src/hooks/usebrowsertestingroutes.ts","./src/hooks/usecomponenterrorlogging.ts","./src/hooks/usedailygreeting.ts","./src/hooks/usedarkmode.ts","./src/hooks/usedebuglogging.ts","./src/hooks/usediagnosticvisibility.ts","./src/hooks/useerrortoastmanager.ts","./src/hooks/usefeatureflag.ts","./src/hooks/usefileoperations.ts","./src/hooks/usefilepreview.ts","./src/hooks/usefiletree.ts","./src/hooks/usegithubdata.ts","./src/hooks/uselogging.ts","./src/hooks/usememorymanagement.ts","./src/hooks/useperformancemonitor.ts","./src/hooks/useretryfetch.ts","./src/hooks/usesafetyswitch.ts","./src/hooks/usesecureinput.ts","./src/hooks/usestubdata.ts","./src/hooks/usesystemstate.ts","./src/hooks/useuierrorcapture.ts","./src/hooks/useuistate.ts","./src/hooks/memory/useerrorregistry.ts","./src/hooks/memory/usegurulomemory.ts","./src/hooks/memory/usememorycontrols.ts","./src/hooks/memory/usememorysync.ts","./src/hooks/memory/usepersonalinfo.ts","./src/hooks/memory/usestats.ts","./src/i18n/config.ts","./src/layout/adminlayout.tsx","./src/lib/apibase.shared.d.ts","./src/lib/apibase.ts","./src/lib/env.ts","./src/lib/featureflags.ts","./src/lib/identity.ts","./src/lib/singleflight.ts","./src/lib/firebase/auth.ts","./src/lib/firebase/firestore.ts","./src/lib/firebase/storage.ts","./src/lib/sse/autoimprovesse.ts","./src/pages/adminpasskeylogin.tsx","./src/pages/adminpasskeyquicklogin.tsx","./src/pages/customerlogin.tsx","./src/pages/devicemanagement.tsx","./src/pages/githubstub.tsx","./src/pages/gurulamanagementpage.tsx","./src/pages/providerlogin.tsx","./src/pages/roleselection.tsx","./src/pages/memory.tsx","./src/schemas/validationschemas.ts","./src/services/systemcleanerservice.ts","./src/services/activityclient.ts","./src/services/adminaiapi.ts","./src/services/auditservice.ts","./src/services/autoimproveservice.ts","./src/services/autoimprovestorageservice.ts","./src/services/browsertestingrunnerservice.ts","./src/services/enhancedsearchservice.ts","./src/services/feedbackapi.ts","./src/services/globalerrorhandler.ts","./src/services/globalvalidationservice.ts","./src/services/integrationregistryservice.ts","./src/services/loggingservice.ts","./src/services/messagingservice.ts","./src/services/mockdatagenerator.ts","./src/services/secretsadminapi.ts","./src/services/secretsvaultservice.ts","./src/state/brainmachine.ts","./src/types/activity.ts","./src/types/aimemory.ts","./src/types/autoimprove.ts","./src/types/chartjs.d.ts","./src/types/filetree.ts","./src/types/global.d.ts","./src/types/react-chartjs-2.d.ts","./src/types/swr.d.ts","./src/types/user.ts","./src/utils/admintoken.ts","./src/utils/aifallback.ts","./src/utils/backendurl.ts","./src/utils/base64url.ts","./src/utils/cleanmessagingdata.ts","./src/utils/codedecoder.ts","./src/utils/connectionmanager.ts","./src/utils/correlationid.ts","./src/utils/createtestlogs.ts","./src/utils/debugapiwrapper.ts","./src/utils/debughelpers.ts","./src/utils/debugtest.ts","./src/utils/devlogger.ts","./src/utils/devicefingerprint.ts","./src/utils/diffmetrics.ts","./src/utils/enhancedmessageformatter.ts","./src/utils/errorloggingwrapper.ts","./src/utils/featureflags.ts","./src/utils/filetreeutils.ts","./src/utils/firebasecleanup.ts","./src/utils/firebasequotamanager.ts","./src/utils/firestorebatch.ts","./src/utils/georgianchatformatter.ts","./src/utils/georgianculturaladapter.ts","./src/utils/georgiangrammarparser.ts","./src/utils/georgianlanguageenhancer.ts","./src/utils/georgiansupport.ts","./src/utils/georgianterminologymapper.ts","./src/utils/githubtestutils.ts","./src/utils/githubverification.ts","./src/utils/gurulocoreadapter.ts","./src/utils/http.ts","./src/utils/httpheaders.ts","./src/utils/networkerrordetection.ts","./src/utils/ratelimithandler.ts","./src/utils/ratelimitedfetch.ts","./src/utils/searchalgorithms.ts","./src/utils/systemhealthcheck.ts","./src/utils/systemverification.ts","./src/utils/testdebugconsole.ts","./src/utils/time.ts","./src/utils/validation.ts","./src/utils/webauthn_support.ts","./src/utils/ai-panel/colorhelpers.ts","./src/utils/ai-panel/formathelpers.ts","./src/utils/ai-panel/index.ts","./src/utils/ai-panel/statushelpers.ts","./src/utils/ai-panel/uimaphelpers.ts","./src/utils/ai-panel/verification.ts"],"version":"5.9.2"}

## ai-service/.env.example
- Line 114: (provider) # 🧮 AI PROVIDER CONFIGURATION

## ai-service/README.md
- Line 4: (booking) 🤖 **Standalone AI service for the Bakhmaro booking platform**

## ai-service/agents/codex_agent.js
- Line 232: (notification) this.logger.warn('Slack notification failed', error && error.message ? error.message : error);

## ai-service/agents/codex_agent.ts
- Line 277: (notification) this.logger.warn('Slack notification failed', error?.message || error);

## ai-service/code_index.json
- Line 797: (cottage) "attached_assets/CottagePage_1752272130290.tsx": {
- Line 798: (cottage) "path": "attached_assets/CottagePage_1752272130290.tsx",
- Line 817: (calendar) "./components/Calendar",
- Line 819: (booking) "./components/BookingModal"
- Line 822: (cottage) "CottagePage",
- Line 823: (cottage) "fetchCottage",
- Line 829: (cottage) "CottagePage",
- Line 853: (vehicle) "./components/VehicleCard",
- Line 854: (hotel) "./components/HotelCard",
- Line 856: (vehicle) "./types/vehicle",
- Line 857: (hotel) "./types/hotel",
- Line 864: (booking) "handleBookingClick"
- Line 1063: (commission) "backend/routes/commission.js": {
- Line 1064: (commission) "path": "backend/routes/commission.js",
- Line 1095: (provider) "path": "/provider/:providerId/summary"
- Line 1099: (provider) "path": "/provider/:providerId/invoices"
- Line 1103: (commission, provider) "path": "/provider/:providerId/commission-rate"
- Line 1159: (notification) "backend/routes/notifications.js": {
- Line 1160: (notification) "path": "backend/routes/notifications.js",
- Line 1181: (notification) "path": "/:notificationId/read"
- Line 1193: (booking) "path": "/booking-created"
- Line 1229: (commission) "backend/services/commissionService.js": {
- Line 1230: (commission) "path": "backend/services/commissionService.js",
- Line 1240: (commission) "CommissionService"
- Line 1346: (commission) "functions/scheduledCommission.js": {
- Line 1347: (commission) "path": "functions/scheduledCommission.js",
- Line 1435: (bank) "src/AdminBankAccounts.tsx": {
- Line 1436: (bank) "path": "src/AdminBankAccounts.tsx",
- Line 1456: (bank) "./components/BankAccountManager",
- Line 1460: (bank) "AdminBankAccounts",
- Line 1461: (bank) "fetchBankAccounts",
- Line 1470: (bank) "AdminBankAccounts"
- Line 1473: (commission) "src/AdminCommission.tsx": {
- Line 1474: (commission) "path": "src/AdminCommission.tsx",
- Line 1482: (commission) "name": "AdminCommission",
- Line 1496: (commission) "fetchCommissions",
- Line 1497: (commission) "updateCommissionStatus",
- Line 1498: (commission) "deleteCommission",
- Line 1508: (cottage) "src/AdminCottages.tsx": {
- Line 1509: (cottage) "path": "src/AdminCottages.tsx",
- Line 1533: (cottage) "AdminCottages",
- Line 1534: (cottage) "fetchCottages",
- Line 1535: (booking) "fetchBookings",
- Line 1536: (booking, cottage) "fetchCottageBookingsWithGuests",
- Line 1537: (notification) "generateNotifications",
- Line 1538: (cottage) "filterAndSortCottages",
- Line 1540: (cottage) "toggleCottageStatus",
- Line 1542: (cottage) "toggleCottageSelection",
- Line 1543: (cottage) "selectAllCottages",
- Line 1544: (booking, cottage) "getBookingsForCottage",
- Line 1545: (booking, calendar) "renderBookingCalendarModal",
- Line 1546: (booking) "getBookingForDate",
- Line 1548: (calendar) "renderMiniCalendar",
- Line 1555: (cottage) "AdminCottages"
- Line 1595: (horse) "src/AdminHorses.tsx": {
- Line 1596: (horse) "path": "src/AdminHorses.tsx",
- Line 1616: (horse) "./HorseForm",
- Line 1617: (horse) "./components/HorseCard",
- Line 1625: (horse) "AdminHorses",
- Line 1626: (horse) "fetchHorses",
- Line 1628: (horse) "filterAndSortHorses",
- Line 1635: (horse) "AdminHorses"
- Line 1638: (hotel) "src/AdminHotels.tsx": {
- Line 1639: (hotel) "path": "src/AdminHotels.tsx",
- Line 1657: (hotel) "./types/hotel",
- Line 1665: (hotel) "AdminHotels",
- Line 1666: (hotel) "fetchHotels",
- Line 1667: (notification) "generateNotifications",
- Line 1668: (hotel) "filterAndSortHotels",
- Line 1670: (hotel) "toggleHotelStatus",
- Line 1672: (hotel) "toggleHotelSelection",
- Line 1673: (hotel) "selectAllHotels",
- Line 1680: (hotel) "AdminHotels"
- Line 1718: (booking, provider) "src/AdminProviderBookings.tsx": {
- Line 1719: (booking, provider) "path": "src/AdminProviderBookings.tsx",
- Line 1727: (booking, provider) "name": "AdminProviderBookings",
- Line 1741: (booking) "fetchBookings",
- Line 1742: (booking) "updateBookingStatus",
- Line 1752: (provider) "src/AdminProviders.tsx": {
- Line 1753: (provider) "path": "src/AdminProviders.tsx",
- Line 1761: (provider) "name": "AdminProviders",
- Line 1776: (provider) "fetchProviders",
- Line 1777: (provider) "toggleProviderStatus",
- Line 1778: (provider) "deleteProvider"
- Line 1784: (snowmobile) "src/AdminSnowmobiles.tsx": {
- Line 1785: (snowmobile) "path": "src/AdminSnowmobiles.tsx",
- Line 1805: (snowmobile) "./SnowmobileForm",
- Line 1806: (snowmobile) "./components/SnowmobileCard",
- Line 1814: (snowmobile) "AdminSnowmobiles",
- Line 1815: (snowmobile) "fetchSnowmobiles",
- Line 1817: (snowmobile) "filterAndSortSnowmobiles",
- Line 1824: (snowmobile) "AdminSnowmobiles"
- Line 1862: (vehicle) "src/AdminVehicles.tsx": {
- Line 1863: (vehicle) "path": "src/AdminVehicles.tsx",
- Line 1883: (vehicle) "./VehicleForm",
- Line 1884: (vehicle) "./components/VehicleCard",
- Line 1892: (vehicle) "AdminVehicles",
- Line 1893: (vehicle) "fetchVehicles",
- Line 1895: (vehicle) "filterAndSortVehicles",
- Line 1902: (vehicle) "AdminVehicles"
- Line 1935: (cottage) "./CottagePage",
- Line 1936: (booking) "./BookingForm",
- Line 1938: (calendar) "./CalendarView",
- Line 1939: (cottage) "./AdminCottages",
- Line 1940: (cottage) "./CottageForm",
- Line 1941: (vehicle) "./VehiclePage",
- Line 1942: (booking, vehicle) "./VehicleBookingForm",
- Line 1943: (vehicle) "./AdminVehicles",
- Line 1944: (vehicle) "./VehicleForm",
- Line 1945: (vehicle) "./VehiclesList",
- Line 1946: (horse) "./AdminHorses",
- Line 1947: (snowmobile) "./AdminSnowmobiles",
- Line 1950: (bank) "./AdminBankAccounts",
- Line 1952: (hotel) "./AdminHotels",
- Line 1953: (hotel) "./HotelForm",
- Line 1954: (hotel) "./HotelPage",
- Line 1955: (booking, hotel) "./HotelBookingForm",
- Line 1956: (hotel) "./HotelsList",
- Line 1957: (cottage) "./CottagesList",
- Line 1958: (provider) "./ProviderDetails",
- Line 1959: (booking, provider) "./AdminProviderBookings",
- Line 1961: (booking, provider) "./ProviderBookings",
- Line 1964: (booking) "./services/bookingExpirationService",
- Line 1965: (bank) "./components/BankAccountManager",
- Line 1968: (provider) "./AdminProviders",
- Line 1969: (commission) "./AdminCommission",
- Line 1984: (booking) "src/BookingForm.tsx": {
- Line 1985: (booking) "path": "src/BookingForm.tsx",
- Line 2005: (calendar) "./components/Calendar",
- Line 2006: (booking) "./components/BookingAuth",
- Line 2012: (booking) "BookingForm",
- Line 2013: (cottage) "fetchCottage",
- Line 2026: (booking) "BookingForm"
- Line 2029: (calendar) "src/CalendarView.tsx": {
- Line 2030: (calendar) "path": "src/CalendarView.tsx",
- Line 2054: (calendar) "CalendarView",
- Line 2055: (booking) "fetchBookings",
- Line 2057: (booking) "filterAndSortBookings",
- Line 2066: (calendar) "CalendarView"
- Line 2069: (cottage) "src/CottageForm.tsx": {
- Line 2070: (cottage) "path": "src/CottageForm.tsx",
- Line 2078: (cottage) "name": "CottageForm",
- Line 2091: (bank) "./components/BankAccountField",
- Line 2099: (cottage) "CottageForm",
- Line 2100: (cottage) "fetchCottage",
- Line 2126: (cottage) "COTTAGE_AMENITIES",
- Line 2129: (cottage) "CottageForm",
- Line 2133: (cottage) "src/CottagePage.tsx": {
- Line 2134: (cottage) "path": "src/CottagePage.tsx",
- Line 2154: (calendar) "./components/Calendar",
- Line 2156: (booking) "./components/BookingModal"
- Line 2159: (cottage) "CottagePage",
- Line 2160: (cottage) "fetchCottage",
- Line 2166: (cottage) "CottagePage",
- Line 2170: (cottage) "src/CottagesList.tsx": {
- Line 2171: (cottage) "path": "src/CottagesList.tsx",
- Line 2190: (booking) "./components/BookingModal",
- Line 2195: (cottage) "CottagesList",
- Line 2196: (cottage) "fetchCottages",
- Line 2197: (booking) "handleBookingClick",
- Line 2198: (booking) "handleBookingSuccess"
- Line 2203: (cottage) "CottagesList"
- Line 2223: (booking) "./services/bookingService",
- Line 2226: (cottage) "./types/cottage",
- Line 2227: (vehicle) "./types/vehicle"
- Line 2232: (booking) "fetchUserBookings",
- Line 2235: (booking) "getBookingIcon",
- Line 2239: (booking) "getBookingDetails",
- Line 2244: (booking) "BookingCard",
- Line 2246: (booking) "getBookingStatusDisplay"
- Line 2252: (booking) "BookingCard",
- Line 2256: (horse) "src/HorseForm.tsx": {
- Line 2257: (horse) "path": "src/HorseForm.tsx",
- Line 2278: (horse) "HorseForm",
- Line 2288: (horse) "HorseForm"
- Line 2291: (booking, hotel) "src/HotelBookingForm.tsx": {
- Line 2292: (booking, hotel) "path": "src/HotelBookingForm.tsx",
- Line 2311: (booking) "./components/BookingAuth",
- Line 2313: (hotel) "./types/hotel",
- Line 2314: (calendar) "./components/Calendar"
- Line 2317: (booking, hotel) "HotelBookingForm",
- Line 2318: (hotel) "fetchHotel",
- Line 2329: (booking, hotel) "HotelBookingForm"
- Line 2332: (hotel) "src/HotelForm.tsx": {
- Line 2333: (hotel) "path": "src/HotelForm.tsx",
- Line 2351: (hotel) "./types/hotel",
- Line 2355: (bank) "./components/BankAccountField",
- Line 2360: (hotel) "HotelForm",
- Line 2361: (hotel) "fetchHotel",
- Line 2377: (hotel) "HotelForm"
- Line 2380: (hotel) "src/HotelPage.tsx": {
- Line 2381: (hotel) "path": "src/HotelPage.tsx",
- Line 2399: (hotel) "./types/hotel",
- Line 2400: (calendar) "./components/Calendar",
- Line 2404: (hotel) "HotelPage",
- Line 2405: (hotel) "fetchHotel",
- Line 2411: (hotel) "HotelPage"
- Line 2414: (hotel) "src/HotelsList.tsx": {
- Line 2415: (hotel) "path": "src/HotelsList.tsx",
- Line 2432: (hotel) "./types/hotel",
- Line 2434: (hotel) "./components/HotelCard"
- Line 2437: (hotel) "HotelsList",
- Line 2438: (hotel) "fetchHotels"
- Line 2443: (hotel) "HotelsList"
- Line 2472: (booking) "fetchBookings",
- Line 2473: (notification) "generateNotifications",
- Line 2474: (booking) "filterAndSortBookings",
- Line 2476: (booking) "updateBookingStatus",
- Line 2478: (booking) "toggleBookingSelection",
- Line 2479: (booking) "selectAllBookings",
- Line 2514: (notification) "./components/MessagingNotificationSystem"
- Line 2581: (booking) "loadUpcomingBookings",
- Line 2584: (commission) "loadCommission",
- Line 2586: (commission) "handleCommissionPayment",
- Line 2588: (calendar) "navigateToCalendar",
- Line 2590: (booking) "navigateToBookings",
- Line 2593: (booking) "navigateToNewBooking",
- Line 2622: (vehicle) "./components/VehicleCard",
- Line 2623: (hotel) "./components/HotelCard",
- Line 2624: (vehicle) "./types/vehicle",
- Line 2625: (hotel) "./types/hotel",
- Line 2633: (booking) "handleBookingClick"
- Line 2673: (booking, provider) "src/ProviderBookings.tsx": {
- Line 2674: (booking, provider) "path": "src/ProviderBookings.tsx",
- Line 2682: (booking, provider) "name": "ProviderBookings",
- Line 2691: (booking) "./services/bookingService"
- Line 2694: (booking) "fetchBookings"
- Line 2700: (provider) "src/ProviderDetails.tsx": {
- Line 2701: (provider) "path": "src/ProviderDetails.tsx",
- Line 2728: (provider) "ProviderDetails",
- Line 2729: (provider) "fetchProviderData"
- Line 2734: (provider) "ProviderDetails",
- Line 2738: (snowmobile) "src/SnowmobileForm.tsx": {
- Line 2739: (snowmobile) "path": "src/SnowmobileForm.tsx",
- Line 2761: (snowmobile) "SnowmobileForm",
- Line 2768: (snowmobile) "SnowmobileForm"
- Line 2796: (booking) "loadUserBookings",
- Line 2798: (notification) "loadNotifications",
- Line 2799: (booking) "handleCancelBooking",
- Line 2803: (booking) "getBookingStatusColor",
- Line 2804: (notification) "markNotificationAsRead"
- Line 2810: (booking, vehicle) "src/VehicleBookingForm.tsx": {
- Line 2811: (booking, vehicle) "path": "src/VehicleBookingForm.tsx",
- Line 2830: (booking) "./components/BookingAuth",
- Line 2831: (vehicle) "./utils/vehiclePricing",
- Line 2832: (vehicle) "./types/vehicle",
- Line 2836: (booking, vehicle) "VehicleBookingForm",
- Line 2837: (vehicle) "fetchVehicle",
- Line 2847: (booking, vehicle) "VehicleBookingForm"
- Line 2850: (vehicle) "src/VehicleForm.tsx": {
- Line 2851: (vehicle) "path": "src/VehicleForm.tsx",
- Line 2872: (vehicle) "./types/vehicle",
- Line 2873: (bank) "./components/BankAccountField",
- Line 2877: (vehicle) "VehicleForm",
- Line 2878: (vehicle) "fetchVehicle",
- Line 2880: (bank) "handleBankAccountChange",
- Line 2890: (vehicle) "VehicleForm"
- Line 2893: (vehicle) "src/VehiclePage.tsx": {
- Line 2894: (vehicle) "path": "src/VehiclePage.tsx",
- Line 2912: (vehicle) "./types/vehicle",
- Line 2913: (calendar) "./components/Calendar",
- Line 2917: (vehicle) "VehiclePage",
- Line 2918: (vehicle) "fetchVehicle",
- Line 2924: (vehicle) "VehiclePage"
- Line 2927: (vehicle) "src/VehiclesList.tsx": {
- Line 2928: (vehicle) "path": "src/VehiclesList.tsx",
- Line 2945: (vehicle) "./types/vehicle",
- Line 2947: (vehicle) "./components/VehicleCard"
- Line 2950: (vehicle) "VehiclesList",
- Line 2951: (vehicle) "fetchVehicles"
- Line 2956: (vehicle) "VehiclesList"
- Line 3044: (bank) "src/components/BankAccountField.tsx": {
- Line 3045: (bank) "path": "src/components/BankAccountField.tsx",
- Line 3053: (bank) "name": "BankAccountField",
- Line 3059: (bank) "../services/bankAccountService",
- Line 3060: (bank) "../types/bank",
- Line 3075: (bank) "src/components/BankAccountManager.tsx": {
- Line 3076: (bank) "path": "src/components/BankAccountManager.tsx",
- Line 3084: (bank) "name": "BankAccountManager",
- Line 3092: (bank) "../services/bankAccountService",
- Line 3093: (bank) "../types/bank",
- Line 3101: (cottage) "loadLinkedCottages",
- Line 3112: (bank) "src/components/BankInfoForm.tsx": {
- Line 3113: (bank) "path": "src/components/BankInfoForm.tsx",
- Line 3130: (bank) "BankInfoForm",
- Line 3131: (bank) "handleBankChange"
- Line 3136: (bank) "BankInfoForm"
- Line 3139: (booking) "src/components/BookingAuth.tsx": {
- Line 3140: (booking) "path": "src/components/BookingAuth.tsx",
- Line 3160: (booking) "BookingAuth",
- Line 3167: (booking) "BookingAuth"
- Line 3170: (booking) "src/components/BookingModal.tsx": {
- Line 3171: (booking) "path": "src/components/BookingModal.tsx",
- Line 3192: (calendar) "./Calendar",
- Line 3193: (booking) "./BookingAuth",
- Line 3202: (booking) "BookingModal",
- Line 3203: (cottage) "fetchCottage",
- Line 3212: (booking) "proceedWithBooking",
- Line 3218: (booking) "BookingModal"
- Line 3221: (calendar) "src/components/Calendar.tsx": {
- Line 3222: (calendar) "path": "src/components/Calendar.tsx",
- Line 3230: (calendar) "name": "Calendar",
- Line 3298: (cottage) "fetchCottageDetails",
- Line 3438: (notification) "./NotificationSystem",
- Line 3451: (horse) "src/components/HorseCard.tsx": {
- Line 3452: (horse) "path": "src/components/HorseCard.tsx",
- Line 3470: (horse) "HorseCard",
- Line 3476: (horse) "HorseCard"
- Line 3479: (hotel) "src/components/HotelCard.tsx": {
- Line 3480: (hotel) "path": "src/components/HotelCard.tsx",
- Line 3496: (hotel) "../types/hotel"
- Line 3499: (hotel) "HotelCard"
- Line 3504: (hotel) "HotelCard"
- Line 3507: (notification) "src/components/MessagingNotificationSystem.tsx": {
- Line 3508: (notification) "path": "src/components/MessagingNotificationSystem.tsx",
- Line 3516: (notification) "name": "MessagingNotificationSystem",
- Line 3527: (notification) "playNotificationSound",
- Line 3528: (notification) "sendEmailNotification",
- Line 3530: (notification) "clearAllNotifications",
- Line 3531: (notification) "getNotificationIcon",
- Line 3560: (booking) "handleBookingConversation",
- Line 3585: (notification) "src/components/NotificationSystem.tsx": {
- Line 3586: (notification) "path": "src/components/NotificationSystem.tsx",
- Line 3604: (notification) "NotificationSystem",
- Line 3605: (notification) "getNotificationIcon",
- Line 3613: (notification) "NotificationSystem"
- Line 3768: (commission, provider) "src/components/ProviderCommissionDashboard.tsx": {
- Line 3769: (commission, provider) "path": "src/components/ProviderCommissionDashboard.tsx",
- Line 3777: (commission, provider) "name": "ProviderCommissionDashboard",
- Line 3786: (commission) "fetchCommissionData",
- Line 3902: (snowmobile) "src/components/SnowmobileCard.tsx": {
- Line 3903: (snowmobile) "path": "src/components/SnowmobileCard.tsx",
- Line 3921: (snowmobile) "SnowmobileCard"
- Line 3926: (snowmobile) "SnowmobileCard"
- Line 4030: (booking) "src/components/UserBookingsSection.tsx": {
- Line 4031: (booking) "path": "src/components/UserBookingsSection.tsx",
- Line 4039: (booking) "name": "UserBookingsSection",
- Line 4048: (booking) "../services/bookingExpirationService",
- Line 4052: (booking) "fetchUserBookings",
- Line 4144: (vehicle) "src/components/VehicleCard.tsx": {
- Line 4145: (vehicle) "path": "src/components/VehicleCard.tsx",
- Line 4161: (vehicle) "../types/vehicle"
- Line 4164: (vehicle) "VehicleCard"
- Line 4169: (vehicle) "VehicleCard"
- Line 4256: (provider) "name": "AuthProvider",
- Line 4293: (provider) "name": "DebugProvider",
- Line 4322: (provider) "name": "PermissionsProvider",
- Line 4334: (booking) "checkFirstBookingCompletion",
- Line 4357: (provider) "name": "ThemeProvider",
- Line 4399: (booking) "src/hooks/useBookingQueries.ts": {
- Line 4400: (booking) "path": "src/hooks/useBookingQueries.ts",
- Line 4408: (booking) "name": "bookingKeys",
- Line 4412: (booking, provider) "name": "useProviderBookings",
- Line 4416: (booking) "name": "useUserBookings",
- Line 4420: (booking) "name": "useCreateBooking",
- Line 4424: (booking) "name": "useUpdateBooking",
- Line 4428: (booking) "name": "useDeleteBooking",
- Line 4432: (booking, provider) "name": "usePrefetchProviderBookings",
- Line 4442: (booking, provider) "useProviderBookings",
- Line 4443: (booking) "useUserBookings",
- Line 4444: (booking) "useCreateBooking",
- Line 4445: (booking) "useUpdateBooking",
- Line 4446: (booking) "useDeleteBooking",
- Line 4447: (booking, provider) "usePrefetchProviderBookings"
- Line 4608: (booking) "canViewBooking",
- Line 4609: (booking) "canManageBookingStatus",
- Line 4610: (booking, provider) "canViewProviderBookings",
- Line 4611: (bank) "canViewBankAccounts",
- Line 4612: (bank) "canManageBankAccounts",
- Line 4614: (bank) "canEditBankAccount",
- Line 4640: (provider) "updateProvider"
- Line 4696: (cottage) "validateCottage",
- Line 4697: (booking) "validateBooking",
- Line 4698: (vehicle) "validateVehicle",
- Line 4699: (hotel) "validateHotel",
- Line 4767: (cottage) "src/pages/Cottages/CottageForm.tsx": {
- Line 4768: (cottage) "path": "src/pages/Cottages/CottageForm.tsx",
- Line 4776: (cottage) "name": "CottageForm",
- Line 4789: (bank) "../../components/BankAccountField",
- Line 4793: (cottage) "CottageForm",
- Line 4794: (bank) "loadSavedBankAccounts",
- Line 4795: (cottage) "fetchCottage",
- Line 4804: (bank) "handleBankAccountSelect",
- Line 4816: (cottage) "CottageForm",
- Line 4820: (cottage) "src/pages/Cottages/NewCottagePage.tsx": {
- Line 4821: (cottage) "path": "src/pages/Cottages/NewCottagePage.tsx",
- Line 4836: (cottage) "../../CottageForm",
- Line 4840: (cottage) "NewCottagePage"
- Line 4845: (cottage) "NewCottagePage"
- Line 4857: (booking) "name": "bookingSchema",
- Line 4861: (cottage) "name": "cottageSchema",
- Line 4865: (vehicle) "name": "vehicleSchema",
- Line 4873: (commission) "name": "commissionSchema",
- Line 4877: (hotel) "name": "hotelSchema",
- Line 4881: (booking) "name": "validateBooking",
- Line 4885: (cottage) "name": "validateCottage",
- Line 4889: (vehicle) "name": "validateVehicle",
- Line 4897: (commission) "name": "validateCommission",
- Line 4901: (hotel) "name": "validateHotel",
- Line 4909: (booking) "validateBooking",
- Line 4910: (cottage) "validateCottage",
- Line 4911: (vehicle) "validateVehicle",
- Line 4913: (commission) "validateCommission",
- Line 4914: (hotel) "validateHotel"
- Line 4945: (bank) "src/services/bankAccountService.ts": {
- Line 4946: (bank) "path": "src/services/bankAccountService.ts",
- Line 4954: (bank) "name": "bankAccountService",
- Line 4960: (bank) "../types/bank"
- Line 4967: (booking) "src/services/bookingExpirationService.ts": {
- Line 4968: (booking) "path": "src/services/bookingExpirationService.ts",
- Line 4976: (booking) "name": "BookingExpirationService",
- Line 4980: (booking) "name": "bookingExpirationService",
- Line 4990: (booking) "BookingExpirationService"
- Line 4995: (booking) "src/services/bookingService.ts": {
- Line 4996: (booking) "path": "src/services/bookingService.ts",
- Line 5004: (booking, provider) "name": "getBookingsByProviderId",
- Line 5008: (booking) "name": "createBooking",
- Line 5012: (booking) "name": "updateBooking",
- Line 5016: (booking) "name": "deleteBooking",
- Line 5020: (provider) "name": "getReviewsByProviderId",
- Line 5024: (booking) "name": "getBookingsByUser",
- Line 5028: (cottage) "name": "getCottages",
- Line 5032: (vehicle) "name": "getVehicles",
- Line 5036: (hotel) "name": "getHotels",
- Line 5040: (provider) "name": "calculateProviderStats",
- Line 5048: (provider) "calculateProviderStats"
- Line 5184: (bank) "./bankAccountService",
- Line 5185: (bank) "../types/bank"
- Line 5239: (provider) "name": "getProviderConversations",
- Line 5265: (notification) "src/services/notificationService.ts": {
- Line 5266: (notification) "path": "src/services/notificationService.ts",
- Line 5274: (notification) "name": "notificationService",
- Line 5385: (provider) "name": "addProviderReply",
- Line 5389: (booking) "name": "getUserBookings",
- Line 5507: (booking) "name": "registerCustomerDuringBooking",
- Line 5551: (bank) "src/types/bank.ts": {
- Line 5552: (bank) "path": "src/types/bank.ts",
- Line 5565: (cottage) "src/types/cottage.ts": {
- Line 5566: (cottage) "path": "src/types/cottage.ts",
- Line 5593: (hotel) "src/types/hotel.ts": {
- Line 5594: (hotel) "path": "src/types/hotel.ts",
- Line 5646: (cottage) "name": "getDefaultCottagePricing",
- Line 5650: (hotel) "name": "getDefaultHotelPricing",
- Line 5654: (cottage) "name": "isCottagePricing",
- Line 5658: (hotel) "name": "isHotelPricing",
- Line 5662: (cottage) "name": "isFlexibleCottagePricing",
- Line 5666: (hotel) "name": "isFlexibleHotelPricing",
- Line 5714: (vehicle) "src/types/vehicle.ts": {
- Line 5715: (vehicle) "path": "src/types/vehicle.ts",
- Line 6086: (bank) "../services/bankAccountService"
- Line 6090: (bank) "testBankAccountService",
- Line 6224: (provider) "name": "validateProviderForm",
- Line 6242: (vehicle) "src/utils/vehiclePricing.ts": {
- Line 6243: (vehicle) "path": "src/utils/vehiclePricing.ts",
- Line 6251: (vehicle) "name": "calculateVehicleDeposit",
- Line 6255: (vehicle) "name": "calculateVehiclePrice",
- Line 6259: (vehicle) "name": "isVehicleAvailable",
- Line 6265: (vehicle) "calculateVehicleDeposit",
- Line 6266: (vehicle) "calculateVehiclePrice",
- Line 6267: (vehicle) "isVehicleAvailable"
- Line 6301: (cottage) "test-cottage-functionality.md": {
- Line 6302: (cottage) "path": "test-cottage-functionality.md",
- Line 6399: (cottage) "CottagePage": "src/CottagePage.tsx",
- Line 6402: (bank) "AdminBankAccounts": "src/AdminBankAccounts.tsx",
- Line 6403: (cottage) "AdminCottages": "src/AdminCottages.tsx",
- Line 6405: (horse) "AdminHorses": "src/AdminHorses.tsx",
- Line 6406: (hotel) "AdminHotels": "src/AdminHotels.tsx",
- Line 6407: (snowmobile) "AdminSnowmobiles": "src/AdminSnowmobiles.tsx",
- Line 6408: (vehicle) "AdminVehicles": "src/AdminVehicles.tsx",
- Line 6411: (booking) "BookingForm": "src/BookingForm.tsx",
- Line 6412: (calendar) "CalendarView": "src/CalendarView.tsx",
- Line 6413: (cottage) "COTTAGE_AMENITIES": "src/CottageForm.tsx",
- Line 6414: (cottage) "ALL_MONTHS": "src/CottageForm.tsx",
- Line 6415: (cottage) "DEFAULT_MONTHS": "src/CottageForm.tsx",
- Line 6416: (cottage) "CottageForm": "src/pages/Cottages/CottageForm.tsx",
- Line 6417: (cottage) "SectionHeader": "src/pages/Cottages/CottageForm.tsx",
- Line 6418: (cottage) "CottagesList": "src/CottagesList.tsx",
- Line 6420: (booking) "BookingCard": "src/CustomerProfile.tsx",
- Line 6422: (horse) "HorseForm": "src/HorseForm.tsx",
- Line 6423: (booking, hotel) "HotelBookingForm": "src/HotelBookingForm.tsx",
- Line 6424: (hotel) "HotelForm": "src/HotelForm.tsx",
- Line 6425: (hotel) "HotelPage": "src/HotelPage.tsx",
- Line 6426: (hotel) "HotelsList": "src/HotelsList.tsx",
- Line 6430: (provider) "ProviderDetails": "src/ProviderDetails.tsx",
- Line 6431: (provider) "USE_STUB_DATA": "src/ProviderDetails.tsx",
- Line 6432: (snowmobile) "SnowmobileForm": "src/SnowmobileForm.tsx",
- Line 6433: (booking, vehicle) "VehicleBookingForm": "src/VehicleBookingForm.tsx",
- Line 6434: (vehicle) "VehicleForm": "src/VehicleForm.tsx",
- Line 6435: (vehicle) "VehiclePage": "src/VehiclePage.tsx",
- Line 6436: (vehicle) "VehiclesList": "src/VehiclesList.tsx",
- Line 6437: (bank) "BankInfoForm": "src/components/BankInfoForm.tsx",
- Line 6438: (booking) "BookingAuth": "src/components/BookingAuth.tsx",
- Line 6439: (booking) "BookingModal": "src/components/BookingModal.tsx",
- Line 6441: (horse) "HorseCard": "src/components/HorseCard.tsx",
- Line 6442: (hotel) "HotelCard": "src/components/HotelCard.tsx",
- Line 6444: (notification) "NotificationSystem": "src/components/NotificationSystem.tsx",
- Line 6449: (snowmobile) "SnowmobileCard": "src/components/SnowmobileCard.tsx",
- Line 6452: (booking) "ResourceIcon": "src/components/UserBookingsSection.tsx",
- Line 6454: (vehicle) "VehicleCard": "src/components/VehicleCard.tsx",
- Line 6460: (cottage) "NewCottagePage": "src/pages/Cottages/NewCottagePage.tsx"
- Line 6500: (commission) "commissionService": "backend/services/commissionService.js",
- Line 6502: (bank) "bankAccountService": "src/services/bankAccountService.ts",
- Line 6503: (booking) "bookingExpirationService": "src/services/bookingExpirationService.ts",
- Line 6504: (booking) "bookingService": "src/services/bookingService.ts",
- Line 6512: (notification) "notificationService": "src/services/notificationService.ts",
- Line 6547: (commission) "POST /generate-invoices": "backend/routes/commission.js",
- Line 6548: (commission) "GET /invoices": "backend/routes/commission.js",
- Line 6549: (commission) "GET /invoices/:invoiceId": "backend/routes/commission.js",
- Line 6550: (commission) "POST /invoices/:invoiceId/mark-paid": "backend/routes/commission.js",
- Line 6551: (commission, provider) "GET /provider/:providerId/summary": "backend/routes/commission.js",
- Line 6552: (commission, provider) "GET /provider/:providerId/invoices": "backend/routes/commission.js",
- Line 6553: (commission, provider) "PUT /provider/:providerId/commission-rate": "backend/routes/commission.js",
- Line 6554: (commission) "POST /enforce-payments": "backend/routes/commission.js",
- Line 6555: (commission) "POST /send-reminders": "backend/routes/commission.js",
- Line 6563: (notification) "GET /:userId": "backend/routes/notifications.js",
- Line 6564: (notification) "POST /": "backend/routes/notifications.js",
- Line 6565: (notification) "PATCH /:notificationId/read": "backend/routes/notifications.js",
- Line 6566: (notification) "PATCH /user/:userId/read-all": "backend/routes/notifications.js",
- Line 6567: (notification) "POST /check-in-reminders": "backend/routes/notifications.js",
- Line 6568: (booking, notification) "POST /booking-created": "backend/routes/notifications.js",

## ai-service/context/code_context.js
- Line 20: (cottage) // Bakhmaro Cottages project structure mapping
- Line 105: (booking) description: 'Node.js + Express API for bookings'
- Line 121: (booking) customHooks: ['useAuth', 'useBooking', 'useAPI'],
- Line 137: (provider) authorization: 'Role-based (CUSTOMER, PROVIDER, SUPER_ADMIN)',
- Line 462: (calendar) 'Date formatting according to Georgian calendar',

## ai-service/context/project_context.js
- Line 2: (cottage, rental) - პლატფორმა: Bakhmaro Cottages Rental System

## ai-service/context/system_prompts.js
- Line 53: (booking) 🧠 Thinking: checking file /src/components/BookingForm.tsx
- Line 245: (cottage) "სპეციალიზაციაა Bakhmaro Cottages კოდბაზის ნავიგაციაში და ანალიზში.",

## ai-service/controllers/ai_controller.js
- Line 111: (provider) const { message, isProvider, userId = 'anonymous', conversationId = `stream-${Date.now()}` } = req.body; // Added conversationId for context
- Line 447: (cottage) - კოტეჯები (Cottages)
- Line 448: (hotel) - სასტუმროები (Hotels)
- Line 449: (vehicle) - ტრანსპორტი (Vehicles)
- Line 450: (horse) - ცხენები (Horses)
- Line 451: (snowmobile) - სნოუმობილები (Snowmobiles)
- Line 545: (booking) • BookingService.ts - ჯავშნის ლოგიკა
- Line 546: (booking) • BookingForm.tsx - ჯავშნის ფორმა
- Line 603: (calendar) } else if (queryType === 'file_search_calendar') {
- Line 604: (calendar) console.log('🔍 [Calendar Search] Processing calendar-specific file search');
- Line 605: (calendar) response = await handleSpecializedFileSearch(message, userId, 'calendar');
- Line 606: (calendar) usedService = 'specialized_calendar_search';
- Line 876: (calendar) file_search_calendar: [
- Line 877: (calendar) /(მოძებნე|ძებნა|find|search).*(კალენდარ|calendar)/i,
- Line 878: (calendar) /(კალენდარ|calendar).*(მოძებნე|ძებნა|find|search)/i,
- Line 879: (calendar) /calendar.*component/i,
- Line 883: (booking) file_search_booking:[
- Line 884: (booking) /(მოძებნე|ძებნა|find|search).*(ჯავშნ|booking|reservation)/i,
- Line 885: (booking) /(ჯავშნ|booking).*(ფაილ|file|კომპონენტ|component)/i
- Line 926: (booking) booking_help: [
- Line 927: (booking) /ჯავშნა/, /booking/, /რეზერვაცია/, /reservation/, /დაჯავშნა/, /reserve/,
- Line 931: (booking) booking_system_query: [
- Line 932: (booking) /დაჯავშნის\s*სისტემა/, /ჯავშნის\s*სისტემა/, /booking\s*system/,
- Line 933: (booking) /ბრონირების\s*პროცესი/, /booking\s*process/, /order\s*flow/,
- Line 934: (booking) /როგორ\s*მუშაობს.*დაჯავშნ/, /როგორ\s*მუშაობს.*ჯავშნ/, /როგორ\s*მუშაობს.*booking/,
- Line 935: (booking) /რა\s*არის.*დაჯავშნ/, /რა\s*არის.*ჯავშნ/, /what\s*is.*booking/
- Line 1354: (booking) • ბრონირების სისტემა (BookingService)
- Line 1392: (booking) if (lowerMessage.includes('bookingservice') || lowerMessage.includes('booking service')) {
- Line 1393: (booking) return `📋 BookingService.ts-ში ეს ფუნქციებია:
- Line 1396: (booking) • createBooking() - ბრონირების შექმნა
- Line 1397: (booking) • updateBooking() - ბრონირების განახლება
- Line 1398: (booking) • cancelBooking() - ბრონირების გაუქმება
- Line 1399: (booking) • getBookingsByUser() - მომხმარებლის ბრონირებები
- Line 1400: (booking) • validateBookingDates() - თარიღების ვალიდაცია
- Line 1405: (booking) if (lowerMessage.includes('bookingmodal') || lowerMessage.includes('booking modal')) {
- Line 1406: (booking) return `🏠 BookingModal.tsx-ში ეს არის:
- Line 1423: (booking, hotel, vehicle) • BookingModal, HotelCard, VehicleCard...
- Line 1426: (booking, notification) • bookingService, userService, notificationService...
- Line 1457: (booking) • bookingService.ts - ბრონირებისთვის
- Line 1459: (notification) • notificationService.ts - შეტყობინებებისთვის
- Line 1471: (booking) • "BookingService რა შეიცავს?" - კოდის ანალიზი
- Line 1513: (calendar) 'calendar': ['კალენდარი', 'calendar', 'Calendar.tsx', 'useCalendar', 'CalendarService', 'datepicker'],
- Line 1514: (booking) 'booking': ['ჯავშნა', 'booking', 'BookingModal', 'BookingService', 'BookingForm', 'reservation'],
- Line 1516: (notification) 'messaging': ['მესიჯი', 'messaging', 'MessagingSystem', 'message', 'notification'],
- Line 1619: (booking) comprehensive_grammar: 'გასწორე ქართული გრამატიკა და ორთოგრაფია. თავიდან აიცილე "მე ვარ..." სტილის თვითაღმოჩენები. შეცვალე "ჩემი საიტი" -> "ბახმაროს Booking პლატფორმა". გახადე ტექსტი ბუნებრივი და პროფესიონალური. დააბრუნე მხოლოდ გასწორებული ტექსტი. დააბრუნე მხოლოდ გასწორებული ტექსტი.'
- Line 1886: (provider) async function processWithRAG(message, isProvider, userId) {

## ai-service/knowledge_base.json
- Line 9: (cottage) "id": "cottage_rules.md_0",
- Line 11: (cottage) "source": "cottage_rules.md",
- Line 401: (cottage) "id": "cottage_rules.md_1",
- Line 403: (cottage) "source": "cottage_rules.md",
- Line 793: (cottage) "id": "cottage_rules.md_2",
- Line 795: (cottage) "source": "cottage_rules.md",
- Line 1185: (cottage) "id": "cottage_rules.md_3",
- Line 1187: (cottage) "source": "cottage_rules.md",
- Line 1577: (cottage) "id": "cottage_rules.md_4",
- Line 1579: (cottage) "source": "cottage_rules.md",
- Line 1969: (cottage) "id": "cottage_rules.md_5",
- Line 1971: (cottage) "source": "cottage_rules.md",
- Line 2361: (cottage) "id": "cottage_rules.md_6",
- Line 2363: (cottage) "source": "cottage_rules.md",

## ai-service/middleware/telemetry_middleware.js
- Line 8: (provider) const { MeterProvider } = require('@opentelemetry/sdk-metrics');
- Line 24: (provider) const meterProvider = new MeterProvider({
- Line 33: (provider) metrics.setGlobalMeterProvider(meterProvider);

## ai-service/routes/ai_chat.js
- Line 22: (cottage) buildCottageDetailsResponse,
- Line 287: (cottage) if (intent.name === 'cottage_details') {
- Line 288: (cottage) return respondWithPayload(buildCottageDetailsResponse(metadata, builderOptions));

## ai-service/routes/ai_stream.js
- Line 332: (provider) const codexMeta = { provider: 'codex' };
- Line 400: (provider) emitCoreMeta('offline-fallback', { provider: 'offline', reason: 'groq_unavailable' });
- Line 461: (provider) emitCoreMeta(activeMode, { provider: 'groq', responseType: typeof streamResponse });
- Line 478: (provider) emitCoreMeta('error', { provider: 'groq', error: streamMetadataExtras.error });

## ai-service/routes/auto_improve.js
- Line 7: (provider) const { loadSimilarOutcomes } = require('../services/proposal_memory_provider');

## ai-service/services/ai_response_improver.js
- Line 47: (booking) 'booking': 'ჯავშანი',

## ai-service/services/backup_system_service.js
- Line 168: (booking, cottage) const collections = ['users', 'cottages', 'bookings', 'reviews', 'activity', 'admin_credentials'];

## ai-service/services/codeAnalyzer.js
- Line 89: (booking) // Core booking modules
- Line 90: (booking, hotel, vehicle) 'BookingForm.tsx', 'BookingModal.tsx', 'HotelBookingForm.tsx', 'VehicleBookingForm.tsx',
- Line 92: (cottage, hotel, vehicle) 'AdminCottages.tsx', 'AdminHotels.tsx', 'AdminVehicles.tsx', 'AdminUsers.tsx',
- Line 96: (cottage, hotel, vehicle) 'CottagePage.tsx', 'HotelPage.tsx', 'VehiclePage.tsx',
- Line 98: (cottage, hotel, vehicle) 'CottagesList.tsx', 'HotelsList.tsx', 'VehiclesList.tsx',
- Line 100: (booking) 'bookingService.ts', 'customerService.ts', 'priceCodeService.ts',
- Line 164: (booking) if (fileName.includes('Booking')) return 'Booking System';
- Line 392: (cottage) 'კოტეჯ': ['cottage'],
- Line 393: (hotel) 'სასტუმრო': ['hotel'],
- Line 394: (vehicle) 'ავტომობილ': ['vehicle', 'car'],
- Line 395: (booking) 'ჯავშან': ['booking', 'reservation'],
- Line 396: (calendar) 'კალენდარ': ['calendar'],
- Line 398: (booking) 'შეკვეთ': ['order', 'booking'],
- Line 434: (vehicle) 'pricing.ts', 'vehiclePricing.ts', 'seasonalPricing.ts',
- Line 435: (booking, cottage) 'BookingForm.tsx', 'BookingModal.tsx', 'CottageForm.tsx',
- Line 436: (cottage) 'AdminCottages.tsx', 'MainPage.tsx', 'ai_controller.js'
- Line 542: (booking) if (filename.includes('booking') || filename.includes('Booking')) score += 8;
- Line 543: (cottage) if (filename.includes('cottage') || filename.includes('Cottage')) score += 6;
- Line 548: (booking) // Explain booking system specifically
- Line 549: (booking) async explainBookingSystem(query) {
- Line 551: (booking) console.log('📋 [Booking System] Starting targeted analysis...');
- Line 553: (booking) // Hardcoded fallback explanation for booking system
- Line 554: (booking) const fallbackBookingExplanation = `🎯 **ბრონირების სისტემის დეტალური აღწერა:**
- Line 558: (booking) 1. **ფორმის შევსება** (BookingForm.tsx/BookingModal.tsx):
- Line 564: (booking) 2. **ვალიდაცია და შემოწმება** (bookingService.ts):
- Line 570: (booking) 3. **ბრონირების შექმნა** (bookingService.ts):
- Line 572: (booking) - უნიკალური booking ID-ის გენერაცია
- Line 592: (calendar) • Calendar Integration - თარიღების მართვისთვის
- Line 595: (booking) • BookingForm.tsx - ბრონირების ძირითადი ფორმა
- Line 596: (booking) • BookingModal.tsx - მოდალური ფანჯარა ბრონირებისთვის
- Line 597: (booking) • bookingService.ts - ბრონირების ყველა ლოგიკა
- Line 601: (booking) const bookingModules = [
- Line 602: (booking) 'src/BookingForm.tsx',
- Line 603: (booking) 'src/components/BookingModal.tsx',
- Line 604: (booking) 'src/components/BookingAuth.tsx',
- Line 605: (booking) 'src/services/bookingService.ts',
- Line 613: (booking) for (const modulePath of bookingModules) {
- Line 621: (booking) console.log(`⚠️ [Booking System] Could not read ${modulePath}`);
- Line 626: (booking) console.log(`✅ [Booking System] Found ${foundModules.length} modules: ${foundModules.join(', ')}`);
- Line 627: (booking) return fallbackBookingExplanation + `\n\n📄 **აღმოჩენილი მოდულები:** ${foundModules.length}/6`;
- Line 629: (booking) console.log('⚠️ [Booking System] Using hardcoded explanation');
- Line 630: (booking) return fallbackBookingExplanation + `\n\n⚠️ **შენიშვნა:** გამოიყენება ჩაშენებული აღწერა.`;
- Line 634: (booking) console.error('❌ [Booking System] explainBookingSystem failed:', error);
- Line 821: (vehicle) return { category: 'pricing', type: 'pricing_query', requiresSpecificFiles: ['pricing.ts', 'vehiclePricing.ts'] };

## ai-service/services/enhanced_error_handler.js
- Line 434: (notification) // Emit Georgian error notification
- Line 435: (notification) async emitGeorgianErrorNotification(error) {

## ai-service/services/fileService.js
- Line 284: (booking) 'ბრონირება': ['booking', 'reservation'],
- Line 285: (cottage) 'კოტეჯი': ['cottage'],
- Line 286: (hotel) 'სასტუმრო': ['hotel'],
- Line 289: (vehicle) 'ავტომობილი': ['vehicle', 'car'],
- Line 290: (calendar) 'კალენდარი': ['calendar'],
- Line 306: (vehicle) expandedTerms.push('pricing', 'vehiclePricing', 'seasonalPricing');
- Line 308: (booking) if (term.includes('ბრონირება') || term.includes('booking')) {
- Line 309: (booking) expandedTerms.push('BookingForm', 'BookingModal', 'bookingService');

## ai-service/services/file_access_service.js
- Line 43: (calendar) 'კალენდარი': ['calendar', 'date', 'datepicker', 'events', 'Calendar.tsx', 'useCalendar', 'CalendarService'],
- Line 44: (booking) 'ჯავშანი': ['booking', 'reservation', 'ჯავშნის', 'BookingModal', 'BookingService', 'BookingForm'],
- Line 46: (hotel) 'სასტუმრო': ['hotel', 'accommodation', 'სასტუმროს', 'HotelCard', 'HotelForm', 'HotelPage'],
- Line 47: (cottage) 'კოტეჯი': ['cottage', 'cabin', 'კოტეჯის', 'CottageForm', 'CottagePage', 'CottageCard'],
- Line 52: (notification) 'მესიჯინგი': ['messaging', 'message', 'შეტყობინება', 'MessagingSystem', 'notificationService'],
- Line 53: (vehicle) 'ტრანსპორტი': ['vehicle', 'transport', 'VehicleCard', 'VehicleForm', 'VehiclePage'],
- Line 54: (horse) 'ცხენები': ['horse', 'horses', 'HorseCard', 'HorseForm'],
- Line 55: (snowmobile) 'სნოუმობილები': ['snowmobile', 'SnowmobileCard', 'SnowmobileForm'],

## ai-service/services/groq_service.js
- Line 381: (booking) const SYSTEM_PROMPT = `You are an AI developer assistant for the Bakhmaro booking platform.
- Line 383: (booking, cottage, hotel) When asked for general information about the site, read the relevant code and describe the structure and features (e.g. cottages, hotels, booking system).

## ai-service/services/gurulo_intent_router.js
- Line 14: (cottage) 'free cottage',
- Line 15: (cottage) 'cottages',
- Line 52: (cottage) const COTTAGE_DETAIL_KEYWORDS = ['დეტალ', 'ინფო', 'amenity', 'bed', 'bath', 'kitchen', 'wifi', 'capacity', 'size'];
- Line 295: (cottage) if (hasKeyword(normalizedLower, COTTAGE_DETAIL_KEYWORDS)) {
- Line 297: (cottage) name: 'cottage_details',

## ai-service/services/gurulo_response_builder.js
- Line 55: (cottage) en: "I'm here to help with guest topics only—Bakhmaro cottages, pricing, weather, routes, and tours. I can't assist with technical questions.",
- Line 64: (cottage) availability: '/cottages',
- Line 65: (cottage) pricing: '/cottages#pricing',
- Line 66: (cottage) weather: '/cottages#weather',
- Line 67: (cottage) tripPlan: '/cottages#plan',
- Line 68: (cottage) policies: '/cottages#policies',
- Line 70: (cottage) transport: '/cottages#transport',
- Line 71: (cottage) attractions: '/cottages#attractions',
- Line 72: (cottage) details: '/cottages#details',
- Line 310: (cottage) ? 'Happy to chat! Ask me about cottages, prices, or planning your stay.'
- Line 439: (cottage) ? 'No cottages match that capacity. Try adjusting dates or guest count.'
- Line 459: (cottage) title: language === 'en' ? 'Available cottages' : 'თავისუფალი კოტეჯები',
- Line 498: (cottage) ? 'Nightly rates vary from ₾140 for cozy couples stays up to ₾260 for family cottages with full amenities.'
- Line 558: (horse) 'Day 2 – Morning horseback ride, afternoon picnic near the ridge.',
- Line 599: (booking) ? 'Bookings are confirmed with a 30% deposit, refundable up to 14 days before arrival.'
- Line 689: (horse) ? 'Sunrise decks, star-gazing platforms, guided mushroom foraging, and horseback trails await nearby.'
- Line 712: (cottage) function buildCottageDetailsResponse(metadata = {}, options = {}) {
- Line 716: (cottage) title: language === 'en' ? 'Cottage highlights' : 'კოტეჯის მახასიათებლები',
- Line 722: (cottage) cta: formatCta(language === 'en' ? 'View cottage details' : 'იხილე კოტეჯის დეტალები', CTA_ROUTES.details),
- Line 730: (cottage) intent_detected: 'cottage_details',
- Line 783: (cottage) buildCottageDetailsResponse,

## ai-service/services/openai_fallback_service.js
- Line 25: (provider) provider: 'openai'
- Line 51: (provider) provider: 'offline'
- Line 82: (provider) provider: 'openai',
- Line 112: (provider) provider: 'openai-error',
- Line 123: (provider) provider: OPENAI_API_KEY ? 'openai' : 'offline',

## ai-service/services/pricing_explainer.js
- Line 10: (cottage) const cottagePricing = await fileService.getFileContext('src/utils/pricing.ts');
- Line 11: (vehicle) const vehiclePricing = await fileService.getFileContext('src/utils/vehiclePricing.ts');
- Line 17: (cottage) ${cottagePricing.content || cottagePricing}
- Line 19: (vehicle) ==== VEHICLE_PRICING.TS ====
- Line 20: (vehicle) ${vehiclePricing.content || vehiclePricing}

## ai-service/services/prompt_manager.js
- Line 438: (cottage) name: 'Bakhmaro Cottages Platform',

## ai-service/services/site_summary.js
- Line 2: (booking) * Bakhmaro Booking Platform - Static Site Information
- Line 12: (cottage) cottages: {
- Line 17: (hotel) hotels: {
- Line 22: (vehicle) vehicles: {
- Line 27: (horse) horses: {
- Line 32: (snowmobile) snowmobiles: {
- Line 41: (booking) booking: {
- Line 66: (provider) "Provider - მომსახურების პროვაიდერი",
- Line 76: (booking) bookings: "ჯავშნების მართვა და მონიტორინგი",
- Line 78: (provider) providers: "პროვაიდერების მართვა და კომისიები",
- Line 80: (notification) notifications: "შეტყობინებების სისტემა",
- Line 139: (booking, calendar) - BookingModal.tsx, Calendar.tsx, PricingManager.tsx
- Line 144: (booking) - bookingService.ts, userService.ts, priceCodeService.ts
- Line 167: (booking) • BookingModal.tsx - ჯავშნის მთავარი ფანჯარა
- Line 168: (calendar) • Calendar.tsx - თარიღების არჩევის კალენდარი
- Line 173: (cottage) • AdminCottages.tsx - კოტეჯების მართვა
- Line 178: (booking) • bookingService.ts - ჯავშნის ყველა ლოგიკა
- Line 181: (notification) • notificationService.ts - შეტყობინებების სისტემა
- Line 200: (booking) • src/services/bookingService.ts - ჯავშნის სრული ლოგიკა
- Line 203: (booking) • src/components/BookingModal.tsx - ჯავშნის UI
- Line 207: (calendar) • src/components/Calendar.tsx - თარიღების ლოგიკა
- Line 218: (booking) booking_process: () => {
- Line 244: (provider) • Customer, Provider, Admin როლები
- Line 277: (booking) // Booking related components
- Line 278: (booking) 'BookingModal': 'ბრონირების მოდალური ფანჯარა - ნომრების ბრონირებისთვის, ასევე ფასის გამოთვლა და ვალიდაცია',
- Line 279: (booking) 'BookingForm': 'ბრონირების ფორმა - მონაცემების შეყვანისთვის, თარიღების შერჩევა და ტერმინების დადასტურება',
- Line 280: (booking) 'BookingAuth': 'ბრონირების ავტორიზაცია - მომხმარებლის შესვლა/რეგისტრაცია ბრონირების პროცესში',
- Line 281: (booking, vehicle) 'VehicleBookingForm': 'ტრანსპორტის ბრონირების ფორმა - მანქანების, ატვების ბრონირება',
- Line 282: (booking, hotel) 'HotelBookingForm': 'სასტუმროს ბრონირების ფორმა - ოთახების ბრონირება სასტუმროებში',
- Line 285: (booking) 'AdminBookings': 'ადმინისტრატორის ბრონირების მართვა - ყველა ბრონირების ნახვა/რედაქტირება',
- Line 287: (commission) 'AdminCommission': 'კომისიის მართვა - პროვაიდერების კომისიის გამოთვლა და გადახდა',
- Line 292: (booking) booking: [
- Line 293: (booking) 'BookingService.ts', 'bookingService.ts', 'BookingForm.tsx',
- Line 294: (booking) 'BookingModal.tsx', 'BookingAuth.tsx', 'UserBookingsSection.tsx',
- Line 295: (booking, provider) 'AdminProviderBookings.tsx', 'ProviderBookings.tsx'
- Line 298: (vehicle) 'pricing.ts', 'priceCodeService.ts', 'vehiclePricing.ts',
- Line 302: (cottage, hotel) 'AdminCottages.tsx', 'AdminUsers.tsx', 'AdminHotels.tsx',
- Line 303: (provider) 'AdminProviders.tsx', 'MainDashboard.tsx'
- Line 305: (cottage) cottage: [
- Line 306: (cottage) 'CottageForm.tsx', 'CottagePage.tsx', 'CottagesList.tsx'
- Line 372: (booking) case 'booking_process':
- Line 373: (booking) case 'booking_system':
- Line 374: (booking) return templates.booking_process();
- Line 424: (booking) 'booking': {
- Line 425: (booking) description: 'ჯავშნის სისტემის ფაილები - BookingService.ts, BookingModal.tsx',
- Line 427: (booking, calendar) relatedFiles: ['src/services/bookingService.ts', 'src/components/BookingModal.tsx', 'src/components/Calendar.tsx']
- Line 432: (vehicle) relatedFiles: ['src/utils/pricing.ts', 'src/utils/vehiclePricing.ts', 'src/components/PricingManager.tsx']
- Line 437: (cottage) relatedFiles: ['src/AdminUsers.tsx', 'src/AdminCottages.tsx', 'src/MainDashboard.tsx']
- Line 465: (provider) summary += `📊 როლები: Customer, Provider, Admin, Super Admin\n`;

## ai-service/test_ai_comprehensive.js
- Line 17: (booking) query: 'მომიყევი Bakhmaro Booking-ის ძირითადი ფუნქციები',
- Line 31: (booking) id: 'booking_process',
- Line 408: (booking) if (expanded.includes('booking') && expanded.includes('reservation')) {

## ai-service/test_ai_final_scenarios.js
- Line 9: (booking) query: 'მომიყევი Bakhmaro Booking-ის ძირითადი გვერდები',
- Line 16: (booking) id: 'booking_process',
- Line 19: (booking) description: 'Step-by-step booking process'
- Line 22: (provider) // 3. Provider როლის უფლებები
- Line 24: (provider) id: 'provider_permissions',
- Line 25: (provider) query: 'რა დონის წვდომა აქვს Provider როლს?',
- Line 26: (booking, cottage) expectedElements: ['view_dashboard', 'manage_cottages', 'view_bookings', 'admin პანელი'],
- Line 27: (provider) description: 'Provider role permissions and access levels'
- Line 34: (cottage) expectedElements: ['AdminCottages.tsx', 'CottageForm.tsx', 'CottagePage.tsx', 'firestore'],
- Line 35: (cottage) description: 'Technical file structure for cottage management'
- Line 50: (booking) expectedElements: ['depositAmount', 'totalPrice', 'BookingModal', 'ავანსი'],
- Line 58: (commission) expectedElements: ['manage_users', 'manage_roles', 'view_logs', 'commission მართვა'],
- Line 98: (notification) expectedElements: ['MessagingSystem', 'real-time', 'notifications'],
- Line 99: (notification) description: 'Internal messaging and notification system'
- Line 104: (bank) id: 'bank_account_management',
- Line 106: (bank, commission) expectedElements: ['BankAccountManager', 'commission', 'payment routing'],
- Line 107: (bank, provider) description: 'Bank account management for providers'

## ai-service/test_groq_full_system.js
- Line 246: (booking) 'რა ფუნქცია აქვს BookingService-ს?',

## ai-service/test_groq_responses.js
- Line 7: (booking) question: "რა ფუნქცია აქვს bookingService.ts-ში?",
- Line 8: (booking) context: "ეს კითხვა ეხება booking service-ის ფუნქციონალს"
- Line 12: (booking) question: "როგორ მუშაობს BookingModal კომპონენტი?",
- Line 17: (booking) question: "რა ლოგიკაა transport booking სერვისში?",
- Line 18: (booking, vehicle) context: "ეს კითხვა ეხება vehicle booking ლოგიკას"

## ai-service/tests/gurulo_chat_flow.test.js
- Line 53: (cottage) expect(sections[0].cta).toContain('/cottages');
- Line 55: (cottage) expect(sections[1].cta).toContain('/cottages#plan');
- Line 75: (cottage) expect(sections[0].cta).toContain('/cottages');
- Line 80: (cottage) test('Availability intent with full params returns cottage cards and CTA links', async () => {
- Line 95: (cottage) expect(sections[0].cta).toContain('/cottages?from=2025-07-01&to=2025-07-04&guests=3');
- Line 96: (cottage) expect(sections[1].cta).toContain('/cottages#pricing');

## ai-service/tests/task_manager.integration.test.js
- Line 18: (booking) 'გთხოვ მოძებნე ფაილი bookingService.ts რომ განვაალიზო',

## ai-service/utils/enhanced_georgian_validator.js
- Line 134: (booking) 'ჩემი საიტი': 'ბახმაროს Booking პლატფორმა',

## backend/.env.example
- Line 116: (notification) # 📧 NOTIFICATIONS
- Line 118: (notification) NOTIFICATION_EMAIL_ENABLED=false
- Line 119: (notification) NOTIFICATION_EMAIL_RECIPIENTS=alerts@ai.bakhmaro.co
- Line 122: (notification) SMTP_USER=notifications@ai.bakhmaro.co
- Line 124: (notification) NOTIFICATION_WEBHOOKS_ENABLED=false
- Line 125: (notification) NOTIFICATION_WEBHOOK_URLS=
- Line 126: (notification) NOTIFICATION_WEBHOOK_SECRET=bk_notification_webhook_secret_2025
- Line 127: (notification) NOTIFICATION_WEBHOOK_TIMEOUT=10000
- Line 128: (notification) NOTIFICATION_EVENTS=proposal_created,applied,smoke_failed,rollback_done
- Line 129: (notification) NOTIFICATION_RATE_LIMIT=100
- Line 130: (notification) NOTIFICATION_RETRY_ATTEMPTS=3
- Line 131: (notification) NOTIFICATION_RETRY_BACKOFF=5000

## backend/ai_controller.js
- Line 123: (booking) const systemPrompt = `You are an AI assistant for the Bakhmaro booking platform. Answer in natural Georgian.
- Line 364: (cottage) - კოტეჯები (Cottages)
- Line 365: (hotel) - სასტუმროები (Hotels)
- Line 366: (vehicle) - ტრანსპორტი (Vehicles)
- Line 367: (horse) - ცხენები (Horses)
- Line 368: (snowmobile) - სნოუმობილები (Snowmobiles)
- Line 414: (booking) • BookingService.ts - ჯავშნის ლოგიკა
- Line 415: (booking) • BookingForm.tsx - ჯავშნის ფორმა
- Line 684: (booking) booking_help: [
- Line 685: (booking) /ჯავშანი/, /booking/, /რეზერვაცია/, /reservation/, /ჯავშნა/, /book/
- Line 992: (booking) • ბრონირების სისტემა (BookingService)
- Line 1011: (booking) if (lowerMessage.includes('bookingservice') || lowerMessage.includes('booking service')) {
- Line 1012: (booking) return `📋 BookingService.ts ძირითადი ფუნქციები:
- Line 1013: (booking) • createBooking() - ბრონირების შექმნა
- Line 1014: (booking) • updateBooking() - ბრონირების განახლება
- Line 1015: (booking) • cancelBooking() - ბრონირების გაუქმება
- Line 1016: (booking) • getBookingsByUser() - მომხმარებლის ბრონირებები
- Line 1017: (booking) • validateBookingDates() - თარიღების ვალიდაცია
- Line 1022: (booking) if (lowerMessage.includes('bookingmodal') || lowerMessage.includes('booking modal')) {
- Line 1023: (booking) return `🏠 BookingModal.tsx კომპონენტი:
- Line 1076: (booking) • bookingService.ts - ბრონირების მართვა
- Line 1078: (notification) • notificationService.ts - შეტყობინებები
- Line 1087: (booking) კონკრეტული კითხვა დამისვი - მაგალითად: "რა ფუნქციებია BookingService-ში?" ან "როგორ მუშაობს ბრონირების სისტემა?"`;
- Line 1126: (booking) comprehensive_grammar: 'გასწორე ქართული გრამატიკა და ორთოგრაფია. თავიდან აიცილე "მე ვარ..." სტილის თვითაღმოჩენები. შეცვალე "ჩემი საიტი" -> "ბახმაროს Booking პლატფორმა". გახადე ტექსტი ბუნებრივი და პროფესიონალური. დააბრუნე მხოლოდ გასწორებული ტექსტი.'

## backend/ai_response_improver.js
- Line 22: (booking) 'booking': 'ჯავშანი',

## backend/backend/index.js
- Line 102: (notification) const notificationsRoute = require('./routes/notifications');
- Line 122: (notification) app.use('/api/notifications', notificationsRoute);
- Line 124: (commission) app.use('/api/commission', async (req, res) => {
- Line 126: (commission) const path = req.originalUrl.replace(/^\/api\/commission/, '/commission');

## backend/backend/index.js.backup.1753954201164
- Line 59: (notification) const notificationsRoute = require('./routes/notifications');
- Line 61: (commission) const commissionRoute = require('./routes/commission');
- Line 72: (notification) app.use('/api/notifications', notificationsRoute);
- Line 74: (commission) app.use('/api/commission', commissionRoute);

## backend/data/auto_improve_event_store.json
- Line 37878: (provider) "message": "✅ სისტემური ოპერაცია (services/proposal_memory_provider.js) წარმატებით დასრულდა 161ms",
- Line 37887: (provider) "filePath": "services/proposal_memory_provider.js",
- Line 37898: (provider) "filePath": "services/proposal_memory_provider.js",
- Line 38238: (provider) "message": "✅ სისტემური ოპერაცია (services/proposal_memory_provider.js) წარმატებით დასრულდა 161ms",
- Line 38247: (provider) "filePath": "services/proposal_memory_provider.js",
- Line 38258: (provider) "filePath": "services/proposal_memory_provider.js",
- Line 38598: (provider) "message": "✅ სისტემური ოპერაცია (services/proposal_memory_provider.js) წარმატებით დასრულდა 161ms",
- Line 38607: (provider) "filePath": "services/proposal_memory_provider.js",
- Line 38618: (provider) "filePath": "services/proposal_memory_provider.js",
- Line 38958: (provider) "message": "✅ სისტემური ოპერაცია (services/proposal_memory_provider.js) წარმატებით დასრულდა 161ms",
- Line 38967: (provider) "filePath": "services/proposal_memory_provider.js",
- Line 38978: (provider) "filePath": "services/proposal_memory_provider.js",
- Line 39264: (provider) "message": "✅ სისტემური ოპერაცია (services/proposal_memory_provider.js) წარმატებით დასრულდა 161ms",
- Line 39273: (provider) "filePath": "services/proposal_memory_provider.js",
- Line 39284: (provider) "filePath": "services/proposal_memory_provider.js",
- Line 39624: (provider) "message": "✅ სისტემური ოპერაცია (services/proposal_memory_provider.js) წარმატებით დასრულდა 161ms",
- Line 39633: (provider) "filePath": "services/proposal_memory_provider.js",
- Line 39644: (provider) "filePath": "services/proposal_memory_provider.js",
- Line 39984: (provider) "message": "✅ სისტემური ოპერაცია (services/proposal_memory_provider.js) წარმატებით დასრულდა 161ms",
- Line 39993: (provider) "filePath": "services/proposal_memory_provider.js",
- Line 40004: (provider) "filePath": "services/proposal_memory_provider.js",
- Line 40290: (provider) "message": "✅ სისტემური ოპერაცია (services/proposal_memory_provider.js) წარმატებით დასრულდა 161ms",
- Line 40299: (provider) "filePath": "services/proposal_memory_provider.js",
- Line 40310: (provider) "filePath": "services/proposal_memory_provider.js",
- Line 40650: (provider) "message": "✅ სისტემური ოპერაცია (services/proposal_memory_provider.js) წარმატებით დასრულდა 161ms",
- Line 40659: (provider) "filePath": "services/proposal_memory_provider.js",
- Line 40670: (provider) "filePath": "services/proposal_memory_provider.js",
- Line 41010: (provider) "message": "✅ სისტემური ოპერაცია (services/proposal_memory_provider.js) წარმატებით დასრულდა 161ms",
- Line 41019: (provider) "filePath": "services/proposal_memory_provider.js",
- Line 41030: (provider) "filePath": "services/proposal_memory_provider.js",
- Line 41370: (provider) "message": "✅ სისტემური ოპერაცია (services/proposal_memory_provider.js) წარმატებით დასრულდა 161ms",
- Line 41379: (provider) "filePath": "services/proposal_memory_provider.js",
- Line 41390: (provider) "filePath": "services/proposal_memory_provider.js",
- Line 41676: (provider) "message": "✅ სისტემური ოპერაცია (services/proposal_memory_provider.js) წარმატებით დასრულდა 161ms",
- Line 41685: (provider) "filePath": "services/proposal_memory_provider.js",
- Line 41696: (provider) "filePath": "services/proposal_memory_provider.js",
- Line 42036: (provider) "message": "✅ სისტემური ოპერაცია (services/proposal_memory_provider.js) წარმატებით დასრულდა 161ms",
- Line 42045: (provider) "filePath": "services/proposal_memory_provider.js",
- Line 42056: (provider) "filePath": "services/proposal_memory_provider.js",
- Line 42342: (provider) "message": "✅ სისტემური ოპერაცია (services/proposal_memory_provider.js) წარმატებით დასრულდა 161ms",
- Line 42351: (provider) "filePath": "services/proposal_memory_provider.js",
- Line 42362: (provider) "filePath": "services/proposal_memory_provider.js",

## backend/data/secrets_store.json
- Line 1103: (notification) "key": "NOTIFICATION_EMAIL_ENABLED",
- Line 1114: (notification) "key": "NOTIFICATION_EMAIL_RECIPIENTS",
- Line 1125: (notification) "key": "NOTIFICATION_EVENTS",
- Line 1136: (notification) "key": "NOTIFICATION_RATE_LIMIT",
- Line 1147: (notification) "key": "NOTIFICATION_RETRY_ATTEMPTS",
- Line 1158: (notification) "key": "NOTIFICATION_RETRY_BACKOFF",
- Line 1169: (notification) "key": "NOTIFICATION_WEBHOOK_SECRET",
- Line 1180: (notification) "key": "NOTIFICATION_WEBHOOK_TIMEOUT",
- Line 1191: (notification) "key": "NOTIFICATION_WEBHOOK_URLS",
- Line 1202: (notification) "key": "NOTIFICATION_WEBHOOKS_ENABLED",

## backend/index.js
- Line 398: (provider) const privilegedRoles = new Set(['SUPER_ADMIN', 'ADMIN', 'PROVIDER_ADMIN']);
- Line 672: (provider) const providerAuthRoutes = require('./routes/provider_auth');
- Line 1127: (notification) // User and Notification routes
- Line 1129: (notification) app.use('/api/notifications', require('./routes/notifications'));
- Line 1243: (notification) // Mount notification hooks routes
- Line 1244: (notification) const notificationHooks = require('./routes/notification_hooks');
- Line 1245: (notification) app.use('/api/notifications', notificationHooks);

## backend/index.js.backup.1753951408002
- Line 60: (notification) const notificationsRoute = require('./routes/notifications');
- Line 62: (commission) const commissionRoute = require('./routes/commission');
- Line 73: (notification) app.use('/api/notifications', notificationsRoute);
- Line 75: (commission) app.use('/api/commission', commissionRoute);

## backend/index.js.backup.1753951417419
- Line 60: (notification) const notificationsRoute = require('./routes/notifications');
- Line 62: (commission) const commissionRoute = require('./routes/commission');
- Line 73: (notification) app.use('/api/notifications', notificationsRoute);
- Line 75: (commission) app.use('/api/commission', commissionRoute);

## backend/middleware/admin_guards.js
- Line 61: (provider) const privilegedRoles = new Set(['ADMIN', 'SUPER_ADMIN', 'PROVIDER_ADMIN']);

## backend/middleware/error_handler.js
- Line 31: (booking) 'BookingConflict': 'ბრონირების კონფლიქტი - ეს თარიღი უკვე დაკავებულია',
- Line 33: (booking) 'BookingNotAllowed': 'ბრონირება ამ პირობებში შეუძლებელია',

## backend/middleware/requireAdminSetupToken.js
- Line 3: (provider) const privilegedRoles = new Set(['SUPER_ADMIN', 'ADMIN', 'PROVIDER_ADMIN']);

## backend/middleware/role_guards.js
- Line 9: (provider) const requireProvider = requireRole(['PROVIDER'], {
- Line 10: (provider) action: 'backend.guard.provider',
- Line 56: (provider) canAccessProvider: false,
- Line 67: (provider) case 'PROVIDER':
- Line 68: (provider) permissions.canAccessProvider = true;
- Line 81: (provider) requireProvider,

## backend/middleware/telemetry_middleware.js
- Line 8: (provider) const { MeterProvider } = require('@opentelemetry/sdk-metrics');
- Line 24: (provider) const meterProvider = new MeterProvider({
- Line 33: (provider) metrics.setGlobalMeterProvider(meterProvider);

## backend/package-lock.json
- Line 5805: (bank) "integrity": "sha512-SbKbANkN603Vi4jEZv49LeVJMn4yGwsbzZworEoyEiutsN3nJYdbO36zfhGJ6QEDpOZIFkDtnq5JRxmvl3jsoQ==",

## backend/package.json
- Line 4: (cottage) "description": "Backend server for Bakhmaro Cottages platform",

## backend/routes/admin_users.js
- Line 40: (provider) role: Joi.string().valid('SUPER_ADMIN', 'PROVIDER').required(),
- Line 60: (provider) is: 'PROVIDER',
- Line 65: (provider) is: 'PROVIDER',
- Line 70: (provider) is: 'PROVIDER',

## backend/routes/ai_admin.js
- Line 76: (provider) const provider = process.env.OPENAI_API_KEY || process.env.OPENAI_FALLBACK_KEY ? 'openai' : 'offline';
- Line 82: (provider) provider,
- Line 196: (provider) const provider = process.env.OPENAI_API_KEY || process.env.OPENAI_FALLBACK_KEY ? 'openai' : 'offline';
- Line 212: (provider) provider,
- Line 219: (provider) provider,

## backend/routes/ai_chat.js
- Line 135: (provider) const hasRealtimeProvider = Boolean(
- Line 141: (provider) return hasRealtimeProvider ? 'auto' : 'disabled';

## backend/routes/ai_rollout_control.js
- Line 51: (notification) // Send notification if hooks service available
- Line 53: (notification) const NotificationHooksService = require('../services/notificationHooks');
- Line 54: (notification) const notificationHooks = new NotificationHooksService();
- Line 56: (notification) await notificationHooks.notify('rollout_update', {
- Line 64: (notification) console.warn('⚠️ Failed to send rollout notification:', notifyError.message);
- Line 131: (notification) // Send emergency rollback notification
- Line 133: (notification) const NotificationHooksService = require('../services/notificationHooks');
- Line 134: (notification) const notificationHooks = new NotificationHooksService();
- Line 136: (notification) await notificationHooks.notify('emergency_rollback', {
- Line 142: (notification) console.warn('⚠️ Failed to send rollback notification:', notifyError.message);

## backend/routes/auto_improve.js
- Line 215: (notification) // Notification hooks service
- Line 216: (notification) const NotificationHooksService = require('../services/notificationHooks');
- Line 217: (notification) const notificationHooks = new NotificationHooksService();
- Line 1958: (notification) // Send notification for successful apply with proper error handling
- Line 1959: (notification) const notificationPromise = (async () => {
- Line 1962: (notification) await notificationHooks.notify('applied', {
- Line 1971: (notification) console.log(`✅ [NOTIFICATIONS] Applied notification sent for ${proposalId}`);
- Line 1974: (notification) console.error(`❌ [NOTIFICATIONS] Failed to send applied notification for ${proposalId}:`, error.message);
- Line 1975: (notification) // Don't let notification failures fail the entire apply operation
- Line 1979: (notification) // Don't await notification - let it run in background
- Line 1980: (notification) notificationPromise.catch(err => {
- Line 1981: (notification) console.error(`⚠️ [NOTIFICATIONS] Background notification error for ${proposalId}:`, err.message);
- Line 2070: (notification) // Send notification for rollback completion
- Line 2074: (notification) await notificationHooks.notify('rollback_done', {
- Line 2085: (notification) console.error(`❌ [NOTIFICATIONS] Failed to send rollback_done notification for ${proposalId}:`, error);

## backend/routes/backup_fallback.js
- Line 9: (provider) provider: null,

## backend/routes/jwt_auth.js
- Line 44: (provider) router.get('/admin-only', authenticateJWT, requireRole(['SUPER_ADMIN', 'PROVIDER']), (req, res) => {

## backend/routes/messaging.js
- Line 81: (booking) const { bookingId, listingTitle, listingType, participantIds, participantNames } = req.body;

## backend/routes/notification_hooks.js
- Line 5: (notification) const NotificationHooksService = require('../services/notificationHooks');
- Line 7: (notification) const notificationHooks = new NotificationHooksService();
- Line 9: (notification) // Get notification configuration
- Line 16: (notification) enabled: process.env.NOTIFICATION_EMAIL_ENABLED === 'true',
- Line 17: (notification) recipients: (process.env.NOTIFICATION_EMAIL_RECIPIENTS || '').split(',').filter(Boolean)
- Line 20: (notification) enabled: process.env.NOTIFICATION_WEBHOOKS_ENABLED === 'true',
- Line 21: (notification) urls: (process.env.NOTIFICATION_WEBHOOK_URLS || '').split(',').filter(Boolean)
- Line 24: (notification) enabled: (process.env.NOTIFICATION_EVENTS || 'proposal_created,applied,smoke_failed,rollback_done').split(','),
- Line 25: (notification) rateLimit: parseInt(process.env.NOTIFICATION_RATE_LIMIT || '100')
- Line 31: (notification) console.error('❌ [NOTIFICATIONS] Config error:', error);
- Line 39: (notification) // Test notification sending
- Line 56: (notification) const result = await notificationHooks.notify(eventType, testPayload);
- Line 66: (notification) console.error('❌ [NOTIFICATIONS] Test error:', error);
- Line 78: (notification) const deadLetterQueue = notificationHooks.getDeadLetterQueue();
- Line 87: (notification) console.error('❌ [NOTIFICATIONS] Dead letter error:', error);
- Line 98: (notification) await notificationHooks.processDeadLetterQueue();
- Line 106: (notification) console.error('❌ [NOTIFICATIONS] Dead letter processing error:', error);
- Line 126: (notification) const isValid = NotificationHooksService.verifyHMACSignature(payload, signature, secret);
- Line 135: (notification) console.error('❌ [NOTIFICATIONS] Verification error:', error);

## backend/routes/notifications.js
- Line 4: (notification) // Mock notifications storage
- Line 5: (notification) let notifications = [];
- Line 7: (notification) // Notification types
- Line 8: (notification) const NOTIFICATION_TYPES = {
- Line 10: (booking) BOOKING: 'booking',
- Line 16: (notification) // Get user notifications
- Line 22: (notification) const userNotifications = notifications
- Line 23: (notification) .filter(notification => notification.userId === userId)
- Line 27: (notification) const unreadCount = notifications.filter(
- Line 28: (notification) notification => notification.userId === userId && !notification.isRead
- Line 33: (notification) notifications: userNotifications,
- Line 35: (notification) total: notifications.filter(n => n.userId === userId).length
- Line 38: (notification) console.error('Error fetching notifications:', error);
- Line 46: (notification) // Create a new notification
- Line 65: (notification) const notification = {
- Line 78: (notification) notifications.push(notification);
- Line 82: (notification) notification
- Line 85: (notification) console.error('Error creating notification:', error);
- Line 93: (notification) // Mark notification as read
- Line 94: (notification) router.patch('/:notificationId/read', (req, res) => {
- Line 96: (notification) const { notificationId } = req.params;
- Line 98: (notification) const notificationIndex = notifications.findIndex(
- Line 99: (notification) notification => notification.id === notificationId
- Line 102: (notification) if (notificationIndex === -1) {
- Line 109: (notification) notifications[notificationIndex].isRead = true;
- Line 113: (notification) notification: notifications[notificationIndex]
- Line 116: (notification) console.error('Error marking notification as read:', error);
- Line 124: (notification) // Mark all notifications as read for user
- Line 129: (notification) notifications = notifications.map(notification => {
- Line 130: (notification) if (notification.userId === userId && !notification.isRead) {
- Line 131: (notification) return { ...notification, isRead: true };
- Line 133: (notification) return notification;
- Line 141: (notification) console.error('Error marking all notifications as read:', error);
- Line 149: (notification) // Create check-in reminder notifications (called by scheduled job)
- Line 152: (booking) // This would typically query the database for bookings with check-in today
- Line 158: (booking) // Mock booking data - in real implementation, query from database
- Line 159: (booking) const todayBookings = [
- Line 162: (provider) userId: 'provider123',
- Line 169: (notification) const createdNotifications = [];
- Line 171: (booking) todayBookings.forEach(booking => {
- Line 172: (notification) const notification = {
- Line 173: (booking) id: `checkin_${booking.id}_${Date.now()}`,
- Line 174: (booking) userId: booking.userId,
- Line 175: (notification) type: NOTIFICATION_TYPES.REMINDER,
- Line 177: (booking) message: `ბრონირება #${booking.id} - ${booking.listingTitle} - მისალმება: ${booking.checkInTime}`,
- Line 178: (booking) actionUrl: `/admin/bookings/${booking.id}`,
- Line 180: (booking) bookingId: booking.id,
- Line 181: (booking) guestName: booking.guestName,
- Line 182: (booking) checkInTime: booking.checkInTime
- Line 189: (notification) notifications.push(notification);
- Line 190: (notification) createdNotifications.push(notification);
- Line 195: (notification) message: `${createdNotifications.length} შეტყობინება შეიქმნა`,
- Line 196: (notification) notifications: createdNotifications
- Line 207: (booking, notification) // Create booking notification
- Line 208: (booking) router.post('/booking-created', (req, res) => {
- Line 211: (provider) providerId,
- Line 212: (booking) bookingId,
- Line 220: (notification) const notification = {
- Line 221: (booking) id: `booking_${bookingId}_${Date.now()}`,
- Line 222: (provider) userId: providerId,
- Line 223: (booking, notification) type: NOTIFICATION_TYPES.BOOKING,
- Line 226: (booking) actionUrl: `/admin/bookings/${bookingId}`,
- Line 228: (booking) bookingId,
- Line 240: (notification) notifications.push(notification);
- Line 244: (notification) notification
- Line 247: (booking, notification) console.error('Error creating booking notification:', error);

## backend/routes/provider_auth.js
- Line 9: (provider) // Provider-specific authentication middleware
- Line 10: (provider) const requireProviderRole = (req, res, next) => {
- Line 11: (provider) if (!req.session?.user || req.session.user.role !== 'PROVIDER') {
- Line 14: (provider) error: 'Provider access required',
- Line 15: (provider) code: 'PROVIDER_ONLY'
- Line 21: (provider) // Provider login endpoint
- Line 33: (provider) console.log('🔐 [Provider Auth] Login attempt:', { email });
- Line 38: (provider) // Verify this user has PROVIDER role
- Line 40: (provider) const userRole = 'PROVIDER'; // Mock - get from Firestore
- Line 42: (provider) if (userRole !== 'PROVIDER') {
- Line 45: (provider) error: 'Not authorized as provider'
- Line 53: (provider) role: 'PROVIDER',
- Line 54: (provider) displayName: userCredential.user.displayName || 'Provider User',
- Line 58: (provider) req.session.userRole = 'PROVIDER';
- Line 60: (provider) // SOL-425: Audit log provider login
- Line 63: (provider) 'PROVIDER',
- Line 69: (provider) console.log('✅ [Provider Auth] Login successful:', { email, userId: userCredential.user.uid });
- Line 77: (provider) // SOL-425: Audit log failed provider login
- Line 85: (provider) console.error('❌ [Provider Auth] Login error:', error);
- Line 93: (provider) // Provider logout
- Line 94: (provider) router.post('/logout', requireProviderRole, (req, res) => {
- Line 97: (provider) console.error('❌ [Provider Auth] Logout error:', err);
- Line 105: (provider) console.log('✅ [Provider Auth] Logout successful');
- Line 114: (provider) // Provider session check
- Line 115: (provider) router.get('/me', requireProviderRole, (req, res) => {
- Line 122: (provider) deviceTrust: false // Providers don't get device trust by default
- Line 126: (provider) // Provider dashboard access (example protected route)
- Line 127: (provider) router.get('/dashboard', requireProviderRole, (req, res) => {
- Line 130: (provider) message: 'Provider dashboard access granted',

## backend/routes/user_activity.js
- Line 44: (booking) if (['authentication_attempt', 'webauthn_flow', 'booking_activity'].includes(action)) {

## backend/services/codeAnalyzer.js
- Line 89: (booking) // Core booking modules
- Line 90: (booking, hotel, vehicle) 'BookingForm.tsx', 'BookingModal.tsx', 'HotelBookingForm.tsx', 'VehicleBookingForm.tsx',
- Line 92: (cottage, hotel, vehicle) 'AdminCottages.tsx', 'AdminHotels.tsx', 'AdminVehicles.tsx', 'AdminUsers.tsx',
- Line 96: (cottage, hotel, vehicle) 'CottagePage.tsx', 'HotelPage.tsx', 'VehiclePage.tsx',
- Line 98: (cottage, hotel, vehicle) 'CottagesList.tsx', 'HotelsList.tsx', 'VehiclesList.tsx',
- Line 100: (booking) 'bookingService.ts', 'customerService.ts', 'priceCodeService.ts',
- Line 164: (booking) if (fileName.includes('Booking')) return 'Booking System';
- Line 392: (cottage) 'კოტეჯ': ['cottage'],
- Line 393: (hotel) 'სასტუმრო': ['hotel'],
- Line 394: (vehicle) 'ავტომობილ': ['vehicle', 'car'],
- Line 395: (booking) 'ჯავშან': ['booking', 'reservation'],
- Line 396: (calendar) 'კალენდარ': ['calendar'],
- Line 398: (booking) 'შეკვეთ': ['order', 'booking'],
- Line 434: (vehicle) 'pricing.ts', 'vehiclePricing.ts', 'seasonalPricing.ts',
- Line 435: (booking, cottage) 'BookingForm.tsx', 'BookingModal.tsx', 'CottageForm.tsx',
- Line 436: (cottage) 'AdminCottages.tsx', 'MainPage.tsx', 'ai_controller.js'
- Line 542: (booking) if (filename.includes('booking') || filename.includes('Booking')) score += 8;
- Line 543: (cottage) if (filename.includes('cottage') || filename.includes('Cottage')) score += 6;

## backend/services/fileService.js
- Line 283: (booking) 'ბრონირება': ['booking', 'reservation'],
- Line 284: (cottage) 'კოტეჯი': ['cottage'],
- Line 285: (hotel) 'სასტუმრო': ['hotel'],
- Line 288: (vehicle) 'ავტომობილი': ['vehicle', 'car'],
- Line 289: (calendar) 'კალენდარი': ['calendar'],
- Line 305: (vehicle) expandedTerms.push('pricing', 'vehiclePricing', 'seasonalPricing');
- Line 307: (booking) if (term.includes('ბრონირება') || term.includes('booking')) {
- Line 308: (booking) expandedTerms.push('BookingForm', 'BookingModal', 'bookingService');

## backend/services/groq_service.js
- Line 246: (booking) const SYSTEM_PROMPT = `You are an AI developer assistant for the Bakhmaro booking platform.
- Line 248: (booking, cottage, hotel) When asked for general information about the site, read the relevant code and describe the structure and features (e.g. cottages, hotels, booking system).

## backend/services/notificationHooks.js
- Line 5: (notification) class NotificationHooksService {
- Line 9: (notification) enabled: process.env.NOTIFICATION_EMAIL_ENABLED === 'true',
- Line 19: (notification) recipients: (process.env.NOTIFICATION_EMAIL_RECIPIENTS || '').split(',').filter(Boolean)
- Line 22: (notification) enabled: process.env.NOTIFICATION_WEBHOOKS_ENABLED === 'true',
- Line 23: (notification) urls: (process.env.NOTIFICATION_WEBHOOK_URLS || '').split(',').filter(Boolean),
- Line 24: (notification) secret: process.env.NOTIFICATION_WEBHOOK_SECRET || 'dev-secret-key',
- Line 25: (notification) timeout: parseInt(process.env.NOTIFICATION_WEBHOOK_TIMEOUT || '10000')
- Line 28: (notification) enabled: (process.env.NOTIFICATION_EVENTS || 'proposal_created,applied,smoke_failed,rollback_done').split(','),
- Line 30: (notification) maxPerHour: parseInt(process.env.NOTIFICATION_RATE_LIMIT || '100'),
- Line 35: (notification) maxAttempts: parseInt(process.env.NOTIFICATION_RETRY_ATTEMPTS || '3'),
- Line 36: (notification) backoffMs: parseInt(process.env.NOTIFICATION_RETRY_BACKOFF || '5000')
- Line 42: (notification) this.sentNotifications = new Set(); // Duplicate prevention
- Line 49: (notification) console.log('🔔 [NOTIFICATIONS] Service initialized:', {
- Line 56: (notification) // Main notification dispatcher
- Line 59: (notification) console.log(`🔔 [NOTIFICATIONS] Event: ${eventType}`, { proposalId: payload.proposalId });
- Line 63: (notification) console.log(`🔕 [NOTIFICATIONS] Event ${eventType} disabled in config`);
- Line 69: (notification) console.warn(`⚠️ [NOTIFICATIONS] Rate limit exceeded for ${eventType}`);
- Line 74: (notification) const notificationKey = `${eventType}-${payload.proposalId}-${Date.now().toString().slice(0, -4)}`;
- Line 75: (notification) if (this.sentNotifications.has(notificationKey)) {
- Line 76: (notification) console.log(`🔕 [NOTIFICATIONS] Duplicate notification prevented: ${notificationKey}`);
- Line 80: (notification) // Create standardized notification payload
- Line 81: (notification) const notification = this.createNotificationPayload(eventType, payload);
- Line 83: (notification) // Send notifications
- Line 85: (notification) this.sendEmailNotification(notification),
- Line 86: (notification) this.sendWebhookNotifications(notification)
- Line 90: (notification) this.sentNotifications.add(notificationKey);
- Line 94: (notification) this.sentNotifications.delete(notificationKey);
- Line 100: (notification) console.log(`✅ [NOTIFICATIONS] Sent ${eventType}:`, {
- Line 114: (notification) console.error(`❌ [NOTIFICATIONS] Error sending ${eventType}:`, error);
- Line 119: (notification) // Create standardized Georgian notification payload
- Line 120: (notification) createNotificationPayload(eventType, payload) {
- Line 171: (notification) actions: this.getNotificationActions(eventType, payload.proposalId),
- Line 181: (notification) getNotificationActions(eventType, proposalId) {
- Line 236: (notification) // Send email notification
- Line 237: (notification) async sendEmailNotification(notification) {
- Line 242: (notification) const html = this.generateEmailHTML(notification);
- Line 247: (notification) subject: `${notification.title} - ${notification.proposal.title}`,
- Line 253: (notification) console.log(`📧 [EMAIL] Sent notification for ${notification.event}`);
- Line 256: (notification) console.error(`❌ [EMAIL] Failed to send ${notification.event}:`, error);
- Line 257: (notification) this.addToDeadLetter('email', notification, error);
- Line 263: (notification) generateEmailHTML(notification) {
- Line 264: (notification) const { proposal, actions } = notification;
- Line 269: (notification) <h1 style="margin: 0; font-size: 24px;">${notification.title}</h1>
- Line 270: (notification) <p style="margin: 10px 0 0; opacity: 0.8;">${new Date(notification.timestamp).toLocaleString('ka-GE')}</p>
- Line 331: (notification) Correlation ID: ${notification.correlationId} |
- Line 332: (notification) AutoImprove System v${notification.metadata.version}
- Line 339: (notification) // Send webhook notifications with HMAC signature
- Line 340: (notification) async sendWebhookNotifications(notification) {
- Line 345: (notification) const payload = JSON.stringify(notification);
- Line 367: (notification) console.error('❌ [WEBHOOK] Failed to send notifications:', error);
- Line 455: (notification) // Add to dead letter queue for failed notifications
- Line 456: (notification) addToDeadLetter(type, notification, error) {
- Line 459: (notification) notification,
- Line 465: (notification) // Keep only last 100 failed notifications
- Line 470: (notification) console.log(`💀 [DEAD-LETTER] Added ${type} notification to queue`);
- Line 485: (notification) await this.sendEmailNotification(item.notification);
- Line 487: (notification) await this.sendWebhookNotifications(item.notification);
- Line 503: (notification) module.exports = NotificationHooksService;

## backend/services/pricing_explainer.js
- Line 10: (cottage) const cottagePricing = await fileService.getFileContext('src/utils/pricing.ts');
- Line 11: (vehicle) const vehiclePricing = await fileService.getFileContext('src/utils/vehiclePricing.ts');
- Line 17: (cottage) ${cottagePricing.content || cottagePricing}
- Line 19: (vehicle) ==== VEHICLE_PRICING.TS ====
- Line 20: (vehicle) ${vehiclePricing.content || vehiclePricing}

## backend/services/site_summary.js
- Line 2: (booking) * Bakhmaro Booking Platform - Static Site Information
- Line 12: (cottage) cottages: {
- Line 17: (hotel) hotels: {
- Line 22: (vehicle) vehicles: {
- Line 27: (horse) horses: {
- Line 32: (snowmobile) snowmobiles: {
- Line 41: (booking) booking: {
- Line 66: (provider) "Provider - მომსახურების პროვაიდერი",
- Line 76: (booking) bookings: "ჯავშნების მართვა და მონიტორინგი",
- Line 78: (provider) providers: "პროვაიდერების მართვა და კომისიები",
- Line 80: (notification) notifications: "შეტყობინებების სისტემა",
- Line 139: (booking, calendar) - BookingModal.tsx, Calendar.tsx, PricingManager.tsx
- Line 144: (booking) - bookingService.ts, userService.ts, priceCodeService.ts
- Line 167: (booking) • BookingModal.tsx - ჯავშნის მთავარი ფანჯარა
- Line 168: (calendar) • Calendar.tsx - თარიღების არჩევის კალენდარი
- Line 173: (cottage) • AdminCottages.tsx - კოტეჯების მართვა
- Line 178: (booking) • bookingService.ts - ჯავშნის ყველა ლოგიკა
- Line 181: (notification) • notificationService.ts - შეტყობინებების სისტემა
- Line 200: (booking) • src/services/bookingService.ts - ჯავშნის სრული ლოგიკა
- Line 203: (booking) • src/components/BookingModal.tsx - ჯავშნის UI
- Line 207: (calendar) • src/components/Calendar.tsx - თარიღების ლოგიკა
- Line 218: (booking) booking_process: () => {
- Line 244: (provider) • Customer, Provider, Admin როლები
- Line 277: (booking) // Booking related components
- Line 278: (booking) 'BookingModal': 'ბრონირების მოდალური ფანჯარა - ნომრების ბრონირებისთვის, ასევე ფასის გამოთვლა და ვალიდაცია',
- Line 279: (booking) 'BookingForm': 'ბრონირების ფორმა - მონაცემების შეყვანისთვის, თარიღების შერჩევა და ტერმინების დადასტურება',
- Line 280: (booking) 'BookingAuth': 'ბრონირების ავტორიზაცია - მომხმარებლის შესვლა/რეგისტრაცია ბრონირების პროცესში',
- Line 281: (booking, vehicle) 'VehicleBookingForm': 'ტრანსპორტის ბრონირების ფორმა - მანქანების, ატვების ბრონირება',
- Line 282: (booking, hotel) 'HotelBookingForm': 'სასტუმროს ბრონირების ფორმა - ოთახების ბრონირება სასტუმროებში',
- Line 285: (booking) 'AdminBookings': 'ადმინისტრატორის ბრონირების მართვა - ყველა ბრონირების ნახვა/რედაქტირება',
- Line 287: (commission) 'AdminCommission': 'კომისიის მართვა - პროვაიდერების კომისიის გამოთვლა და გადახდა',
- Line 292: (booking) booking: [
- Line 293: (booking) 'BookingService.ts', 'bookingService.ts', 'BookingForm.tsx',
- Line 294: (booking) 'BookingModal.tsx', 'BookingAuth.tsx', 'UserBookingsSection.tsx',
- Line 295: (booking, provider) 'AdminProviderBookings.tsx', 'ProviderBookings.tsx'
- Line 298: (vehicle) 'pricing.ts', 'priceCodeService.ts', 'vehiclePricing.ts',
- Line 302: (cottage, hotel) 'AdminCottages.tsx', 'AdminUsers.tsx', 'AdminHotels.tsx',
- Line 303: (provider) 'AdminProviders.tsx', 'MainDashboard.tsx'
- Line 305: (cottage) cottage: [
- Line 306: (cottage) 'CottageForm.tsx', 'CottagePage.tsx', 'CottagesList.tsx'
- Line 375: (booking) case 'booking_process':
- Line 376: (booking) case 'booking_system':
- Line 377: (booking) return templates.booking_process();
- Line 427: (booking) 'booking': {
- Line 428: (booking) description: 'ჯავშნის სისტემის ფაილები - BookingService.ts, BookingModal.tsx',
- Line 430: (booking, calendar) relatedFiles: ['src/services/bookingService.ts', 'src/components/BookingModal.tsx', 'src/components/Calendar.tsx']
- Line 435: (vehicle) relatedFiles: ['src/utils/pricing.ts', 'src/utils/vehiclePricing.ts', 'src/components/PricingManager.tsx']
- Line 440: (cottage) relatedFiles: ['src/AdminUsers.tsx', 'src/AdminCottages.tsx', 'src/MainDashboard.tsx']
- Line 468: (provider) summary += `📊 როლები: Customer, Provider, Admin, Super Admin\n`;

## backend/services/user_service.js
- Line 20: (provider) role, // SUPER_ADMIN, PROVIDER, CUSTOMER

## backend/test_ai_comprehensive.js
- Line 8: (booking) question: "მომწერე Bakhmaro booking-ის ძირითადი ფუნქციები",
- Line 29: (booking) question: "რა ფუნქციებია BookingService.ts-ში?",
- Line 31: (booking) expectedKeywords: ["createBooking", "updateBooking", "getBookings", "validation"],
- Line 36: (booking) question: "როგორ მუშაობს BookingModal კომპონენტი?",
- Line 45: (hotel) expectedKeywords: ["სასტუმრო", "hotel", "ბუკინგი", "ნომერი", "ღამე"],
- Line 65: (vehicle) category: "vehicle_types",
- Line 66: (vehicle) expectedKeywords: ["ტრანსპორტი", "vehicle", "მანქანა", "სნოუმობილი"],

## backend/test_ai_final_scenarios.js
- Line 9: (booking) query: 'მომიყევი Bakhmaro Booking-ის ძირითადი გვერდები',
- Line 16: (booking) id: 'booking_process',
- Line 19: (booking) description: 'Step-by-step booking process'
- Line 22: (provider) // 3. Provider როლის უფლებები
- Line 24: (provider) id: 'provider_permissions',
- Line 25: (provider) query: 'რა დონის წვდომა აქვს Provider როლს?',
- Line 26: (booking, cottage) expectedElements: ['view_dashboard', 'manage_cottages', 'view_bookings', 'admin პანელი'],
- Line 27: (provider) description: 'Provider role permissions and access levels'
- Line 34: (cottage) expectedElements: ['AdminCottages.tsx', 'CottageForm.tsx', 'CottagePage.tsx', 'firestore'],
- Line 35: (cottage) description: 'Technical file structure for cottage management'
- Line 50: (booking) expectedElements: ['depositAmount', 'totalPrice', 'BookingModal', 'ავანსი'],
- Line 58: (commission) expectedElements: ['manage_users', 'manage_roles', 'view_logs', 'commission მართვა'],
- Line 98: (notification) expectedElements: ['MessagingSystem', 'real-time', 'notifications'],
- Line 99: (notification) description: 'Internal messaging and notification system'
- Line 104: (bank) id: 'bank_account_management',
- Line 106: (bank, commission) expectedElements: ['BankAccountManager', 'commission', 'payment routing'],
- Line 107: (bank, provider) description: 'Bank account management for providers'

## backend/test_groq_responses.js
- Line 7: (booking) question: "რა ფუნქცია აქვს bookingService.ts-ში?",
- Line 8: (booking) context: "ეს კითხვა ეხება booking service-ის ფუნქციონალს"
- Line 12: (booking) question: "როგორ მუშაობს BookingModal კომპონენტი?",
- Line 17: (booking) question: "რა ლოგიკაა transport booking სერვისში?",
- Line 18: (booking, vehicle) context: "ეს კითხვა ეხება vehicle booking ლოგიკას"

## backend/utils/enhanced_georgian_validator.js
- Line 77: (booking) 'ჩემი საიტი': 'ბახმაროს Booking პლატფორმა',

## backend/utils/rpid.js
- Line 178: (cottage, rental) rpName: 'Bakhmaro Cottages - Georgian Rental Platform'

## docs/REPLIT_AI_ASSISTANT_ARCHITECTURE.md
- Line 430: (provider) interface DiagnosticsProvider {

## docs/ai-stream-diagnostic.md
- Line 4: (provider) - Investigation performed within local repository snapshot; live infrastructure (browser UI, running backend, Groq provider) was not available.

## docs/front-ai-chat-report.md
- Line 56: (provider) - Proxy consumes environment variables: `AI_SERVICE_URL`, `AI_INTERNAL_TOKEN`, `ALLOW_ANONYMOUS_AI_CHAT`, `AI_PROXY_STREAMING_MODE`, and optionally realtime provider keys (`GROQ_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`) to switch streaming mode; sets signed service headers for upstream authentication.【F:backend/routes/ai_chat.js†L11-L118】

## docs/step0_frontend_inventory.csv
- Line 2: (commission) ai-frontend/src/AdminCommission.tsx,Component
- Line 3: (cottage) ai-frontend/src/AdminCottages.tsx,Component
- Line 5: (hotel) ai-frontend/src/AdminHotels.tsx,Component
- Line 9: (booking, provider) ai-frontend/src/AdminProviderBookings.tsx,Component
- Line 10: (provider) ai-frontend/src/AdminProviders.tsx,Component
- Line 11: (snowmobile) ai-frontend/src/AdminSnowmobiles.tsx,Component
- Line 13: (vehicle) ai-frontend/src/AdminVehicles.tsx,Component
- Line 15: (booking) ai-frontend/src/BookingForm.tsx,Component
- Line 16: (calendar) ai-frontend/src/CalendarView.tsx,Component
- Line 17: (cottage) ai-frontend/src/CottageForm.tsx,Component
- Line 18: (cottage) ai-frontend/src/CottagePage.tsx,Page
- Line 19: (cottage) ai-frontend/src/CottagesList.tsx,Component
- Line 21: (booking, hotel) ai-frontend/src/HotelBookingForm.tsx,Component
- Line 22: (hotel) ai-frontend/src/HotelForm.tsx,Component
- Line 23: (hotel) ai-frontend/src/HotelPage.tsx,Page
- Line 24: (hotel) ai-frontend/src/HotelsList.tsx,Component
- Line 29: (booking, provider) ai-frontend/src/ProviderBookings.tsx,Component
- Line 30: (provider) ai-frontend/src/ProviderDetails.tsx,Component
- Line 31: (snowmobile) ai-frontend/src/SnowmobileForm.tsx,Component
- Line 33: (booking, vehicle) ai-frontend/src/VehicleBookingForm.tsx,Component
- Line 34: (vehicle) ai-frontend/src/VehicleForm.tsx,Component
- Line 35: (vehicle) ai-frontend/src/VehiclePage.tsx,Page
- Line 36: (vehicle) ai-frontend/src/VehiclesList.tsx,Component
- Line 44: (bank) ai-frontend/src/components/BankAccountField.tsx,Component
- Line 45: (bank) ai-frontend/src/components/BankAccountManager.tsx,Component
- Line 46: (bank) ai-frontend/src/components/BankInfoForm.tsx,Component
- Line 47: (booking) ai-frontend/src/components/BookingAuth.tsx,Component
- Line 48: (booking) ai-frontend/src/components/BookingModal.tsx,Component
- Line 49: (calendar) ai-frontend/src/components/Calendar.tsx,Component
- Line 59: (horse) ai-frontend/src/components/HorseCard.tsx,Component
- Line 60: (hotel) ai-frontend/src/components/HotelCard.tsx,Component
- Line 62: (notification) ai-frontend/src/components/NotificationSystem.tsx,Component
- Line 63: (commission, provider) ai-frontend/src/components/ProviderCommissionDashboard.tsx,Page
- Line 69: (snowmobile) ai-frontend/src/components/SnowmobileCard.tsx,Component
- Line 72: (booking) ai-frontend/src/components/UserBookingsSection.tsx,Component
- Line 75: (vehicle) ai-frontend/src/components/VehicleCard.tsx,Component
- Line 88: (provider) ai-frontend/src/contexts/FilePreviewProvider.tsx,Service
- Line 102: (booking) ai-frontend/src/hooks/useBookingQueries.ts,Util
- Line 110: (cottage) ai-frontend/src/pages/Cottages/CottageForm.tsx,Page
- Line 111: (cottage) ai-frontend/src/pages/Cottages/NewCottagePage.tsx,Page
- Line 114: (provider) ai-frontend/src/pages/ProviderLogin.tsx,Page
- Line 118: (bank) ai-frontend/src/services/bankAccountService.ts,Service
- Line 119: (booking) ai-frontend/src/services/bookingAuthService.ts,Service
- Line 120: (booking) ai-frontend/src/services/bookingExpirationService.ts,Service
- Line 121: (booking) ai-frontend/src/services/bookingService.ts,Service
- Line 127: (notification) ai-frontend/src/services/notificationService.ts,Service
- Line 136: (bank) ai-frontend/src/types/bank.ts,Type
- Line 137: (cottage) ai-frontend/src/types/cottage.ts,Type
- Line 139: (hotel) ai-frontend/src/types/hotel.ts,Type
- Line 143: (vehicle) ai-frontend/src/types/vehicle.ts,Type
- Line 154: (vehicle) ai-frontend/src/utils/vehiclePricing.ts,Util

## docs/step0_frontend_inventory.md
- Line 4: (booking, calendar, commission, cottage, hotel, provider, rental, snowmobile, vehicle) This document captures the Bakhmaro rental domain footprint within the frontend workspace. It lists every file that still references booking, cottage, hotel, commission, customer, provider, calendar, vehicle, or snowmobile concepts (including Georgian UI copy), and records the role those files play. A CSV export is stored alongside this report for backup.
- Line 17: (cottage, vehicle) - `ai-frontend/src/AdminPanel.tsx` — Implements tab navigation that redirects to /admin sub-routes like /admin/javshnissia, /admin/cottages, and /admin/vehicles.
- Line 18: (cottage, horse, hotel, snowmobile, vehicle) - `ai-frontend/src/components/UnifiedListingForm.tsx` — Centralizes creation routes for cottages, vehicles, hotels, horses, and snowmobiles under /admin/*/new.
- Line 20: (cottage, hotel, vehicle) - `ai-frontend/src/components/Header.tsx` — Navigation menu exposes public-facing cottage/hotel/vehicle routes and admin detection based on pathname.
- Line 27: (commission) | `ai-frontend/src/AdminCommission.tsx` | Component |
- Line 28: (cottage) | `ai-frontend/src/AdminCottages.tsx` | Component |
- Line 30: (hotel) | `ai-frontend/src/AdminHotels.tsx` | Component |
- Line 34: (booking, provider) | `ai-frontend/src/AdminProviderBookings.tsx` | Component |
- Line 35: (provider) | `ai-frontend/src/AdminProviders.tsx` | Component |
- Line 36: (snowmobile) | `ai-frontend/src/AdminSnowmobiles.tsx` | Component |
- Line 38: (vehicle) | `ai-frontend/src/AdminVehicles.tsx` | Component |
- Line 40: (booking) | `ai-frontend/src/BookingForm.tsx` | Component |
- Line 41: (calendar) | `ai-frontend/src/CalendarView.tsx` | Component |
- Line 42: (cottage) | `ai-frontend/src/CottageForm.tsx` | Component |
- Line 43: (cottage) | `ai-frontend/src/CottagePage.tsx` | Page |
- Line 44: (cottage) | `ai-frontend/src/CottagesList.tsx` | Component |
- Line 46: (booking, hotel) | `ai-frontend/src/HotelBookingForm.tsx` | Component |
- Line 47: (hotel) | `ai-frontend/src/HotelForm.tsx` | Component |
- Line 48: (hotel) | `ai-frontend/src/HotelPage.tsx` | Page |
- Line 49: (hotel) | `ai-frontend/src/HotelsList.tsx` | Component |
- Line 54: (booking, provider) | `ai-frontend/src/ProviderBookings.tsx` | Component |
- Line 55: (provider) | `ai-frontend/src/ProviderDetails.tsx` | Component |
- Line 56: (snowmobile) | `ai-frontend/src/SnowmobileForm.tsx` | Component |
- Line 58: (booking, vehicle) | `ai-frontend/src/VehicleBookingForm.tsx` | Component |
- Line 59: (vehicle) | `ai-frontend/src/VehicleForm.tsx` | Component |
- Line 60: (vehicle) | `ai-frontend/src/VehiclePage.tsx` | Page |
- Line 61: (vehicle) | `ai-frontend/src/VehiclesList.tsx` | Component |
- Line 69: (bank) | `ai-frontend/src/components/BankAccountField.tsx` | Component |
- Line 70: (bank) | `ai-frontend/src/components/BankAccountManager.tsx` | Component |
- Line 71: (bank) | `ai-frontend/src/components/BankInfoForm.tsx` | Component |
- Line 72: (booking) | `ai-frontend/src/components/BookingAuth.tsx` | Component |
- Line 73: (booking) | `ai-frontend/src/components/BookingModal.tsx` | Component |
- Line 74: (calendar) | `ai-frontend/src/components/Calendar.tsx` | Component |
- Line 84: (horse) | `ai-frontend/src/components/HorseCard.tsx` | Component |
- Line 85: (hotel) | `ai-frontend/src/components/HotelCard.tsx` | Component |
- Line 87: (notification) | `ai-frontend/src/components/NotificationSystem.tsx` | Component |
- Line 88: (commission, provider) | `ai-frontend/src/components/ProviderCommissionDashboard.tsx` | Page |
- Line 94: (snowmobile) | `ai-frontend/src/components/SnowmobileCard.tsx` | Component |
- Line 97: (booking) | `ai-frontend/src/components/UserBookingsSection.tsx` | Component |
- Line 100: (vehicle) | `ai-frontend/src/components/VehicleCard.tsx` | Component |
- Line 113: (provider) | `ai-frontend/src/contexts/FilePreviewProvider.tsx` | Service |
- Line 127: (booking) | `ai-frontend/src/hooks/useBookingQueries.ts` | Util |
- Line 135: (cottage) | `ai-frontend/src/pages/Cottages/CottageForm.tsx` | Page |
- Line 136: (cottage) | `ai-frontend/src/pages/Cottages/NewCottagePage.tsx` | Page |
- Line 139: (provider) | `ai-frontend/src/pages/ProviderLogin.tsx` | Page |
- Line 143: (bank) | `ai-frontend/src/services/bankAccountService.ts` | Service |
- Line 144: (booking) | `ai-frontend/src/services/bookingAuthService.ts` | Service |
- Line 145: (booking) | `ai-frontend/src/services/bookingExpirationService.ts` | Service |
- Line 146: (booking) | `ai-frontend/src/services/bookingService.ts` | Service |
- Line 152: (notification) | `ai-frontend/src/services/notificationService.ts` | Service |
- Line 161: (bank) | `ai-frontend/src/types/bank.ts` | Type |
- Line 162: (cottage) | `ai-frontend/src/types/cottage.ts` | Type |
- Line 164: (hotel) | `ai-frontend/src/types/hotel.ts` | Type |
- Line 168: (vehicle) | `ai-frontend/src/types/vehicle.ts` | Type |
- Line 179: (vehicle) | `ai-frontend/src/utils/vehiclePricing.ts` | Util |

## functions/.env.example
- Line 4: (commission) # Upstream property API endpoint for scheduled commission sync

## functions/scheduledCommission.js
- Line 70: (commission) const result = await propertyApiRequest('/commission/generate-invoices', {
- Line 91: (commission) await propertyApiRequest('/commission/send-reminders', { method: 'POST' });
- Line 109: (commission) await propertyApiRequest('/commission/enforce-payments', { method: 'POST' });
- Line 119: (booking, commission) // Trigger function to calculate commission when booking is completed
- Line 120: (booking) exports.onBookingCompleted = functions.firestore
- Line 121: (booking) .document('bookings/{bookingId}')
- Line 127: (booking) // Check if booking status changed to completed
- Line 129: (booking, commission) console.log(`📋 Booking ${context.params.bookingId} completed, calculating commission...`);
- Line 131: (commission) const result = await propertyApiRequest('/commission/calculate', {
- Line 134: (provider) providerId: newValue.providerId,
- Line 136: (hotel) listingType: newValue.listingType || 'hotel',
- Line 140: (commission) const commission = result?.commission;
- Line 142: (commission) if (commission) {
- Line 144: (commission) commissionRate: commission.rate,
- Line 145: (commission) commissionAmount: commission.amount,
- Line 149: (booking, commission) console.log(`✅ Commission calculated for booking ${context.params.bookingId}: ₾${commission.amount}`);
- Line 151: (booking, commission) console.warn(`⚠️ Commission calculation returned no result for booking ${context.params.bookingId}`);
- Line 157: (booking, commission) console.error('❌ Error calculating commission for booking:', error);
- Line 177: (commission) await propertyApiRequest(`/commission/invoices/${invoiceId}/mark-paid`, {
- Line 194: (commission, provider) // Function to update provider commission rates
- Line 195: (commission, provider) exports.updateProviderCommissionRate = functions.https.onCall(async (data, context) => {
- Line 207: (provider) const { providerId, rate, model = 'percentage' } = data;
- Line 209: (provider) if (!providerId || !rate || rate < 0 || rate > 1) {
- Line 210: (commission, provider) throw new functions.https.HttpsError('invalid-argument', 'Invalid provider ID or commission rate');
- Line 213: (provider) await db.collection('providers').doc(providerId).update({
- Line 214: (commission) customCommission: { model, rate },
- Line 219: (commission, provider) console.log(`✅ Updated commission rate for provider ${providerId} to ${rate * 100}%`);
- Line 221: (commission) return { success: true, message: 'Commission rate updated successfully' };
- Line 223: (commission) console.error('❌ Error updating commission rate:', error);

## package-lock.json
- Line 7866: (bank) "integrity": "sha512-SbKbANkN603Vi4jEZv49LeVJMn4yGwsbzZworEoyEiutsN3nJYdbO36zfhGJ6QEDpOZIFkDtnq5JRxmvl3jsoQ==",

## pnpm-lock.yaml
- Line 2613: (bank) resolution: {integrity: sha512-SbKbANkN603Vi4jEZv49LeVJMn4yGwsbzZworEoyEiutsN3nJYdbO36zfhGJ6QEDpOZIFkDtnq5JRxmvl3jsoQ==}

## replit.md
- Line 1: (cottage) # Bakhmaro Cottages Platform
- Line 4: (cottage, rental) This project is "ბახმაროს ქირავება" (Bakhmaro Rental), a Georgian cottage/accommodation rental platform. It aims to provide a comprehensive solution for property rentals, integrating a modern frontend, a robust backend, and an advanced AI service with RAG capabilities for enhanced data persistence, session management, and codebase understanding. The platform prioritizes security, performance, and a seamless user experience, including full Georgian language support.

## restart-servers.js
- Line 5: (cottage) * Manual Server Restart Utility for Georgian Cottage Platform

## scripts/ensureLocalSecrets.js
- Line 33: (provider) auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',

## scripts/test_front_gurulo_chat.js
- Line 72: (cottage) ensureCTA(responseSections, /\/cottages/i);
- Line 97: (cottage) ensureCTA(responseSections, /\/cottages/i);

## test_ai_scenarios.js
- Line 5: (booking) question: "რა ფუნქცია აქვს bookingService.ts-ში?",
- Line 6: (booking, provider) expectedTopics: ["getBookingsByUser", "createBooking", "updateBooking", "deleteBooking", "calculateProviderStats"],
- Line 11: (booking) question: "როგორ მუშაობს BookingModal კომპონენტი?",
- Line 12: (booking, calendar) expectedTopics: ["booking form", "validation", "Firebase", "calendar", "pricing"],
- Line 17: (booking) question: "რა ლოგიკაა transport booking სერვისში?",
- Line 18: (booking, vehicle) expectedTopics: ["vehicle booking", "pricing", "availability", "validation"],
- Line 23: (cottage) question: "როგორ ითვლება ღამეების ღირებულება cottage-ებისთვის?",
- Line 30: (notification) expectedTopics: ["conversations", "real-time", "notifications", "support"],
