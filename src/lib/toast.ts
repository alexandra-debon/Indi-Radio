type ToastOptions = Record<string, unknown>;
type ToastFn = (message: string, options?: ToastOptions) => void;
type ToastApi = {
  success: ToastFn;
  error: ToastFn;
  info: ToastFn;
  warning: ToastFn;
  message: ToastFn;
};

async function callToast(method: keyof ToastApi, message: string, options?: ToastOptions) {
  if (typeof window === "undefined") return;
  try {
    const mod = await import("sonner");
    const api = mod.toast as unknown as Partial<ToastApi>;
    const fn = api[method] ?? api.message;
    fn?.(message, options);
  } catch {
    // Notification UI is optional; never let it break the app shell.
  }
}

export const toast: ToastApi = {
  success: (message, options) => void callToast("success", message, options),
  error: (message, options) => void callToast("error", message, options),
  info: (message, options) => void callToast("info", message, options),
  warning: (message, options) => void callToast("warning", message, options),
  message: (message, options) => void callToast("message", message, options),
};