import { getClipAndCenter, type PlacementZone } from '../lib/utils';

interface CroppedProductImageProps {
  src?: string;
  alt?: string;
  zone?: PlacementZone | null;
  className?: string;
  style?: React.CSSProperties;
  center?: boolean;
}

export function CroppedProductImage({
  src,
  alt = '',
  zone,
  className = '',
  style = {},
  center = false,
}: CroppedProductImageProps) {
  const { clipPath, transform } = getClipAndCenter(zone || null);
  const shouldClip = clipPath !== 'none';
  const imgStyle: React.CSSProperties = {
    ...style,
    ...(shouldClip ? { clipPath } : {}),
    ...(center && shouldClip && transform !== 'none' ? { transform } : {}),
  };

  return <img src={src || ''} alt={alt} className={className} style={imgStyle} />;
}
