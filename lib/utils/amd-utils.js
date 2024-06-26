const Emitter = require('events');
const {readFile} = require('fs');
const {
  AmdEvents,
  AvmdEvents
} = require('./constants');
const {VMD_HINTS_FILE} = require('../config');
let voicemailHints = [];

const updateHints = async(file, callback) => {
  readFile(file, 'utf8', (err, data) => {
    if (err) return callback(err);
    try {
      callback(null, JSON.parse(data));
    } catch (err) {
      callback(err);
    }
  });
};

if (VMD_HINTS_FILE) {
  updateHints(VMD_HINTS_FILE, (err, hints) => {
    if (err) {  console.error(err); }
    voicemailHints = hints;

    /* if successful, update the hints every hour */
    setInterval(() => {
      updateHints(VMD_HINTS_FILE, (err, hints) => {
        if (err) {  console.error(err); }
        voicemailHints = hints;
      });
    }, 60000);
  });
}

class Amd extends Emitter {
  constructor(logger, cs, opts) {
    super();
    this.logger = logger;
    this.vendor = opts.recognizer?.vendor || cs.speechRecognizerVendor;
    if ('default' === this.vendor) this.vendor = cs.speechRecognizerVendor;

    this.language = opts.recognizer?.language || cs.speechRecognizerLanguage;
    if ('default' === this.language) this.language = cs.speechRecognizerLanguage;

    this.thresholdWordCount = opts.thresholdWordCount || 9;
    const {normalizeTranscription} = require('./transcription-utils')(logger);
    this.normalizeTranscription = normalizeTranscription;
    const {getNuanceAccessToken, getIbmAccessToken} = cs.srf.locals.dbHelpers;
    this.getNuanceAccessToken = getNuanceAccessToken;
    this.getIbmAccessToken = getIbmAccessToken;
    const {setChannelVarsForStt} = require('./transcription-utils')(logger);
    this.setChannelVarsForStt = setChannelVarsForStt;

    const {
      noSpeechTimeoutMs = 5000,
      decisionTimeoutMs = 15000,
      toneTimeoutMs = 20000,
      greetingCompletionTimeoutMs = 2000
    } = opts.timers || {};
    this.noSpeechTimeoutMs = noSpeechTimeoutMs;
    this.decisionTimeoutMs = decisionTimeoutMs;
    this.toneTimeoutMs = toneTimeoutMs;
    this.greetingCompletionTimeoutMs = greetingCompletionTimeoutMs;

    this.beepDetected = false;
  }

  startDecisionTimer() {
    this.decisionTimer = setTimeout(this._onDecisionTimeout.bind(this), this.decisionTimeoutMs);
    this.noSpeechTimer = setTimeout(this._onNoSpeechTimeout.bind(this), this.noSpeechTimeoutMs);
    this.startToneTimer();
  }
  stopDecisionTimer() {
    this.decisionTimer && clearTimeout(this.decisionTimer);
  }
  stopNoSpeechTimer() {
    this.noSpeechTimer && clearTimeout(this.noSpeechTimer);
  }
  startToneTimer() {
    this.toneTimer = setTimeout(this._onToneTimeout.bind(this), this.toneTimeoutMs);
  }
  startGreetingCompletionTimer() {
    this.greetingCompletionTimer = setTimeout(
      this._onGreetingCompletionTimeout.bind(this),
      this.beepDetected ? 1000 : this.greetingCompletionTimeoutMs);
  }
  stopGreetingCompletionTimer() {
    this.greetingCompletionTimer && clearTimeout(this.greetingCompletionTimer);
  }
  restartGreetingCompletionTimer() {
    this.stopGreetingCompletionTimer();
    this.startGreetingCompletionTimer();
  }
  stopToneTimer() {
    this.toneTimer && clearTimeout(this.toneTimer);
  }
  stopAllTimers() {
    this.stopDecisionTimer();
    this.stopNoSpeechTimer();
    this.stopToneTimer();
    this.stopGreetingCompletionTimer();
  }
  _onDecisionTimeout() {
    this.emit(this.decision = AmdEvents.DecisionTimeout);
    this.stopNoSpeechTimer();
  }
  _onToneTimeout() {
    this.emit(AmdEvents.ToneTimeout);
  }
  _onNoSpeechTimeout() {
    this.emit(this.decision = AmdEvents.NoSpeechDetected);
    this.stopDecisionTimer();
  }
  _onGreetingCompletionTimeout() {
    this.emit(AmdEvents.MachineStoppedSpeaking);
  }

  evaluateTranscription(evt) {
    if (this.decision) {
      /* at this point we are only listening for the machine to stop speaking */
      if (this.decision === AmdEvents.MachineDetected) {
        this.restartGreetingCompletionTimer();
      }
      return;
    }
    this.stopNoSpeechTimer();

    this.logger.debug({evt}, 'Amd:evaluateTranscription - raw');
    const t = this.normalizeTranscription(evt, this.vendor, this.language);
    const hints = voicemailHints[this.language] || [];

    this.logger.debug({t}, 'Amd:evaluateTranscription - normalized');

    if (Array.isArray(t.alternatives) && t.alternatives.length > 0) {
      const wordCount = t.alternatives[0].transcript.split(' ').length;
      const final = t.is_final;

      const foundHint = hints.find((h) =>  t.alternatives[0].transcript.includes(h));
      if (foundHint) {
        /* we detected a common voice mail greeting */
        this.logger.debug(`Amd:evaluateTranscription: found hint ${foundHint}`);
        this.emit(this.decision = AmdEvents.MachineDetected, {
          reason: 'hint',
          hint: foundHint,
          language: t.language_code
        });
      }
      else if (final && wordCount < this.thresholdWordCount) {
        /* a short greeting is typically a human */
        this.emit(this.decision = AmdEvents.HumanDetected, {
          reason: 'short greeting',
          greeting: t.alternatives[0].transcript,
          language: t.language_code
        });
      }
      else if (wordCount >= this.thresholdWordCount) {
        /* a long greeting is typically a machine */
        this.emit(this.decision = AmdEvents.MachineDetected, {
          reason: 'long greeting',
          greeting: t.alternatives[0].transcript,
          language: t.language_code
        });
      }

      if (this.decision) {
        this.stopDecisionTimer();

        if (this.decision === AmdEvents.MachineDetected) {
          /* if we detected a machine, then wait for greeting to end */
          this.startGreetingCompletionTimer();
        }
      }
      return this.decision;
    }
  }
}

module.exports = (logger) => {
  const onBeep = (cs, ep, task, evt, fsEvent) => {
    stopAmd(ep, task);
    logger.debug({evt, fsEvent}, 'onBeep');
    const frequency = Math.floor(fsEvent.getHeader('Frequency'));
    const variance = Math.floor(fsEvent.getHeader('Frequency-variance'));
    task.emit('amd', {type: AmdEvents.ToneDetected, frequency, variance});
    if (ep.amd) {
      ep.amd.stopToneTimer();
      ep.amd.beepDetected = true;
    }
    ep.execute('avmd_stop').catch((err) => this.logger.info(err, 'Error stopping avmd'));
  };

  const startAmd = async(cs, ep, task, opts) => {
    const amd = ep.amd = new Amd(logger, cs, opts);

    amd.startDecisionTimer();

    ep.addCustomEventListener(AvmdEvents.Beep, onBeep.bind(null, cs, ep, task));
    ep.execute('avmd_start').catch((err) => this.logger.info(err, 'Error starting avmd'));
  };

  const stopAmd = (ep, task) => {
    if (ep.connected) {
      ep.execute('avmd_stop').catch((err) => this.logger.info(err, 'Error stopping avmd'));
    }
    ep.removeCustomEventListener(AvmdEvents.Beep);
  };

  return {startAmd, stopAmd};
};
