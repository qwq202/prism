import * as React from "react";
import { useMemo } from "react";
import { cn } from "@/components/ui/lib/utils.ts";

export type Visibility = {
  [key: string]: boolean;
};

export type VisibilityOptions = {
  translatePrefix?: string;
};

export type Column = { key: string; name: string; value: boolean };

export const useColumnsVisibility = (
  initial: Visibility,
  options?: VisibilityOptions,
) => {
  const [visibility, setVisibility] = React.useState(initial);
  const bar = useMemo(
    (): Column[] =>
      Object.entries(visibility).map(([name, value]) => ({
        key: name,
        name: options?.translatePrefix
          ? `${options.translatePrefix}.${name}`
          : name,
        value,
      })),
    [visibility, options],
  );

  const toggle = (key: string) => {
    setVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const show = (key: string) => {
    setVisibility((prev) => ({ ...prev, [key]: true }));
  };

  const hide = (key: string) => {
    setVisibility((prev) => ({ ...prev, [key]: false }));
  };

  const merge = (key: string, ...args: string[]) => {
    return cn(...args, !visibility[key] && "hidden");
  };

  return { visibility, bar, options, toggle, show, hide, merge };
};
