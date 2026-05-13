import { runAdminEdgePost } from "../_shared/admin-runtime.ts";
import { routeAdminInsights } from "./router.ts";

Deno.serve((req) => runAdminEdgePost(req, routeAdminInsights));
