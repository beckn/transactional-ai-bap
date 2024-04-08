export const ITEM_ID = '4'
export const ITEM_NAME = 'Ticket Pass-Mueseum'

export const CAT_ATTR_TAG_RELATIONS = [2, 3, 4, 5]
export const TRIGGER_BLIZZARD_MESSAGE = 'Hey, Triggering a Blizzard'
export const CANCEL_BOOKING_MESSAGE = `Dear Guest,\n\nApologies, but your hotel booking with us has been canceled due to unforeseen circumstances. \nWe understand the inconvenience and are here to assist you with any alternative arrangements needed. \n\nPlease contact us for further assistance.`
export const NEW_CATALOG_AVAILABLE = `Dear Guest,\n\n Checkout this new place to visit.`
export const TOURISM_STRAPI_URL = 'https://mit-bpp-tourism.becknprotocol.io/api'
export const HOTEL_STRAPI_URL = 'https://mit-bpp-hotel.becknprotocol.io/api'
export const ENERGY_STRAPI_URL = 'https://mit-bpp-energy.becknprotocol.io/api'
export const RETAIL_STRAPI_URL = 'https://mit-bpp-retail.becknprotocol.io/api'
export const DOMAINS = {
    RETAIL: 'retail',
    HOTEL: 'hotel',
    ENERGY: 'energy',
    TOURISM: 'tourism',
}
export const UPDATE_STATUS_MESSAGE = {
    RETAIL: 'order-picked-up',
    HOTEL: 'checkn-in',
    ENERGY: 'charging-started',
    TOURISM: 'ticket-purchased',
}
export const ORDER_DETAILS = {
    domain: [
        {retail: {
            orders: [
                {
                    orderId: '6',
                    orderFulfillmentStatus: '',
                },
                {
                    orderId: '5',
                    orderFulfillmentStatus: '',
                },
                {
                    orderId: '4',
                    orderFulfillmentStatus: '',
                },
                {
                    orderId: '3',
                    orderFulfillmentStatus: '',
                },
                {
                    orderId: '2',
                    orderFulfillmentStatus: '',
                },
            ],
        }},
        {hotel: {
            orders: [
                {
                    orderId: '84',
                    orderFulfillmentStatus: '',
                },
                {
                    orderId: '85',
                    orderFulfillmentStatus: '',
                },
                {
                    orderId: '86',
                    orderFulfillmentStatus: '',
                },
                {
                    orderId: '87',
                    orderFulfillmentStatus: '',
                },
                {
                    orderId: '88',
                    orderFulfillmentStatus: '',
                },
            ],
        }},
        {tourism: {
            orders: [
                {
                    orderId: '19',
                    orderFulfillmentStatus: '',
                },
                {
                    orderId: '18',
                    orderFulfillmentStatus: '',
                },
                {
                    orderId: '17',
                    orderFulfillmentStatus: '',
                },
                {
                    orderId: '16',
                    orderFulfillmentStatus: '',
                },
                {
                    orderId: '15',
                    orderFulfillmentStatus: '',
                },
            ],
        }},
        {energy: {
            orders: [
                {
                    orderId: '27',
                    orderFulfillmentStatus: '',
                },
                {
                    orderId: '28',
                    orderFulfillmentStatus: '',
                },
                {
                    orderId: '29',
                    orderFulfillmentStatus: '',
                },
                {
                    orderId: '30',
                    orderFulfillmentStatus: '',
                },
                {
                    orderId: '31',
                    orderFulfillmentStatus: '',
                },
            ],
        }}
    ]
}
