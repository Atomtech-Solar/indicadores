import { runAdminEdgePost } from "../_shared/admin-runtime.ts";
import { routeAdminMessages } from "./router.ts";

Deno.serve((req) => runAdminEdgePost(req, routeAdminMessages));
