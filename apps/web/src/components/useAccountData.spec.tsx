import { act, render, screen, waitFor } from '@testing-library/react';
import { ShopError, ShopNetworkError } from '@/lib/shop-api';
import { AccountStateView } from './AccountState';
import { useAccountData } from './useAccountData';

/**
 * Kabinet yuklash holati.
 *
 * NEGA SHU YERDAN BOSHLANDI. Aynan bu joyda foydalanuvchi ekranida
 * cheksiz «Yuklanmoqda…» turardi: server javob bermasa ham, sessiya
 * tugagan bo'lsa ham — bir xil ko'rinish. Server logida esa hech
 * qanday xato yo'q edi, chunki xato SERVERDA emas edi.
 *
 * Shuning uchun testlar HOLATLARNI ajratishini tekshiradi: sessiya
 * tugagani «xatolik» emas, tarmoq yo'qligi «xatolik» emas, va
 * ikkalasi ham cheksiz kutish emas.
 */

function Probe({ load }: { load: () => Promise<string> }) {
  const { data, state, reload } = useAccountData(load);
  if (state.status !== 'ready') {
    return <AccountStateView state={state} locale="uz" onRetry={reload} />;
  }
  return <div>Yuklandi: {data}</div>;
}

describe('useAccountData', () => {
  it('muvaffaqiyatli yuklanganda ma’lumot ko‘rsatiladi', async () => {
    render(<Probe load={async () => 'salom'} />);
    expect(await screen.findByText('Yuklandi: salom')).toBeInTheDocument();
  });

  it('401 — «xatolik» emas, «qayta kiring»', async () => {
    // Eng ko'p uchraydigan holat. Uni xato deb ko'rsatish yolg'on:
    // hech narsa buzilmagan, sessiya muddati tugagan.
    render(
      <Probe
        load={async () => {
          throw new ShopError(401, 'UNAUTHORIZED', 'Kirish talab qilinadi');
        }}
      />,
    );
    expect(await screen.findByRole('link', { name: /kirish/i })).toBeInTheDocument();
  });

  it('403 ham xuddi shunday', async () => {
    render(
      <Probe
        load={async () => {
          throw new ShopError(403, 'FORBIDDEN', 'Ruxsat yo‘q');
        }}
      />,
    );
    expect(await screen.findByRole('link', { name: /kirish/i })).toBeInTheDocument();
  });

  it('tarmoq xatosi alohida ko‘rsatiladi va qayta urinish tugmasi beriladi', async () => {
    render(
      <Probe
        load={async () => {
          throw new ShopNetworkError('timeout');
        }}
      />,
    );
    expect(await screen.findByRole('button', { name: /qayta/i })).toBeInTheDocument();
  });

  it('«Qayta urinish» haqiqatan qayta so‘rov yuboradi', async () => {
    let attempt = 0;
    render(
      <Probe
        load={async () => {
          attempt += 1;
          if (attempt === 1) throw new ShopNetworkError('offline');
          return 'ikkinchi urinish';
        }}
      />,
    );

    const retry = await screen.findByRole('button', { name: /qayta/i });
    await act(async () => {
      retry.click();
    });
    expect(await screen.findByText('Yuklandi: ikkinchi urinish')).toBeInTheDocument();
    expect(attempt).toBe(2);
  });

  it('boshqa xato matni bilan ko‘rsatiladi', async () => {
    render(
      <Probe
        load={async () => {
          throw new Error('Bazaga ulanib bo‘lmadi');
        }}
      />,
    );
    expect(await screen.findByText(/Bazaga ulanib bo‘lmadi/)).toBeInTheDocument();
  });

  it('server sekin javob bersa — bir necha soniyadan keyin sabab aytiladi', async () => {
    // Render’ning bepul instansi uxlab qoladi va birinchi so'rov 50
    // soniyagacha kutadi. Shu vaqt ichida ekranda hech qanday izoh
    // bo'lmasa, foydalanuvchi saytni buzilgan deb o'ylaydi.
    jest.useFakeTimers();
    try {
      render(<Probe load={() => new Promise<string>(() => {})} />);

      expect(screen.queryByText(/uyg‘on/i)).not.toBeInTheDocument();
      act(() => {
        jest.advanceTimersByTime(4_000);
      });
      expect(screen.getByText(/uyg‘on/i)).toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });

  it('`load` har chizishda yangi bo‘lsa ham qayta-qayta so‘ralmaydi', async () => {
    // Bu cheksiz halqa xavfi: `load` ni bevosita bog'lanishga qo'ysak,
    // har javob yangi chizishni, har chizish yangi so'rovni keltirardi.
    let calls = 0;
    function Wrapper() {
      return (
        <Probe
          load={async () => {
            calls += 1;
            return 'bir marta';
          }}
        />
      );
    }
    const { rerender } = render(<Wrapper />);
    await screen.findByText('Yuklandi: bir marta');
    rerender(<Wrapper />);
    rerender(<Wrapper />);
    await waitFor(() => expect(calls).toBe(1));
  });
});
