import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "./lib/utils";

export interface ClickableProps extends HTMLMotionProps<"div"> {
  tapScale?: number;
  tapDuration?: number;
  hoverScale?: number;
}

const Clickable = React.forwardRef<HTMLDivElement, ClickableProps>(
  (
    {
      children,
      className,
      tapScale = 0.95,
      tapDuration = 0.1,
      hoverScale,
      onClick,
      ...props
    },
    ref,
  ) => (
    <motion.div
      ref={ref}
      className={cn("cursor-pointer", className)}
      whileTap={{
        scale: tapScale,
        transition: { duration: tapDuration },
      }}
      whileHover={hoverScale ? { scale: hoverScale } : {}}
      whileFocus={hoverScale ? { scale: hoverScale } : {}}
      onClick={onClick}
      {...props}
    >
      {children}
    </motion.div>
  ),
);

Clickable.displayName = "Clickable";
export default Clickable;
