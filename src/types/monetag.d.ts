// تعريف دالة الإعلان الخاصة بـ Monetag
export {};

declare global {
  interface Window {
    // الدالة تقبل معاملات اختيارية (مثل 'pop' أو إعدادات inApp)
    show_10310779: (args?: any) => Promise<void>;
  }
}
