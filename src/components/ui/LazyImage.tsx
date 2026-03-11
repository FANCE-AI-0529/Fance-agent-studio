import React from "react";

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  webpSrc?: string;
}

// Simple wrapper that adds lazy loading and optional WebP source
export const LazyImage: React.FC<LazyImageProps> = ({ src, webpSrc, alt = "", ...rest }) => {
  if (webpSrc) {
    return (
      <picture>
        <source srcSet={webpSrc} type="image/webp" />
        <img loading="lazy" src={src} alt={alt} {...rest} />
      </picture>
    );
  }
  return <img loading="lazy" src={src} alt={alt} {...rest} />;
};
