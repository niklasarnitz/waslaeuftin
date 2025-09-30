import { getKinoHeldMovies } from "../src/cinemaProviders/kinoheld/getKinoHeldMovies";

// Example KinoHeldCinemasMetadata object for testing
const testMetadata = {
  id: 1,
  centerId: "MjI2MDM4MA",
  centerShorty: "traumpalast-leonberg", // Replace with a real shorty if needed
  createdAt: new Date(),
  updatedAt: new Date(),
  Cinema: [],
};

async function testKinoHeldProvider() {
  const testCinemaId = 1001;

  try {
    const result = await getKinoHeldMovies(testCinemaId, testMetadata);
    console.log(`Movies for cinema ${testCinemaId}:`, result.movies);
    console.log(`Showings:`, result.showings);
  } catch (error) {
    console.error("Error fetching movies from KinoHeld provider:", error);
  }
}

void testKinoHeldProvider();
