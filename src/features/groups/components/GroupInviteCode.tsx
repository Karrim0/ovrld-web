"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";

export interface GroupInviteCodeProps {
  inviteCode: string;
}

export function GroupInviteCode({ inviteCode }: GroupInviteCodeProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (navigator.clipboard) await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  async function share() {
    const text = `ادخل جروب OVRLD بالكود ${inviteCode}`;
    try {
      if (navigator.share) await navigator.share({ title: "دعوة OVRLD", text });
      else await copy();
    } catch {
      // A cancelled native share sheet is not an application error.
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-white/[0.07] bg-black/20 p-2.5">
      <span className="min-w-0 flex-1 truncate px-2 font-mono text-base font-bold tracking-[0.2em] text-white sm:text-lg">{inviteCode}</span>
      <button type="button" onClick={() => void share()} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/[0.07] bg-white/[0.04] text-neutral-300" aria-label="شارك كود الدعوة">
        <Share2 className="h-4 w-4" />
      </button>
      <button type="button" onClick={() => void copy()} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-emerald-300 px-3 text-xs font-bold text-neutral-950">
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        <span className="hidden sm:inline">{copied ? "اتنسخ" : "انسخ"}</span>
      </button>
    </div>
  );
}
