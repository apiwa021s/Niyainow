"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type NovelChapterDialogContextValue = {
  open: boolean;
  openDialog: () => void;
  closeDialog: () => void;
  registerOpenHandler: (handler: () => void) => () => void;
};

const NovelChapterDialogContext = createContext<NovelChapterDialogContextValue | null>(null);

export function NovelChapterDialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openHandlerRef = useRef<(() => void) | null>(null);
  const openDialog = useCallback(() => {
    openHandlerRef.current?.();
    setOpen(true);
  }, []);
  const closeDialog = useCallback(() => setOpen(false), []);
  const registerOpenHandler = useCallback((handler: () => void) => {
    openHandlerRef.current = handler;
    return () => {
      if (openHandlerRef.current === handler) openHandlerRef.current = null;
    };
  }, []);
  const value = useMemo(
    () => ({ open, openDialog, closeDialog, registerOpenHandler }),
    [closeDialog, open, openDialog, registerOpenHandler],
  );

  return (
    <NovelChapterDialogContext.Provider value={value}>
      {children}
    </NovelChapterDialogContext.Provider>
  );
}

export function useNovelChapterDialog() {
  const context = useContext(NovelChapterDialogContext);
  if (!context) {
    throw new Error("useNovelChapterDialog must be used within NovelChapterDialogProvider");
  }
  return context;
}
