import { cn } from "@/components/ui/lib/utils.ts";
import { getEmojiSource } from "@/components/EmojiSource.ts";

type EmojiProps = {
  emoji: string;
  className?: string;
};

function Emoji({ emoji, className }: EmojiProps) {
  return (
    <img
      className={cn("select-none", className)}
      src={getEmojiSource(emoji)}
      alt={""}
    />
  );
}

export default Emoji;
