import { Outlet, createFileRoute } from "@tanstack/react-router";
import { parseSearch } from "@/lib/search";

export const Route = createFileRoute("/hotels")({
  validateSearch: parseSearch,
  component: HotelsLayout,
});

function HotelsLayout() {
  return <Outlet />;
}
