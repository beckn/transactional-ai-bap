## Description
`beckn-action-bot` is an open-source project built on Node.js, integrating OpenAI and the Beckn protocol to enable economic transactions across the Beckn open network using simple text inputs from users.

The primary objective of this AI assistant is to facilitate daily tasks such as ordering food, booking taxis, finding and navigating routes, scheduling appointments, and purchasing groceries, among others.

Key Features:
1. Functions as a traditional chatbot by answering questions using GPT-3.5.
2. Executes transactions on the Beckn open network.
3. Retrieves routes from Google Maps and searches for items en route.
4. Provides integration with WhatsApp and custom GPT models.
5. Compatible with various chat interfaces.

## How it works?

[Simple booking using whatsapp](https://github-production-user-asset-6210df.s3.amazonaws.com/4734717/323161316-15011025-e7e0-4395-af4a-4525c2626cbd.mp4?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAVCODYLSA53PQK4ZA%2F20240417%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20240417T142821Z&X-Amz-Expires=300&X-Amz-Signature=310e9271d842dee075fb7ae5b81db869bfe1f302d58251be82ed4ac23edf3b22&X-Amz-SignedHeaders=host&actor_id=4734717&key_id=0&repo_id=776644490)

[Searching along a route](https://github-production-user-asset-6210df.s3.amazonaws.com/4734717/323161620-2e5a4da7-fc10-4308-9678-9d6bfa7e3ee7.mp4?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAVCODYLSA53PQK4ZA%2F20240417%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20240417T144741Z&X-Amz-Expires=300&X-Amz-Signature=713eead793bafb69dc798aca76a8edc8240f6c04517c973aabbaca449a983d7b&X-Amz-SignedHeaders=host&actor_id=4734717&key_id=0&repo_id=776644490)


## Installation

```
git clone https://github.com/beckn/beckn-action-bot
cd beckn-action-bot
npm i
```


## Pre-requisites
1. **OpenAI access token** : Obtain an open AI access token to use open AI LLMs. [Here](https://platform.openai.com/docs/quickstart/account-setup) is a quick guide on how to do this.

2. **Twilio access token** : The project uses twilio to send and receive messages from Whatsapp. You can skip this step if you plan to use the project in API only mode. You can read more about Twilio access token [here](https://www.twilio.com/docs/iam/access-tokens).

3. **Google maps API key** :The project uses Google maps for fetching route polylines. You will need the Google maps API key if you plan to use it



## Usage

1. Copy `.env.sample` to `.env` and set your environment variables. This is the step where you will need to set your access tokens as mentioned in the step above. 

2. To run the node server, run:

```
npm run dev # for debugging
npm run docker:dev # for docker
```

### Steps to run tests

To run test cases, run:

```
npm run test # run all test cases
npm run test:unit # to run  unit tests

# To run test cases inside docker-container
npm run docker:test
```

### Steps to run lint tests

We use eslint to check for linting errors. The rules for eslint are configured under `.eslint.json` file. Use the following command to run the eslint tests:

```
npm run lint

```

### Steps to prettify

We use prettier to prettify the code. Run the following command to prettify:

```
npm run prettify
```

If you want to change the prettier rules, edit the `.prettierrc.json` file

## Contributing
This is an open source project and everyone is welcome to chime in. Here is how you can contribute:

1. Checkout the list of open issues [here](https://github.com/beckn/beckn-action-bot/issues), and select the one that you are intersted in
2. If you have any idea, suggestion or you discover an issue, create a discussion for it [here](https://github.com/beckn/beckn-action-bot/discussions) 
3. To raise a PR: Fork the project
   1. Create your feature branch (git checkout -b feature/amazing-feature)
   2. Commit your changes (git commit -am 'Add some amazing feature')
   3. Push to the branch (git push origin feature/amazing-feature)
   4. Open a Pull Request
4. Best practices:
   1. Follow the code structure 
   2. Use test driven development 
   3. Describe your PRs or issues in detail for the developers to understand. There are PR templates and issue templates configured in the project which can be used for understanding the structure.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details

## Support
For support, join our [Discord channel](https://bit.ly/bocWebInvite) or open an issue.


