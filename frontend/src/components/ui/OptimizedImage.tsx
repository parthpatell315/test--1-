"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

interface OptimizedImageProps extends Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  "src"
> {
  src?: string | null | undefined;
  alt: string;
  fallbackSrc?: string;
  priority?: boolean;
  /** Target display width (e.g., 360 for thumbnails/cards, 720 for hero). */
  cloudinaryWidth?: number;
  bunnyVariant?: string;
}

function withCloudinaryWidth(url: string, width: number) {
  const uploadMarker = "/upload/";
  const uploadIndex = url.indexOf(uploadMarker);
  if (uploadIndex === -1) return url;

  const before = url.slice(0, uploadIndex + uploadMarker.length);
  const segments = url.slice(uploadIndex + uploadMarker.length).split("/");
  const firstSegment = segments[0] || "";
  const hasTransform = firstSegment.length > 0 && !/^v\d+$/.test(firstSegment);
  const sourceTransforms = hasTransform
    ? firstSegment.split(",").filter(Boolean)
    : [];
  const transforms = sourceTransforms.filter((part) => !/^w_\d+$/.test(part));

  if (!transforms.some((part) => part.startsWith("f_")))
    transforms.unshift("f_auto");
  if (!transforms.some((part) => part.startsWith("q_")))
    transforms.push("q_auto:eco");
  transforms.push(`w_${width}`);
  if (!transforms.some((part) => part.startsWith("c_")))
    transforms.push("c_limit");

  const assetSegments = hasTransform ? segments.slice(1) : segments;
  return `${before}${transforms.join(",")}/${assetSegments.join("/")}`;
}

export function OptimizedImage({
  src,
  alt,
  fallbackSrc = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=50",
  className = "",
  priority,
  cloudinaryWidth = 360,
  bunnyVariant,
  ...props
}: OptimizedImageProps) {
  const { onLoad, onError, ...imageProps } = props;
  const [errorObj, setErrorObj] = useState(false);

  // 1. Validation and Normalization
  let finalSrc = src;

  if (
    !finalSrc ||
    typeof finalSrc !== "string" ||
    finalSrc.includes("image:")
  ) {
    finalSrc = fallbackSrc;
  } else if (finalSrc.startsWith("/uploads/")) {
    const apiBase = (
      process.env.NEXT_PUBLIC_API_URL || "https://api.youthcamping.in"
    ).replace(/\/api$/, "");
    finalSrc = `${apiBase}${finalSrc}`;
  } else if (
    finalSrc.includes("unsplash.com") &&
    !finalSrc.startsWith("https://")
  ) {
    finalSrc = fallbackSrc;
  } else if (!finalSrc.startsWith("http") && !finalSrc.startsWith("/")) {
    finalSrc = fallbackSrc;
  }

  if (
    typeof finalSrc === "string" &&
    /https?:\/\/(www\.)?youthcamping\.in\/system\/images\//i.test(finalSrc)
  ) {
    finalSrc = finalSrc.replace(
      /https?:\/\/(www\.)?youthcamping\.in\/system\/images\//i,
      "https://vl-prod-static.b-cdn.net/system/images/",
    );
  }

  const isCloudinary = finalSrc && finalSrc.includes("res.cloudinary.com");
  const isUnsplash = finalSrc && finalSrc.includes("images.unsplash.com");
  const isBunny = finalSrc && finalSrc.includes("vl-prod-static.b-cdn.net");
  const resolvedWidth = cloudinaryWidth || 360;

  let srcSet: string | undefined = undefined;

  if (isUnsplash) {
    // Ultra-lightweight WebP compression (< 15 KB per photo)
    const cleanUrl = finalSrc.includes("?") ? finalSrc.split("?")[0] : finalSrc;
    const w1 = Math.min(360, resolvedWidth);
    const w2 = Math.min(720, resolvedWidth * 2);

    finalSrc = `${cleanUrl}?auto=format&fit=crop&q=50&w=${w1}`;
    srcSet = `${cleanUrl}?auto=format&fit=crop&q=50&w=${w1} ${w1}w, ${cleanUrl}?auto=format&fit=crop&q=50&w=${w2} ${w2}w`;
  } else if (isCloudinary) {
    const w1 = Math.min(360, resolvedWidth);
    const w2 = Math.min(720, resolvedWidth * 2);

    const cSrc1 = withCloudinaryWidth(finalSrc, w1);
    const cSrc2 = withCloudinaryWidth(finalSrc, w2);
    finalSrc = cSrc1;
    srcSet = `${cSrc1} ${w1}w, ${cSrc2} ${w2}w`;
  } else if (isBunny && bunnyVariant && finalSrc.includes("/original/")) {
    finalSrc = finalSrc.replace("/original/", `/${bunnyVariant}/`);
  }

  const currentSrc = errorObj ? fallbackSrc : finalSrc;

  return (
    <img
      src={currentSrc}
      srcSet={srcSet}
      sizes={
        imageProps.sizes ||
        "(max-width: 640px) 360px, (max-width: 1024px) 600px, 720px"
      }
      alt={alt}
      loading={priority ? "eager" : props.loading || "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      className={cn("w-full h-full object-cover", className)}
      onError={(event) => {
        setErrorObj(true);
        onError?.(event);
      }}
      {...imageProps}
    />
  );
}
