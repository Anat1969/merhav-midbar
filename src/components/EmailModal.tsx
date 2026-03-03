import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface EmailModalProps {
  open: boolean;
  onClose: () => void;
}

export const EmailModal: React.FC<EmailModalProps> = ({ open, onClose }) => {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const handleSend = () => {
    const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailto, "_blank");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent dir="rtl" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>שליחת מייל</DialogTitle>
          <DialogDescription>מלא את הפרטים ולחץ שלח</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Input
            placeholder="כתובת נמען"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            dir="ltr"
          />
          <Input
            placeholder="נושא"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <Textarea
            placeholder="תוכן ההודעה"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
          />
          <div className="flex gap-2 justify-start">
            <Button onClick={handleSend} title="שלח">שלח</Button>
            <Button variant="outline" onClick={onClose} title="ביטול">ביטול</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
