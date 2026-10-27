import { useMemo } from 'react';
import Kit3DViewer from '@formo/kit-3d/react';
import { assetUrl } from '../../../services/api';
import './kitDesigns.css';

/**
 * Buyurtmadagi 3D forma: buyurtma paytidagi dizayn nusxasi (designSnapshot) va mijoz yozgan ism/raqam — orqa tomondan.
 * Buyurtma oynasi ochilganda bitta sahna (ro'yxatda emas).
 */
export default function KitOrderPreview({ snapshot, backName, number }) {
  const design = useMemo(
    () => ({ ...snapshot, crestImageUrl: assetUrl(snapshot?.crestImageUrl), sponsorImageUrl: assetUrl(snapshot?.sponsorImageUrl) }),
    [snapshot],
  );
  return (
    <Kit3DViewer
      className="kd-order-preview"
      design={design}
      backName={backName || ''}
      number={number || ''}
      view="back"
      autoRotate={false}
      textureSize={1024}
    />
  );
}
