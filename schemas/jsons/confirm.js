export default {
    type: "object",
    properties: {
        order: {
            type: "object",
            description: "Describes a legal purchase order. It contains the complete details of the legal contract created between the buyer and the seller.",
            properties: {
                items:{
                    type: "array",
                    description: "The items purchased / availed in this order as per the 'init' request payload.",
                    items: {
                        type: "object",
                        description: "'Describes a product or a service offered to the end consumer by the provider. In the mobility sector, it can represent a fare product like one way journey. In the logistics sector, it can represent the delivery service offering. In the retail domain it can represent a product like a grocery item.'",
                        properties: {
                            id: {
                                type: "string",
                                description: "ID of the item. In case of a select, this should be the id of item selected."
                            },
                            quantity: {
                                type: "object",
                                description: "The selling quantity of the item. In case of a select, this should be the quantity selected by the user.",
                                properties: {
                                    selected: {
                                        type: "object",
                                        description: "This represents the quantity selected for purchase of the item.",
                                        properties: {
                                            count: {
                                                type: "number",
                                                description: "The quantity selected for purchase."
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }                    
                },
                billing: {
                    description: "Billing details as per the 'init' request payload.",
                    type: "object",
                    properties: {
                        name: {
                            type: "string",
                            description: "Name of the billable entity"
                        },
                        email: {
                            type: "string",
                            description: "Email address where the bill is sent to"
                        },
                        phone: {
                            type: "string",
                            description: "Phone number of the billable entity"
                        }
                    },
                    required: ["name", "email", "phone"]
                },
                fulfillments: {
                    description: "The fulfillments involved in completing this order.",
                    type: "array",
                    items: {
                        type: "object",
                        description: "Describes how a an order will be rendered/fulfilled to the end-customer.",
                        properties: {
                            id: {
                                type: "string",
                                description: "Unique reference ID to the fulfillment of an order based on fulfillments provided in the init response."
                            },
                            customer: {
                                type: "object",
                                description: "The person that will ultimately receive the order",
                                properties: {
                                    person: {
                                        type: "object",
                                        description: " Describes a person as any individual ",
                                        properties: {
                                            name: {
                                                type: "string",
                                                description: "Name of the person"
                                            }
                                        },
                                        required: ["name"]
                                    },
                                    contact: {
                                        type: "object",
                                        description: "Describes the contact information of an entity",
                                        properties: {
                                            phone: {
                                                type: "string",
                                                description: "Phone number of the contact person"
                                            },
                                            email: {
                                                type: "string",
                                                description: "Email address of the contact person"
                                            }
                                        },
                                        required: ["phone", "email"]
                                    }
                                },
                                required: ["person", "contact"]
                            }
                        },
                        required: ["customer"]
                    }
                }
            },
            required: ["items", "billing", "fulfillments"]
        }
    }
}