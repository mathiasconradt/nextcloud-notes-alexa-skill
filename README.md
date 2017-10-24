# Nextcloud Notes Alexa Skill

![![aws-lambda-function-code.png](img/aws-lambda-function-code.png)](img/alexa.jpg)

This skill has three **intents**:
* **about**: gives an introduction to the skill / Nextcloud Notes.
* **read notes**: reads out all of your notes in Nextcloud.
* **take a note**: take a new note and stores it in Nextcloud.

**The following should be noted:**

* This skill is just a quick & dirty code result of an Amazon Skills workshop I participated in, because I was curious about the status, possibilities and limitations of Alexa. It is not intended to be used in production.

* in this example, you put your Nextcloud password hard-coded (though encoded as basic auth header) into the Lamda function. I use https://www.blitter.se/utils/basic-authentication-header-generator/ for that. It's not the recommended way. In a real production skill / service, you should use "account linking" together with OAuth.

* the Nextcloud endpoint / url is currently hard-coded as well.

* personally I don't own an Amazon Echo and don't plan to do so, because I don't like a device like this sitting in my living room, even though not everything you say goes into the cloud. I just don't see the benefit of it yet (at it's current status). At the moment, it's just a nice toy to play around with.
If I'd do, I'd rather go with the open source variant Mycroft AI (https://mycroft.ai/), of which I hope that it will evolve and become better and better. At the time of writing, it's not yet as fast and accurate as Google Home, Alexa, etc. but on the other hand, it's open source and independently developed via a small startup and took off via a kickstarter campaign. Maybe I will have time to develop a Nextcloud Notes skill for Mycroft as well.


## Backend: Lambda function

### Setup

* create an **AWS account** https://aws.amazon.com
* go to **AWS Management Console** at https://console.aws.amazon.com/console/home
* select a **location**, i.e. Ireland (EU), but any (most) other will do - just make sure that Amazon Skills Set is available there, because it's not available in all regions yet.
* search for **Lambda** in the AWS management console and select it
* click the **'Create function'** button in the upper right
* filter blueprints and select `alexa-skill-kit-sdk-factskill`

![aws-services-lambda.png](img/aws-services-lambda.png)

![aws-lambda-functions.png](img/aws-lambda-functions.png)

![aws-lambda-blueprints.png](img/aws-lambda-blueprints.png)


### Basic Information

* **Name**: `nextcloudNotes`
* **Role**: if you don't have it yet, create a new default role, which will automatically be `lambda_basic_execution`
* leave the code as is, you will edit it later (right now, it's not even editable)
* click **"create function"** button
* after saving, copy/paste and note down the **ARN** somewhere, i.e. in my case `arn:aws:lambda:eu-west-1:992674152027:function:nextcloudNotes` (**adjust it to your own ARN !**)

![aws-lambda-function-code.png](img/aws-lambda-function-code.png)

###  Configuration

![aws-lambda-function-code.png](img/aws-lambda-function-code.png)

* copy/paste the **source code** as below (or from [src/nextcloud-notes-lambda-function.js](src/nextcloud-notes-lambda-function.js)) into the function source textarea

    ```javascript

    // 1. Text strings =====================================================================================================
    //    Modify these strings and messages to change the behavior of your Lambda function

    const languageStrings = {
        'en': {
            'translation': {
                'WELCOME' : "Welcome to Nextcloud Notes!",
                'HELP'    : "Say read my notes to hear all your notes or say take a note to let Alexa take a new note in Nextcloud for you. ",
                'ABOUT'   : "Nextcloud Notes allows you to take notes and keep them safe and private.",
                'STOP'    : "Okay, see you next time!"
            }
        }
    };

    const SKILL_NAME = "Nextcloud Notes";

    // 2. Skill Code =======================================================================================================

    const Alexa = require('alexa-sdk');

    exports.handler = function(event, context, callback) {
        var alexa = Alexa.handler(event, context);
        alexa.resources = languageStrings;
        alexa.registerHandlers(handlers);
        alexa.execute();
    };

    const handlers = {
        'LaunchRequest': function () {
            var say = this.t('WELCOME') + ' ' + this.t('HELP');
            this.response.speak(say).listen(say);
            this.emit(':responseReady');
        },

        'AboutIntent': function () {
            this.response.speak(this.t('ABOUT'));
            this.emit(':responseReady');
        },

        'CreateNoteIntent': function () {
            var noteToTake = '';
            if (this.event.request.intent.slots.content.value) {
                noteToTake = this.event.request.intent.slots.content.value;
            }
            createNote(noteToTake, ( content ) => {
                var say = content;
                this.response.speak(say);
                this.emit(':responseReady');
            });
        },

        'GetNotesIntent': function () {
            getNotes( ( content ) => {
                var say = content;
                this.response.speak(say);
                this.emit(':responseReady');
            });
        },

        'AMAZON.YesIntent': function () {
            this.response.speak(this.t('ABOUT'));
            this.emit(':responseReady');
        },
        'AMAZON.NoIntent': function () {
            this.emit('AMAZON.StopIntent');
        },
        'AMAZON.HelpIntent': function () {
            this.response.speak(this.t('HELP')).listen(this.t('HELP'));
            this.emit(':responseReady');
        },
        'AMAZON.CancelIntent': function () {
            this.response.speak(this.t('STOP'));
            this.emit(':responseReady');
        },
        'AMAZON.StopIntent': function () {
            this.emit('SessionEndedRequest');
        },
        'SessionEndedRequest': function () {
            this.response.speak(this.t('STOP'));
            this.emit(':responseReady');
        }

    };

    //    END of Intent Handlers {} ========================================================================================
    // 3. Helper Function  =================================================================================================

    function createNote(note, callback) {

      var http = require('http');
      var fs = require('fs');

      // Build the post string from an object
      var post_data = JSON.stringify({content: note});

      // An object of options to indicate where to post to
      var post_options = {
          host: 'www.mynextcloud.com',
          port: '80', // or better: 443 if you use https
          path: '/index.php/apps/notes/api/v0.2/notes',
          method: 'POST',
          headers: {
              'Authorization': 'Basic YWRtaW46YWRtaW4=', // TODO adjust the Basic Auth credentials here. Note: hard-coding them here is definitely NOT best-practice though!
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Content-Length': Buffer.byteLength(post_data)
          }
      };

      // Set up the request
      var post_req = http.request(post_options, function(res) {
          res.setEncoding('utf8');
          // TODO MC one of these listeners is not needed.
          res.on('data', function (chunk) {
              callback('Note creation successful.');
          });
          res.on('end', function (chunk) {
              callback('Note creation successful.');
          });
          res.on('error', function (chunk) {
              callback('Note creation failed.');
          });
      });

      // post the data
      post_req.write(post_data);
      post_req.end();
    }

    function getNotes(callback) {
        var http = require('http');
        // TODO adjust the Basic Auth credentials here. Note: hard-coding them here is definitely NOT best-practice though!
        var req = http.request("http://admin:admin@www.mynextcloud.com/index.php/apps/notes/api/v0.2/notes", res => {
            res.setEncoding('utf8');
            var returnData = "";
            res.on('data', chunk => {
                returnData = returnData + chunk;
            });
            res.on('end', () => {
                var noteObj = JSON.parse(returnData);
                var content = '';
                for (var i=0; i<noteObj.length; i++) {
                    content += 'Note ' + (i+1) + ': ' + noteObj[i].content + '.';
                }
                callback(content);
            });
        });
        req.end();
    }
    ```

* adjust `Nextcloud endpoint URL` and `username` / `password`. I use https://www.blitter.se/utils/basic-authentication-header-generator/ for that.
* click the `save` button

###  Triggers

On the triggers tab, select Alexa:

* Click on `+ Add trigger`
* click on the empty icon
* select `Alexa Skills Set` and submit

You're done with the backend.


##  Frontend: Skill configuration

### Setup

* create an **Amazon developer account** at https://developer.amazon.com
https://developer.amazon.com/edw/home.html
* Select `Alexa` tab
* Select `Alexa Skills Set`
* Click `Add a new skill`

![dev-alexa.png](img/dev-alexa.png)

![dev-alexa-skills.png](img/dev-alexa-skills.png)

For the skill you are going to create, set the following configuration:

### Skill Information

![skill-information.png](img/skill-information.png)

* **Skill type**: Custom
* **Select Language**: English (U.S.)
* **Name**: Nextcloud
* **Invocation Name**: nextcloud

### Interaction model

![skill-interaction-model.png](img/skill-interaction-model.png)

    Copy/paste below JSON (or from [src/nextcloud-notes-interaction-model.json](src/nextcloud-notes-interaction-model.json)) and save, then build.

    ```javascript
    {
      "intents": [
        {
          "name": "AboutIntent",
          "samples": [
            "about"
          ],
          "slots": []
        },
        {
          "name": "AMAZON.CancelIntent",
          "samples": []
        },
        {
          "name": "AMAZON.HelpIntent",
          "samples": []
        },
        {
          "name": "AMAZON.StopIntent",
          "samples": []
        },
        {
          "name": "CreateNoteIntent",
          "samples": [
            "take a note {content}",
            "create a note {content}",
            "create a new note {content}",
            "take a new note {content}"
          ],
          "slots": [
            {
              "name": "content",
              "type": "AMAZON.Actor",
              "samples": []
            }
          ]
        },
        {
          "name": "GetNotesIntent",
          "samples": [
            "read my notes",
            "read all notes",
            "get my notes",
            "get all notes"
          ],
          "slots": []
        }
      ]
    }
    ```

* Leave the rest as default

### Configuration

![skill-configuration.png](img/skill-configuration.png)

* **Service Endpoint Type**: AWS Lambda ARN
    * enter the **ARN** from the backend / AWS lambda function that you noted down earlier


* Leave the rest as default:

    * **Provide geographical region endpoints?** `no`
    * **Accounting linking**: `no`

## Test your skill

First, you can test your new skill in the `Test` section of the skill page by typing a command ("utterance"), which is what you would usually speak to Alexa. You could enter something like *read my notes*. You don't need to enter *"Alexa, ask Nextcloud..."* here, but only the intent.

![skill-test.png](img/skill-test.png)

![skill-test-2.png](img/skill-test-2.png)


A better way to test with real voice is to use **EchoSim** http://echosim.io/: login with your Amazon Developer Account and **test**, for example:

*"Alexa, ask Nextcloud to read my notes."*

*"Alexa, ask Nextcloud to take a note: Buy milk"*
