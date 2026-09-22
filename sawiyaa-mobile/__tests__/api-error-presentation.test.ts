import { AxiosError } from "axios";
import { extractApiErrorMessage } from "../src/lib/api";
import i18n from "../src/i18n";

jest.mock("expo-localization", () => ({
  getLocales: () => [{ languageCode: "en", languageTag: "en-US" }],
}));
jest.mock("react-native", () => ({
  Platform: { OS: "web" },
  I18nManager: {
    isRTL: false,
    allowRTL: jest.fn(),
    forceRTL: jest.fn(),
  },
}));
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

beforeAll(async () => {
  await i18n.changeLanguage("en");
});

function axiosError(data: unknown, code?: string) {
  const error = new AxiosError("PAYMOB provider detail", code);
  error.response = {
    status: 500,
    statusText: "Internal Server Error",
    headers: {},
    config: {} as never,
    data,
  };
  return error;
}

describe("extractApiErrorMessage", () => {
  it("maps provider and backend message payloads to safe product copy", () => {
    const message = extractApiErrorMessage(
      axiosError({ message: "PAYMOB unavailable", error: "GatewayError" }),
    );

    expect(message).toBe("We couldn't complete that request. Please try again.");
    expect(message).not.toContain("PAYMOB");
    expect(message).not.toContain("GatewayError");
  });

  it("does not expose a raw Error message", () => {
    expect(extractApiErrorMessage(new Error("stack trace or provider detail"))).toBe(
      "We couldn't complete that request. Please try again.",
    );
  });

  it("keeps timeout feedback user-facing", () => {
    expect(extractApiErrorMessage(axiosError({}, "ECONNABORTED"))).toBe(
      "The request timed out. Please try again.",
    );
  });

  it("localizes the safe fallback in Arabic", async () => {
    await i18n.changeLanguage("ar");
    expect(extractApiErrorMessage(new Error("raw Arabic provider detail"))).toBe(
      "تعذر إكمال الطلب حالياً. حاول مرة أخرى.",
    );
    await i18n.changeLanguage("en");
  });
});
