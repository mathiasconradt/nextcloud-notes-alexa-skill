
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
          'Authorization': 'Basic YWRtaW46YWRtaW4=', // TODO adjust the Basic Authentication credentials here. Note: hard-coding them here is definitely NOT best-practice though!
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