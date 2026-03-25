import { getKinoHeldMovies } from "@waslaeuftin/cinemaProviders/kinoheld/getKinoHeldMovies";

await getKinoHeldMovies(-1, {
    centerId: "MTA5Njg2MA",
    centerShorty: "lichtburg",
    createdAt: new Date(),
    id: -1,
    updatedAt: new Date()
})
