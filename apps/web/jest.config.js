/**
 * Sayt tomonidagi testlar.
 *
 * NEGA jsdom. Bu yerda sinaladigan narsa — FORMA: mijoz nimani
 * ko'radi, tugma qachon bloklanadi, xato qayerda chiqadi. Bunday
 * xatolar server logida ko'rinmaydi va ularning hammasi foydalanuvchi
 * ekranida topilgan edi.
 *
 * `next/navigation` va `next/link` mock qilinadi: ular router
 * kontekstini talab qiladi va u testda yo'q. Mock testni haqiqatdan
 * uzoqlashtirmaydi — bizni qiziqtirgan mantiq komponent ichida.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  rootDir: 'src',
  testRegex: '.*\\.spec\\.tsx?$',
  setupFilesAfterEnv: ['<rootDir>/../jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '\\.(css|scss)$': '<rootDir>/../jest.style-mock.js',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { isolatedModules: true, tsconfig: { jsx: 'react-jsx' } }],
  },
};
