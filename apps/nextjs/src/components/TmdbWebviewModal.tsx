"use client";

import React from "react";
import { ExternalLink, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@waslaeuftin/components/ui/dialog";

type TmdbWebviewModalProps = {
  url: string | null;
  title?: string;
  isOpen: boolean;
  onClose: () => void;
};

export const TmdbWebviewModal: React.FC<TmdbWebviewModalProps> = ({
  url,
  title = "TMDB Information",
  isOpen,
  onClose,
}) => {
  if (!url) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] h-[800px] flex flex-col p-0 overflow-hidden bg-background border-border shadow-xl rounded-2xl">
        <DialogHeader className="flex flex-row items-center justify-between px-4 py-3 border-b border-border bg-card">
          <DialogTitle className="text-base font-bold truncate flex items-center gap-2">
            <span>{title}</span>
            <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
              themoviedb.org
            </span>
          </DialogTitle>
          <div className="flex items-center gap-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline px-2 py-1 rounded-md bg-primary/10 transition-colors"
            >
              <span>In neuem Tab öffnen</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Schließen"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </DialogHeader>
        <div className="flex-1 w-full bg-slate-900 relative">
          <iframe
            src={url}
            title={title}
            className="w-full h-full border-0"
            allow="autoplay; encrypted-media; picture-in-picture"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
