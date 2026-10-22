// types/global.d.ts
export { }

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string
        initDataUnsafe: any
        sendData: (data: string) => void
        close: () => void
        expand: () => void
        // در صورت نیاز فیلدهای دیگر اضافه شوند
      }
    }
  }
}
