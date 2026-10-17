import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Sheet } from '@/components/Sheet';

interface SheetControl {
  open: (content: ReactNode) => void;
  close: () => void;
}

const SheetContext = createContext<SheetControl | null>(null);

/** Global bottom-sheet host — the FAB and every screen share this one sheet. */
export function SheetHost({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<ReactNode>(null);
  const [visible, setVisible] = useState(false);

  const open = useCallback((node: ReactNode) => {
    setContent(node);
    setVisible(true);
  }, []);

  const close = useCallback(() => setVisible(false), []);

  return (
    <SheetContext.Provider value={{ open, close }}>
      {children}
      <Sheet visible={visible} onClose={close}>
        {content}
      </Sheet>
    </SheetContext.Provider>
  );
}

export function useSheet(): SheetControl {
  const ctx = useContext(SheetContext);
  if (!ctx) throw new Error('useSheet must be used inside <SheetHost>');
  return ctx;
}
