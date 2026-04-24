import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "./index.ts";

export function dispatchWrapper(
  action: (payload?: unknown) => Parameters<AppDispatch>[0],
) {
  return (payload?: unknown) => {
    const dispatch = useDispatch<AppDispatch>();
    dispatch(action(payload));
  };
}

export function useGetSelector(reducer: string, key: string) {
  return useSelector((state: RootState) => {
    const section = state[reducer as keyof RootState] as Record<string, unknown>;
    return section[key];
  });
}

export const getSelector = useGetSelector;
