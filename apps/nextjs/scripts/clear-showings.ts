import { db } from "@waslaeuftin/db/client";

await db.showing.deleteMany();

console.log("deleted all showings");
