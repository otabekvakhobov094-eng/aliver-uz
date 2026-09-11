/** Tokenlarning TS ko'rinishi — grafiklar va inline uslublar uchun. */
export const tokens = {
  color: {
    ink: '#1B1220',
    ink2: '#463A4F',
    muted: '#8B7D94',
    line: '#F1E3EB',
    line2: '#E3D2DD',
    bg: '#FFF9FC',
    surface: '#FFFFFF',
    surface2: '#FDEFF5',
    surface3: '#FFF3E9',
    brand: '#E4175C',
    brandDeep: '#B00E45',
    brandSoft: '#FFE3EE',
    gold: '#F0A007',
    goldSoft: '#FFF0D6',
    mint: '#00A97F',
    mintSoft: '#DDF6EE',
    violet: '#7A3DF5',
    violetSoft: '#EEE6FF',
  },
  radius: { sm: 10, md: 14, lg: 20, xl: 26, pill: 999 },
  tapMin: 44,
} as const;

export type ColorToken = keyof typeof tokens.color;
