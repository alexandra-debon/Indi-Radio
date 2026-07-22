/**
 * Local ESLint plugin — surfaces raw French JSX text so contributors
 * translate new UI strings via useT()/t("clé") instead of hardcoding them.
 *
 * Mirrors scripts/verify-i18n.mjs (FRENCH_JSX_RE + grandfathered list).
 * Keep the two in sync when editing.
 */
import path from "node:path";

// Accented characters that indicate French copy. Matches the CI script.
const FRENCH_CHAR_RE = /[éèêëàâçùûôïîÉÈÊËÀÂÇÙÛÔÏÎœŒ]/;

// Files currently allowed to keep raw French JSX (grandfathered).
// Mirror of FRENCH_JSX_GRANDFATHERED in scripts/verify-i18n.mjs.
const GRANDFATHERED = new Set([
  "src/components/AuthDialog.tsx",
  "src/components/coups/CoupComments.tsx",
  "src/components/media/MultiImageUploader.tsx",
  "src/components/onboarding/OnboardingTour.tsx",
  "src/components/EmailVerificationBanner.tsx",
  "src/components/IosInstallHint.tsx",
  "src/components/NotificationPreferences.tsx",
  "src/components/about/IndiLinksBar.tsx",
  "src/components/admin/DeployCheckPanel.tsx",
  "src/components/admin/EmailStatusPanel.tsx",
  "src/components/clips/ClipEntryEditor.tsx",
  "src/components/media/ImageUploader.tsx",
  "src/components/moderation/ReportAlbumButton.tsx",
  "src/components/moderation/ReportImageButton.tsx",
  "src/components/social/SocialLinksBar.tsx",
  "src/components/wall/InlineEditable.tsx",
  "src/components/wall/SocialWall.tsx",
  "src/routes/_authenticated/admin.messages.tsx",
  "src/routes/_authenticated/admin.seo-preview.tsx",
  "src/routes/_authenticated/admin.tsx",
  "src/routes/_authenticated/notif-test.tsx",
  "src/routes/_authenticated/profile.albums.tsx",
  "src/routes/_authenticated/profile.edit.tsx",
  "src/routes/_authenticated/profile.likes.tsx",
  "src/routes/actus.$postId.tsx",
  "src/routes/chroniques.$slug.tsx",
  "src/routes/clips.$clipId.tsx",
  "src/routes/coups-de-coeur.tsx",
  "src/routes/emissions.$showId.tsx",
  "src/routes/episodes.$episodeId.tsx",
  "src/routes/magazines.$magazineId.tsx",
  "src/routes/newsletter.tsx",
  "src/routes/p.$postId.tsx",
  "src/routes/privacy.tsx",
  "src/routes/tag.$tag.tsx",
  "src/routes/terms.tsx",
]);

function toRel(filename) {
  const cwd = process.cwd();
  const rel = path.relative(cwd, filename);
  return rel.split(path.sep).join("/");
}

function isTargetFile(filename) {
  const rel = toRel(filename);
  return rel.startsWith("src/routes/") || rel.startsWith("src/components/");
}

/** @type {import("eslint").Rule.RuleModule} */
const noRawFrenchJsx = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow raw French text in JSX — wrap it with t(\"clé\") from useT() so FR/EN stays in sync.",
    },
    schema: [],
    messages: {
      rawFrenchText:
        'Texte français brut détecté dans le JSX : "{{ snippet }}". Utilise t("clé") via useT() et ajoute la clé dans src/lib/i18n/dict.ts.',
      rawFrenchAttr:
        'Texte français brut dans l\'attribut "{{ attr }}" : "{{ snippet }}". Passe par t("clé").',
    },
  },
  create(context) {
    const filename = context.filename ?? context.getFilename();
    if (!filename || !isTargetFile(filename)) return {};
    const rel = toRel(filename);
    if (GRANDFATHERED.has(rel)) return {};

    const snip = (s) => {
      const trimmed = s.replace(/\s+/g, " ").trim();
      return trimmed.length > 60 ? trimmed.slice(0, 57) + "…" : trimmed;
    };

    return {
      JSXText(node) {
        if (FRENCH_CHAR_RE.test(node.value)) {
          context.report({
            node,
            messageId: "rawFrenchText",
            data: { snippet: snip(node.value) },
          });
        }
      },
      // <button title="Valider">, aria-label, placeholder, alt…
      JSXAttribute(node) {
        const name =
          node.name && node.name.type === "JSXIdentifier" ? node.name.name : null;
        if (!name) return;
        const watched = new Set([
          "title",
          "alt",
          "placeholder",
          "aria-label",
          "aria-description",
          "label",
        ]);
        if (!watched.has(name)) return;
        const v = node.value;
        if (!v) return;
        if (v.type === "Literal" && typeof v.value === "string" && FRENCH_CHAR_RE.test(v.value)) {
          context.report({
            node: v,
            messageId: "rawFrenchAttr",
            data: { attr: name, snippet: snip(v.value) },
          });
        }
        if (
          v.type === "JSXExpressionContainer" &&
          v.expression.type === "Literal" &&
          typeof v.expression.value === "string" &&
          FRENCH_CHAR_RE.test(v.expression.value)
        ) {
          context.report({
            node: v.expression,
            messageId: "rawFrenchAttr",
            data: { attr: name, snippet: snip(v.expression.value) },
          });
        }
      },
    };
  },
};

export default {
  meta: { name: "eslint-plugin-i18n-guard", version: "1.0.0" },
  rules: {
    "no-raw-french-jsx": noRawFrenchJsx,
  },
};