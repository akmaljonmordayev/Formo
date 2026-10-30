import { ApiError } from '../services/api';

/**
 * Xatoni foydalanuvchiga ko'rsatiladigan matnga aylantiradi.
 * ApiError — server o'zi yozgan o'zbekcha sabab; fetch'ning TypeError'i — tarmoq xatosi.
 */
export function errorText(err, t) {
  if (err instanceof ApiError && err.message) return err.message;
  return t('networkError');
}
