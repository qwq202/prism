import { useDeeptrain } from "@/conf/env.ts";
import React from "react";

export function DeeptrainOnly({ children }: { children: React.ReactNode }) {
  return useDeeptrain ? <>{children}</> : null;
}
