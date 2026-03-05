// src/components/features/reports/BatchDeleteButton.tsx
"use client";

import { useState } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { deleteReportsBatch } from "@/src/app/dashboard/actions";
import { useToast } from "@/src/context/ToastContext";

interface BatchDeleteButtonProps {
  selectedIds: string[];
  onClearSelection?: () => void;
}

export function BatchDeleteButton({
  selectedIds,
  onClearSelection,
}: BatchDeleteButtonProps): React.JSX.Element | null {
  // I'm tracking whether our confirmation modal is visible to the user.
  const [isOpen, setIsOpen] = useState<boolean>(false);

  // I'm using this state to disable buttons and show a loading phase while we wait for the server.
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const { showToast } = useToast();

  // If we don't have any items selected, I'm just bailing out early.
  // There's no point in rendering a delete button if there's nothing to delete!
  if (selectedIds.length === 0) return null;

  // I'm setting this up as an async function because we need to wait for the server action to finish doing its thing.
  const handleBatchDelete = async (): Promise<void> => {
    setIsDeleting(true);

    // I'm wrapping our server call in a try-catch block so we can handle network hiccups gracefully without crashing the app.
    try {
      const response = await deleteReportsBatch(selectedIds);

      // Once the server gives us the green light, I'm cleaning up the UI.
      if (response?.success) {
        setIsOpen(false);
        showToast("success", response.message);

        // If the parent component passed down a cleanup function, I'm calling it here to uncheck all those boxes.
        if (onClearSelection) {
          onClearSelection();
        }
      }
    } catch (error: unknown) {
      // If things go south, I'm making sure we log it for our own debugging,
      // but I'm also showing a friendly error toast so the user isn't left in the dark.
      console.error(error);
      showToast(
        "error",
        "Failed to delete selected reports. Please try again.",
      );
    } finally {
      // Whether the request succeeded or failed, I'm resetting our loading state so the user isn't stuck forever.
      setIsDeleting(false);
    }
  };

  // Here, I'm wrapping the return in a fragment so we can render both the trigger button and the modal on the same level.
  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
      >
        <Trash2 className="w-4 h-4" />
        Delete Selected ({selectedIds.length})
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>

              <h3 className="text-xl font-bold text-gray-900">
                Delete Multiple Reports?
              </h3>
              <p className="text-gray-500 text-sm">
                Are you sure you want to permanently delete{" "}
                <span className="font-bold text-gray-800">
                  {selectedIds.length}
                </span>{" "}
                reports? This action cannot be undone.
              </p>
            </div>

            <div className="flex border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => setIsOpen(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-4 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <div className="w-px bg-gray-200"></div>
              <button
                onClick={handleBatchDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-4 text-sm font-bold text-red-600 hover:bg-red-50 transition disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Yes, Delete All"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
