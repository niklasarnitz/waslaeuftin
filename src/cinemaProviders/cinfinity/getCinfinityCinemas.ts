const CINFINITY_GRAPHQL_ENDPOINT = "https://api.cinfinity.de/";

type CinfinityGraphQLResponse<T> = {
    data?: T;
    errors?: { message: string }[];
};

export type CinfinityCinema = {
    id: string;
    name: string | null;
    city: string | null;
    location: {
        latitude: number;
        longitude: number;
    } | null;
};

const CINFINITY_CINEMAS_QUERY = `
    query CinfinityCinemas {
        cinemas {
            id
            name
            city
            location {
                latitude
                longitude
            }
        }
    }
`;

export const queryCinfinity = async <T>(query: string, variables?: Record<string, unknown>) => {
    const response = await fetch(CINFINITY_GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables }),
    });

    const responseBody = await response.text();
    let payload: CinfinityGraphQLResponse<T>;

    try {
        payload = JSON.parse(responseBody) as CinfinityGraphQLResponse<T>;
    } catch {
        throw new Error(`Cinfinity GraphQL returned invalid JSON (${response.status}): ${responseBody}`);
    }

    if (!response.ok || payload.errors?.length) {
        const errors = payload.errors?.map((error) => error.message).join(", ") || responseBody;
        throw new Error(`Cinfinity GraphQL request failed (${response.status}): ${errors}`);
    }

    if (!payload.data) {
        throw new Error("Cinfinity GraphQL response did not include data");
    }

    return payload.data;
};

export const getCinfinityCinemas = async () => {
    const data = await queryCinfinity<{ cinemas: CinfinityCinema[] }>(CINFINITY_CINEMAS_QUERY);

    return data.cinemas.filter(
        (cinema): cinema is CinfinityCinema & { name: string; city: string } =>
            typeof cinema.name === "string" &&
            cinema.name.trim().length > 0 &&
            typeof cinema.city === "string" &&
            cinema.city.trim().length > 0,
    );
};
