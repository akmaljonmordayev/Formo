// +998 prefiksli telefon input. value/onChange — 9 ta raqam ("901234567")
export function phoneDigits(phone = '') {
  return phone.replace(/\D/g, '').replace(/^998/, '').slice(0, 9);
}

export default function PhoneInput({ value, onChange, ...rest }) {
  const d = value.slice(0, 9);
  const shown = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' ');
  return (
    <span className="input input--phone">
      <span className="input__prefix">+998</span>
      <input
        type="tel"
        inputMode="numeric"
        placeholder="90 123 45 67"
        value={shown}
        onChange={(e) => {
          let digits = e.target.value.replace(/\D/g, '');
          if (digits.length > 9 && digits.startsWith('998')) digits = digits.slice(3);
          onChange(digits.slice(0, 9));
        }}
        {...rest}
      />
    </span>
  );
}
