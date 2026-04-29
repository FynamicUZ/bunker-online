"use client";

import { useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import TurnTimer from "./TurnTimer";

interface AfkWarningDialogProps {
  open: boolean;
  warningStartedAt: string | null;
  onConfirm: () => void;
}

export default function AfkWarningDialog({ open, warningStartedAt, onConfirm }: AfkWarningDialogProps) {
  const handleExpire = useCallback(() => {
    // Parent will handle kicking via triggerAfkAdvance
  }, []);

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-xs text-center" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Hali o&apos;yindamisiz?</DialogTitle>
          <DialogDescription>
            Kartangizni ochmagansiz. Javob bermesangiz bot sizning ornida ochadi.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center py-2">
          <TurnTimer
            turnStartedAt={warningStartedAt}
            totalSeconds={12}
            onExpire={handleExpire}
            label="qoldi"
          />
        </div>

        <Button onClick={onConfirm} className="w-full">
          Ha, o&apos;yindaman!
        </Button>
      </DialogContent>
    </Dialog>
  );
}
