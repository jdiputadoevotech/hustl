"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface ContactSellerButtonProps {
  gigId: string;
  gigTitle: string;
  sellerName: string;
  sellerHandle: string | null; // messenger_username
  buyerEmail: string;
}

/**
 * Opens the seller's Messenger in a NEW TAB with a prefilled inquiry message,
 * and copies the same message to the clipboard as a fallback (desktop web often
 * ignores the ?text= prefill). No order is created here — the freelancer reads
 * the buyer's email + gig link from the message and creates the order.
 */
export function ContactSellerButton({
  gigId,
  gigTitle,
  sellerName,
  sellerHandle,
  buyerEmail,
}: ContactSellerButtonProps) {
  const [copied, setCopied] = useState(false);
  const [noHandle, setNoHandle] = useState(false);

  const handleClick = async () => {
    const gigUrl = `${window.location.origin}/gigs/${gigId}`;
    const message =
      `Hello ${sellerName}, I'd like to inquire about your gig "${gigTitle}".\n` +
      `Gig link: ${gigUrl}\n` +
      `My email: ${buyerEmail}`;

    // Clipboard fallback (best-effort; ignore failures e.g. no permission).
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
    } catch {
      // no-op
    }

    if (sellerHandle) {
      const url = `https://m.me/${sellerHandle}?text=${encodeURIComponent(message)}`;
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      setNoHandle(true);
    }
  };

  return (
    <div className="space-y-2">
      <Button type="button" className="w-full" onClick={handleClick}>
        Contact on Messenger
      </Button>
      {noHandle ? (
        <p className="text-xs text-destructive">
          This seller hasn&apos;t set a Messenger username yet. Your message was
          copied to the clipboard — reach out to them directly.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Opens Messenger in a new tab with a prefilled message
          {copied ? " (also copied to your clipboard)" : ""}. The seller uses
          your email + gig link to create the order — it&apos;s up to them to
          accept.
        </p>
      )}
    </div>
  );
}
