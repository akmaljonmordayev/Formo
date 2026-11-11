import React from 'react';
import { ProductCard } from './ProductCard';

/**
 * Forma kartasi (bosh sahifa, Studio katalogi): Forma 360° surati, yurakcha, nomi. Narx kartada ko'rsatilmaydi —
 * u o'lchamga bog'liq va Forma 360° ekranida o'lcham tanlangach chiqadi.
 * `rank` berilsa — "#1" belgisi (eng ko'p sotilganlar). Yurakcha har doim ko'rinadi (bosilsa qizaradi).
 *
 * Props: kit (toKitCard), t, favorite, onFavorite(kit), onPress(kit), rank?, style
 */
export default function KitTile({ kit, t, favorite, onFavorite, onPress, rank, style }) {
  const long = kit.sleeve === 'LONG';
  const product = {
    kit360Id: kit.kit360Id,
    // Uzun yeng (qishki) — l0 surati
    variant: kit.variant,
    name: kit.name,
    // Narx o'rniga "Ko'rish" — har o'lchamning o'z narxi bor
    cta: t('viewKit'),
    category: `${kit.kind === 'national' ? t('nationalTeams') : t('clubTeams')} · ${long ? t('sleeveLong') : t('sleeveShort')}`,
    badge: rank ? `#${rank}` : null,
  };
  return (
    <ProductCard
      product={product}
      style={style}
      onPress={() => onPress(kit)}
      favorite={favorite}
      onFavorite={onFavorite ? () => onFavorite(kit) : undefined}
      favoriteLabel={favorite ? t('favoriteRemove') : t('favoriteAdd')}
    />
  );
}
