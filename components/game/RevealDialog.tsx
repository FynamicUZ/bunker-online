"use client";

import { Briefcase, Heart, Gamepad2, Sparkles, Package, Dna } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { CharacterField } from "@/lib/game/types";

const FIELD_META: Record<CharacterField, { label: string; icon: React.ReactNode }> = {
  biology:    { label: "Biologiya",   icon: <Dna className="h-4 w-4" /> },
  profession: { label: "Kasb",        icon: <Briefcase className="h-4 w-4" /> },
  health:     { label: "Salomatlik",  icon: <Heart className="h-4 w-4" /> },
  hobby:      { label: "Hobbi",       icon: <Gamepad2 className="h-4 w-4" /> },
  trait:      { label: "Xarakter",    icon: <Sparkles className="h-4 w-4" /> },
  extra:      { label: "Qo'shimcha",  icon: <Package className="h-4 w-4" /> },
};

interface RevealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hiddenFields: CharacterField[];
  onReveal: (field: CharacterField) => void;
  loading?: boolean;
  isFirstPlayer?: boolean;
}

export default function RevealDialog({
  open,
  onOpenChange,
  hiddenFields,
  onReveal,
  loading = false,
  isFirstPlayer = false,
}: RevealDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isFirstPlayer ? "Bu bosqich uchun karta turini tanlang" : "Qaysi kartani ochmoqchisiz?"}
          </DialogTitle>
          <DialogDescription>
            {isFirstPlayer
              ? "Siz tanlagan karta turi bu bosqichda barcha o'yinchilar ochadigan tur bo'ladi."
              : "Bu bosqichda faqat bitta kartani ochishingiz mumkin."}
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
