"use client";

import { useState, useTransition } from "react";
import jsPDF from "jspdf";
import { Card } from "@/components/ui";
import { inr } from "@/lib/format";

export default function TicketPanel({ ticket, viewerRole, viewerId }: { ticket: any; viewerRole: string; viewerId: number }) {
  const [downloading, setDownloading] = useState(false);
  const [isPending, startTransition] = useTransition();

  function generatePDF() {
    setDownloading(true);
    startTransition(() => {
      try {
        const doc = new jsPDF();
        const hospital = "Varun Arjun Medical College";
        const now = new Date().toLocaleString();

        doc.setFontSize(18);
        doc.text("PURCHASE APPROVAL TICKET", 20, 20);
        doc.setFontSize(11);
        doc.text(hospital, 20, 28);

        doc.setFontSize(12);
        doc.text(`Ticket: ${ticket.ref_no}`, 20, 42);
        doc.text(`Approved: ${ticket.approved_at ? new Date(ticket.approved_at).toLocaleDateString() : ""}`, 20, 49);

        doc.setFontSize(13);
        doc.text("Item Approved", 20, 62);
        doc.setFontSize(11);
        doc.text(`${ticket.product_title}`, 20, 70);
        doc.text(`Source: ${ticket.source}  |  Unit Price: ${inr(ticket.unit_price)}  |  Qty: ${ticket.quantity} ${ticket.unit}`, 20, 77);

        doc.text(`Total Estimated: ${inr(Number(ticket.unit_price) * Number(ticket.quantity))}`, 20, 85);

        doc.setFontSize(12);
        doc.text("Requested By", 20, 100);
        doc.setFontSize(11);
        doc.text(`User ID ${ticket.requested_by || "—"}   Reason: ${ticket.requested_reason || "—"}`, 20, 107);

        doc.setFontSize(12);
        doc.text("Purchase Responsibility", 20, 120);
        doc.setFontSize(11);
        doc.text(`Purchaser / Acquirer User ID: ${ticket.purchaser_id || "—"}`, 20, 127);

        doc.setFontSize(12);
        doc.text("PDF Recipients (Visibility)", 20, 140);
        const recips = (ticket.recipient_ids || []).join(", ") || "Not specified (owner + admin)";
        doc.setFontSize(11);
        doc.text(`User IDs: ${recips}`, 20, 147);

        if (ticket.notes) {
          doc.setFontSize(11);
          doc.text(`Notes: ${ticket.notes}`, 20, 160);
        }

        doc.setFontSize(9);
        doc.text(`Generated ${now}  |  Role: ${viewerRole}`, 20, 185);
        doc.text("This document authorizes the listed purchaser to proceed with acquisition.", 20, 192);

        doc.save(`${ticket.ref_no}_approval.pdf`);
      } catch (e) {
        console.error("PDF generation failed", e);
      } finally {
        setDownloading(false);
      }
    });
  }

  const canDownload = true; // all who can view ticket

  return (
    <div className="max-w-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs font-semibold tracking-widest text-emerald-600">APPROVED TICKET</div>
          <div className="text-4xl font-bold tracking-tighter mt-1">{ticket.ref_no}</div>
        </div>
        <button 
          onClick={generatePDF} 
          disabled={downloading || isPending} 
          className={`btn btn-primary px-6 py-3 text-base ${(downloading || isPending) ? 'loading' : ''}`}
        >
          <span className="spinner" />
          <span className="btn-text">{(downloading || isPending) ? "Generating..." : "Download PDF"}</span>
        </button>
      </div>

      <div className="card p-7">
        <div>
          <div className="text-sm text-slate-500">Item</div>
          <div className="font-semibold text-2xl leading-tight mt-1">{ticket.product_title}</div>
          <div className="text-primary font-medium mt-0.5">{ticket.source}</div>
        </div>

        <div className="my-6 flex items-baseline gap-2">
          <span className="text-4xl font-semibold tabular-nums tracking-tight">{inr(ticket.unit_price)}</span>
          <span className="text-slate-500">× {ticket.quantity} {ticket.unit}</span>
        </div>

        <div className="text-right font-medium text-lg border-t pt-3">
          Est. Total {inr(Number(ticket.unit_price) * Number(ticket.quantity))}
        </div>

        <div className="mt-8 text-sm space-y-3 border-t pt-5">
          <div className="flex justify-between"><span className="text-slate-500">Requested by</span> <span>User #{ticket.requested_by}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Reason</span> <span className="text-right max-w-[200px]">{ticket.requested_reason || "—"}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Approved by</span> <span>Owner #{ticket.approved_by}</span></div>
          <div className="flex justify-between pt-3 border-t"><span className="font-semibold">Responsible Purchaser</span> <span className="font-semibold">User #{ticket.purchaser_id}</span></div>
          <div className="flex justify-between text-xs"><span className="text-slate-500">PDF sent to</span> <span>{(ticket.recipient_ids || []).length ? ticket.recipient_ids.join(", ") : "—"}</span></div>
        </div>

        {ticket.notes && <div className="mt-4 italic text-sm text-slate-600 border-t pt-4">“{ticket.notes}”</div>}
      </div>

      <div className="text-[10px] text-slate-400 mt-4 text-center">This ticket authorizes the purchaser to acquire the item. PDF contains all details for visibility.</div>
    </div>
  );
}
