import { AlertTriangle } from "lucide-react";

export function ErrorState({
  message = "Something went wrong.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-red-50 p-3">
        <AlertTriangle className="h-6 w-6 text-red-500" />
      </div>
      <h3 className="mt-3 text-sm font-medium text-gray-900">{message}</h3>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          Retry
        </button>
      )}
    </div>
  );
}
