export type CineplexxATCinema = {
    id: string
    name: string
    cinemaUrlName: string
    image: string
    phoneNumber: string
    address1: string
    /// [PLZ] CityName
    address2: string
    city?: string
    parkingInfo: string
    arrivalInfo: string
    loyaltyCode: string
    description: any
    publicTransport: string
    workingHours: string
    geo: CineplexxATCinemaGeo
    hint: string
    favorite: boolean
    gallery: string[]
    social: CineplexxATCinemaSocial[]
    isDriveInCinema: boolean
    linkedHallInfo: number
    linkedPricelist: number
    freeparking?: string
    freeparkingEN?: string
    concessionsale: boolean
}

export type CineplexxATCinemaGeo = {
    latitude: number
    longitude: number
}

export type CineplexxATCinemaSocial = {
    title: string
    url: string
}
