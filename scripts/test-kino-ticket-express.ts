import { getKinoTicketsExpressMovies } from "../src/cinemaProviders/kino-ticket-express/getKinoTicketExpressMovies";

async function testKinoTicketsExpressProvider() {
  const cinemaId = 1;
  const slug = "karlsruhe_kinemathek"; // Updated to match the HTML structure

  try {
    const movies = await getKinoTicketsExpressMovies(cinemaId, slug);
    console.log("Fetched movies:", JSON.stringify(movies, null, 2));
    console.log("Number of movies:", movies.movies.length);
    console.log("Number of showings:", movies.showings.length);
  } catch (error) {
    console.error(
      "Error fetching movies from KinoTickets Express provider:",
      error,
    );
  }
}

void testKinoTicketsExpressProvider();
