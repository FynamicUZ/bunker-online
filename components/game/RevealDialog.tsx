"use client";

import { Briefcase, Heart, Gamepad2, Sparkles, Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { CharacterField } from "@/lib/game/types";

const FIELD_META: Record<
  Exclude<CharacterField, "age" | "gender">,
  { label: string; icon: React.ReactNode }
> = {
  profession: { label: "Kasb", icon: <Briefcase className="h-4 w-4" /> },
  health: { label: "Salomatlik", icon: <Heart className="h-4 w-4" /> },
  hobby: { label: "Hobbi", icon: <Gamepad2 className="h-4 w-4" /> },
  trait: { label: "Xarakter", icon: <Sparkles className="h-4 w-4" /> },
  extra: { label: "Qo'shimcha", icon: <Package className="h-4 w-4" /> },
};

type RevealableField = Exclude<CharacterField, "age" | "gender">;

interface RevealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hiddenFields: RevealableField[];
  onReveal: (field: RevealableField) => void;
  loading?: boolean;
}

export default function RevealDialog({
  open,
  onOpenChange,
  hiddenFields,
  onReveal,
  loading = false,
}: RevealDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Qaysi maydonni ochmoqchisiz?</DialogTitle>
          <DialogDescription>
            Bu bosqichda faqat bitta maydonni ochishingiz mumkin. Boshqalar siz tanlagan
            ma&apos;lumotni ko&apos;radi.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {hiddenFields.map((field) => {
            const meta = FIELD_META[field];
            return (
              <Button
                key={field}
                variant="outline"
                className="w-full justify-start gap-2"
                disabled={loading}
                onClick={() => onReveal(field)}
              >
                {meta.icon}
                {meta.label}
              </Button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
