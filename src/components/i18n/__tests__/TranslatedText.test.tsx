import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const lang = { current: "fr" as "fr" | "en" };
const translateMock = vi.fn();

vi.mock("@/lib/i18n", () => ({
  useLang: () => ({ lang: lang.current, t: (k: string) => k }),
}));
vi.mock("@tanstack/react-start", () => ({
  useServerFn: () => translateMock,
}));
vi.mock("@/lib/translate.functions", () => ({ translateContent: () => {} }));

import { TranslatedText } from "@/components/i18n/TranslatedText";

function renderText(text: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <TranslatedText entityType="post" entityKey="1" field="content" text={text} />
    </QueryClientProvider>,
  );
}

describe("TranslatedText FR/EN rendering", () => {
  beforeEach(() => {
    translateMock.mockReset();
  });

  it("keeps quoted work titles original when rendering in French", async () => {
    lang.current = "fr";
    translateMock.mockResolvedValue({
      text: 'Nouvelle chronique de « Le sol » disponible',
    });
    renderText('New review of "Dick on the Floor" out now');
    await waitFor(() =>
      expect(
        screen.getByText('Nouvelle chronique de "Dick on the Floor" disponible'),
      ).toBeTruthy(),
    );
  });

  it("renders the full translation in English", async () => {
    lang.current = "en";
    translateMock.mockResolvedValue({ text: 'Review of "Vincent\'s Tale"' });
    renderText("Chronique de « Vincent's Tale »");
    await waitFor(() =>
      expect(screen.getByText('Review of "Vincent\'s Tale"')).toBeTruthy(),
    );
  });
});
