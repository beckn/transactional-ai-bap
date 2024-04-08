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
    domain: {
        retail: {
            orders: {
                6:{
                    orderFulfillmentStatus: 'IN_PROGRESS',
                },
                5:{
                    orderFulfillmentStatus: 'IN_PROGRESS',
                },
                4:{
                    orderFulfillmentStatus: 'IN_PROGRESS',
                },
                3:{
                    orderFulfillmentStatus: 'IN_PROGRESS',
                },
                2:{
                    orderFulfillmentStatus: 'IN_PROGRESS',
                }
            },
        },
        hotel: {
            orders: {
                89:{
                    orderFulfillmentStatus: 'IN_PROGRESS',
                },
                88:{
                    orderFulfillmentStatus: 'IN_PROGRESS',
                },
                87:{
                    orderFulfillmentStatus: 'IN_PROGRESS',
                },
                86:{
                    orderFulfillmentStatus: 'IN_PROGRESS',
                },
                85:{
                    orderFulfillmentStatus: 'IN_PROGRESS',
                }
            },
        },
        tourism: {
            orders:{
                19:{
                    orderFulfillmentStatus: 'IN_PROGRESS',
                },
                18:{
                    orderFulfillmentStatus: 'IN_PROGRESS',
                },
                17:{
                    orderFulfillmentStatus: 'IN_PROGRESS',
                },
                16:{
                    orderFulfillmentStatus: 'IN_PROGRESS',
                },
                15:{
                    orderFulfillmentStatus: 'IN_PROGRESS',
                }
            },
        },
        energy: {
            orders: {
                34:{
                    orderFulfillmentStatus: 'IN_PROGRESS',
                },
                33:{
                    orderFulfillmentStatus: 'IN_PROGRESS',
                },
                32:{
                    orderFulfillmentStatus: 'IN_PROGRESS',
                },
                31:{
                    orderFulfillmentStatus: 'IN_PROGRESS',
                },
                30:{
                    orderFulfillmentStatus: 'IN_PROGRESS',
                }
            }
        }
    }
}


export const BECKN_STATUS_CALL =  {
        "context": {
            "domain": "",
            "location": {
                "country": {
                    "code": "DE"
                }
            },
            "action": "status",
            "version": "1.1.0",
            "bap_uri": "",
            "bap_id": "",
            "bpp_id": "",
            "bpp_uri": "",
            "timestamp": "2023-05-25T05:23:03.443Z",
            "ttl": "P30M"
        },
        "message": {
            "order_id": ""
        }
    }
