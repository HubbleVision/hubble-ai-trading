import { type RouteConfig, index, route } from "@react-router/dev/routes";

const apiRoutes = [
  route("api/v1/traders", "routes/api/v1/traders.ts"),
  route("api/v1/traders/pnl", "routes/api/v1/traders.pnl.ts"),
  route("api/v1/config", "routes/api/v1/config.ts"),
  route(
    "api/v1/traders/latest-balance",
    "routes/api/v1/traders.latest-balance.ts"
  ),
  route("api/v1/analysis-records", "routes/api/v1/analysis-records.ts"),
  route("api/v1/position-records", "routes/api/v1/position-records.ts"),

  route("api/v1/orders", "routes/api/v1/orders.ts"),
  route("api/v1/orders/import", "routes/api/v1/orders.import.ts"),
  route("api/v1/orders/latest", "routes/api/v1/orders.latest.ts"),
  route(
    "api/v1/admin/position-records/fix-datetime",
    "routes/api/v1/admin/position-records/fix-datetime.ts"
  ),
] satisfies RouteConfig;

const systemRoutes = [
  route("*", "routes/$.tsx"), // Wildcard route, handles all unmatched paths
] satisfies RouteConfig;

const pagesRoutes = [
  index("routes/home.tsx"),
  route("admin/position-fix", "routes/admin/position-fix.tsx"),
] satisfies RouteConfig;

export default [
  ...apiRoutes,
  ...systemRoutes,
  ...pagesRoutes,
] satisfies RouteConfig;
