export default {
    type: "object",
    properties: {
        order: {
            type: "object",
            description: "Describes a legal purchase order. It contains the complete details of the legal contract created between the buyer and the seller.",
            properties: {
                billing: {
                    description: "Describes the billing details of an entity.<br>This has properties like name,organization,address,email,phone,time,tax_number, created_at,updated_at",
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
                }
            },
            required: ["items", "billing"]
        }
    }
}