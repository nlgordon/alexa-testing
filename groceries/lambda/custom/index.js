/* eslint-disable  func-names */
/* eslint-disable  no-console */

const Alexa = require('ask-sdk-core');
const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const uuid = require('uuid/v4');
const tableName = "GroceriesList";

function generateSimpleResponse(handlerInput, speechText) {
    return handlerInput.responseBuilder
        .speak(speechText)
        .withSimpleCard('Groceries', speechText)
        .getResponse();
}

const AddItemIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AddItemIntent';
  },
  async handle(handlerInput) {
    console.log('handlerInput: ', JSON.stringify(handlerInput));
    try {
        // const name = await handlerInput.serviceClientFactory.getUpsServiceClient().getProfileName();
        // console.log(`Name is: ${name}`);

        const item = {
            TableName: tableName,
            Item: {
                UserId: handlerInput.requestEnvelope.session.user.userId,
                ListItemId: uuid(),
                Item: handlerInput.requestEnvelope.request.intent.slots.Item.value
            }
        };

        return await dynamodb.put(item).promise().then(data => {
            return generateSimpleResponse(handlerInput, `added ${handlerInput.requestEnvelope.request.intent.slots.Item.value} to your cart`);
        }).catch(err => {
          console.log("Error saving to dynamo: ", err);
            return generateSimpleResponse(handlerInput, "Unable to add item to cart, please try again");
        });
    } catch (error) {
      console.log('error: ', error);
      if (error.statusCode == 403) {
        return handlerInput.responseBuilder
            .speak("Please enable profile permissions in the Amazon Alexa App")
            .withAskForPermissionsConsentCard([
                "alexa::profile:name:read",
                "alexa::profile:email:read",
                "alexa::profile:mobile_number:read",
                "alexa::devices:all:address:full:read"
            ])
            .getResponse();
      } else {
          return generateSimpleResponse(handlerInput, "Unknown error occurred");
      }
    }
  },
};

const PlaceOrderHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'PlaceOrderIntent';
    },
    async handle(handlerInput) {
        const userId = handlerInput.requestEnvelope.session.user.userId;
        const queryParams = {
            TableName: tableName,
            KeyConditionExpression: "#u = :id",
            ExpressionAttributeNames: {
                "#u": "UserId"
            },
            ExpressionAttributeValues: {
                ":id": userId
            }
        };

        console.log("Placing order");

        return await dynamodb.query(queryParams).promise().then(data => {
            const batchWrite = {
                RequestItems: {
                    [tableName]: data.Items.map(item => {
                        return {
                            DeleteRequest: {
                                Key: {
                                    "UserId": userId,
                                    "ListItemId": item.ListItemId
                                }
                            }
                        }
                    })
                }
            };
            return dynamodb.batchWrite(batchWrite).promise().then(data => {
                return generateSimpleResponse(handlerInput, "Order Placed");
            })
        }).catch(error => {
            console.error(error);
            return generateSimpleResponse(handlerInput, "Unable to place order at this time, please try again later");
        });
    }
};

const ClearCartHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'ClearCartIntent';
    },
    async handle(handlerInput) {
        const userId = handlerInput.requestEnvelope.session.user.userId;
        const queryParams = {
            TableName: tableName,
            KeyConditionExpression: "#u = :id",
            ExpressionAttributeNames: {
                "#u": "UserId"
            },
            ExpressionAttributeValues: {
                ":id": userId
            }
        };

        console.log("Clearing Cart");

        return await dynamodb.query(queryParams).promise().then(data => {
            const batchWrite = {
                RequestItems: {
                    [tableName]: data.Items.map(item => {
                        return {
                            DeleteRequest: {
                                Key: {
                                    "UserId": userId,
                                    "ListItemId": item.ListItemId
                                }
                            }
                        }
                    })
                }
            };
            return dynamodb.batchWrite(batchWrite).promise().then(data => {
                return generateSimpleResponse(handlerInput, "Cart Cleared");
            })
        }).catch(error => {
            console.error(error);
            return generateSimpleResponse(handlerInput, "Unable to clear cart at this time, please try again later");
        });
    }
};

const CartContentsHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'CartContentsIntent';
    },
    async handle(handlerInput) {
        const userId = handlerInput.requestEnvelope.session.user.userId;
        const queryParams = {
            TableName: tableName,
            KeyConditionExpression: "#u = :id",
            ExpressionAttributeNames: {
                "#u": "UserId"
            },
            ExpressionAttributeValues: {
                ":id": userId
            }
        };

        console.log("Getting Cart Contents");

        return await dynamodb.query(queryParams).promise().then(data => {
            const items = data.Items.map(item => { return item.Item }).join(', ');
            if (items) {
                return generateSimpleResponse(handlerInput, `your cart contains ${items}`);
            }
            return generateSimpleResponse(handlerInput, "Cart is empty");
        }).catch(error => {
            console.error(error);
            return generateSimpleResponse(handlerInput, "Unable to get cart contents at this time, please try again later");
        });
    }
};

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speechText = 'Welcome to groceries, you can add items to your cart!';

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .withSimpleCard('Groceries', speechText)
            .getResponse();
    },
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const speechText = 'You can add items to your grocery cart!';

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard('Groceries', speechText)
      .getResponse();
  },
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
        || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
      return generateSimpleResponse(handlerInput, 'Goodbye!');
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak('Sorry, I can\'t understand the command. Please say again.')
      .reprompt('Sorry, I can\'t understand the command. Please say again.')
      .getResponse();
  },
};

const skillBuilder = Alexa.SkillBuilders.custom();

exports.handler = skillBuilder
  .addRequestHandlers(
    AddItemIntentHandler,
    PlaceOrderHandler,
    ClearCartHandler,
    CartContentsHandler,
    LaunchRequestHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
    .withApiClient(new Alexa.DefaultApiClient())
  .lambda();
