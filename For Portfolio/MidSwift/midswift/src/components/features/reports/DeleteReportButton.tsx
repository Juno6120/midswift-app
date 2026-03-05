"use client";

import React, { useState } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { deleteReport } from "@/src/app/dashboard/actions";
import { useToast } from "@/src/context/ToastContext";

// I'm naming this specifically so it's easier to find in the IDE than just "Props"
interface DeleteReportButtonProps {
  reportId: string;
  monthName: string;
}

export function DeleteReportButton({
  reportId,
  monthName,
}: DeleteReportButtonProps) {
  // I'm using these two states to control the "Are you sure?" popup
  // and to disable buttons so the user doesn't click "Delete" twice.
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Pulling this in so I can send those nice popup notifications.
  const { showToast } = useToast();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // I'm calling the server action here to wipe the record from the DB.
      await deleteReport(reportId);

      // I'm triggering a success message. Since the parent list will likely
      // re-validate and remove this component, I don't need to manually close the modal.
      showToast("success", `Successfully deleted 1 report (${monthName}).`);
    } catch (error: unknown) {
      // In TypeScript, errors are 'unknown', so I'm logging it and
      // resetting the UI so the user can actually try again if they want.
      console.error("Deletion failed:", error);
      setIsOpen(false);
      setIsDeleting(false);
      showToast("error", "Failed to delete. Please try again.");
    }
  };

  return (
    <>
      {/* This is the main trash icon button that starts the whole process. */}
      <button
        onClick={(e: React.MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(true);
        }}
        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
        title="Delete Report"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {/* I only want to render the overlay and modal if the user actually clicked the trash icon. */}
      {isOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>

              <h3 className="text-xl font-bold text-gray-900">
                Delete Report?
              </h3>
              <p className="text-gray-500 text-sm">
                Are you sure you want to permanently delete the{" "}
                <span className="font-bold text-gray-800">{monthName}</span>{" "}
                report? This action cannot be undone.
              </p>
            </div>

            <div className="flex border-t border-gray-100 bg-gray-50">
              {/* I'm making sure both buttons are disabled during the async delete call. */}
              <button
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                disabled={isDeleting}
                className="flex-1 px-4 py-4 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition disabled:opacity-50"
              >
                Cancel
              </button>

              <div className="w-px bg-gray-200"></div>

              <button
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDelete();
                }}
                disabled={isDeleting}
                className="flex-1 px-4 py-4 text-sm font-bold text-red-600 hover:bg-red-50 transition disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
