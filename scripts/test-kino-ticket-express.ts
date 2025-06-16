import { getKinoTicketsExpressMovies } from "../src/cinemaProviders/kino-ticket-express/getKinoTicketExpressMovies";

async function testKinoTicketsExpressProvider() {
  const cinemaId = 1;
  const slug = "karlsruhe_schauburg";

  try {
    const movies = await getKinoTicketsExpressMovies(cinemaId, slug);
    console.log("Fetched movies:", movies);
  } catch (error) {
    console.error(
      "Error fetching movies from KinoTickets Express provider:",
      error,
    );
  }
}

void testKinoTicketsExpressProvider();
