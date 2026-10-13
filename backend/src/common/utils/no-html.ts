import { Transform } from 'class-transformer';
import { registerDecorator, ValidationOptions } from 'class-validator';

// <, >, javascript:, on*= kabi XSS uchun ishlatiladigan bo'laklar
const HTML_PATTERN = /[<>]|javascript:|data:text\/html|\bon\w+\s*=/i;
// Ko'rinmas boshqaruv belgilari (\t va \n dan tashqari)
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g;

/** Matnli maydonlarda HTML/skript kodini qabul qilmaydi (stored XSS himoyasi) */
export function NoHtml(options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'noHtml',
      target: object.constructor,
      propertyName,
      options: { message: "Matnda HTML yoki skript belgilariga (<, >, javascript: va h.k.) ruxsat yo'q", ...options },
      validator: {
        validate: (value: unknown) => typeof value !== 'string' || !HTML_PATTERN.test(value),
      },
    });
  };
}

/** Bo'shliqlarni qirqadi va ko'rinmas boshqaruv belgilarini olib tashlaydi */
export const CleanText = () =>
  Transform(({ value }) =>
    typeof value === 'string' ? value.replace(CONTROL_CHARS, '').replace(/\s+/g, ' ').trim() : value,
  );
