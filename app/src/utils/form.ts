type FormAction = {
  type: string;
  payload?: unknown;
  value?: unknown;
};

export function setKey<T>(state: T, key: string, value: unknown): T {
  const segment = key.split(".");
  if (segment.length === 1) {
    return { ...state, [key]: value };
  } else if (segment.length > 1) {
    const [k, ...v] = segment;
    return { ...state, [k]: setKey(state[k as keyof T], v.join("."), value) };
  }

  // segment.length is zero
  throw new Error("invalid key");
}

export const formReducer = <T>() => {
  return (state: T, action: FormAction): T => {
    const payload = action.payload ?? action.value;

    switch (action.type) {
      case "update":
        return { ...state, ...(payload as Partial<T>) } as T;
      case "reset":
        return { ...(payload as Partial<T>) } as T;
      case "set":
        return payload as T;
      default:
        if (action.type.startsWith("update:")) {
          const key = action.type.slice(7);
          return setKey(state, key, payload) as T;
        }

        return state;
    }
  };
};

export function isEmailValid(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 255;
}

export function isInRange(value: number, min: number, max: number) {
  return value >= min && value <= max;
}

export function isTextInRange(value: string, min: number, max: number) {
  return value.trim().length >= min && value.trim().length <= max;
}
