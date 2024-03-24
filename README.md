# beckn-action-bot
This is an open source project that creates an action bot which can take plain text inputs and take beckn based actions based on them. 


## Instructions

1. The script runs both in local environment as well as docker containers. Its recommended to use docker containers for local development as well as testing
2. Test Driven Approach should be used for development. Write the test case first then write the code.

## Steps to setup

1. Copy `.env.sample` to `.env` and set your environment variables
2. To run the node server, run:

```
npm run dev # for debugging
npm run docker:dev # for docker
```

## Steps to run tests

To run test cases, run:

```
npm run test # run all test cases
npm run test:unit # to run  unit tests

# To run test cases inside docker-container
npm run docker:test
```

## Steps to run lint tests

We use eslint to check for linting errors. The rules for eslint are configured under `.eslint.json` file. Use the following command to run the eslint tests:

```
npm run lint

```

## Steps to prettify

We use prettier to prettify the code. Run the following command to prettify:

```
npm run prettify
```

If you want to change the prettier rules, edit the `.prettierrc.json` file

## Steps to deploy

```
# build
docker-compose build

# Biuld on mac m1
DOCKER_DEFAULT_PLATFORM=linux/amd64 docker-compose build

docker-compose push
```

On the server

```
docker-compose pull
docker-compose up -d
```
