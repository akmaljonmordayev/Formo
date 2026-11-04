import React from 'react';
import { ProductCard } from './ProductCard';

/**
 * Forma kartasi (bosh sahifa, Studio katalogi): Forma 360° surati, yurakcha, nomi, narxi.
 * `rank` berilsa — "#1" belgisi (eng ko'p sotilganlar). Yurakcha faqat aniq forma (kitId) bo'lsa.
 *
 * Props: kit (toKitCard), t, favorite, onFavorite(kit), onPress(kit), rank?, style
 */
export default function KitTile({ kit, t, favorite, onFavorite, onPress, rank, style }) {
  const product = {
    kit360Id: kit.kit360Id,
    name: kit.name,
    price: kit.price,
    category: kit.kind === 'national' ? t('nationalTeams') : t('clubTeams'),
    badge: rank ? `#${rank}` : null,
  };
  return (
    <ProductCard
      product={product}
      style={style}
      onPress={() => onPress(kit)}
      favorite={favorite}
      onFavorite={kit.kitId && onFavorite ? () => onFavorite(kit) : undefined}
      favoriteLabel={favorite ? t('favoriteRemove') : t('favoriteAdd')}
    />
  );
}
