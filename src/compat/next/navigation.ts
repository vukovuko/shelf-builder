import {
  notFound as routerNotFound,
  redirect as routerRedirect,
  useLocation,
  useRouter as useTanStackRouter,
} from "@tanstack/react-router";
import { useMemo } from "react";
import { parseHref } from "./href";

// Stands in for `next/navigation` while components are shared with the
// Next.js app on `main`. Vite and tsconfig map the import here.

interface NavigateOptions {
  scroll?: boolean;
}

export function useRouter() {
  const router = useTanStackRouter();
  return useMemo(() => {
    const go = (href: string, replace: boolean, options?: NavigateOptions) => {
      const target = parseHref(href);
      if (!target) {
        window.location.assign(href);
        return;
      }
      router.navigate({
        to: target.to,
        search: target.search as never,
        hash: target.hash,
        replace,
        resetScroll: options?.scroll,
      });
    };
    return {
      push: (href: string, options?: NavigateOptions) =>
        go(href, false, options),
      replace: (href: string, options?: NavigateOptions) =>
        go(href, true, options),
      back: () => router.history.back(),
      forward: () => router.history.forward(),
      // Next re-renders the page's server data. Here that data lives in
      // TanStack Query, so everything on screen is marked stale and refetched.
      refresh: () => {
        router.options.context.queryClient.invalidateQueries();
        router.invalidate();
      },
      prefetch: (href: string) => {
        const target = parseHref(href);
        if (target) router.preloadRoute({ to: target.to }).catch(() => {});
      },
    };
  }, [router]);
}

export function usePathname(): string {
  return useLocation({ select: (location) => location.pathname });
}

export function useSearchParams(): URLSearchParams {
  const searchStr = useLocation({ select: (location) => location.searchStr });
  return useMemo(() => new URLSearchParams(searchStr), [searchStr]);
}

export function redirect(href: string): never {
  throw routerRedirect({ href });
}

export function permanentRedirect(href: string): never {
  throw routerRedirect({ href, statusCode: 308 });
}

export function notFound(): never {
  throw routerNotFound();
}
