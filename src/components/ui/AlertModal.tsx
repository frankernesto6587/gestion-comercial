"use client";

import { Fragment } from "react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

export type AlertType = "error" | "warning" | "success" | "info";

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  type?: AlertType;
  title: string;
  message: string;
}

const typeConfig = {
  error: {
    icon: XCircleIcon,
    bgColor: "bg-red-100 dark:bg-red-900/30",
    iconColor: "text-red-600 dark:text-red-400",
    buttonClass: "bg-error hover:bg-red-700",
  },
  warning: {
    icon: ExclamationTriangleIcon,
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    iconColor: "text-yellow-600 dark:text-yellow-400",
    buttonClass: "bg-warning hover:bg-yellow-600 text-black",
  },
  success: {
    icon: CheckCircleIcon,
    bgColor: "bg-green-100 dark:bg-green-900/30",
    iconColor: "text-green-600 dark:text-green-400",
    buttonClass: "bg-success hover:bg-green-700",
  },
  info: {
    icon: InformationCircleIcon,
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    iconColor: "text-blue-600 dark:text-blue-400",
    buttonClass: "bg-info hover:bg-blue-600",
  },
};

export default function AlertModal({
  isOpen,
  onClose,
  type = "info",
  title,
  message,
}: AlertModalProps) {
  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-xl bg-surface p-6 shadow-xl transition-all">
                <div className="flex flex-col items-center text-center">
                  <div
                    className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${config.bgColor}`}
                  >
                    <Icon className={`h-7 w-7 ${config.iconColor}`} />
                  </div>

                  <DialogTitle
                    as="h3"
                    className="mt-4 text-lg font-semibold text-foreground"
                  >
                    {title}
                  </DialogTitle>

                  <p className="mt-2 text-sm text-secondary whitespace-pre-line">
                    {message}
                  </p>

                  <button
                    type="button"
                    className={`mt-6 w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${config.buttonClass}`}
                    onClick={onClose}
                  >
                    Aceptar
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
