"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { BacklogStatus } from "@/lib/types";
import { statusBadgeClass } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/types";

interface GameCardProps {
  appId: number;
  name: string;
  image: string;
  description?: string;
  status?: BacklogStatus;
  metascore?: string;
  price?: string;
  index?: number;
  variant?: "grid" | "list" | "hero";
}

export function GameCard({
  appId,
  name,
  image,
  description,
  status,
  metascore,
  price,
  index = 0,
  variant = "grid",
}: GameCardProps) {
  if (variant === "list") {
    return (
      <Link
        href={`/game/${appId}`}
        className="steam-card-hover group flex items-center gap-3 border-b border-steam-border px-3 py-2.5 last:border-b-0 sm:px-4 sm:py-3"
      >
        <div className="relative h-[42px] w-[64px] shrink-0 overflow-hidden rounded-sm sm:h-[45px] sm:w-[82px]">
          <Image src={image} alt={name} fill className="object-cover" sizes="82px" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm text-steam-text-bright group-hover:text-steam-accent">
              {name}
            </h3>
            {status && (
              <span className={`shrink-0 rounded-sm border px-1.5 py-0.5 text-[10px] uppercase ${statusBadgeClass(status)}`}>
                {STATUS_LABELS[status]}
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-steam-muted">
            {metascore && (
              <span className="text-[#66c0f4]">{metascore}</span>
            )}
            {price && <span>{price}</span>}
            {description && !metascore && !price && (
              <span className="line-clamp-1">{description}</span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="min-w-0"
    >
      <Link
        href={`/game/${appId}`}
        className="group block overflow-hidden rounded-sm border border-steam-border bg-steam-dark transition-colors hover:bg-steam-elevated/20"
      >
        <div className="relative aspect-[16/10] overflow-hidden">
          <Image
            src={image}
            alt={name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, 33vw"
          />
        </div>
        <div className="p-2.5">
          <h3 className="truncate text-sm text-steam-text-bright group-hover:text-steam-accent">{name}</h3>
          {price && <p className="mt-0.5 text-xs text-steam-muted">{price}</p>}
        </div>
      </Link>
    </motion.div>
  );
}
