import KitDesignEditor from './KitDesignEditor';
import { useT } from '../i18n';

// 2-bosqich: tahrirlovchi va jonli 3D ko'rinish. Ro'yxat, saqlash va rasm yuklash — backend API bilan keyingi bosqichda.
export default function SuperadminKitDesigns() {
  const t = useT();
  return (
    <>
      <div className="sa-head">
        <div>
          <h1>{t('3D formalar')}</h1>
          <p>{t("Forma dizaynlari: ilovada mijoz shu dizaynni 3D ko'rinishda ko'radi va orqasiga ism-raqam yozadi.")}</p>
        </div>
      </div>
      <KitDesignEditor initial={null} />
    </>
  );
}
