import { jsPDF } from "jspdf";
import type { Conversation } from "./chat-store";
import { personaById } from "./personas";

export function exportConversationToPdf(c: Conversation) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const maxW = pageW - margin * 2;
  let y = margin;

  const p = personaById(c.personaId);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(20, 20, 30);
  doc.text(c.title || "Conversation", margin, y);
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(
    `${p.name}  ·  ${new Date(c.updatedAt).toLocaleString()}  ·  ${c.messages.length} messages`,
    margin,
    y,
  );
  y += 18;
  doc.setDrawColor(220);
  doc.line(margin, y, pageW - margin, y);
  y += 18;

  const writeBlock = (label: string, text: string, accent: [number, number, number]) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(accent[0], accent[1], accent[2]);
    if (y > pageH - margin) {
      doc.addPage();
      y = margin;
    }
    doc.text(label, margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 35);
    const lines = doc.splitTextToSize(text || "", maxW);
    for (const line of lines) {
      if (y > pageH - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += 15;
    }
    y += 10;
  };

  for (const m of c.messages) {
    if (m.role === "user") {
      writeBlock("YOU", m.content, [60, 60, 200]);
    } else {
      writeBlock("REPLY", m.content, [40, 130, 90]);
    }
  }

  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(160);
    doc.text(`${i} / ${total}`, pageW - margin, pageH - 20, { align: "right" });
    doc.text("NovaHelp", margin, pageH - 20);
  }

  const safe = (c.title || "conversation").replace(/[^a-z0-9-_ ]/gi, "").slice(0, 60).trim() || "conversation";
  doc.save(`${safe}.pdf`);
}
