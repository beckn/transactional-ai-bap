export default {
    type: "object",
    properties: {
        action:{
            type:"string",
            description: "action that the user wants to perform. This should be one of th actions defined by supported actions. If its not one of the actions, its value should be null."
        },
        transaction_id:{
            type:"string",
            description: "Transaction id of the booking to be performed from the given list of bookings. It should not be set if th action is not from one of the bookings. It shold only be used when the action is 'search'"
        }
    }
}