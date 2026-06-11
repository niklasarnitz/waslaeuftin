import type { TypedDocumentNode } from "@apollo/client";
import { gql } from "@apollo/client";

import type { KinoHeldCinemasResponse } from "@waslaeuftin/cinema-providers/internal/providers/kinoheld/KinoHeldCinemasResponse";

interface FetchCinemasVariables {
  first: number;
  page: number;
}

export const FETCH_CINEMAS = gql`
  query fetchCinemas($first: Int, $page: Int) {
    cinemas(first: $first, page: $page) {
      paginatorInfo {
        count
        currentPage
        firstItem
        hasMorePages
        lastItem
        lastPage
        perPage
        total
      }
      data {
        id
        name
        street
        url
        urlSlug
        longitude
        latitude
        portal
        phonenumber
        hasConcessions
        hasCustomercards
        isCustomerCardChargingEnabled
        isShopEnabled
        isReservationsEnabled
        isClosed
        isOpenAir
        isDriveIn
        isStationary
        isHidden
        isVoucherBuyEnabled
        isBookable
        bookingType
        hasOfflineVouchers
        heroImageAlignment
        seoText
        cid
        fbPixelId
        offersBirthdayEventBookings
        cancellationPriorBeginning
        rating
        auditoriumCount
        seatCount
        bookingFee
        created
        modified
        distance
        acardoId
        faq
        shortFaq
        city {
          id
          name
          latitude
          longitude
          distance
          urlSlug
          timezone
        }
      }
    }
  }
` as TypedDocumentNode<KinoHeldCinemasResponse, FetchCinemasVariables>;
