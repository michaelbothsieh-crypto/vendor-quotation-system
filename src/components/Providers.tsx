"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import { UIProvider } from "@/components/ui";

export default function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  return (
    <SessionProvider session={session}>
      <UIProvider>{children}</UIProvider>
    </SessionProvider>
  );
}
