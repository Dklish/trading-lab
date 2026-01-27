"use client";

type MarketStatus = "connecting" | "live" | "disconnected" | "error" | "loading" | "stale";

interface DashboardHeaderProps {
  status: MarketStatus;
  lastUpdated: number | null;
  errors: string[];
}

export default function DashboardHeader({ status, lastUpdated, errors }: DashboardHeaderProps) {
  const getStatusBadge = () => {
    switch (status) {
      case "live":
        return { text: "Live", color: "bg-green-100 text-green-800" };
      case "connecting":
        return { text: "Connecting", color: "bg-blue-100 text-blue-800" };
      case "disconnected":
        return { text: "Disconnected", color: "bg-yellow-100 text-yellow-800" };
      case "stale":
        return { text: "Stale", color: "bg-yellow-100 text-yellow-800" };
      case "error":
        return { text: "Error", color: "bg-red-100 text-red-800" };
      case "loading":
        return { text: "Loading", color: "bg-gray-100 text-gray-800" };
      default:
        return { text: "Unknown", color: "bg-gray-100 text-gray-800" };
    }
  };

  const formatLastUpdated = () => {
    if (!lastUpdated) return "Never";
    const seconds = Math.floor((Date.now() - lastUpdated) / 1000);
    if (seconds < 5) return "Just now";
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  };

  const statusBadge = getStatusBadge();

  return (
    <div className="mb-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Trading Lab</h1>
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusBadge.color}`}>
          {statusBadge.text}
        </span>
      </div>
      
      <div className="text-sm text-gray-600">
        Last updated: {formatLastUpdated()}
      </div>
      
      {errors.length > 0 && (
        <div className="flex-1 ml-4">
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <div className="text-sm text-red-800">
              <strong>Errors:</strong> {errors.join(", ")}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
