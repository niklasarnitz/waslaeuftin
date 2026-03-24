import { normalizeMovieTitle } from "./src/helpers/movieTitleNormalizer";

const TITLES = [
  "The Matrix (OV)",
  "The Matrix 3D",
  "The Matrix (3D/OV)",
  "Inception - Original Version",
  "Avatar 2 (3D/HFR/Dolby Atmos)",
  "Spider-Man: No Way Home (IMAX)",
  "Dune: Part Two (70mm)",
  "Oppenheimer (35mm)",
  "Everything Everywhere All at Once (OmU)",
  "The Batman (4K)",
  "Top Gun: Maverick (ScreenX)",
  "Mission: Impossible - Dead Reckoning Part One (4DX)",
  "John Wick: Chapter 4 (Laser)",
  "Blade Runner 2049 (Preview)",
  "Mad Max: Fury Road (Sneak)",
  "The Dark Knight (English)",
  "Interstellar (Dt. Fassung)",
  "Gladiator (Deutsche Fassung)",
  "The Lord of the Rings: The Return of the King (Originalfassung)",
  "Star Wars: Episode V - The Empire Strikes Back (Untertitel)",
  "Pulp Fiction (FSK 16)",
  "Fight Club (FSK 18)",
  "The Shawshank Redemption",
  "Forrest Gump",
  "The Godfather",
];

const start = performance.now();
for (let i = 0; i < 100000; i++) {
  for (const title of TITLES) {
    normalizeMovieTitle(title);
  }
}
const end = performance.now();

console.log(`Time taken: ${end - start} ms`);
