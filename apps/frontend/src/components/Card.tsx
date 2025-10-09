"use client";

import Image from "next/image";
import React from "react";
import clsx from "clsx";

type CardProps = {
  title?: string;
  subtitle?: string;
  imageSrc?: string | null;
  className?: string;
};

export default function Card({ title, subtitle, imageSrc, className }: CardProps) {
  return (
    <div className={clsx("group flex w-[234px] h-[342px] flex-col overflow-hidden rounded-xl border border-gray-200 bg-[#D9D9D9] shadow-sm transition-shadow hover:shadow-md", className)}>
      <div className="relative h-full w-full bg-gray-200">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={title || "card image"}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 300px"
            priority={false}
          />
        ) : (
          <div className="h-full w-full bg-gray-200" />
        )}
      </div>
    </div>
  );
}


