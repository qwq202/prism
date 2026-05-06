import { deeptrainApiEndpoint, useDeeptrain } from "@/conf/env.ts";
import { ImgHTMLAttributes, useMemo } from "react";
import { cn } from "@/components/ui/lib/utils.ts";

export interface AvatarProps extends ImgHTMLAttributes<HTMLElement> {
  username: string;
}

function Avatar({ username, ...props }: AvatarProps) {
  const code = useMemo(
    () => (username?.length > 0 ? username[0].toUpperCase() : "A"),
    [username],
  );

  const background = useMemo(() => {
    const colors = [
      "bg-gradient-to-br from-red-500 to-orange-500",
      "bg-gradient-to-br from-yellow-500 to-green-500",
      "bg-gradient-to-br from-green-500 to-teal-500",
      "bg-gradient-to-br from-indigo-500 to-purple-500",
      "bg-gradient-to-br from-purple-500 to-pink-500",
      "bg-gradient-to-br from-sky-500 to-blue-500",
      "bg-gradient-to-br from-pink-500 to-rose-500",
    ];
    const index = code.charCodeAt(0) % colors.length;
    return colors[index];
  }, [code]);

  const avatarSrc =
    useDeeptrain && username.length > 0
      ? `${deeptrainApiEndpoint}/avatar/${username}`
      : "";

  return avatarSrc ? (
    <img
      {...props}
      className={cn("w-10 h-10", props.className)}
      src={avatarSrc}
      alt=""
    />
  ) : (
    <div
      {...props}
      className={cn("avatar w-10 h-10 shadow", background, props.className)}
    >
      <p className={`text-white`}>{code}</p>
    </div>
  );
}

export default Avatar;
