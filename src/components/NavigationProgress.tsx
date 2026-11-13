import { useRouterState } from "@tanstack/react-router";

/**
 * The thin bar across the top while the next page loads. It only appears
 * when a navigation takes longer than a blink.
 */
export function NavigationProgress() {
  const loading = useRouterState({
    select: (state) => state.status === "pending",
  });
  if (!loading) return null;

  return (
    <>
      <style>
        {
          "@keyframes nav-progress{from{transform:scaleX(0)}to{transform:scaleX(.92)}}"
        }
      </style>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-[1600] h-[3px] origin-left bg-[#7c3aed]"
        style={{
          animation: "nav-progress 8s cubic-bezier(.1,.7,.1,1) 120ms both",
        }}
      />
    </>
  );
}
