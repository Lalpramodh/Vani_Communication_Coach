document.addEventListener("DOMContentLoaded", function () {
    const app = window.VaniApp;
    const METRIC_ORDER = ["clarity", "grammar", "confidence", "professionalism", "vocabulary"];
    const METRIC_META = {
        clarity: { icon: "fa-bullseye", label: "Clarity" },
        grammar: { icon: "fa-spell-check", label: "Grammar" },
        confidence: { icon: "fa-shield-halved", label: "Confidence" },
        professionalism: { icon: "fa-briefcase", label: "Professionalism" },
        vocabulary: { icon: "fa-book-open", label: "Vocabulary" }
    };
    const SPEECH_RATE = 1;
    const SPEECH_PITCH = 1;
    const SPEECH_LANG = "en-US";

    if (!app) {
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const selectedModeId = params.get("mode") || "leadership-standup";

    const form = document.getElementById("practiceForm");
    const input = document.getElementById("practiceInput");
    const sendButton = document.getElementById("sendPracticeMessage");
    const clearButton = document.getElementById("clearPracticeInput");
    const voiceButton = document.getElementById("voicePracticeButton");
    const finishButton = document.getElementById("finishPracticeButton");
    const conversation = document.getElementById("conversationStream");
    const metricsContainer = document.getElementById("practiceMetrics");
    const outlineContainer = document.getElementById("practiceOutline");
    const voiceState = document.getElementById("practiceVoiceState");
    const voiceWave = document.getElementById("practiceVoiceWave");
    const customScenarioPanel = document.getElementById("customScenarioPanel");
    const customScenarioForm = document.getElementById("customScenarioForm");
    const scenarioInput = document.getElementById("scenarioPromptInput");
    const scenarioVoiceButton = document.getElementById("scenarioVoiceButton");
    const startCustomScenarioButton = document.getElementById("startCustomScenarioButton");
    const customScenarioStatus = document.getElementById("customScenarioStatus");
    const pauseSpeechButton = document.getElementById("pauseSpeechButton");
    const resumeSpeechButton = document.getElementById("resumeSpeechButton");
    const stopSpeechButton = document.getElementById("stopSpeechButton");
    const replaySpeechButton = document.getElementById("replaySpeechButton");

    if (!form || !input || !sendButton || !finishButton || !conversation || !metricsContainer || !outlineContainer) {
        return;
    }

    let state = null;
    let isTyping = false;
    let timerId = null;
    let isBusy = false;
    let recognition = null;
    let isListening = false;
    let activeVoiceTarget = null;
    let voiceSeed = "";
    let streamingEntry = null;
    let lastAssistantReply = "";
    let currentUtterance = null;
    let isSpeaking = false;
    let previousMetricSnapshot = {
        grammar: 50,
        vocabulary: 50,
        confidence: 50,
        clarity: 50,
        professionalism: 50
    };
    let loadStarted = false;

    function getMode() {
        if (state && state.modeId) {
            return app.getModeById(state.modeId);
        }
        return app.getModeById(selectedModeId);
    }

    function isCustomMode() {
        const mode = getMode();
        return Boolean(mode && mode.isCustomScenario);
    }

    function isSessionComplete() {
        return Boolean(state && state.wrappedUp);
    }

    function getProgressPercent() {
        if (!state) {
            return 0;
        }

        if (isSessionComplete()) {
            return 100;
        }

        return Math.min(92, state.answers.length * 16);
    }

    function getSessionScore() {
        const latestScores = state && state.latestScores ? state.latestScores : {};

        if (!state || !state.answers.length) {
            return 0;
        }

        return app.average(METRIC_ORDER.map(function (metric) {
            return latestScores[metric] || 0;
        }));
    }

    function formatTimeLabel(dateValue) {
        if (!dateValue) {
            return "";
        }

        return new Date(dateValue).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function updateTimer() {
        if (!state) {
            return;
        }

        const startedAt = new Date(state.startedAt).getTime();
        const totalSeconds = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
        const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
        const seconds = String(totalSeconds % 60).padStart(2, "0");
        const timer = document.getElementById("sessionTimer");

        if (timer) {
            timer.textContent = minutes + ":" + seconds;
        }
    }

    function autoResizeInput(target) {
        const field = target || input;
        field.style.height = "auto";
        field.style.height = Math.min(field.scrollHeight, 220) + "px";
    }

    function setVoiceState(label, stateName) {
        if (voiceState) {
            const labelNode = voiceState.querySelector("span");
            if (labelNode) {
                labelNode.textContent = label;
            }
            voiceState.dataset.state = stateName || "idle";
        }

        if (voiceWave) {
            voiceWave.dataset.state = stateName || "idle";
        }
    }

    function stopSpeaking() {
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        currentUtterance = null;
        isSpeaking = false;
        setVoiceState(isListening ? "Listening..." : "Ready", isListening ? "listening" : "idle");
        renderConversation();
    }

    function speakText(text, shouldReplay) {
        const content = String(text || "").trim();

        if (!content || !window.speechSynthesis || typeof window.SpeechSynthesisUtterance === "undefined") {
            return;
        }

        if (currentUtterance && !shouldReplay) {
            window.speechSynthesis.cancel();
        }

        const utterance = new window.SpeechSynthesisUtterance(content);
        currentUtterance = utterance;
        utterance.lang = SPEECH_LANG;
        utterance.rate = SPEECH_RATE;
        utterance.pitch = SPEECH_PITCH;
        utterance.volume = 1;

        utterance.onstart = function () {
            isSpeaking = true;
            setVoiceState("Speaking...", "speaking");
            renderConversation();
        };

        utterance.onend = function () {
            isSpeaking = false;
            currentUtterance = null;
            setVoiceState(isListening ? "Listening..." : "Ready", isListening ? "listening" : "idle");
            renderConversation();
        };

        utterance.onerror = function () {
            isSpeaking = false;
            currentUtterance = null;
            setVoiceState(isListening ? "Listening..." : "Ready", isListening ? "listening" : "idle");
            renderConversation();
        };

        window.speechSynthesis.speak(utterance);
    }

    function replayLastResponse() {
        if (lastAssistantReply) {
            speakText(lastAssistantReply, true);
        }
    }

    function updateVoiceButtons() {
        if (voiceButton) {
            const label = voiceButton.querySelector("span");
            voiceButton.classList.toggle("is-active", isListening);
            if (label) {
                label.textContent = isListening ? "Listening..." : "Voice";
            }
        }

        if (scenarioVoiceButton) {
            const label = scenarioVoiceButton.querySelector("span");
            scenarioVoiceButton.classList.toggle("is-active", isListening && activeVoiceTarget === scenarioInput);
            if (label) {
                label.textContent = isListening && activeVoiceTarget === scenarioInput ? "Listening..." : "Speak scenario";
            }
        }
    }

    function getRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            return null;
        }

        if (!recognition) {
            recognition = new SpeechRecognition();
            recognition.lang = SPEECH_LANG;
            recognition.continuous = false;
            recognition.interimResults = true;

            recognition.onresult = function (event) {
                const transcript = Array.from(event.results).map(function (result) {
                    return result[0].transcript;
                }).join(" ").trim();
                const nextValue = [voiceSeed, transcript].filter(Boolean).join(" ").trim();

                if (activeVoiceTarget) {
                    activeVoiceTarget.value = nextValue;
                    autoResizeInput(activeVoiceTarget);
                }
            };

            recognition.onend = function () {
                isListening = false;
                activeVoiceTarget = null;
                voiceSeed = "";
                updateVoiceButtons();
                setVoiceState(isSpeaking ? "Speaking..." : "Ready", isSpeaking ? "speaking" : "idle");
            };

            recognition.onerror = function (event) {
                isListening = false;
                activeVoiceTarget = null;
                voiceSeed = "";
                updateVoiceButtons();
                setVoiceState("Ready", "idle");
                app.showToast({
                    tone: "warning",
                    title: "Microphone unavailable",
                    message: event && event.error === "not-allowed"
                        ? "Microphone access was blocked. Please allow it and try again."
                        : "Voice capture stopped before the transcript finished."
                });
            };
        }

        return recognition;
    }

    function startListening(targetInput) {
        const speechRecognition = getRecognition();

        if (!speechRecognition) {
            app.showToast({
                tone: "info",
                title: "Voice not supported",
                message: "This browser does not support live speech transcription."
            });
            return;
        }

        if (isListening) {
            speechRecognition.stop();
            return;
        }

        stopSpeaking();
        activeVoiceTarget = targetInput || input;
        voiceSeed = activeVoiceTarget.value.trim();
        isListening = true;
        updateVoiceButtons();
        setVoiceState("Listening...", "listening");

        try {
            speechRecognition.start();
        } catch (error) {
            isListening = false;
            activeVoiceTarget = null;
            voiceSeed = "";
            updateVoiceButtons();
            setVoiceState("Ready", "idle");
            app.showToast({
                tone: "warning",
                title: "Microphone unavailable",
                message: error.message || "Voice capture could not start."
            });
        }
    }

    function renderLoadingState() {
        conversation.innerHTML = [
            '<div class="message message--coach">',
            '<div class="message__avatar"><i class="fa-solid fa-sparkles"></i></div>',
            '<div class="message__bubble">',
            '<div class="skeleton skeleton--title"></div>',
            '<div class="skeleton skeleton--text"></div>',
            '<div class="skeleton skeleton--text skeleton--text-short"></div>',
            "</div>",
            "</div>"
        ].join("");

        metricsContainer.innerHTML = new Array(5).fill("").map(function () {
            return [
                '<div class="live-metric is-loading-card">',
                '<div class="skeleton skeleton--title"></div>',
                '<div class="skeleton skeleton--text skeleton--text-short"></div>',
                "</div>"
            ].join("");
        }).join("");
    }

    function renderHeader() {
        const mode = getMode();
        const percent = getProgressPercent();
        const isComplete = isSessionComplete();
        const title = document.getElementById("practiceTitle");
        const scenario = document.getElementById("practiceScenario");
        const questionCounter = document.getElementById("practiceQuestionCounter");
        const progressLabel = document.getElementById("practiceProgressLabel");
        const progressText = document.getElementById("practiceProgressText");
        const progressPercent = document.getElementById("practiceProgressPercent");
        const currentQuestion = document.getElementById("currentQuestionText");
        const objective = document.getElementById("practiceObjectiveText");
        const objectiveMeta = document.getElementById("practiceObjectiveMeta");
        const modeName = document.getElementById("practiceModeName");
        const scoreValue = document.getElementById("practiceScoreValue");

        if (title) {
            title.textContent = mode.title;
        }
        if (scenario) {
            scenario.textContent = state && state.mode ? state.mode.scenario : mode.scenario;
        }
        if (objective) {
            objective.textContent = mode.objective || mode.coachTip;
        }
        if (objectiveMeta) {
            objectiveMeta.textContent = isComplete
                ? "Your report is ready as soon as you finish the session."
                : (isCustomMode()
                    ? "Describe your situation and the coach will infer the other role."
                    : "Speak naturally. The coach will stay in character and challenge your answer.");
        }
        if (modeName) {
            modeName.textContent = mode.title;
        }
        if (questionCounter) {
            questionCounter.textContent = state
                ? (isComplete ? "Session complete" : "Voice turn " + (state.answers.length + 1))
                : (isCustomMode() ? "Start custom roleplay" : "Ready to begin");
        }
        if (progressLabel) {
            progressLabel.textContent = isComplete ? "Wrap-up ready" : percent + "% complete";
        }
        if (progressText) {
            progressText.textContent = state
                ? (state.answers.length + (state.answers.length === 1 ? " turn coached" : " turns coached"))
                : "0 turns coached";
        }
        if (progressPercent) {
            progressPercent.textContent = isComplete ? "Done" : percent + "%";
        }
        if (currentQuestion) {
            if (!state) {
                currentQuestion.textContent = isCustomMode()
                    ? "Describe the situation you want to practice and then start the roleplay."
                    : mode.openingLine || mode.scenario;
            } else if (isComplete) {
                currentQuestion.textContent = "The roleplay is complete. Finish the session when you are ready for the report.";
            } else if (state.transcript.length) {
                const latestCoachLine = state.transcript[state.transcript.length - 1].role === "assistant"
                    ? state.transcript[state.transcript.length - 1].content
                    : mode.openingLine;
                currentQuestion.textContent = latestCoachLine;
            }
        }
        if (scoreValue) {
            scoreValue.textContent = String(getSessionScore());
        }

        input.placeholder = isCustomMode()
            ? "Keep the roleplay going. The AI will stay in character."
            : "Answer naturally, then listen to the coach's next move.";

        app.setScoreRing("practiceScoreRing", getSessionScore());
        app.setProgress("practiceProgressFill", percent);
    }

    function buildMessage(entry, options) {
        const settings = Object.assign({
            text: entry.content,
            allowHtml: false,
            className: ""
        }, options || {});
        const isCoach = entry.role !== "user";
        const safeText = settings.allowHtml ? settings.text : app.sanitizeText(settings.text);

        return [
            '<article class="message message--' + (isCoach ? "coach" : "user") + settings.className + '">',
            '<div class="message__avatar"><i class="fa-solid ' + (isCoach ? "fa-sparkles" : "fa-user") + '"></i></div>',
            '<div class="message__bubble">',
            '<div class="message__meta"><strong>' + (isCoach ? "Vani Coach" : "You") + "</strong><span>" + app.sanitizeText(formatTimeLabel(entry.createdAt)) + "</span></div>",
            '<div class="message__text">' + safeText + "</div>",
            "</div>",
            "</article>"
        ].join("");
    }

    function renderConversation() {
        conversation.classList.toggle("is-speaking", isSpeaking);

        if (!state) {
            conversation.innerHTML = [
                '<div class="message message--coach">',
                '<div class="message__avatar"><i class="fa-solid fa-sparkles"></i></div>',
                '<div class="message__bubble">',
                '<div class="message__meta"><strong>Vani Coach</strong></div>',
                '<div class="message__text">Choose a roleplay and start speaking when you are ready.</div>',
                "</div>",
                "</div>"
            ].join("");
            return;
        }

        const transcriptMarkup = state.transcript.map(function (entry, index) {
            const isLastCoachMessage = isSpeaking && entry.role === "assistant" && index === state.transcript.length - 1;
            return buildMessage(entry, {
                className: isLastCoachMessage ? " is-speaking" : ""
            });
        }).join("");

        let dynamicMarkup = "";

        if (isTyping) {
            dynamicMarkup = [
                '<article class="message message--coach">',
                '<div class="message__avatar"><i class="fa-solid fa-sparkles"></i></div>',
                '<div class="message__bubble">',
                '<div class="message__meta"><strong>Vani Coach</strong></div>',
                '<div class="typing-dots"><span></span><span></span><span></span></div>',
                "</div>",
                "</article>"
            ].join("");
        } else if (streamingEntry) {
            dynamicMarkup = buildMessage(streamingEntry, {
                allowHtml: true,
                text: app.sanitizeText(streamingEntry.partial) + '<span class="streaming-caret"></span>'
            });
        }

        conversation.innerHTML = transcriptMarkup + dynamicMarkup;
        conversation.scrollTop = conversation.scrollHeight;
    }

    function renderMetrics() {
        const scores = state && state.latestScores ? state.latestScores : {};

        metricsContainer.innerHTML = METRIC_ORDER.map(function (metric) {
            const value = state && state.answers.length ? (scores[metric] || 0) : 0;
            const hasLiveData = Boolean(state && state.answers.length);
            const previousValue = hasLiveData ? (previousMetricSnapshot[metric] || 0) : value;
            const delta = hasLiveData ? (value - previousValue) : 0;
            const meta = METRIC_META[metric] || { icon: "fa-chart-line", label: app.metricLabel(metric) };
            const trendClass = delta > 0 ? "is-up" : delta < 0 ? "is-down" : "is-flat";
            const trendLabel = hasLiveData ? (delta > 0 ? "+" + delta : delta < 0 ? String(delta) : "0") : "Live";
            return [
                '<article class="skill-card ' + trendClass + '">',
                '<div class="skill-card__top">',
                '<div class="skill-card__icon"><i class="fa-solid ' + meta.icon + '"></i></div>',
                '<span class="skill-card__trend">' + trendLabel + '</span>',
                "</div>",
                '<div class="skill-card__score">',
                "<strong>" + value + "%</strong>",
                "<span>" + meta.label + "</span>",
                "</div>",
                '<div class="skill-card__meter">',
                '<div class="skill-card__fill" data-score-fill="' + value + '"></div>',
                "</div>",
                '<p class="micro-copy">' + (!hasLiveData ? "Waiting for your first response" : delta > 0 ? "Improving this turn" : delta < 0 ? "Needs a sharper close" : "Stable for now") + "</p>",
                "</article>"
            ].join("");
        }).join("");

        metricsContainer.querySelectorAll("[data-score-fill]").forEach(function (element) {
            element.style.width = element.getAttribute("data-score-fill") + "%";
        });
    }

    function renderOutline() {
        const mode = getMode();
        const currentTone = state ? "Live roleplay" : "Getting started";
        const completedCount = state ? state.answers.length : 0;

        outlineContainer.innerHTML = [
            {
                title: "Opening move",
                copy: mode.openingLine || mode.scenario,
                done: completedCount > 0
            },
            {
                title: "Goal",
                copy: mode.objective || mode.coachTip,
                done: completedCount > 1
            },
            {
                title: "Challenge style",
                copy: mode.challengeStyle || "Keep it natural and in character.",
                done: completedCount > 2
            },
            {
                title: "Wrap up",
                copy: "Finish the session when you are ready for a detailed report.",
                done: isSessionComplete()
            }
        ].map(function (item, index) {
            return [
                '<div class="outline-item' + (item.done ? " is-done" : index === 0 && !state ? " is-current" : "") + '">',
                '<div class="outline-item__step">' + (item.done ? '<i class="fa-solid fa-check"></i>' : index + 1) + "</div>",
                '<div class="outline-item__copy">',
                "<strong>" + app.sanitizeText(item.title) + "</strong>",
                "<span>" + app.sanitizeText(item.copy) + "</span>",
                "<span class=\"micro-copy\">" + app.sanitizeText(currentTone) + "</span>",
                "</div>",
                "</div>"
            ].join("");
        }).join("");

        const coachTip = document.getElementById("coachTipText");
        if (coachTip) {
            coachTip.textContent = state ? state.coachTip : (mode.coachTip || mode.objective);
        }
    }

    function render() {
        renderHeader();
        renderConversation();
        renderMetrics();
        renderOutline();
        updateTimer();
    }

    function showCustomScenarioPanel(show) {
        if (customScenarioPanel) {
            customScenarioPanel.hidden = !show;
        }
    }

    function prepareSession(session) {
        state = session;
        lastAssistantReply = "";
        previousMetricSnapshot = {
            grammar: 50,
            vocabulary: 50,
            confidence: 50,
            clarity: 50,
            professionalism: 50
        };
        if (state && state.transcript && state.transcript.length) {
            const openingEntry = state.transcript[0];
            if (openingEntry && openingEntry.role === "assistant") {
                lastAssistantReply = openingEntry.content || "";
            }
        }
        render();
        showCustomScenarioPanel(false);
        if (!timerId) {
            timerId = window.setInterval(updateTimer, 1000);
        }
        window.setTimeout(function () {
            if (state && state.transcript && state.transcript.length) {
                const assistantEntry = state.transcript[state.transcript.length - 1];
                if (assistantEntry && assistantEntry.role === "assistant") {
                    speakText(assistantEntry.content);
                }
            }
        }, 100);
    }

    function renderCustomStarterState() {
        showCustomScenarioPanel(true);
        if (scenarioInput && params.get("scenario")) {
            scenarioInput.value = params.get("scenario");
            autoResizeInput(scenarioInput);
        }
        if (customScenarioStatus) {
            customScenarioStatus.textContent = "Describe the situation, then start the roleplay.";
        }
        render();
    }

    function renderSessionLoadingState() {
        renderLoadingState();
        const mode = getMode();
        const questionCounter = document.getElementById("practiceQuestionCounter");
        if (questionCounter) {
            questionCounter.textContent = mode.isCustomScenario ? "Start custom roleplay" : "Voice roleplay";
        }
        if (customScenarioPanel) {
            customScenarioPanel.hidden = true;
        }
    }

    function startSessionWithScenario(scenarioText) {
        const mode = getMode();

        if (!scenarioText.trim()) {
            app.setStatus("customScenarioStatus", "Describe a situation before starting the roleplay.", "error");
            return;
        }

        app.setButtonLoading(startCustomScenarioButton, true, "Starting");
        isBusy = true;

        app.apiRequest("/api/practice/session" + app.buildQuery({
            mode: mode.id,
            restart: 1,
            scenario: scenarioText
        })).then(function (payload) {
            prepareSession(payload.session);
            app.setStatus("customScenarioStatus", "Roleplay started. Speak or type your first response.", "success");
        }).catch(function (error) {
            app.setStatus("customScenarioStatus", error.message || "The roleplay could not be started.", "error");
            app.showToast({
                tone: "error",
                title: "Scenario unavailable",
                message: error.message || "Please try again."
            });
        }).finally(function () {
            isBusy = false;
            app.setButtonLoading(startCustomScenarioButton, false);
        });
    }

    async function animateAssistantReply(entry) {
        const text = String(entry.content || "");

        if (!text) {
            return;
        }

        streamingEntry = Object.assign({}, entry, {
            partial: ""
        });

        const step = text.length > 200 ? 5 : 3;

        await new Promise(function (resolve) {
            let index = 0;

            function tick() {
                index = Math.min(text.length, index + step);
                streamingEntry.partial = text.slice(0, index);
                renderConversation();

                if (index < text.length) {
                    window.setTimeout(tick, 18);
                    return;
                }

                resolve();
            }

            tick();
        });
    }

    async function finishCurrentSession() {
        const mode = getMode();

        if (!state || !state.answers.length) {
            app.setStatus("practiceStatus", "Answer at least one turn before finishing.", "error");
            app.showToast({
                tone: "warning",
                title: "Session not ready",
                message: "Give the roleplay one real turn before generating a report."
            });
            return;
        }

        app.setButtonLoading(finishButton, true, "Finishing");
        isBusy = true;

        try {
            const payload = await app.apiRequest("/api/practice/finish", {
                method: "POST"
            });

            stopSpeaking();
            app.showToast({
                tone: "success",
                title: "Session complete",
                message: payload.session.title + " is ready to review."
            });

            window.setTimeout(function () {
                window.location.href = "/report" + app.buildQuery({ session_id: payload.sessionId });
            }, 180);
        } catch (error) {
            app.setStatus("practiceStatus", error.message || "The report could not be generated right now.", "error");
            app.showToast({
                tone: "error",
                title: "Finish failed",
                message: error.message || "Please try again."
            });
        } finally {
            isBusy = false;
            app.setButtonLoading(finishButton, false);
        }
    }

    async function sendPracticeMessage() {
        if (isBusy || !state) {
            return;
        }

        const mode = getMode();
        const answer = input.value.trim();
        const previousAnswerCount = state.answers.length;

        app.setStatus("practiceStatus", "");

        if (!answer) {
            app.setStatus("practiceStatus", "Write or dictate a response before sending.", "error");
            input.focus();
            return;
        }

        if (isSessionComplete()) {
            app.setStatus("practiceStatus", "This session is already complete. Finish when you are ready.", "success");
            return;
        }

        stopSpeaking();
        isTyping = true;
        isBusy = true;
        streamingEntry = null;
        app.setButtonLoading(sendButton, true, "Sending");
        renderConversation();

        try {
            const payload = await app.apiRequest("/api/practice/message", {
                method: "POST",
                body: {
                    message: answer
                }
            });
            const nextState = payload.session;
            const assistantEntry = nextState.transcript[nextState.transcript.length - 1];

            isTyping = false;
            input.value = "";
            autoResizeInput();
            previousMetricSnapshot = state && state.latestScores ? Object.assign({}, state.latestScores) : previousMetricSnapshot;
            state = Object.assign({}, nextState);
            render();

            if (assistantEntry) {
                lastAssistantReply = assistantEntry.content || "";
                await animateAssistantReply(assistantEntry);
                speakText(assistantEntry.content);
            }

            state = nextState;
            streamingEntry = null;
            render();

            app.setStatus(
                "practiceStatus",
                isSessionComplete()
                    ? "Roleplay wrapped up. Finish when you are ready."
                    : (state.answers.length === previousAnswerCount
                        ? "Keep going when you are ready."
                        : "Reply coached. Keep the conversation moving naturally."),
                "success"
            );
        } catch (error) {
            isTyping = false;
            streamingEntry = null;
            renderConversation();
            app.setStatus("practiceStatus", error.message || "The message could not be sent right now.", "error");
            app.showToast({
                tone: "error",
                title: "Message failed",
                message: error.message || "Please try again."
            });
        } finally {
            isBusy = false;
            app.setButtonLoading(sendButton, false);
        }
    }

    function loadPracticeSession() {
        if (loadStarted) {
            return;
        }

        loadStarted = true;

        if (isCustomMode()) {
            renderCustomStarterState();
            return;
        }

        renderSessionLoadingState();

        app.apiRequest("/api/practice/session" + app.buildQuery({
            mode: selectedModeId,
            restart: params.get("restart")
        })).then(function (payload) {
            prepareSession(payload.session);
        }).catch(function (error) {
            app.setStatus("practiceStatus", error.message || "The practice session could not load.", "error");
            app.showToast({
                tone: "error",
                title: "Practice unavailable",
                message: error.message || "Please refresh and try again."
            });
        });
    }

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        sendPracticeMessage();
    });

    input.addEventListener("keydown", function (event) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendPracticeMessage();
        }
    });

    input.addEventListener("input", function () {
        autoResizeInput(input);
    });

    if (clearButton) {
        clearButton.addEventListener("click", function () {
            input.value = "";
            autoResizeInput(input);
            input.focus();
        });
    }

    if (voiceButton) {
        voiceButton.addEventListener("click", function () {
            startListening(input);
        });
    }

    if (scenarioVoiceButton) {
        scenarioVoiceButton.addEventListener("click", function () {
            startListening(scenarioInput || input);
        });
    }

    if (pauseSpeechButton) {
        pauseSpeechButton.addEventListener("click", function () {
            if (window.speechSynthesis && window.speechSynthesis.speaking) {
                window.speechSynthesis.pause();
                setVoiceState("Paused", "paused");
            }
        });
    }

    if (resumeSpeechButton) {
        resumeSpeechButton.addEventListener("click", function () {
            if (window.speechSynthesis && window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
                setVoiceState("Speaking", "speaking");
            }
        });
    }

    if (stopSpeechButton) {
        stopSpeechButton.addEventListener("click", stopSpeaking);
    }

    if (replaySpeechButton) {
        replaySpeechButton.addEventListener("click", replayLastResponse);
    }

    if (customScenarioForm) {
        customScenarioForm.addEventListener("submit", function (event) {
            event.preventDefault();
            startSessionWithScenario((scenarioInput && scenarioInput.value) || "");
        });
    }

    finishButton.addEventListener("click", finishCurrentSession);

    renderLoadingState();
    autoResizeInput(input);
    if (scenarioInput) {
        autoResizeInput(scenarioInput);
    }
    setVoiceState("Ready", "idle");
    loadPracticeSession();

    window.addEventListener("beforeunload", function () {
        if (timerId) {
            window.clearInterval(timerId);
        }
        stopSpeaking();
    });
});
