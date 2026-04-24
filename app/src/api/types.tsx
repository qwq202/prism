export {
  AssistantRole,
  Roles,
  SystemRole,
  UserRole,
  VirtualRolePrefix,
  VirtualWebSearchRole,
} from "./types.ts";
import { GetRoleIcon } from "./types.ts";
// eslint-disable-next-line react-refresh/only-export-components -- Legacy components import getRoleIcon from this .tsx compatibility entrypoint.
export const getRoleIcon = GetRoleIcon;
export type {
  ConversationInstance,
  Id,
  Message,
  MessageToolCall,
  Model,
  Plan,
  PlanItem,
  Plans,
  Role,
} from "./types.ts";
