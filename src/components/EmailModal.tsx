import React, { useState, useEffect, useRef } from "react";
import emailjs from "@emailjs/browser";
import { EMAILJS_CONFIG } from "@/config/emailjs";
import { X } from "lucide-react";

interface EmailAttachment {
  name: string;
  base64: string;
}

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject?: string;
  body?: string;
  domainColor?: string;
  attachment?: EmailAttachment;
}

type SendState = "idle" | "loading" | "success" | "error";

export const EmailModal: React.FC<EmailModalProps> = ({
  isOpen,
  onClose,
  subject: initSubject = "",
  body: initBody = "",
  domainColor = "#2C6E6A",
}) => {
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState(initSubject);
  const [body, setBody] = useState(initBody);
  const [image, setImage] = useState<string | null>(null);
  const [imageName, setImageName] = useState("");
  const [sendState, setSendState] = useState<SendState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Sync props when modal opens
  useEffect(() => {
    if (isOpen) {
      setSubject(initSubject);
      setBody(initBody);
      setTo("");
      setCc("");
      setImage(null);
      setImageName("");
      setSendState("idle");
      setErrorMsg("");
    }
  }, [isOpen, initSubject, initBody]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Trap focus
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;
    const focusable = modalRef.current.querySelectorAll<HTMLElement>(
      'input, textarea, button, select, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length) focusable[0].focus();
  }, [isOpen]);

  if (!isOpen) return null;

  const isConfigured = EMAILJS_CONFIG.SERVICE_ID !== "YOUR_SERVICE_ID";

  const fallbackMailto = () => {
    const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}${cc ? `&cc=${encodeURIComponent(cc)}` : ""}`;
    window.open(mailto, "_blank");
    onClose();
  };

  const handleSend = async () => {
    if (!to.trim()) return;

    if (!isConfigured) {
      fallbackMailto();
      return;
    }

    setSendState("loading");
    setErrorMsg("");

    try {
      const templateParams = {
        to_email: to,
        cc_email: cc,
        subject,
        message: body,
        image_data: image || "",
        sent_from: "דשבורד אדריכלית העיר",
        sent_date: new Date().toLocaleDateString("he-IL"),
      };

      await emailjs.send(
        EMAILJS_CONFIG.SERVICE_ID,
        EMAILJS_CONFIG.TEMPLATE_ID,
        templateParams,
        EMAILJS_CONFIG.PUBLIC_KEY
      );

      setSendState("success");
      setTimeout(() => onClose(), 2000);
    } catch (err: any) {
      setSendState("error");
      setErrorMsg(err?.text || err?.message || "שגיאה בשליחה");
      // Fallback silently
      fallbackMailto();
    }
  };

  const handleImageSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
      setImageName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImage(null);
    setImageName("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const buttonLabel =
    sendState === "loading" ? "שולח..." :
    sendState === "success" ? "✓ נשלח בהצלחה" :
    sendState === "error" ? "שגיאה — נסה שוב" :
    "שלח מייל";

  const buttonBg =
    sendState === "success" ? "#10B981" :
    sendState === "error" ? "#EF4444" :
    sendState === "loading" ? domainColor + "99" :
    domainColor;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={modalRef}
        dir="rtl"
        className="bg-white rounded-2xl shadow-2xl w-full p-6 relative"
        style={{ maxWidth: 520 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">✉️ שליחת חוות דעת</h2>
          <button
            title="סגור"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-3">
          <label className="block text-sm font-medium">
            אל:
            <input
              type="email"
              required
              className="mt-1 w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-1"
              style={{ direction: "ltr" }}
              placeholder="email@example.com"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>

          <label className="block text-sm font-medium">
            עותק:
            <input
              type="email"
              className="mt-1 w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-1"
              style={{ direction: "ltr" }}
              placeholder="cc@example.com (אופציונלי)"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
            />
          </label>

          <label className="block text-sm font-medium">
            נושא:
            <input
              type="text"
              required
              className="mt-1 w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-1"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </label>

          <label className="block text-sm font-medium">
            תוכן:
            <textarea
              className="mt-1 w-full rounded-lg border border-gray-200 p-3 text-sm resize-y focus:outline-none focus:ring-1"
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>

          {/* Image attachment */}
          <div className="text-sm font-medium">
            צרף תמונה:
            <div className="mt-1 flex items-center gap-3">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="text-xs"
                onChange={(e) => e.target.files?.[0] && handleImageSelect(e.target.files[0])}
              />
              {image && (
                <div className="flex items-center gap-2">
                  <img src={image} alt="preview" className="w-[60px] h-[60px] rounded object-cover border" />
                  <button
                    className="text-xs text-red-500 hover:underline"
                    onClick={removeImage}
                  >
                    הסר
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error message */}
        {sendState === "error" && errorMsg && (
          <div className="mt-3 text-xs text-red-500">{errorMsg}</div>
        )}

        {/* Send button */}
        <div className="mt-5 flex gap-2 justify-start">
          <button
            disabled={sendState === "loading" || sendState === "success"}
            className="h-9 px-6 rounded-lg text-white text-sm font-bold transition-opacity disabled:opacity-70"
            style={{ background: buttonBg }}
            onClick={handleSend}
          >
            {buttonLabel}
          </button>
          <button
            className="h-9 px-4 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
            onClick={onClose}
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
};
