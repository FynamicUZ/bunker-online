"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  createRoomFormSchema,
  joinRoomFormSchema,
  type CreateRoomForm,
  type JoinRoomForm,
} from "@/lib/validation";
import { createClient } from "@/lib/supabase/client";
import { createRoom, joinRoom } from "@/app/actions";

async function ensureAnonymousAuth() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) throw new Error("Tizimga kirishda xatolik: " + error.message);
  }
}

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-10 px-4 py-12">
      <header className="text-center">
        <h1 className="from-foreground to-muted-foreground bg-gradient-to-b bg-clip-text text-6xl font-black tracking-tight text-transparent sm:text-7xl">
          BUNKER
        </h1>
        <p className="text-muted-foreground mt-3 text-sm sm:text-base">
          Apokalipsis boshlandi. Bunkerda hamma uchun joy yetmaydi.
        </p>
      </header>

      <div className="grid w-full max-w-md gap-4 sm:max-w-2xl sm:grid-cols-2">
        <CreateRoomCard />
        <JoinRoomCard />
      </div>

      <footer className="text-muted-foreground max-w-md text-center text-xs text-balance">
        4 dan 10 gacha o&apos;yinchi. Tasodifiy xarakterlar, muhokama va ovoz berish orqali bunkerga
        kim loyiq ekanini hal qilasiz.
      </footer>
    </main>
  );
}

function CreateRoomCard() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const form = useForm<CreateRoomForm>({
    resolver: zodResolver(createRoomFormSchema),
    defaultValues: { nickname: "" },
    mode: "onSubmit",
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setPending(true);
    try {
      await ensureAnonymousAuth();
      const result = await createRoom(values.nickname);
      if ("error" in result) {
        toast.error(result.error);
        setPending(false);
      } else {
        router.push(`/room/${result.code}`);
      }
    } catch {
      toast.error("Xatolik yuz berdi. Qayta urinib ko'ring");
      setPending(false);
    }
  });

  const errorMessage = form.formState.errors.nickname?.message;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Yangi xona yaratish</CardTitle>
        <CardDescription>Do&apos;stlaringizni chaqirib, host bo&apos;ling.</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit} noValidate>
        <CardContent className="space-y-2">
          <Label htmlFor="create-nickname">Sizning ismingiz</Label>
          <Input
            id="create-nickname"
            placeholder="Masalan: Alisher"
            autoComplete="nickname"
            aria-invalid={Boolean(errorMessage)}
            aria-describedby={errorMessage ? "create-nickname-error" : undefined}
            {...form.register("nickname")}
          />
          {errorMessage ? (
            <p id="create-nickname-error" className="text-destructive text-sm">
              {errorMessage}
            </p>
          ) : null}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Yaratilmoqda..." : "Xona yaratish"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function JoinRoomCard() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const form = useForm<JoinRoomForm>({
    resolver: zodResolver(joinRoomFormSchema),
    defaultValues: { nickname: "", roomCode: "" },
    mode: "onSubmit",
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setPending(true);
    try {
      await ensureAnonymousAuth();
      const result = await joinRoom(values.nickname, values.roomCode);
      if ("error" in result) {
        toast.error(result.error);
        setPending(false);
      } else {
        router.push(`/room/${result.code}`);
      }
    } catch {
      toast.error("Xatolik yuz berdi. Qayta urinib ko'ring");
      setPending(false);
    }
  });

  const nicknameError = form.formState.errors.nickname?.message;
  const roomCodeError = form.formState.errors.roomCode?.message;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Xonaga qo&apos;shilish</CardTitle>
        <CardDescription>Do&apos;stingiz yuborgan kod bilan kiring.</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit} noValidate>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="join-nickname">Sizning ismingiz</Label>
            <Input
              id="join-nickname"
              placeholder="Masalan: Alisher"
              autoComplete="nickname"
              aria-invalid={Boolean(nicknameError)}
              aria-describedby={nicknameError ? "join-nickname-error" : undefined}
              {...form.register("nickname")}
            />
            {nicknameError ? (
              <p id="join-nickname-error" className="text-destructive text-sm">
                {nicknameError}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="join-code">Xona kodi</Label>
            <Input
              id="join-code"
              placeholder="K7M2X9"
              autoCapitalize="characters"
              autoComplete="off"
              maxLength={6}
              className="font-mono tracking-widest uppercase"
              aria-invalid={Boolean(roomCodeError)}
              aria-describedby={roomCodeError ? "join-code-error" : undefined}
              {...form.register("roomCode")}
            />
            {roomCodeError ? (
              <p id="join-code-error" className="text-destructive text-sm">
                {roomCodeError}
              </p>
            ) : null}
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" variant="secondary" disabled={pending} className="w-full">
            {pending ? "Ulanmoqda..." : "Xonaga kirish"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
