import { gql } from "@apollo/client";

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
`;
