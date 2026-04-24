import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { type VariantProps } from "class-variance-authority";

import { cn } from "./lib/utils";
import { useEffect, useMemo, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { useTemporaryState } from "@/utils/hook.ts";
import Clickable from "@/components/ui/clickable.tsx";
import { buttonVariants } from "@/components/ui/button-variants.ts";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  unClickable?: boolean;
  classNameWrapper?: string;
  tapScale?: number;
  onLoadingChange?: (loading: boolean) => void;
}

import { motion, AnimatePresence } from "framer-motion";

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      onClick,
      disabled,
      children,
      asChild = false,
      loading = false,
      unClickable,
      classNameWrapper,
      tapScale,
      onLoadingChange,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    const [working, setWorking] = useState<boolean>(false);
    const [animating, setAnimating] = useState<boolean>(false);
    const onTrigger =
      loading && onClick
        ? async (e: React.MouseEvent<HTMLButtonElement>) => {
            if (disabled) return;
            e.preventDefault();
            e.stopPropagation();

            if (working) return;
            setWorking(true);
            setAnimating(true);

            try {
              // execute the onClick handler
              await onClick(e);
            } finally {
              setWorking(false);
              // Keep animating for a minimum of 500ms
              setTimeout(() => setAnimating(false), 500);
            }
          }
        : onClick;

    useEffect(() => {
      onLoadingChange?.(working);
    }, [working, onLoadingChange]);

    const child = useMemo(() => {
      if (asChild) return children;
      if (size === "icon" || size === "icon-sm") {
        if (loading && animating) {
          return <Loader2 className={`animate-spin w-4 h-4`} />;
        }
      }

      return (
        <>
          <AnimatePresence>
            {loading && animating && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "auto", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="mr-2"
              >
                <Loader2 className={`animate-spin w-4 h-4`} />
              </motion.div>
            )}
          </AnimatePresence>
          {children}
        </>
      );
    }, [asChild, children, loading, animating, size]);

    const comp = (
      <Comp
        className={cn(
          "button-wrapper",
          animating && "is-loading",
          buttonVariants({ variant, size, className }),
        )}
        ref={ref}
        onClick={onTrigger}
        disabled={disabled || working}
        {...props}
      >
        {child}
      </Comp>
    );

    return unClickable ? (
      comp
    ) : (
      <Clickable className={classNameWrapper} tapScale={tapScale}>
        {comp}
      </Clickable>
    );
  },
);
Button.displayName = "Button";

type TemporaryButtonProps = ButtonProps & {
  interval?: number;
};

const TemporaryButton = React.forwardRef<
  HTMLButtonElement,
  TemporaryButtonProps
>(({ interval, children, onClick, ...props }, ref) => {
  const { state, triggerState } = useTemporaryState(interval);

  const event = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (onClick) onClick(e);
    triggerState();
  };

  return (
    <Button ref={ref} onClick={event} {...props}>
      {state ? <Check className={`h-4 w-4`} /> : children}
    </Button>
  );
});

type UploadFileButtonProps = ButtonProps & {
  onFileChange: (file: File) => Promise<void>;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
  stayAfterUpload?: boolean;
};

const UploadFileButton = React.forwardRef<
  HTMLButtonElement,
  UploadFileButtonProps
>(({ onFileChange, inputProps, stayAfterUpload, ...props }, ref) => {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const onFileChangeHandler = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      await onFileChange(file);
    }

    !stayAfterUpload && inputRef.current && (e.target.value = "");
  };

  return (
    <>
      <Button ref={ref} onClick={() => inputRef.current?.click()} {...props} />
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={onFileChangeHandler}
        {...inputProps}
      />
    </>
  );
});

export { Button, TemporaryButton, UploadFileButton };
