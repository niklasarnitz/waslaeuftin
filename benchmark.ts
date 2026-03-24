import { getKinoTicketsExpressMovies } from "./src/cinemaProviders/kino-ticket-express/getKinoTicketExpressMovies";

async function run() {
    // warmup
    await getKinoTicketsExpressMovies(-1, 'karlsruhe_schauburg');

    const start = performance.now();
    for (let i = 0; i < 20; i++) {
        await getKinoTicketsExpressMovies(-1, 'karlsruhe_schauburg');
    }
    const end = performance.now();
    console.log(`Average time: ${(end - start) / 20} ms`);
}
run();
