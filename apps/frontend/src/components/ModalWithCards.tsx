"use client";

import React, { useEffect, useId, useRef } from "react";
import Card from "@/components/Card";
import clsx from "clsx";

export type ModalCardItem = {
  id: string | number;
  title?: string;
  subtitle?: string;
  imageSrc?: string | null;
};

type ModalWithCardsProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  cards: ModalCardItem[];
  actionText?: string;
  onAction?: () => void;
  className?: string;
};

export default function ModalWithCards({
  isOpen,
  onClose,
  title,
  cards,
  actionText = "Continue",
  onAction,
  className,
}: ModalWithCardsProps) {
  const labelId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelId}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/50" />

      <div
        ref={dialogRef}
        className={clsx(
          "relative z-10 flex flex-col justify-center items-center w-full max-w-5xl rounded-2xl bg-white p-6 shadow-xl",
          className,
        )}
      >
        <div className="mb-4 w-full flex items-start justify-between">
          <h2 id={labelId} className="text-xl font-semibold text-black">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-9 w-9 rounded-full bg-black text-white"
          >
            ×
          </button>
        </div>

        <div className="-mx-2 overflow-x-auto pb-2">
          <div className="mx-2 flex gap-3">
            {cards.slice(0, 5).map((item) => (
              <Card
                key={item.id}
                className="w-[183px] h-[220px] bg-white text-black"
                title={item.title}
                subtitle={item.subtitle}
                imageSrc={item.imageSrc}
              />
            ))}
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={onAction}
            className="w-min rounded-[24px] bg-black px-4 py-3 text-center text-white"
          >
            {actionText}
          </button>
        </div>
      </div>
    </div>
  );
}


