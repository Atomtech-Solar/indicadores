import { runAdminEdgePost } from "../_shared/admin-runtime.ts";
import { routeAdminFinance } from "./router.ts";

Deno.serve((req) => runAdminEdgePost(req, routeAdminFinance));
