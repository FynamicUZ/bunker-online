"use client";

import { Lock, User, Briefcase, Heart, Gamepad2, Sparkles, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Character, CharacterField } from "@/lib/game/types";

interface CharacterCardProps {
  character: Character;
  revealedFields: CharacterField[];
  isOwn?: boolean;
  playerName?: string;
}

interface FieldConfig {
  key: CharacterField;
  label: string;
  icon: React.ReactNode;
}

const FIELD_CONFIGS: FieldConfig[] = [
  { key: "profession", label: "Kasb", icon: <Briefcase className="h-4 w-4" /> },
  { key: "health", label: "Salomatlik", icon: <Heart className="h-4 w-4" /> },
  { key: "hobby", label: "Hobbi", icon: <Gamepad2 className="h-4 w-4" /> },
  { key: "trait", label: "Xarakter", icon: <Sparkles className="h-4 w-4" /> },
  { key: "extra", label: "Qo'shimcha", icon: <Package className="h-4 w-4" /> },
];

export default function CharacterCard({
  character,
  revealedFields,
  isOwn = false,
  playerName,
}: CharacterCardProps) {
  const isVisible = (field: CharacterField) => isOwn || revealedFields.includes(field);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            {playerName ?? "Sizning kartangiz"}
          </CardTitle>
          {isOwn && (
            <Badge variant="secondary" className="text-xs">
              Siz
            </Badge>
          )}
        </div>

        {/* Yosh va jins — har doim ko'rinadi */}
        <div className="flex gap-3 pt-1">
          <div className="bg-muted rounded-md px-3 py-1.5 text-center">
            <p className="text-muted-foreground text-xs">Yosh</p>
            <p className="text-sm font-bold">{character.age}</p>
          </div>
          <div className="bg-muted rounded-md px-3 py-1.5 text-center">
            <p className="text-muted-foreground text-xs">Jins</p>
            <p className="text-sm font-bold capitalize">
              {character.gender === "erkak" ? "Erkak" : "Ayol"}
            </p>
          </div>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="space-y-3 pt-4">
        {FIELD_CONFIGS.map(({ key, label, icon }) => (
          <div key={key} className="space-y-0.5">
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs uppercase tracking-wide">
              {icon}
              {label}
            </div>
            {isVisible(key) ? (
              <div>
                <p className="text-sm font-semibold">{(character[key] as { name: string }).name}</p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {(character[key] as { description: string }).description}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-md border border-dashed px-3 py-2">
                <Lock className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                <p className="text-muted-foreground text-xs italic">Hali ochilmagan</p>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
