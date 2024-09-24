export default {
    type: "object",
    properties: {
        intent: {
            type: "object",
            description: "The intent to buy a product or avail a service.",
            properties:{
                item: { 
                    type: "object",
                    description: "The product or service that the user wants to buy or avail.",
                    properties: {
                        descriptor: {
                            type: "object",
                            properties: {
                                name: {
                                    type: "string",
                                    description: "shortest search keyword for the item to be searched. For e.g. if someone is looking for tickets for yellowstone national park, search 'tickets'"
                                }
                            }
                        },
                        tags: {
                            type: "array",
                            description: "List of tags that the user wants to search by. This should be defined by the network policy",
                            items: {
                                type: "object",
                                properties: {
                                    list: {
                                        type: "array",
                                        description: "List of tags",
                                        items: {
                                            type: "object",
                                            properties: {
                                                descriptor: {
                                                    type: "object",
                                                    properties: {
                                                        code: {
                                                            type: "string",
                                                            description: "code of the tag"
                                                        }
                                                    }
                                                },
                                                value: {
                                                    type: "string",
                                                    description: "value of the tag"
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        
                        }
                    }
                },
                fulfillment:{
                    type: "object",
                    description: "The fulfillment details of the item",
                    properties: {
                        stops: {
                            type: "array",
                            description: "List of stops",
                            items: {
                                type: "object",
                                properties: {
                                    location: {
                                        type: "object",
                                        properties: {
                                            gps: {
                                                type: "string",
                                                description: "Describes a GPS coordinate.",
                                                pattern: '^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$'
                                            },
                                            polygon: {
                                                type: "string",
                                                description: "This describes the route on which the item needs to be searched. This should be used if the instruction is to search along a route and there is a selelected route in user profile."
                                            }
                                        },
                                        required: []
                                    },
                                    time: {
                                        type: "object",
                                        properties: {
                                            timestamp: {
                                                type: "string",
                                                description: "Time of the stop",
                                                format: 'date-time'
                                            }
                                        },
                                        required: ['timestamp']
                                    },
                                    type:{
                                        type: "string",
                                        description: "The type of stop. Allowed values of this property can be defined by the network policy.",
                                    }                                    
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}