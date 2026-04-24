import { CustomMask, initialCustomMask } from "@/masks/types.ts";
import { UserRole } from "@/api/types.tsx";

export type MaskEditorAction =
  | { type: "update-avatar"; payload: string }
  | { type: "update-name"; payload: string }
  | { type: "update-description"; payload: string }
  | { type: "set-conversation"; payload: CustomMask["context"] }
  | { type: "new-message" }
  | { type: "new-message-below"; index: number }
  | { type: "update-message-role"; index: number; payload: string }
  | { type: "update-message-content"; index: number; payload: string }
  | { type: "change-index"; payload: { from: number; to: number } }
  | { type: "remove-message"; index: number }
  | { type: "reset" }
  | { type: "set-mask"; payload: CustomMask }
  | { type: "import-mask"; payload: CustomMask };

export function maskEditorReducer(
  state: CustomMask,
  action: MaskEditorAction,
): CustomMask {
  switch (action.type) {
    case "update-avatar":
      return { ...state, avatar: action.payload };
    case "update-name":
      return { ...state, name: action.payload };
    case "update-description":
      return { ...state, description: action.payload };
    case "set-conversation":
      return {
        ...state,
        context: action.payload,
      };
    case "new-message":
      return {
        ...state,
        context: [...state.context, { role: UserRole, content: "" }],
      };
    case "new-message-below":
      return {
        ...state,
        context: [
          ...state.context.slice(0, action.index + 1),
          { role: UserRole, content: "" },
          ...state.context.slice(action.index + 1),
        ],
      };
    case "update-message-role":
      return {
        ...state,
        context: state.context.map((item, idx) => {
          if (idx === action.index) return { ...item, role: action.payload };
          return item;
        }),
      };
    case "update-message-content":
      return {
        ...state,
        context: state.context.map((item, idx) => {
          if (idx === action.index) return { ...item, content: action.payload };
          return item;
        }),
      };
    case "change-index": {
      const { from, to } = action.payload;
      const context = [...state.context];
      const [removed] = context.splice(from, 1);
      context.splice(to, 0, removed);
      return { ...state, context };
    }
    case "remove-message":
      return {
        ...state,
        context: state.context.filter((_, idx) => idx !== action.index),
      };
    case "reset":
      return { ...initialCustomMask };
    case "set-mask":
      return {
        ...action.payload,
      };
    case "import-mask":
      return {
        ...action.payload,
        description: action.payload.description || "",
        id: -1,
      };
    default:
      return state;
  }
}
