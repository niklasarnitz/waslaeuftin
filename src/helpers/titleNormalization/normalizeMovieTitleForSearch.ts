import { normalizeMovieTitle } from "./normalizeMovieTitle";


export const normalizeMovieTitleForSearch = (title: string) => {
    return normalizeMovieTitle(title).baseTitle;
};
