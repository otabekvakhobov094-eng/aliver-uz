import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from './page';

/**
 * Kirish ekrani.
 *
 * Bu saytdagi eng tor joy: mijoz bu yerdan o'tmasa, kabinet ham,
 * buyurtma tarixi ham, ballar ham yo'q. Va bu yerdagi xatolar
 * serverda ko'rinmaydi — ular ekranda bo'ladi: tugma bosilmaydi,
 * xato chiqmaydi, kod qayta so'ralmaydi.
 */

const requestOtp = jest.fn();
const verifyOtp = jest.fn();
const push = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: (...args: unknown[]) => push(...args) }),
  useParams: () => ({ locale: 'uz' }),
}));

jest.mock('@/lib/api', () => {
  class ApiRequestError extends Error {
    constructor(
      message: string,
      readonly status = 400,
      readonly retryAfterSeconds?: number,
    ) {
      super(message);
      this.name = 'ApiRequestError';
    }
  }
  return {
    ApiRequestError,
    api: {
      requestOtp: (...a: unknown[]) => requestOtp(...a),
      verifyOtp: (...a: unknown[]) => verifyOtp(...a),
    },
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ApiRequestError } = require('@/lib/api') as {
  ApiRequestError: new (m: string, s?: number, r?: number) => Error;
};

beforeEach(() => {
  requestOtp.mockReset();
  verifyOtp.mockReset();
  push.mockReset();
  requestOtp.mockResolvedValue({ resendAfterSeconds: 60 });
  verifyOtp.mockResolvedValue({ ok: true });
});

async function typeCode(code: string) {
  const cells = screen.getAllByRole('textbox');
  for (let i = 0; i < code.length; i += 1) {
    await userEvent.type(cells[i]!, code[i]!);
  }
}

describe('Kirish sahifasi', () => {
  it('telefon qadamidan kod qadamiga o‘tadi', async () => {
    render(<LoginPage />);
    await userEvent.click(screen.getByRole('button', { name: /kod/i }));

    await waitFor(() => expect(requestOtp).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('group', { name: /kod/i })).toBeInTheDocument();
  });

  it('serverning xato matni EKRANDA ko‘rsatiladi', async () => {
    // Server xatoni to'g'ri qaytarib, ekranda hech narsa chiqmasa —
    // mijoz tugmani qayta-qayta bosadi va limitga uriladi.
    requestOtp.mockRejectedValue(new ApiRequestError('Bu raqam bloklangan'));
    render(<LoginPage />);
    await userEvent.click(screen.getByRole('button', { name: /kod/i }));

    expect(await screen.findByText(/Bu raqam bloklangan/)).toBeInTheDocument();
  });

  it('server aytgan kutish vaqti qayta so‘rash tugmasini bloklaydi', async () => {
    // Server 429 bilan «60 soniyadan keyin» desa, tugma ochiq qolsa
    // mijoz yana bosadi va yana rad javob oladi — sababini bilmay.
    requestOtp.mockRejectedValueOnce(new ApiRequestError('Juda tez-tez', 429, 42));
    render(<LoginPage />);
    await userEvent.click(screen.getByRole('button', { name: /kod/i }));
    expect(await screen.findByText(/Juda tez-tez/)).toBeInTheDocument();
  });

  it('kod to‘lganda avtomatik tasdiqlanadi — ortiqcha bosish kerak emas', async () => {
    render(<LoginPage />);
    await userEvent.click(screen.getByRole('button', { name: /kod/i }));
    await screen.findByRole('group', { name: /kod/i });

    await typeCode('12345');

    await waitFor(() => expect(verifyOtp).toHaveBeenCalledTimes(1));
    expect(verifyOtp).toHaveBeenCalledWith(expect.stringContaining('998'), '12345');
  });

  it('tasdiqlangach bosh sahifaga o‘tkaziladi', async () => {
    render(<LoginPage />);
    await userEvent.click(screen.getByRole('button', { name: /kod/i }));
    await screen.findByRole('group', { name: /kod/i });
    await typeCode('12345');

    await waitFor(() => expect(push).toHaveBeenCalledWith('/uz'));
  });

  it('noto‘g‘ri kodda maydon tozalanadi — mijoz o‘chirib o‘tirmasin', async () => {
    verifyOtp.mockRejectedValue(new ApiRequestError('Kod noto‘g‘ri'));
    render(<LoginPage />);
    await userEvent.click(screen.getByRole('button', { name: /kod/i }));
    await screen.findByRole('group', { name: /kod/i });
    await typeCode('11111');

    expect(await screen.findByRole('alert')).toHaveTextContent('Kod noto‘g‘ri');
    await waitFor(() => {
      const cells = screen.getAllByRole('textbox') as HTMLInputElement[];
      expect(cells.every((c) => c.value === '')).toBe(true);
    });
  });

  it('qayta yuborish tugmasi kutish vaqti tugaguncha bloklangan', async () => {
    jest.useFakeTimers({ advanceTimers: true });
    try {
      render(<LoginPage />);
      await userEvent.click(screen.getByRole('button', { name: /kod/i }));
      await screen.findByRole('group', { name: /kod/i });

      const resend = screen.getByRole('button', { name: /soniya|qayta/i });
      expect(resend).toBeDisabled();

      await act(async () => {
        jest.advanceTimersByTime(61_000);
      });
      expect(screen.getByRole('button', { name: /qayta/i })).not.toBeDisabled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('«Raqamni o‘zgartirish» birinchi qadamga qaytaradi', async () => {
    render(<LoginPage />);
    await userEvent.click(screen.getByRole('button', { name: /kod/i }));
    await screen.findByRole('group', { name: /kod/i });

    await userEvent.click(screen.getByRole('button', { name: /o‘zgartir/i }));
    expect(screen.queryByRole('group', { name: /kod/i })).not.toBeInTheDocument();
  });
});
