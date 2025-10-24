import React from 'react';

interface BookingModalProps {
  cottageId?: string;
  cottageName?: string;
  isOpen: boolean;
  onClose: () => void;
  booking?: unknown;
  mode?: 'create' | 'edit' | 'view';
  onBookingUpdated?: () => void;
}

export default function BookingModal({
  cottageName,
  isOpen,
  onClose,
}: BookingModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl dark:bg-gray-900">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Legacy booking disabled
          </h2>
          {cottageName ? (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              The historic booking workflow for <span className="font-medium">{cottageName}</span> has been retired as part of the
              AI workspace migration.
            </p>
          ) : (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Cottage bookings are no longer available in this environment.
            </p>
          )}
        </div>

        <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300">
          <p>
            To manage AI workspace resources, please use the new admin surfaces instead of the legacy rental forms.
          </p>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-white dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
