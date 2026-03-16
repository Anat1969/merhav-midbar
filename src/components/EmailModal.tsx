import React, { useState, useEffect, useRef, DragEvent } from "react";
import emailjs from "@emailjs/browser";
import { EMAILJS_CONFIG } from "@/config/emailjs";
import { X, Paperclip, FileText, Image as ImageIcon } from "lucide-react";

interface EmailAttachment {
  name: string;
  base64: string;
}

interface LocalFile {
  name: string;
  type: string;
  dataUrl: string;
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
  attachment,
}) => {
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState(initSubject);
  const [body, setBody] = useState(initBody);
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [sendState, setSendState] = useState<SendState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSubject(initSubject);
      setBody(initBody);
      setTo("");
      setCc("");
      setFiles([]);
      setDragging(false);
      setSendState("idle");
      setErrorMsg("");
    }
  }, [isOpen, initSubject, initBody]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !modalRef.current) return;
    const focusable = modalRef.current.querySelectorAll<HTMLElement>(
      'input, textarea, button, select, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length) focusable[0].focus();
  }, [isOpen]);

  if (!isOpen) return null;

  const isConfigured = EMAILJS_CONFIG.SERVICE_ID !== "YOUR_SERVICE_ID";

  const addFiles = (incoming: FileList | File[]) => {
    const arr = Array.from(incoming);
    arr.forEach((file) => {
      if (file.size > 20 * 1024 * 1024) return; // 20MB limit
      const reader = new FileReader();
      reader.onload = () => {
        setFiles((prev) => {
          if (prev.some((f) => f.name === file.name)) return prev;
          return [...prev, { name: file.name, type: file.type, dataUrl: reader.result as string }];
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (name: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== name));
    if (fileRef.current) fileRef.current.value = "";
  };

  const onDragOver = (e: DragEvent) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = (e: DragEvent) => { e.preventDefault(); setDragging(false); };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  const fallbackMailto = () => {
    const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}${cc ? `&cc=${encodeURIComponent(cc)}` : ""}`;
    window.open(mailto, "_blank");
    onClose();
  };

  const handleSend = async () => {
    if (!to.trim()) return;
    if (!isConfigured) { fallbackMailto(); return; }

    setSendState("loading");
    setErrorMsg("");

    try {
      const templateParams: Record<string, any> = {
        to_email: to,
        cc_email: cc,
        subject,
        message: body,
        image_data: files.find((f) => f.type.startsWith("image/"))?.dataUrl || "",
        sent_from: "דשבורד אדריכלית העיר",
        sent_date: new Date().toLocaleDateString("he-IL"),
      };

      if (attachment) {
        templateParams.content = {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          name: attachment.name,
          data: attachment.base64,
        };
      }

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
      fallbackMailto();
    }
  };

  const isImage = (type: string) => type.startsWith("image/");

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
        className="bg-background rounded-2xl shadow-2xl w-full p-6 relative"
        style={{ maxWidth: 520 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">✉️ שליחת חוות דעת</h2>
          <button
            title="סגור"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-3">
          <label className="block text-sm font-medium">
            אל:
            <input type="email" required
              className="mt-1 w-full h-9 rounded-lg border border-border px-3 text-sm focus:outline-none focus:ring-1"
              style={{ direction: "ltr" }} placeholder="email@example.com"
              value={to} onChange={(e) => setTo(e.target.value)} />
          </label>

          <label className="block text-sm font-medium">
            עותק:
            <input type="email"
              className="mt-1 w-full h-9 rounded-lg border border-border px-3 text-sm focus:outline-none focus:ring-1"
              style={{ direction: "ltr" }} placeholder="cc@example.com (אופציונלי)"
              value={cc} onChange={(e) => setCc(e.target.value)} />
          </label>

          <label className="block text-sm font-medium">
            נושא:
            <input type="text" required
              className="mt-1 w-full h-9 rounded-lg border border-border px-3 text-sm focus:outline-none focus:ring-1"
              value={subject} onChange={(e) => setSubject(e.target.value)} />
          </label>

          <label className="block text-sm font-medium">
            תוכן:
            <textarea
              className="mt-1 w-full rounded-lg border border-border p-3 text-sm resize-y focus:outline-none focus:ring-1"
              rows={5} value={body} onChange={(e) => setBody(e.target.value)} />
          </label>

          {/* Drag & drop file zone */}
          <div className="text-sm font-medium">
            צרף קובץ:
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              className={`mt-1 flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed cursor-pointer transition-colors py-4 ${
                dragging ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"
              }`}
            >
              <Paperclip className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">גרור קובץ לכאן או לחץ לבחירה</span>
            </div>
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && addFiles(e.target.files)}
            />
          </div>

          {/* Attached files list */}
          {files.length > 0 && (
            <div className="space-y-1.5">
              {files.map((f) => (
                <div key={f.name} className="flex items-center gap-2 rounded-lg bg-muted/50 px-2.5 py-1.5 text-sm">
                  {isImage(f.type) ? (
                    <img src={f.dataUrl} alt="" className="w-8 h-8 rounded object-cover border border-border" />
                  ) : (
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <span className="flex-1 truncate text-xs">{f.name}</span>
                  <button onClick={() => removeFile(f.name)} className="text-xs text-red-500 hover:underline shrink-0">הסר</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Word attachment indicator */}
        {attachment && (
          <div className="flex items-center gap-2 mt-3 p-2 rounded-lg bg-muted text-sm">
            <span>📎</span>
            <span className="font-medium">{attachment.name}</span>
            <span className="text-muted-foreground text-xs">(יצורף למייל)</span>
          </div>
        )}

        {sendState === "error" && errorMsg && (
          <div className="mt-3 text-xs text-destructive">{errorMsg}</div>
        )}

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
            className="h-9 px-4 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors"
            onClick={onClose}
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
};