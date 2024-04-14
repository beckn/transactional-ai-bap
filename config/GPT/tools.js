export const TOOLS = [
    {
        type: "function",
        function: {
            name: "get_routes",
            description: "This function should only be used if the user specifically asks to get routes between a source and destination using google maps.", 
            parameters: {
                type: "object",
                properties: {
                    source:{
                        type:"string",
                        description: "Source location in the format 'latitude,longitude' or 'text' from which route is to be fetched"
                    },
                    destination:{
                        type:"string",
                        description: "Destination location in the format 'latitude,longitude' or 'text' to which route is to be fetched"
                    }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "perform_beckn_action",
            description: "If the user is trying to search a product, select an item or add to cart, initialize an order or confirm on order.", 
            parameters: {
                type: "object",
                properties: {
                    action : {
                        type: "string",
                        description: "Action for which payload is to be fetched",
                        enum: ["search", "select", "init", "confirm"]
                    },
                    instruction: {
                        type: "string",
                        description: "Complete instructions about the action to be performed."
                    }
                }
            }
        }
    }
];