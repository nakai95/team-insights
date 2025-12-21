// Enable type-safe message keys
type Messages = typeof import("@/i18n/messages/en.json");
declare interface IntlMessages extends Messages {}
