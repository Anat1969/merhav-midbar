import {
  Document,
  Paragraph,
  TextRun,
  AlignmentType,
  HeadingLevel,
  Packer,
  BorderStyle,
} from "docx";
import { saveAs } from "file-saver";

interface DraftDocxParams {
  projectName: string;
  category: string;
  sub: string;
  statusLabel: string;
  created: string;
  details: Record<string, Record<string, string>>;
  detailFields: Record<string, { key: string; label: string }[]>;
  note: string;
  notDoneComments: { date: string; text: string }[];
  recommendation: string;
}

export async function generateDraftDocx(params: DraftDocxParams): Promise<Blob> {
  const {
    projectName, category, sub, statusLabel, created,
    details, detailFields, note, notDoneComments, recommendation,
  } = params;

  const children: Paragraph[] = [];

  // Title
  children.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: `טיוטת המלצה — ${projectName}`, bold: true, size: 32, font: "Arial" })],
    })
  );

  // Metadata
  const meta = [
    `קטגוריה: ${category} › ${sub}`,
    `סטטוס: ${statusLabel}`,
    `תאריך יצירה: ${created}`,
    `תאריך הפקה: ${new Date().toLocaleDateString("he-IL")}`,
  ];
  meta.forEach((line) =>
    children.push(new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: line, size: 22, font: "Arial" })],
    }))
  );

  children.push(new Paragraph({ children: [] })); // spacer

  // Detail sections
  Object.entries(detailFields).forEach(([section, fields]) => {
    const vals = details[section] ?? {};
    const filled = fields.filter((f) => vals[f.key]);
    if (filled.length) {
      children.push(new Paragraph({
        alignment: AlignmentType.RIGHT,
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: section, bold: true, size: 26, font: "Arial" })],
      }));
      filled.forEach((f) =>
        children.push(new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [
            new TextRun({ text: `${f.label}: `, bold: true, size: 22, font: "Arial" }),
            new TextRun({ text: vals[f.key], size: 22, font: "Arial" }),
          ],
        }))
      );
    }
  });

  // Project description
  if (note) {
    children.push(new Paragraph({ children: [] }));
    children.push(new Paragraph({
      alignment: AlignmentType.RIGHT,
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: "תיאור הפרויקט", bold: true, size: 26, font: "Arial" })],
    }));
    note.split("\n").forEach((line) =>
      children.push(new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: line, size: 22, font: "Arial" })],
      }))
    );
  }

  // Not-done comments
  if (notDoneComments.length) {
    children.push(new Paragraph({ children: [] }));
    children.push(new Paragraph({
      alignment: AlignmentType.RIGHT,
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: "ריכוז הערות", bold: true, size: 26, font: "Arial" })],
    }));
    notDoneComments.forEach((c) =>
      children.push(new Paragraph({
        alignment: AlignmentType.RIGHT,
        bullet: { level: 0 },
        children: [
          new TextRun({ text: `${c.date} — `, bold: true, size: 22, font: "Arial" }),
          new TextRun({ text: c.text, size: 22, font: "Arial" }),
        ],
      }))
    );
  }

  // Final recommendation
  if (recommendation) {
    children.push(new Paragraph({ children: [] }));
    children.push(new Paragraph({
      alignment: AlignmentType.RIGHT,
      heading: HeadingLevel.HEADING_2,
      border: {
        top: { style: BorderStyle.SINGLE, size: 1, color: "2C6E6A" },
      },
      children: [new TextRun({ text: "המלצה סופית", bold: true, size: 26, font: "Arial", color: "2C6E6A" })],
    }));
    recommendation.split("\n").forEach((line) =>
      children.push(new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: line, size: 22, font: "Arial" })],
      }))
    );
  }

  const doc = new Document({
    sections: [{ properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } }, children }],
  });

  return Packer.toBlob(doc);
}

export async function downloadDraftDocx(params: DraftDocxParams): Promise<Blob> {
  const blob = await generateDraftDocx(params);
  saveAs(blob, `טיוטת_המלצה_${params.projectName.replace(/\s+/g, "_")}.docx`);
  return blob;
}
