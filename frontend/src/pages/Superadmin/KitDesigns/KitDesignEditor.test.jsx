import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import KitDesignEditor from './KitDesignEditor';

// jsdom'da WebGL yo'q — viewer o'rniga olgan props'ini ko'rsatadigan soxta komponent
vi.mock('@formo/kit-3d/react', () => ({
  default: (props) => (
    <div
      data-testid="viewer"
      data-pattern={props.design.pattern}
      data-primary={props.design.primaryColor}
      data-name={props.backName}
      data-number={props.number}
      data-view={props.view}
      data-spin={String(props.autoRotate)}
    />
  ),
}));

const viewer = () => screen.getByTestId('viewer');

describe('KitDesignEditor', () => {
  it('forma o\'zgarishlari darhol 3D ko\'rinishga uzatiladi', () => {
    render(<KitDesignEditor initial={null} />);
    expect(viewer().dataset.pattern).toBe('fade');
    fireEvent.change(screen.getByDisplayValue('Oqim (gradient)'), { target: { value: 'hoops' } });
    expect(viewer().dataset.pattern).toBe('hoops');
    fireEvent.click(screen.getByRole('button', { name: /Olov/ }));
    expect(viewer().dataset.primary).toBe('#a3122b');
    expect(viewer().dataset.pattern).toBe('stripes');
  });

  it("sinov ism/raqami orqaga yoziladi, raqam faqat 2 ta raqam", () => {
    render(<KitDesignEditor initial={null} />);
    const name = screen.getByPlaceholderText('RAHIMOV');
    fireEvent.focus(name);
    expect(viewer().dataset.view).toBe('back');
    expect(viewer().dataset.spin).toBe('false');
    fireEvent.change(name, { target: { value: 'Aliyev' } });
    fireEvent.change(screen.getByPlaceholderText('10'), { target: { value: '1a23' } });
    expect(viewer().dataset.name).toBe('Aliyev');
    expect(viewer().dataset.number).toBe('12');
  });

  it("saqlashda sinov ism/raqami dizaynga qo'shilmaydi", () => {
    const onSave = vi.fn();
    render(<KitDesignEditor initial={{ name: 'Tun', pattern: 'hoops' }} onSave={onSave} />);
    fireEvent.change(screen.getByPlaceholderText('RAHIMOV'), { target: { value: 'Aliyev' } });
    fireEvent.click(screen.getByRole('button', { name: 'Saqlash' }));
    expect(onSave).toHaveBeenCalledTimes(1);
    const saved = onSave.mock.calls[0][0];
    expect(saved).toMatchObject({ name: 'Tun', pattern: 'hoops', neck: 'round' });
    expect(saved).not.toHaveProperty('backName');
    expect(saved).not.toHaveProperty('number');
  });

  it("onSave berilmasa saqlash tugmasi yo'q", () => {
    render(<KitDesignEditor initial={null} />);
    expect(screen.queryByRole('button', { name: 'Saqlash' })).toBeNull();
  });
});
