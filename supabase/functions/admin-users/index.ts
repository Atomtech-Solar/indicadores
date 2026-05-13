import { runAdminEdgePost } from "../_shared/admin-runtime.ts";
import { routeAdminUsers } from "./router.ts";

Deno.serve((req) => runAdminEdgePost(req, routeAdminUsers));
