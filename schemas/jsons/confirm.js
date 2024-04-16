export default {
    type: "object",
    properties: {
        order: {
            type: "object",
            description: "Describes a legal purchase order. It contains the complete details of the legal contract created between the buyer and the seller.",
            properties: {
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