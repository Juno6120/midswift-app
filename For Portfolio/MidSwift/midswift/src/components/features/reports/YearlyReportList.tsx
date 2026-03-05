"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Pencil,
  CheckSquare,
  Square,
  Trash2,
  X,
  ListChecks,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";
import { ExportYearButton } from "@/src/components/features/export/ExportYearButton";
import { DeleteReportButton } from "@/src/components/features/reports/DeleteReportButton";
import { deleteReportsBatch } from "@/src/app/dashboard/actions";
import LoadingScreen from "@/src/components/ui/LoadingScreen";
import { useToast } from "@/src/context/ToastContext";

type MonthName =
  | "JANUARY"
  | "FEBRUARY"
  | "MARCH"
  | "APRIL"
  | "MAY"
  | "JUNE"
  | "JULY"
  | "AUGUST"
  | "SEPTEMBER"
  | "OCTOBER"
  | "NOVEMBER"
  | "DECEMBER";

const MONTH_ORDER: Record<MonthName, number> = {
  JANUARY: 1,
  FEBRUARY: 2,
  MARCH: 3,
  APRIL: 4,
  MAY: 5,
  JUNE: 6,
  JULY: 7,
  AUGUST: 8,
  SEPTEMBER: 9,
  OCTOBER: 10,
  NOVEMBER: 11,
  DECEMBER: 12,
};

interface Report {
  id: string;
  report_month: MonthName;
  status: string;
}

interface YearlyReportListProps {
  category?: string;
  year: number;
  reports: Report[];
  exportUrl: string;
  defaultOpen?: boolean;
  onToggle?: () => void;
  accordionName?: string;
}

export function YearlyReportList({
  category,
  year,
  reports,
  exportUrl,
  defaultOpen = false,
  onToggle,
  accordionName,
}: YearlyReportListProps) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(defaultOpen);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { showToast } = useToast();

  const sortedReports = [...reports].sort(
    (a, b) =>
      (MONTH_ORDER[a.report_month] ?? 0) - (MONTH_ORDER[b.report_month] ?? 0),
  );

  useEffect(() => {
    setIsExpanded(defaultOpen);
  }, [defaultOpen]);

  useEffect(() => {
    if (!isExpanded && isSelecting) {
      setIsSelecting(false);
      setSelectedIds(new Set());
    }
  }, [isExpanded, isSelecting]);

  const handleTouchStart = (id: string) => {
    if (isSelecting) return;

    timerRef.current = setTimeout(() => {
      setIsSelecting(true);
      setSelectedIds(new Set([id]));

      if (typeof window !== "undefined" && window.navigator?.vibrate) {
        window.navigator.vibrate(50);
      }
    }, 500);
  };

  const handleTouchEnd = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const cancelSelection = () => {
    setIsSelecting(false);
    setSelectedIds(new Set());
    setIsModalOpen(false);
  };

  const executeBatchDelete = async () => {
    const idsToDelete = Array.from(selectedIds);
    if (idsToDelete.length === 0) return;

    setIsDeleting(true);
    try {
      const response = await deleteReportsBatch(idsToDelete);

      if (response?.success) {
        setIsModalOpen(false);
        cancelSelection();
        showToast("success", response.message);
      }
    } catch (error) {
      console.error("Batch delete failed:", error);
      setIsModalOpen(false);
      showToast(
        "error",
        "Failed to delete selected reports. Please try again.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const ReportInfo = ({ report }: { report: Report }) => (
    <div>
      <span className="text-base font-bold text-slate-800 group-hover/row:text-teal-700 block">
        {report.report_month}
      </span>
    </div>
  );

  const renderReportItem = (report: Report) => {
    const isSelected = selectedIds.has(report.id);
    return (
      <div
        key={report.id}
        onTouchStart={() => handleTouchStart(report.id)}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchEnd}
        onClick={() => isSelecting && toggleSelection(report.id)}
        className={`flex items-center justify-between p-4 bg-white border rounded-2xl transition-all group/row ${
          isSelecting ? "cursor-pointer" : ""
        } ${
          isSelected
            ? "border-teal-400 bg-teal-50 ring-1 ring-teal-400 shadow-sm"
            : "border-slate-200 hover:border-teal-300 hover:shadow-md"
        }`}
      >
        <div className="grow flex items-center gap-4">
          {isSelecting && (
            <div className="text-teal-600">
              {isSelected ? (
                <CheckSquare className="w-5 h-5" />
              ) : (
                <Square className="w-5 h-5 text-slate-300" />
              )}
            </div>
          )}
          {isSelecting ? (
            <ReportInfo report={report} />
          ) : (
            <Link
              href={`/dashboard/reports/${report.id}`}
              onClick={() => setIsLoading(true)}
              className="grow flex items-center gap-4"
            >
              <ReportInfo report={report} />
            </Link>
          )}
        </div>
        {!isSelecting && (
          <div className="flex items-center gap-1">
            <Link
              href={`/dashboard/reports/${report.id}`}
              onClick={() => setIsLoading(true)}
              className="p-2.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all"
            >
              <Pencil className="w-5 h-5" />
            </Link>
            <DeleteReportButton
              reportId={report.id}
              monthName={report.report_month}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {isLoading && (
        <LoadingScreen isTimeout={false} onClose={() => setIsLoading(false)} />
      )}

      <div className="space-y-3">
        <div
          className="flex items-center justify-between px-1 h-8 cursor-pointer"
          onClick={() => {
            if (!isSelecting) {
              onToggle ? onToggle() : setIsExpanded((prev) => !prev);
            }
          }}
        >
          {!isSelecting ? (
            <>
              <div className="flex items-center gap-2 text-slate-700">
                <span className="font-black text-sm uppercase tracking-tighter italic">
                  {year}
                </span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-300 ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                />
              </div>

              <div
                className="flex items-center gap-3"
                onClick={(e) => e.stopPropagation()}
              >
                {isExpanded && (
                  <button
                    onClick={() => setIsSelecting(true)}
                    className="hidden sm:flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-teal-600 transition-colors"
                  >
                    <ListChecks className="w-4 h-4" /> Select
                  </button>
                )}
                <ExportYearButton year={year} exportUrl={exportUrl} />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-teal-700">
                <span className="font-black text-sm uppercase tracking-tighter">
                  {selectedIds.size} Selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={cancelSelection}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setIsModalOpen(true)}
                  disabled={selectedIds.size === 0}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            </>
          )}
        </div>

        <div
          className={`grid transition-all duration-500 ease-in-out ${
            isExpanded
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            {category === "Deworming & Vitamin A Report" ? (
              <div className="flex flex-col gap-4 pt-2">
                {(() => {
                  const dewormingReports = sortedReports.filter(
                    (r) =>
                      r.report_month === "JANUARY" || r.report_month === "JULY",
                  );
                  const vitAReports = sortedReports.filter(
                    (r) =>
                      r.report_month === "APRIL" ||
                      r.report_month === "OCTOBER",
                  );
                  const otherReports = sortedReports.filter(
                    (r) =>
                      !["JANUARY", "JULY", "APRIL", "OCTOBER"].includes(
                        r.report_month,
                      ),
                  );

                  return (
                    <>
                      {dewormingReports.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-2">
                            Deworming
                          </h4>
                          <div className="grid grid-cols-1 gap-2">
                            {dewormingReports.map(renderReportItem)}
                          </div>
                        </div>
                      )}
                      {vitAReports.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-2">
                            Vitamin A
                          </h4>
                          <div className="grid grid-cols-1 gap-2">
                            {vitAReports.map(renderReportItem)}
                          </div>
                        </div>
                      )}
                      {otherReports.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-2">
                            Others
                          </h4>
                          <div className="grid grid-cols-1 gap-2">
                            {otherReports.map(renderReportItem)}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 pt-2">
                {sortedReports.map(renderReportItem)}
              </div>
            )}
          </div>
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
              <div className="p-6 text-center space-y-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  Delete {selectedIds.size}{" "}
                  {selectedIds.size === 1 ? "Report" : "Reports"}?
                </h3>
                <p className="text-gray-500 text-sm">
                  This action cannot be undone.
                </p>
              </div>
              <div className="flex border-t border-gray-100 bg-gray-50">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-4 text-sm font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <div className="w-px bg-gray-200"></div>
                <button
                  onClick={executeBatchDelete}
                  className="flex-1 px-4 py-4 text-sm font-bold text-red-600 hover:bg-red-50"
                >
                  {isDeleting ? "Deleting..." : "Yes, Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
