document.addEventListener("DOMContentLoaded", function () {
    const app = window.VaniApp;
    const METRIC_ORDER = ["clarity", "grammar", "confidence", "professionalism", "vocabulary"];

    if (!app) {
        return;
    }

    const form = document.getElementById("practiceForm");
    const input = document.getElementById("practiceInput");
    const sendButton = document.getElementById("sendPracticeMessage");
    const clearButton = document.getElementById("clearPracticeInput");
    const voiceButton = document.getElementById("voicePracticeButton");
    const finishButton = document.getElementById("finishPracticeButton");
    const conversation = document.getElementById("conversationStream");
    const metricsContainer = document.getElementById("practiceMetrics");
    const outlineContainer = document.getElementById("practiceOutline");

    if (!form || !input || !sendButton || !finishButton || !conversation || !metricsContainer || !outlineContainer) {
        return;
    }

    let state = null;
    let isTyping = false;
    let timerId = null;
    let isBusy = false;
    let recognition = null;
    let isListening = false;
    let voiceSeed = "";
    let streamingEntry = null;

    function getMode() {
        return app.getModeById(state.modeId);
    }

    function isOpenEndedMode() {
        const mode = getMode();
        return Boolean(mode && mode.isOpenEnded);
    }

    function getStopPhrase() {
        const mode = getMode();
        return (mode && mode.stopPhrase) || "ok stop the chat";
    }

    function isSessionComplete() {
        if (!state) {
            return false;
        }

        if (isOpenEndedMode()) {
            return Boolean(state.wrappedUp);
        }

        return state.answers.length >= getMode().questions.length;
    }

    function getProgressPercent() {
        const mode = getMode();
        if (isOpenEndedMode()) {
            if (isSessionComplete()) {
                return 100;
            }
            return Math.min(92, state.answers.length * 18);
        }
        return Math.round((state.answers.length / mode.questions.length) * 100);
    }

    function getSessionScore() {
        const latestScores = state.latestScores || {};

        if (!state.answers.length) {
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
        const now = Date.now();
        const totalSeconds = Math.max(0, Math.round((now - startedAt) / 1000));
        const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
        const seconds = String(totalSeconds % 60).padStart(2, "0");
        const timer = document.getElementById("sessionTimer");

        if (timer) {
            timer.textContent = minutes + ":" + seconds;
        }
    }

    function autoResizeInput() {
        input.style.height = "auto";
        input.style.height = Math.min(input.scrollHeight, 220) + "px";
    }

    function renderHeader() {
        const mode = getMode();
        const questionCounter = document.getElementById("practiceQuestionCounter");
        const progressLabel = document.getElementById("practiceProgressLabel");
        const progressText = document.getElementById("practiceProgressText");
        const progressPercent = document.getElementById("practiceProgressPercent");
        const title = document.getElementById("practiceTitle");
        const modeName = document.getElementById("practiceModeName");
        const scenario = document.getElementById("practiceScenario");
        const currentQuestion = document.getElementById("currentQuestionText");
        const objective = document.getElementById("practiceObjectiveText");
        const objectiveMeta = document.getElementById("practiceObjectiveMeta");
        const scoreValue = document.getElementById("practiceScoreValue");
        const percent = getProgressPercent();
        const isComplete = isSessionComplete();
        const openEnded = isOpenEndedMode();
        const stopPhrase = getStopPhrase();
        const replyCount = state.answers.length;

        if (title) {
            title.textContent = mode.title;
        }
        if (modeName) {
            modeName.textContent = mode.title;
        }
        if (scenario) {
            scenario.textContent = mode.scenario;
        }
        if (objective) {
            objective.textContent = mode.objective || mode.coachTip;
        }
        if (objectiveMeta) {
            if (openEnded) {
                objectiveMeta.textContent = isComplete
                    ? "Your chat is wrapped up. Finish whenever you're ready."
                    : "Chat naturally. Say '" + stopPhrase + "' whenever you want to wrap up.";
            } else {
                objectiveMeta.textContent = isComplete
                    ? "Your report is ready as soon as you finish the session"
                    : "Live coaching updates after each answer";
            }
        }
        if (questionCounter) {
            if (openEnded) {
                questionCounter.textContent = isComplete
                    ? "Chat wrapped up"
                    : replyCount
                        ? replyCount + (replyCount === 1 ? " reply coached" : " replies coached")
                        : "Open-ended chat";
            } else {
                questionCounter.textContent = isComplete
                    ? "Session complete"
                    : "Question " + (state.turnIndex + 1) + " of " + mode.questions.length;
            }
        }
        if (progressLabel) {
            progressLabel.textContent = openEnded
                ? (isComplete ? "Wrap-up ready" : "Open-ended")
                : percent + "% complete";
        }
        if (progressText) {
            progressText.textContent = openEnded
                ? (isComplete
                    ? "Wrapped up after " + replyCount + (replyCount === 1 ? " reply" : " replies")
                    : replyCount
                        ? replyCount + (replyCount === 1 ? " reply coached so far" : " replies coached so far")
                        : "No replies coached yet")
                : state.answers.length + " of " + mode.questions.length + " prompts completed";
        }
        if (progressPercent) {
            progressPercent.textContent = openEnded
                ? (isComplete ? "Done" : "Live")
                : percent + "%";
        }
        if (currentQuestion) {
            if (openEnded) {
                currentQuestion.textContent = isComplete
                    ? "The friendly chat is wrapped up. Finish the session when you're ready to generate the report."
                    : replyCount
                        ? "Keep the conversation going naturally. Add one clear detail, respond to the latest follow-up, and say '" + stopPhrase + "' whenever you want to wrap up."
                        : mode.questions[0];
            } else {
                currentQuestion.textContent = isComplete
                    ? "You've answered every prompt. Finish the session when you're ready to generate the report."
                    : mode.questions[state.turnIndex];
            }
        }
        if (scoreValue) {
            scoreValue.textContent = String(getSessionScore());
        }

        input.placeholder = openEnded
            ? "Reply naturally. Say '" + stopPhrase + "' whenever you want to wrap up."
            : "Answer clearly, directly, and in your own natural voice.";

        app.setScoreRing("practiceScoreRing", getSessionScore());
        app.setProgress("practiceProgressFill", percent);
    }

    function buildMessage(entry, options) {
        const settings = Object.assign({
            text: entry.content,
            allowHtml: false
        }, options || {});
        const isCoach = entry.role !== "user";
        const safeText = settings.allowHtml ? settings.text : app.sanitizeText(settings.text);

        return [
            '<article class="message message--' + (isCoach ? "coach" : "user") + '">',
            '<div class="message__avatar"><i class="fa-solid ' + (isCoach ? "fa-sparkles" : "fa-user") + '"></i></div>',
            '<div class="message__bubble">',
            '<div class="message__meta"><strong>' + (isCoach ? "Vani Coach" : "You") + "</strong><span>" + app.sanitizeText(formatTimeLabel(entry.createdAt)) + "</span></div>",
            '<div class="message__text">' + safeText + "</div>",
            "</div>",
            "</article>"
        ].join("");
    }

    function renderConversation() {
        if (!state) {
            return;
        }

        const transcriptMarkup = state.transcript.map(function (entry) {
            return buildMessage(entry);
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
        const scores = state.latestScores || {};

        metricsContainer.innerHTML = METRIC_ORDER.map(function (metric) {
            const value = state.answers.length ? (scores[metric] || 0) : 0;
            return [
                '<div class="live-metric">',
                '<div class="live-metric__top">',
                "<span>" + app.metricLabel(metric) + "</span>",
                "<strong>" + value + "</strong>",
                "</div>",
                '<div class="live-metric__track">',
                '<div class="live-metric__fill" data-score-fill="' + value + '"></div>',
                "</div>",
                "</div>"
            ].join("");
        }).join("");

        metricsContainer.querySelectorAll("[data-score-fill]").forEach(function (element) {
            element.style.width = element.getAttribute("data-score-fill") + "%";
        });
    }

    function renderOutline() {
        const mode = getMode();
        const completedCount = state.answers.length;
        const openEnded = isOpenEndedMode();
        const isComplete = isSessionComplete();
        const currentIndex = openEnded
            ? Math.min(completedCount, Math.max(mode.questions.length - 1, 0))
            : completedCount;

        outlineContainer.innerHTML = mode.questions.map(function (question, index) {
            const isDone = openEnded
                ? index < Math.min(completedCount, mode.questions.length)
                : index < completedCount;
            const isCurrent = !isComplete && index === currentIndex && (openEnded || completedCount < mode.questions.length);
            return [
                '<div class="outline-item' + (isDone ? " is-done" : isCurrent ? " is-current" : "") + '">',
                '<div class="outline-item__step">' + (isDone ? '<i class="fa-solid fa-check"></i>' : index + 1) + "</div>",
                '<div class="outline-item__copy">',
                "<strong>" + (openEnded ? "Starter " : "Prompt ") + (index + 1) + "</strong>",
                "<span>" + app.sanitizeText(question) + "</span>",
                "</div>",
                "</div>"
            ].join("");
        }).join("");

        const coachTip = document.getElementById("coachTipText");
        if (coachTip) {
            coachTip.textContent = state.coachTip;
        }
    }

    function render() {
        renderHeader();
        renderConversation();
        renderMetrics();
        renderOutline();
        updateTimer();
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

    function updateVoiceButton() {
        if (!voiceButton) {
            return;
        }

        const label = voiceButton.querySelector("span");
        voiceButton.classList.toggle("is-active", isListening);

        if (label) {
            label.textContent = isListening ? "Listening" : "Voice";
        }
    }

    function getRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            return null;
        }

        if (!recognition) {
            recognition = new SpeechRecognition();
            recognition.lang = "en-US";
            recognition.continuous = false;
            recognition.interimResults = true;

            recognition.onresult = function (event) {
                const transcript = Array.from(event.results).map(function (result) {
                    return result[0].transcript;
                }).join(" ").trim();
                const nextValue = [voiceSeed, transcript].filter(Boolean).join(" ").trim();
                input.value = nextValue;
                autoResizeInput();
            };

            recognition.onend = function () {
                isListening = false;
                updateVoiceButton();
            };

            recognition.onerror = function () {
                isListening = false;
                updateVoiceButton();
                app.showToast({
                    tone: "warning",
                    title: "Voice unavailable",
                    message: "Voice capture stopped before the transcript finished."
                });
            };
        }

        return recognition;
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

        if (!state.answers.length) {
            app.setStatus("practiceStatus", "Answer at least one prompt before finishing.", "error");
            app.showToast({
                tone: "warning",
                title: "Session not ready",
                message: "Answer at least one prompt before generating a report."
            });
            return;
        }

        if (isOpenEndedMode() && !state.wrappedUp) {
            const shouldFinish = window.confirm("Wrap up this friendly chat and generate a report?");
            if (!shouldFinish) {
                return;
            }
        } else if (!isOpenEndedMode() && state.answers.length < mode.questions.length) {
            const shouldFinish = window.confirm("You still have prompts remaining. Generate a report with the current answers?");
            if (!shouldFinish) {
                return;
            }
        }

        app.setButtonLoading(finishButton, true, "Finishing");
        isBusy = true;

        try {
            const payload = await app.apiRequest("/api/practice/finish", {
                method: "POST"
            });

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

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        if (isBusy || !state) {
            return;
        }

        const mode = getMode();
        const answer = input.value.trim();
        const previousAnswerCount = state.answers.length;

        app.setStatus("practiceStatus", "");

        if (!answer) {
            app.setStatus("practiceStatus", "Write or dictate an answer before sending.", "error");
            input.focus();
            return;
        }

        if (isSessionComplete()) {
            app.setStatus(
                "practiceStatus",
                isOpenEndedMode()
                    ? "This chat is already wrapped up. Finish when you're ready."
                    : "This session is already complete. Finish when you're ready.",
                "success"
            );
            return;
        }

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
            state = Object.assign({}, nextState, {
                transcript: nextState.transcript.slice(0, -1)
            });
            render();

            if (assistantEntry) {
                await animateAssistantReply(assistantEntry);
            }

            state = nextState;
            streamingEntry = null;
            render();

            app.setStatus(
                "practiceStatus",
                isOpenEndedMode()
                    ? (nextState.answers.length === previousAnswerCount && !isSessionComplete()
                        ? "Start with one real message, then say '" + getStopPhrase() + "' whenever you want to wrap up."
                        : isSessionComplete()
                        ? "Friendly chat wrapped up. Finish when you're ready."
                        : "Reply coached. Keep chatting, or say '" + getStopPhrase() + "' whenever you want to wrap up.")
                    : (state.answers.length >= mode.questions.length
                        ? "All prompts answered. Finish when you're ready."
                        : "Answer recorded. The next prompt is ready."),
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
    });

    input.addEventListener("keydown", function (event) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            form.requestSubmit();
        }
    });

    input.addEventListener("input", function () {
        autoResizeInput();
    });

    if (clearButton) {
        clearButton.addEventListener("click", function () {
            input.value = "";
            autoResizeInput();
            input.focus();
        });
    }

    if (voiceButton) {
        voiceButton.addEventListener("click", function () {
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

            voiceSeed = input.value.trim();
            isListening = true;
            updateVoiceButton();
            speechRecognition.start();
        });
    }

    finishButton.addEventListener("click", finishCurrentSession);

    renderLoadingState();
    autoResizeInput();

    (async function loadPracticeSession() {
        try {
            const params = new URLSearchParams(window.location.search);
            const payload = await app.apiRequest("/api/practice/session" + app.buildQuery({
                mode: params.get("mode"),
                restart: params.get("restart")
            }));

            state = payload.session;
            timerId = window.setInterval(updateTimer, 1000);

            window.addEventListener("beforeunload", function () {
                if (timerId) {
                    window.clearInterval(timerId);
                }
            });

            render();
        } catch (error) {
            app.setStatus("practiceStatus", error.message || "The practice session could not load.", "error");
            app.showToast({
                tone: "error",
                title: "Practice unavailable",
                message: error.message || "Please refresh and try again."
            });
        }
    })();
});
