import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SeoAdminPanel } from "./SeoAdminPanel";

const { inspect } = vi.hoisted(() => ({ inspect: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: () => inspect }));
vi.mock("@/lib/search-console.functions", () => ({ inspectUrl: vi.fn() }));
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: [], isLoading: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/components/admin/SearchConsoleCockpit", () => ({ SearchConsoleCockpit: () => null }));
vi.mock("@/components/admin/SitemapRobotsPreview", () => ({ SitemapRobotsPreview: () => null }));
vi.mock("@/components/media/ImageUploader", () => ({ ImageUploader: () => null }));
vi.mock("@/lib/seo-overrides", () => ({
  SITE_ORIGIN: "https://www.radio.indi-art-culture.com",
  fetchSeoOverrides: vi.fn(), indexOverrides: () => new Map(),
  defaultSeo: () => null, saveSeoOverride: vi.fn(), deleteSeoOverride: vi.fn(), pingIndexNow: vi.fn(),
  normalizePath: (path: string) => path,
}));

function openEditor() {
  render(<SeoAdminPanel />);
  fireEvent.change(screen.getByPlaceholderText("Rechercher une page ou un article…"), { target: { value: "/about" } });
  fireEvent.click(screen.getByRole("button", { name: "Modifier le SEO" }));
}
function requestedUrl() {
  const link = screen.getByRole("link", { name: "Demander l'indexation" });
  return new URL(link.getAttribute("href") ?? "").searchParams.get("id");
}

describe("SEO indexing language", () => {
  afterEach(cleanup);
  beforeEach(() => {
    inspect.mockReset();
    inspect.mockResolvedValue({ verdict: "PASS", coverageState: "French inspection result" });
  });
  it("inspects and links to the French page without hl=en", async () => {
    openEditor();
    expect(requestedUrl()).toBe("https://www.radio.indi-art-culture.com/about");
    fireEvent.click(screen.getByRole("button", { name: "Vérifier sur Google" }));
    await waitFor(() => expect(inspect).toHaveBeenCalledWith({ data: { url: "https://www.radio.indi-art-culture.com/about" } }));
  });
  it("inspects and links to hl=en on the English tab, independent of a custom canonical", async () => {
    openEditor();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "🇬🇧 English" }), { button: 0, ctrlKey: false });
    fireEvent.change(screen.getByLabelText("URL canonique (optionnel)"), { target: { value: "https://example.com/other" } });
    expect(requestedUrl()).toBe("https://www.radio.indi-art-culture.com/about?hl=en");
    fireEvent.click(screen.getByRole("button", { name: "Vérifier sur Google" }));
    await waitFor(() => expect(inspect).toHaveBeenCalledWith({ data: { url: "https://www.radio.indi-art-culture.com/about?hl=en" } }));
  });
  it("does not carry an inspection result or its link across language switches", async () => {
    inspect.mockResolvedValue({ verdict: "PASS", coverageState: "French inspection result", inspectLink: "https://search.google.com/search-console/inspect?id=french" });
    openEditor();
    fireEvent.click(screen.getByRole("button", { name: "Vérifier sur Google" }));
    await screen.findByText("French inspection result");
    fireEvent.mouseDown(screen.getByRole("tab", { name: "🇬🇧 English" }), { button: 0, ctrlKey: false });
    expect(screen.queryByText("French inspection result")).toBeNull();
    expect(requestedUrl()).toBe("https://www.radio.indi-art-culture.com/about?hl=en");
    fireEvent.mouseDown(screen.getByRole("tab", { name: "🇫🇷 Français" }), { button: 0, ctrlKey: false });
    expect(screen.queryByText("French inspection result")).toBeNull();
    expect(requestedUrl()).toBe("https://www.radio.indi-art-culture.com/about");
  });
});