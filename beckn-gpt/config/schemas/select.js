export default {
    type: "object",
    properties: {
        order: {
            type: "object",
            description: "Describes a legal purchase order. It contains the complete details of the legal contract created between the buyer and the seller.",
            properties: {
                items:{
                    type: "array",
                    description: "The items purchased / availed in this order",
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
                }
            }
        }
    }
}