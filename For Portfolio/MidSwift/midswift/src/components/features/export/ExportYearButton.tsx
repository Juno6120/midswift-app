"use client";

import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface ExportYearButtonProps {
  exportUrl: string;
  year: number;
}

export function ExportYearButton({ exportUrl, year }: ExportYearButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastStyle, setToastStyle] = useState<React.CSSProperties>({});
  const [mounted, setMounted] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({
    position: "fixed",
    visibility: "hidden",
    top: "-9999px",
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (isOpen && wrapperRef.current && menuRef.current) {
      const buttonRect = wrapperRef.current.getBoundingClientRect();
      const menuRect = menuRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = document.documentElement.clientWidth;

      const spaceBelow = viewportHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;

      const openUp =
        spaceBelow < menuRect.height + 10 && spaceAbove > spaceBelow;

      setMenuStyle({
        position: "fixed",
        zIndex: 99999,
        minWidth: "160px",
        ...(openUp
          ? {
              bottom: viewportHeight - buttonRect.top + 4,
              right: viewportWidth - buttonRect.right,
            }
          : {
              top: buttonRect.bottom + 4,
              right: viewportWidth - buttonRect.right,
            }),
      });
    } else {
      setMenuStyle({
        position: "fixed",
        visibility: "hidden",
        top: "-9999px",
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleScroll = (e: Event) => {
      if (menuRef.current && menuRef.current.contains(e.target as Node)) return;
      if (isOpen) setIsOpen(false);
    };

    if (isOpen) {
      window.addEventListener("scroll", handleScroll, true);
      window.addEventListener("resize", handleScroll);
    }

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, [isOpen]);

  const triggerSuccessToast = () => {
    if (wrapperRef.current) {
      const buttonRect = wrapperRef.current.getBoundingClientRect();
      const viewportWidth = document.documentElement.clientWidth;
      setToastStyle({
        position: "fixed",
        top: buttonRect.bottom + 8,
        right: viewportWidth - buttonRect.right,
        zIndex: 99999,
      });
    }

    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setShowSuccessToast(true);
    toastTimerRef.current = setTimeout(() => {
      setShowSuccessToast(false);
    }, 5000);
  };

  const handleDocxExport = async () => {
    setIsExporting(true);
    setIsOpen(false);

    try {
      const res = await fetch(exportUrl);
      if (!res.ok) throw new Error("Failed to fetch docx file");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;

      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(
        /filename\*?=(?:UTF-8'')?["']?([^"';\n]+)/i,
      );
      link.download = match?.[1] ?? `${year}_export.docx`;

      link.click();
      URL.revokeObjectURL(url);

      triggerSuccessToast();
    } catch (err) {
      console.error("Export failed:", err);
      alert("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImageExport = async (format: "png" | "pdf") => {
    setIsExporting(true);
    setIsOpen(false);

    try {
      const res = await fetch(`${exportUrl}&format=json`);
      const data = await res.json();

      const { buildHtmlForType } = await import("@/src/lib/htmlTables");
      const html = buildHtmlForType(data.type, data);

      const iframe = document.createElement("iframe");
      iframe.style.cssText =
        "position:fixed;left:-9999px;top:-9999px;width:1400px;height:900px;border:none;";
      document.body.appendChild(iframe);

      await new Promise<void>((resolve) => {
        iframe.onload = () => resolve();
        iframe.srcdoc = html;
      });

      await new Promise((r) => setTimeout(r, 500));

      const iframeDoc = iframe.contentDocument!;
      const target = iframeDoc.body;

      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: 0,
        width: target.scrollWidth,
        height: target.scrollHeight,
        windowWidth: target.scrollWidth,
        windowHeight: target.scrollHeight,
      });

      document.body.removeChild(iframe);

      const type =
        (data.type as string)?.replace(/[\/\s]+/g, "").toUpperCase() ||
        "REPORT";
      const brgy =
        (data.brgy as string)?.replace(/\s+/g, "").toUpperCase() || "";
      const filename = `${year}_${brgy}_${type}`;

      if (format === "png") {
        const link = document.createElement("a");
        link.download = `${filename}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      } else {
        const { jsPDF } = await import("jspdf");
        const imgData = canvas.toDataURL("image/png");

        const pdf = new jsPDF({
          orientation: canvas.width > canvas.height ? "landscape" : "portrait",
          unit: "px",
          format: [canvas.width / 2, canvas.height / 2],
        });

        pdf.addImage(imgData, "PNG", 0, 0, canvas.width / 2, canvas.height / 2);
        pdf.save(`${filename}.pdf`);
      }

      triggerSuccessToast();
    } catch (err) {
      console.error("Export failed:", err);
      alert("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      {/* I’m toggling the dropdown menu here and disabling the button 
          if an export is already running so we don't double-click.
      */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={isExporting}
        className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-teal-50 text-teal-700 font-bold rounded-lg border border-gray-200 shadow-sm transition text-xs disabled:opacity-60"
      >
        {isExporting ? (
          <svg
            className="animate-spin h-3.5 w-3.5 text-teal-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        ) : (
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            ></path>
          </svg>
        )}

        {isExporting ? "Exporting..." : `Export`}

        <svg
          className={`w-3 h-3 text-teal-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
            d="M19 9l-7 7-7-7"
          ></path>
        </svg>
      </button>

      {/* I’m using a Portal here to shoot the menu to the end of the document body. 
          This prevents any parent containers with 'overflow: hidden' from cutting off my menu.
      */}
      {isOpen && mounted && document.body
        ? createPortal(
            <div
              ref={menuRef}
              style={menuStyle}
              className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
            >
              {/* This option triggers the download of the Word document version */}
              <button
                onClick={handleDocxExport}
                className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 hover:bg-teal-50 text-teal-700 font-semibold text-xs transition"
              >
                <svg
                  className="w-4 h-4 opacity-80"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  ></path>
                </svg>
                Word (.docx)
              </button>

              {/* I'm passing "png" to the image handler to capture a snapshot of the report */}
              <button
                onClick={() => handleImageExport("png")}
                className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 hover:bg-teal-50 text-teal-700 font-semibold text-xs transition"
              >
                <svg
                  className="w-4 h-4 opacity-80"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  ></path>
                </svg>
                Image (.png)
              </button>

              {/* I'm passing "pdf" here so we can generate a document using jsPDF from the canvas */}
              <button
                onClick={() => handleImageExport("pdf")}
                className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 hover:bg-teal-50 text-teal-700 font-semibold text-xs transition"
              >
                <svg
                  className="w-4 h-4 opacity-80"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  ></path>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 9h1m1 0h1m1 0h1m-3 4h1m1 0h1m1 0h1m-3 4h1m1 0h1m1 0h1"
                  ></path>
                </svg>
                PDF (.pdf)
              </button>
            </div>,
            document.body,
          )
        : null}

      {/* I’m showing this toast whenever a file is successfully processed.
          It's also portaled to the body and positioned dynamically right below the button.
      */}
      {mounted &&
        document.body &&
        createPortal(
          <div
            style={{
              ...toastStyle,
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "14px 18px",
              background: "#ffffff",
              border: "1px solid #99f6e4",
              borderLeft: "4px solid #0d9488",
              borderRadius: "10px",
              boxShadow:
                "0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -1px rgba(0,0,0,0.04)",
              pointerEvents: "none",
              transition: "opacity 0.3s ease, transform 0.3s ease",
              opacity: showSuccessToast ? 1 : 0,
              transform: showSuccessToast
                ? "translateY(0)"
                : "translateY(-6px)",
              minWidth: "210px",
            }}
            role="status"
            aria-live="polite"
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "#f0fdfa",
                flexShrink: 0,
              }}
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#0d9488"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </span>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "2px" }}
            >
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#0f766e",
                  lineHeight: 1.3,
                }}
              >
                File export processed.
              </span>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "green",
                  lineHeight: 1.3,
                }}
              >
                Check your Downloads folder.
              </span>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
