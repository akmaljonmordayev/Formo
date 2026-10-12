import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PhoneInput, { phoneDigits } from './PhoneInput';

describe('phoneDigits', () => {
  it.each([
    ['+998901234567', '901234567'],
    ['+998 90 123-45-67', '901234567'],
    ['901234567', '901234567'],
    ['90 123', '90123'],
    ['', ''],
  ])('"%s" -> "%s"', (input, expected) => {
    expect(phoneDigits(input)).toBe(expected);
  });

  it('argumentsiz — bo‘sh qator', () => {
    expect(phoneDigits()).toBe('');
  });
});

describe('PhoneInput', () => {
  const setup = (value = '') => {
    const onChange = vi.fn();
    render(<PhoneInput value={value} onChange={onChange} />);
    return { input: screen.getByPlaceholderText('90 123 45 67'), onChange };
  };

  it('9 ta raqamni "90 123 45 67" ko‘rinishida chiqaradi', () => {
    expect(setup('901234567').input).toHaveValue('90 123 45 67');
    expect(screen.getByText('+998')).toBeInTheDocument();
  });

  it('chala raqam ham guruhlab ko‘rsatiladi', () => {
    expect(setup('90123').input).toHaveValue('90 123');
  });

  it('yozilganda faqat raqamlar qaytadi', () => {
    const { input, onChange } = setup();
    fireEvent.change(input, { target: { value: '90 12a-3' } });
    expect(onChange).toHaveBeenCalledWith('90123');
  });

  it('+998 bilan to‘liq raqam joylashtirilsa — prefiks olib tashlanadi', () => {
    const { input, onChange } = setup();
    fireEvent.change(input, { target: { value: '+998 90 123 45 67' } });
    expect(onChange).toHaveBeenCalledWith('901234567');
  });

  it('9 tadan ortiq raqam qirqiladi', () => {
    const { input, onChange } = setup();
    fireEvent.change(input, { target: { value: '90123456789' } });
    expect(onChange).toHaveBeenCalledWith('901234567');
  });
});
