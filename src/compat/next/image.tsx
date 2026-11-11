import type { CSSProperties, ImgHTMLAttributes } from "react";

// Stands in for `next/image` while components are shared with the Next.js app
// on `main`. There is no image optimizer here: every image the site uses is a
// prepared file in /public or on R2, served as is.

interface ImageProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> {
  src: string;
  alt: string;
  /** Fills the nearest positioned parent instead of taking width and height. */
  fill?: boolean;
  /** Above-the-fold image: loaded eagerly and ahead of other images. */
  priority?: boolean;
  quality?: number;
  unoptimized?: boolean;
  placeholder?: string;
  blurDataURL?: string;
}

const FILL: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
};

export default function Image({
  fill,
  priority,
  quality: _quality,
  unoptimized: _unoptimized,
  placeholder: _placeholder,
  blurDataURL: _blurDataURL,
  style,
  alt,
  ...rest
}: ImageProps) {
  return (
    <img
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : undefined}
      style={fill ? { ...FILL, ...style } : style}
      {...rest}
    />
  );
}
