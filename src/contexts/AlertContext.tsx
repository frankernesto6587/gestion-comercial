"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import AlertModal, { AlertType } from "@/components/ui/AlertModal";

interface AlertOptions {
  type?: AlertType;
  title: string;
  message: string;
}

interface AlertContextType {
  showAlert: (options: AlertOptions) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [alertOptions, setAlertOptions] = useState<AlertOptions>({
    type: "info",
    title: "",
    message: "",
  });

  const showAlert = useCallback((options: AlertOptions) => {
    setAlertOptions({
      type: options.type || "info",
      title: options.title,
      message: options.message,
    });
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <AlertModal
        isOpen={isOpen}
        onClose={handleClose}
        type={alertOptions.type}
        title={alertOptions.title}
        message={alertOptions.message}
      />
    </AlertContext.Provider>
  );
}

export function useAlert(): AlertContextType {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error("useAlert must be used within an AlertProvider");
  }
  return context;
}
