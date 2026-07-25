import { useEffect, useState } from "react";

/**
 * Diagnostic overlay: shows the detected bottom-bar height and the four
 * safe-area insets, plus a red guide line where the collapse button sits.
 *
 * Enable with `?debugSafeArea=1` (persisted in localStorage) or by setting
 * `localStorage.setItem("indi:debug-safe-area", "1")`.
 * Disable with `?debugSafeArea=0` or removing the key.
 */
export function SafeAreaDebug() {
  const [enabled, setEnabled] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const qp = url.searchParams.get("debugSafeArea");
      if (qp === "1") localStorage.setItem("indi:debug-safe-area", "1");
      if (qp === "0") localStorage.removeItem("indi:debug-safe-area");
      setEnabled(localStorage.getItem("indi:debug-safe-area") === "1");
    } catch {}
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const onResize = () => setTick((n) => n + 1);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    const id = window.setInterval(onResize, 500);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      window.clearInterval(id);
    };
  }, [enabled]);

  if (!enabled) return null;

  const readInset = (side: "top" | "right" | "bottom" | "left") => {
    const probe = document.createElement("div");
    probe.style.position = "fixed";
    probe.style.visibility = "hidden";
    probe.style.pointerEvents = "none";
    probe.style.height = `env(safe-area-inset-${side}, 0px)`;
    document.body.appendChild(probe);
    const h = probe.getBoundingClientRect().height;
    probe.remove();
    return Math.round(h);
  };

  const barVar = getComputedStyle(document.documentElement)
    .getPropertyValue("--app-bottom-bar-h")
    .trim() || "unset";
  const insets = {
    top: readInset("top"),
    right: readInset("right"),
    bottom: readInset("bottom"),
    left: readInset("left"),
  };
  const vv = window.visualViewport;

  return (
    <>
      {/* Safe-area outlines */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[9998]"
        style={{
          boxShadow: `inset 0 ${insets.top}px 0 0 rgba(59,130,246,0.25),
                      inset 0 -${insets.bottom}px 0 0 rgba(59,130,246,0.25),
                      inset ${insets.left}px 0 0 0 rgba(59,130,246,0.25),
                      inset -${insets.right}px 0 0 0 rgba(59,130,246,0.25)`,
        }}
      />
      {/* Bottom-bar guide line */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 z-[9998] border-t-2 border-dashed border-red-500"
        style={{ bottom: `var(--app-bottom-bar-h, 0px)` }}
      />
      {/* Readout panel */}
      <div
        className="fixed left-2 top-2 z-[9999] max-w-[92vw] rounded-md border-2 border-black bg-yellow-300 px-3 py-2 font-mono text-[11px] leading-tight text-black shadow-[3px_3px_0_0_#000]"
        data-tick={tick}
      >
        <div className="mb-1 flex items-center justify-between gap-3">
          <strong>SAFE-AREA DEBUG</strong>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem("indi:debug-safe-area");
              setEnabled(false);
            }}
            className="rounded border border-black bg-white px-1.5 py-0.5 text-[10px]"
          >
            close
          </button>
        </div>
        <div>--app-bottom-bar-h: <b>{barVar || "unset"}</b></div>
        <div>safe-area t/r/b/l: <b>{insets.top}/{insets.right}/{insets.bottom}/{insets.left}px</b></div>
        <div>viewport: <b>{Math.round(window.innerWidth)}×{Math.round(window.innerHeight)}</b></div>
        {vv && (
          <div>
            visualViewport: <b>{Math.round(vv.width)}×{Math.round(vv.height)}</b> off {Math.round(vv.offsetTop)}
          </div>
        )}
        <div className="mt-1 text-[10px] opacity-70">?debugSafeArea=0 to disable</div>
      </div>
    </>
  );
}