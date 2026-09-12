import { render, screen } from '@testing-library/react';
import { Rating } from '@aliver/ui';

/**
 * Reyting ko'rinishi.
 *
 * Yangi do'konda hech bir mahsulotda sharh yo'q. Agar shunda beshta
 * bo'sh yulduz chizilsa, mijoz uni «baholanmagan» deb emas, «past
 * baholangan» deb o'qiydi — va bu butun katalog bo'ylab takrorlanadi.
 * Ya'ni xato bitta mahsulotda emas, 556 tasida bir vaqtda ko'rinadi.
 */
describe('Rating', () => {
  it('sharh yo‘q bo‘lsa umuman chizilmaydi', () => {
    const { container } = render(<Rating value={0} count={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('sharh bor bo‘lsa yulduzlar va soni ko‘rsatiladi', () => {
    render(<Rating value={4.4} count={12} />);
    expect(screen.getByRole('img', { name: /4\.4/ })).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('alohida sharhning o‘z bahosi (soni berilmagan) ko‘rsatilaveradi', () => {
    // Bu yerda baho har doim mavjud — uni yashirish sharhni
    // bahosiz qoldirardi.
    render(<Rating value={5} />);
    expect(screen.getByRole('img', { name: /5\.0/ })).toBeInTheDocument();
  });
});
