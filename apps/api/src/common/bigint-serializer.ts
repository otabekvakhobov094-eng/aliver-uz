/**
 * BigInt JSON.stringify da xato beradi. Pul tiyinda BigInt bo'lgani uchun
 * bu global serializer majburiy — aks holda har javobda qo'lda o'girish kerak.
 * Tiyin satr sifatida uzatiladi: {"grandTotal": "57400000"}.
 */
export function installBigIntSerializer(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (BigInt.prototype as any).toJSON = function toJSON(this: bigint): string {
    return this.toString();
  };
}
