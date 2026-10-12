import { db } from "@waslaeuftin/db/client";

await db.showing.updateMany({ data: { isListed: false } });

console.log("unlisted all showings; screening history retained");
