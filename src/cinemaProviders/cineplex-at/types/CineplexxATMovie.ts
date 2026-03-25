export interface CineplexxATMovie {
    id: string
    HOFilmCode: string
    corporateFilmId: string
    posterImage: string
    title: string
    titleAlt: any
    titleCalculated: string
    titleOriginalCalculated: string
    trailers: Trailer[]
    director?: string
    directors: string[]
    actors?: string[]
    startDate: string
    openingDate: string
    genres: string[]
    genreId: string
    comingSoon: boolean
    isScheduledAtCinema: any
    rating: string
    ratingDescription: string
    allStateRatings?: string
    ratingAlt: any
    runTime: number
    avgRating: any
    nrOfRating: any
    gallery: string[]
    teachingMaterials: TeachingMaterial[]
    cinemaIds: string[]
    technologies: any[]
    isInWatchlist: any
    ratingGetmesh?: string
    ratingGetmeshEn?: string
    originLangCMS?: string
    availableTechCMS: AvailableTechCms[]
    availableVersCMS: AvailableVersCms[]
    movieStartCMS?: string
    movieCountryCMS?: string[]
    keywords: any[]
    Sortierung: any
    Filmtipp?: boolean
    distributorName: string
    shortURL?: string
    EUYouthLogo: any
    synopsis: string
    shortSynopsis: string
    descriptionCalculated?: string
    descriptionShortCalculated: string
    scheduledMovies: ScheduledMovy[]
    sessions: Session[]
}

export interface Trailer {
    trailerKey: string
    keyframeUrl: string
    videoUrl: string
    iosUrl: string
    androidUrl: string
    universalPlayerUrl: string
}

export interface TeachingMaterial {
    fullpath: string
    value: string
}

export interface AvailableTechCms {
    id: string
    Description: string
    DescriptionEN: string
}

export interface AvailableVersCms {
    id: string
    Description: string
    DescriptionEN: string
}

export interface ScheduledMovy {
    id: string
    corporateId: any
    cinemaId: any
    ageRating: any
    title: any
}

export interface Session {
    id: string
    salesChannels: string
    cinemaId: string
    movieId: string
    sessionId: string
    cinemaName: string
    screenName: string
    screenNumber: number
    technologies: string[][]
    showtime: string
    isAllocatedSeating: boolean
    status: string
    restrictions: Restrictions
    cinemaIsFavorite: boolean
    conceptAttributesNames: string | undefined[]
    isUnderAbo: boolean
}

export interface Restrictions {
    id: string
    allowedGiftCardNumber: string
    isAllowGiftCardNumber: boolean
    activateCurrencyTwo: boolean
    allowBookingSplitting: boolean
    boughtTicketTTL: number
    blackStatusCount: number
    currencyCodeOne: any
    currencyCodeTwo: any
    currencyConversionFactor: any
    greySessionTTL: number
    maxBonusCardTickets: number
    maxReservedBonusTickets: number
    maxReservedTickets: number
    maxTickets: number
    orderPaymentTTL: number
    orderTTL: number
    pickupTimeLimit: number
    pickupTimeLimitVip: number
    purchaseTicketsScreenPopupText: string
    redSessionTTL: number
    refundTimespan: number
    retryTimeout: number
    showPopupOnPurchaseTicketsScreen: boolean
    timeout: number
    yellowSeatsAvailablePercent: number
    yellowSessionTTL: number
}
