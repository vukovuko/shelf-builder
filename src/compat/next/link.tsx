import { Link as RouterLink, useRouterState } from "@tanstack/react-router";
import {
  type AnchorHTMLAttributes,
  createContext,
  type MouseEvent,
  type ReactNode,
  type Ref,
  useContext,
  useEffect,
  useState,
} from "react";
import { parseHref, type RouterTarget } from "./href";

// Stands in for `next/link` while components are shared with the Next.js app
// on `main`. Vite and tsconfig map the import here; see MIGRATION.md.

interface LinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  href: string;
  replace?: boolean;
  /** Next's name for it; `false` turns preloading on hover off. */
  prefetch?: boolean | null;
  scroll?: boolean;
  ref?: Ref<HTMLAnchorElement>;
  children?: ReactNode;
}

const LinkStatus = createContext({ pending: false });

/** True inside a link that was clicked and whose page is still loading. */
export function useLinkStatus() {
  return useContext(LinkStatus);
}

export default function Link({ href, ...rest }: LinkProps) {
  const target = parseHref(href);
  if (!target) return <a href={href} {...rest} />;
  return <InAppLink route={target} {...rest} />;
}

function InAppLink({
  route,
  replace,
  prefetch,
  scroll,
  onClick,
  children,
  ...rest
}: Omit<LinkProps, "href"> & { route: RouterTarget }) {
  const [clicked, setClicked] = useState(false);
  const isLoading = useRouterState({ select: (state) => state.isLoading });
  const goingHere = useRouterState({
    select: (state) => state.location.pathname === route.to,
  });

  useEffect(() => {
    if (!isLoading) setClicked(false);
  }, [isLoading]);

  return (
    <RouterLink
      // Hrefs come from shared components as plain strings, so they are not
      // checked against the route tree here.
      to={route.to as "/"}
      search={route.search as never}
      hash={route.hash}
      replace={replace}
      resetScroll={scroll}
      preload={prefetch === false ? false : undefined}
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(event);
        if (!event.defaultPrevented) setClicked(true);
      }}
      {...rest}
    >
      <LinkStatus value={{ pending: clicked && isLoading && goingHere }}>
        {children}
      </LinkStatus>
    </RouterLink>
  );
}
