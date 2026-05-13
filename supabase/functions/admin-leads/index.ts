import { runAdminEdgePost } from "../_shared/admin-runtime.ts";
import { routeAdminLeads } from "./router.ts";

Deno.serve((req) => runAdminEdgePost(req, routeAdminLeads));
