# Step 0 Frontend Domain Inventory

## Overview
This document captures the Bakhmaro rental domain footprint within the frontend workspace. It lists every file that still references booking, cottage, hotel, commission, customer, provider, calendar, vehicle, or snowmobile concepts (including Georgian UI copy), and records the role those files play. A CSV export is stored alongside this report for backup.

### Role distribution
- **Component**: 70 files
- **Page**: 16 files
- **Route**: 1 files
- **Service**: 38 files
- **Type**: 8 files
- **Util**: 20 files
- **Total**: 153 files

### Routing sources
- `ai-frontend/src/App.tsx` — Defines the BrowserRouter and maps the root path and /admin entry to the legacy admin panel.
- `ai-frontend/src/AdminPanel.tsx` — Implements tab navigation that redirects to /admin sub-routes like /admin/javshnissia, /admin/cottages, and /admin/vehicles.
- `ai-frontend/src/components/UnifiedListingForm.tsx` — Centralizes creation routes for cottages, vehicles, hotels, horses, and snowmobiles under /admin/*/new.
- `ai-frontend/src/hooks/useBrowserTestingRoutes.ts` — Exports helper routes pointing to /admin/browser-testing paths.
- `ai-frontend/src/components/Header.tsx` — Navigation menu exposes public-facing cottage/hotel/vehicle routes and admin detection based on pathname.
- `ai-frontend/src/features/devconsole-v2/components/ServicesView.tsx` — Route discovery utility references /admin?tab=dashboard and other admin routes when linking services.
- `ai-frontend/src/contexts/AuthContext.tsx` — Authentication flows redirect users to /admin?tab=dashboard upon successful login.

### File catalog
| File Path | Role |
| --- | --- |
| `ai-frontend/src/AdminCommission.tsx` | Component |
| `ai-frontend/src/AdminCottages.tsx` | Component |
| `ai-frontend/src/AdminCustomers.tsx` | Component |
| `ai-frontend/src/AdminHotels.tsx` | Component |
| `ai-frontend/src/AdminLogs.tsx` | Component |
| `ai-frontend/src/AdminMyProfile.tsx` | Component |
| `ai-frontend/src/AdminPanel.tsx` | Page |
| `ai-frontend/src/AdminProviderBookings.tsx` | Component |
| `ai-frontend/src/AdminProviders.tsx` | Component |
| `ai-frontend/src/AdminSnowmobiles.tsx` | Component |
| `ai-frontend/src/AdminUsers.tsx` | Component |
| `ai-frontend/src/AdminVehicles.tsx` | Component |
| `ai-frontend/src/App.tsx` | Route |
| `ai-frontend/src/BookingForm.tsx` | Component |
| `ai-frontend/src/CalendarView.tsx` | Component |
| `ai-frontend/src/CottageForm.tsx` | Component |
| `ai-frontend/src/CottagePage.tsx` | Page |
| `ai-frontend/src/CottagesList.tsx` | Component |
| `ai-frontend/src/CustomerProfile.tsx` | Component |
| `ai-frontend/src/HotelBookingForm.tsx` | Component |
| `ai-frontend/src/HotelForm.tsx` | Component |
| `ai-frontend/src/HotelPage.tsx` | Page |
| `ai-frontend/src/HotelsList.tsx` | Component |
| `ai-frontend/src/Javshnissia.tsx` | Component |
| `ai-frontend/src/MainDashboard.tsx` | Page |
| `ai-frontend/src/MainPage.tsx` | Page |
| `ai-frontend/src/PriceOverrideManager.tsx` | Component |
| `ai-frontend/src/ProviderBookings.tsx` | Component |
| `ai-frontend/src/ProviderDetails.tsx` | Component |
| `ai-frontend/src/SnowmobileForm.tsx` | Component |
| `ai-frontend/src/UserDashboard.tsx` | Page |
| `ai-frontend/src/VehicleBookingForm.tsx` | Component |
| `ai-frontend/src/VehicleForm.tsx` | Component |
| `ai-frontend/src/VehiclePage.tsx` | Page |
| `ai-frontend/src/VehiclesList.tsx` | Component |
| `ai-frontend/src/components/AIAssistantEnhanced.tsx` | Component |
| `ai-frontend/src/components/AIDeveloper/tabs/ConsoleTab.tsx` | Component |
| `ai-frontend/src/components/AIDeveloperPanel.tsx` | Component |
| `ai-frontend/src/components/AIMemoryManager/ContextActions.tsx` | Component |
| `ai-frontend/src/components/AdminMessagingDashboard.tsx` | Page |
| `ai-frontend/src/components/AdvancedSearch.tsx` | Component |
| `ai-frontend/src/components/Backup/BackupTab.tsx` | Component |
| `ai-frontend/src/components/BankAccountField.tsx` | Component |
| `ai-frontend/src/components/BankAccountManager.tsx` | Component |
| `ai-frontend/src/components/BankInfoForm.tsx` | Component |
| `ai-frontend/src/components/BookingAuth.tsx` | Component |
| `ai-frontend/src/components/BookingModal.tsx` | Component |
| `ai-frontend/src/components/Calendar.tsx` | Component |
| `ai-frontend/src/components/CancellationReasonModal.tsx` | Component |
| `ai-frontend/src/components/ChatPanel.tsx` | Component |
| `ai-frontend/src/components/CheckpointManager.tsx` | Component |
| `ai-frontend/src/components/ConfirmationModal.tsx` | Component |
| `ai-frontend/src/components/EnhancedMessagingSystem.tsx` | Component |
| `ai-frontend/src/components/FilePreview.tsx` | Component |
| `ai-frontend/src/components/GitHubManagement/GitHubAnalyticsTab.tsx` | Component |
| `ai-frontend/src/components/GitHubManagement/GitHubVersionTab.tsx` | Component |
| `ai-frontend/src/components/Header.tsx` | Component |
| `ai-frontend/src/components/HorseCard.tsx` | Component |
| `ai-frontend/src/components/HotelCard.tsx` | Component |
| `ai-frontend/src/components/MessagingSystem.tsx` | Component |
| `ai-frontend/src/components/NotificationSystem.tsx` | Component |
| `ai-frontend/src/components/ProviderCommissionDashboard.tsx` | Page |
| `ai-frontend/src/components/ReplitInterface.tsx` | Component |
| `ai-frontend/src/components/ReviewsList.tsx` | Component |
| `ai-frontend/src/components/RolePermissionsPage.tsx` | Page |
| `ai-frontend/src/components/RoleSelectionWithDebug.tsx` | Component |
| `ai-frontend/src/components/SecurityAuditTab.tsx` | Component |
| `ai-frontend/src/components/SnowmobileCard.tsx` | Component |
| `ai-frontend/src/components/TermsAgreementModal.tsx` | Component |
| `ai-frontend/src/components/UnifiedListingForm.tsx` | Component |
| `ai-frontend/src/components/UserBookingsSection.tsx` | Component |
| `ai-frontend/src/components/UserDetailModal.tsx` | Component |
| `ai-frontend/src/components/UserProfile.tsx` | Component |
| `ai-frontend/src/components/VehicleCard.tsx` | Component |
| `ai-frontend/src/components/admin/AIDeveloperManagementPanel.tsx` | Component |
| `ai-frontend/src/components/admin/ai-panel/AnalyticsPanel.tsx` | Component |
| `ai-frontend/src/components/admin/ai-panel/FallbackControlCard.tsx` | Component |
| `ai-frontend/src/components/futuristic-chat/AIChatInterface.tsx` | Component |
| `ai-frontend/src/components/futuristic-chat/FuturisticChatPanel.tsx` | Component |
| `ai-frontend/src/components/illustrations/GuruloFsqIllustration.tsx` | Component |
| `ai-frontend/src/contexts/AIModeContext.tsx` | Service |
| `ai-frontend/src/contexts/AssistantModeContext.tsx` | Service |
| `ai-frontend/src/contexts/AuthContext.tsx` | Service |
| `ai-frontend/src/contexts/AuthContext.types.ts` | Service |
| `ai-frontend/src/contexts/DebugContext.tsx` | Service |
| `ai-frontend/src/contexts/DevConsoleContext.tsx` | Service |
| `ai-frontend/src/contexts/FilePreviewProvider.tsx` | Service |
| `ai-frontend/src/contexts/PermissionsContext.tsx` | Service |
| `ai-frontend/src/contexts/PermissionsContext.types.ts` | Service |
| `ai-frontend/src/contexts/ThemeContext.tsx` | Service |
| `ai-frontend/src/contexts/useAIMode.ts` | Service |
| `ai-frontend/src/contexts/useAssistantMode.ts` | Service |
| `ai-frontend/src/contexts/useAuth.ts` | Service |
| `ai-frontend/src/contexts/useDebug.ts` | Service |
| `ai-frontend/src/contexts/useDevConsole.ts` | Service |
| `ai-frontend/src/contexts/useFilePreview.ts` | Service |
| `ai-frontend/src/contexts/usePermissions.ts` | Service |
| `ai-frontend/src/contexts/useTheme.ts` | Service |
| `ai-frontend/src/features/devconsole-v2/components/AdvancedFilters.tsx` | Component |
| `ai-frontend/src/hooks/useBackupService.ts` | Util |
| `ai-frontend/src/hooks/useBookingQueries.ts` | Util |
| `ai-frontend/src/hooks/usePermissions.ts` | Util |
| `ai-frontend/src/hooks/useStubData.ts` | Util |
| `ai-frontend/src/hooks/useValidation.ts` | Util |
| `ai-frontend/src/i18n/locales/en.json` | Util |
| `ai-frontend/src/i18n/locales/ka.json` | Util |
| `ai-frontend/src/index.css` | Util |
| `ai-frontend/src/lib/firebase/auth.ts` | Service |
| `ai-frontend/src/pages/Cottages/CottageForm.tsx` | Page |
| `ai-frontend/src/pages/Cottages/NewCottagePage.tsx` | Page |
| `ai-frontend/src/pages/CustomerLogin.tsx` | Page |
| `ai-frontend/src/pages/DeviceManagement.tsx` | Page |
| `ai-frontend/src/pages/ProviderLogin.tsx` | Page |
| `ai-frontend/src/pages/RoleSelection.tsx` | Page |
| `ai-frontend/src/schemas/validationSchemas.ts` | Util |
| `ai-frontend/src/services/adminAiApi.ts` | Service |
| `ai-frontend/src/services/bankAccountService.ts` | Service |
| `ai-frontend/src/services/bookingAuthService.ts` | Service |
| `ai-frontend/src/services/bookingExpirationService.ts` | Service |
| `ai-frontend/src/services/bookingService.ts` | Service |
| `ai-frontend/src/services/customerService.ts` | Service |
| `ai-frontend/src/services/globalValidationService.ts` | Service |
| `ai-frontend/src/services/internalMessagingService.ts` | Service |
| `ai-frontend/src/services/invoiceService.ts` | Service |
| `ai-frontend/src/services/messagingService.ts` | Service |
| `ai-frontend/src/services/notificationService.ts` | Service |
| `ai-frontend/src/services/priceCodeService.ts` | Service |
| `ai-frontend/src/services/priceOverrideService.ts` | Service |
| `ai-frontend/src/services/realTimeService.ts` | Service |
| `ai-frontend/src/services/reviewService.ts` | Service |
| `ai-frontend/src/services/temporaryBlockingService.ts` | Service |
| `ai-frontend/src/services/userActivityMonitor.ts` | Service |
| `ai-frontend/src/services/userService.ts` | Service |
| `ai-frontend/src/services/userStatsService.ts` | Service |
| `ai-frontend/src/types/bank.ts` | Type |
| `ai-frontend/src/types/cottage.ts` | Type |
| `ai-frontend/src/types/customer.ts` | Type |
| `ai-frontend/src/types/hotel.ts` | Type |
| `ai-frontend/src/types/review.ts` | Type |
| `ai-frontend/src/types/seasonalPricing.ts` | Type |
| `ai-frontend/src/types/user.ts` | Type |
| `ai-frontend/src/types/vehicle.ts` | Type |
| `ai-frontend/src/utils/createTestLogs.ts` | Util |
| `ai-frontend/src/utils/debugHelpers.ts` | Util |
| `ai-frontend/src/utils/georgianCulturalAdapter.ts` | Util |
| `ai-frontend/src/utils/georgianGrammarParser.ts` | Util |
| `ai-frontend/src/utils/logDemo.ts` | Util |
| `ai-frontend/src/utils/pdfGenerator.ts` | Util |
| `ai-frontend/src/utils/pricing.ts` | Util |
| `ai-frontend/src/utils/updateGiorgiRole.ts` | Util |
| `ai-frontend/src/utils/updateUserRoles.ts` | Util |
| `ai-frontend/src/utils/validateFields.ts` | Util |
| `ai-frontend/src/utils/vehiclePricing.ts` | Util |

### Artifacts
- `docs/step0_frontend_inventory.csv` — machine-readable export of the table above.
