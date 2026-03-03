

## Update EmailJS Configuration

The user is providing a corrected Template ID (`template_0xcrx98` instead of the previous `template_oxcrx98`).

### Change

Update `src/config/emailjs.ts` with trimmed values:

```ts
export const EMAILJS_CONFIG = {
  SERVICE_ID: "service_0un70wm",
  TEMPLATE_ID: "template_0xcrx98",
  PUBLIC_KEY: "puvmH5fmImT3ggeYD",
};
```

Note: The Template ID changed from `template_oxcrx98` → `template_0xcrx98` (the letter "o" was replaced with the digit "0"). All values will be trimmed of extra whitespace.

