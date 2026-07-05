(function () {
    const MODE_LIBRARY = [
        {
            id: "leadership-standup",
            title: "Leadership Standup",
            tag: "Executive presence",
            difficulty: "Advanced",
            duration: "12 min",
            icon: "fa-solid fa-people-group",
            scenario: "Deliver a concise leadership update that sounds calm, decisive, and outcome-first.",
            description: "Practice high-visibility updates that keep the room aligned without sounding overly detailed.",
            objective: "Lead with the business outcome, support it with one decision, and close with certainty.",
            coachTip: "Lead with the business outcome, then the decision, then the next step.",
            questions: [
                "Give a short leadership update on a project you own and start with why it matters.",
                "Describe a blocker or tradeoff you handled while keeping stakeholders aligned.",
                "Explain one decision you made and how you communicated it with confidence.",
                "Close with the single next step you want the room to remember."
            ]
        },
        {
            id: "interview-sprint",
            title: "Interview Sprint",
            tag: "Structured answers",
            difficulty: "Intermediate",
            duration: "10 min",
            icon: "fa-solid fa-briefcase",
            scenario: "Answer hiring-panel questions with structure, confidence, and clean delivery.",
            description: "Sharpen short, high-pressure answers that stay clear and persuasive.",
            objective: "Answer directly, support with one clear example, and land the impact quickly.",
            coachTip: "Start with the situation, state your action, then land the impact quickly.",
            questions: [
                "Tell me about yourself in a way that sounds relevant and memorable.",
                "Describe a time you handled conflicting priorities without losing momentum.",
                "How do you communicate difficult tradeoffs to leadership or teammates?",
                "End with the communication habit that makes you especially effective."
            ]
        },
        {
            id: "client-pitch",
            title: "Client Pitch",
            tag: "Persuasive clarity",
            difficulty: "Advanced",
            duration: "14 min",
            icon: "fa-solid fa-handshake-angle",
            scenario: "Pitch a solution to a client who needs confidence, clarity, and a crisp next step.",
            description: "Practice sounding commercially sharp without losing warmth or trust.",
            objective: "Frame the problem in the client's language, connect it to outcomes, and ask for the next step clearly.",
            coachTip: "Name the customer pain, translate it into outcomes, then invite the next step.",
            questions: [
                "Open by framing the client's problem in their language.",
                "Explain why your solution is a fit without sounding generic.",
                "Handle a concern about cost, complexity, or implementation risk.",
                "Close with a helpful but confident next step."
            ]
        },
        {
            id: "difficult-conversation",
            title: "Difficult Conversation",
            tag: "Calm candor",
            difficulty: "Advanced",
            duration: "11 min",
            icon: "fa-solid fa-shield-heart",
            scenario: "Balance empathy and directness in a sensitive conversation where trust matters.",
            description: "Practice naming the issue clearly while still sounding respectful and constructive.",
            objective: "Acknowledge the relationship, name the issue clearly, and align on one next action.",
            coachTip: "Acknowledge the relationship, name the issue clearly, then move to one next action.",
            questions: [
                "Start the conversation in a way that feels respectful and steady.",
                "How would you name the issue without sounding vague or harsh?",
                "How do you keep the other person engaged instead of defensive?",
                "End with one clear next step you can both agree on."
            ]
        },
        {
            id: "friendly-chat",
            title: "Friendly Chat",
            tag: "Warm connection",
            difficulty: "Open-ended",
            duration: "Flexible",
            icon: "fa-solid fa-comments",
            scenario: "Have a natural back-and-forth conversation that helps you sound warm, clear, and confident in everyday communication.",
            description: "Practice relaxed conversation that builds fluency, listening, and social confidence without a fixed question limit.",
            objective: "Keep the conversation natural, respond with warmth, and ask or answer follow-ups with clear, easy flow.",
            coachTip: "Stay present, answer directly, add one detail, and keep the exchange moving naturally.",
            openingLine: "Let's start a friendly chat. Tell me something small about your day, your interests, or what's on your mind, and I'll help you sound warm, clear, and natural as we go.",
            stopPhrase: "ok stop the chat",
            stopPhrases: [
                "ok stop the chat",
                "okay stop the chat",
                "stop the chat",
                "wrap up the chat",
                "wrap up this chat"
            ],
            isOpenEnded: true,
            questions: [
                "Tell me something simple about your day or week and keep it natural.",
                "Share a hobby, habit, or interest in a way that sounds easy and engaging.",
                "Talk about a recent experience and add one detail that makes it memorable.",
                "Ask a friendly follow-up or keep the conversation moving with curiosity."
            ]
        }
    ];

    const METRIC_LABELS = {
        grammar: "Grammar",
        vocabulary: "Vocabulary",
        confidence: "Confidence",
        clarity: "Clarity",
        professionalism: "Professionalism"
    };

    const METRIC_GOALS = {
        grammar: {
            title: "Tighten sentence control and remove filler.",
            detail: "Cleaner phrasing will make your ideas sound more polished with less effort."
        },
        vocabulary: {
            title: "Use more precise language in your strongest points.",
            detail: "Sharper word choice will make the answer feel more memorable and professional."
        },
        confidence: {
            title: "End key answers with more certainty.",
            detail: "The room already follows your logic. A firmer close will make it easier to trust your recommendation."
        },
        clarity: {
            title: "Make your structure more visible from the first sentence.",
            detail: "Outcome-first phrasing will help the listener track your answer faster."
        },
        professionalism: {
            title: "Sound a little more polished and executive.",
            detail: "Small shifts in tone and phrasing will make the answer feel more commercially mature."
        }
    };

    const METRIC_MODE_MAP = {
        grammar: "interview-sprint",
        vocabulary: "client-pitch",
        confidence: "leadership-standup",
        clarity: "interview-sprint",
        professionalism: "client-pitch"
    };

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function average(values) {
        if (!values.length) {
            return 0;
        }

        const total = values.reduce(function (sum, value) {
            return sum + value;
        }, 0);

        return Math.round(total / values.length);
    }

    function sanitizeText(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function formatDate(dateValue, options) {
        return new Date(dateValue).toLocaleDateString("en-US", Object.assign({
            month: "short",
            day: "numeric",
            year: "numeric"
        }, options || {}));
    }

    function formatRelativeDate(dateValue) {
        const today = new Date();
        const target = new Date(dateValue);
        const todayFloor = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
        const targetFloor = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
        const dayDelta = Math.round((todayFloor - targetFloor) / 86400000);

        if (dayDelta === 0) {
            return "Today";
        }
        if (dayDelta === 1) {
            return "Yesterday";
        }
        if (dayDelta < 7) {
            return dayDelta + " days ago";
        }

        return formatDate(dateValue, {
            month: "short",
            day: "numeric"
        });
    }

    function formatDuration(minutes) {
        return Math.max(1, Math.round(Number(minutes) || 0)) + " min";
    }

    function metricLabel(metric) {
        return METRIC_LABELS[metric] || metric;
    }

    function humanizeNameFromEmail(email) {
        const local = String(email || "learner").split("@")[0];
        return local
            .split(/[._-]+/)
            .filter(Boolean)
            .map(function (part) {
                return part.charAt(0).toUpperCase() + part.slice(1);
            })
            .join(" ") || "Learner";
    }

    function communicationLevel(score) {
        const safeScore = clamp(Number(score) || 0, 0, 100);

        if (safeScore < 35) {
            return "Needs Foundation";
        }
        if (safeScore < 55) {
            return "Emerging";
        }
        if (safeScore < 70) {
            return "Developing";
        }
        if (safeScore < 85) {
            return "Strong";
        }
        if (safeScore < 93) {
            return "Advanced";
        }

        return "Executive Ready";
    }

    function getModeById(modeId) {
        return MODE_LIBRARY.find(function (mode) {
            return mode.id === modeId;
        }) || MODE_LIBRARY[0];
    }

    function getTopMetrics(breakdown, count) {
        return Object.keys(breakdown || {})
            .sort(function (left, right) {
                return breakdown[right] - breakdown[left];
            })
            .slice(0, count || 1);
    }

    function getWeakestMetric(breakdown) {
        return Object.keys(breakdown || {}).sort(function (left, right) {
            return breakdown[left] - breakdown[right];
        })[0] || "confidence";
    }

    function getGoalForMetric(metric) {
        return METRIC_GOALS[metric] || METRIC_GOALS.confidence;
    }

    function getRecommendationForMetric(metric) {
        const modeId = METRIC_MODE_MAP[metric] || MODE_LIBRARY[0].id;
        const mode = getModeById(modeId);

        return {
            modeId: mode.id,
            title: mode.title,
            copy: mode.description
        };
    }

    function getStreak(sessions) {
        sessions = sessions || [];
        const dayKeys = sessions.map(function (session) {
            const date = new Date(session.date);
            return [
                date.getFullYear(),
                String(date.getMonth() + 1).padStart(2, "0"),
                String(date.getDate()).padStart(2, "0")
            ].join("-");
        }).filter(function (value, index, values) {
            return values.indexOf(value) === index;
        });

        if (!dayKeys.length) {
            return 0;
        }

        let streak = 1;
        let previous = new Date(dayKeys[0]);

        for (let index = 1; index < dayKeys.length; index += 1) {
            const current = new Date(dayKeys[index]);
            const dayDelta = Math.round((previous.getTime() - current.getTime()) / 86400000);

            if (dayDelta === 1) {
                streak += 1;
                previous = current;
            } else {
                break;
            }
        }

        return streak;
    }

    function getPreviousSession(sessions, sessionId) {
        sessions = sessions || [];

        if (!sessions.length) {
            return null;
        }

        if (!sessionId) {
            return sessions[1] || null;
        }

        const activeIndex = sessions.findIndex(function (session) {
            return session.id === sessionId;
        });

        return activeIndex >= 0 ? sessions[activeIndex + 1] || null : null;
    }

    function getScoreDelta(session, previousSession) {
        if (!session || !previousSession) {
            return 0;
        }

        return session.overall - previousSession.overall;
    }

    function scoreDeltaClass(value) {
        if (value > 0) {
            return "is-positive";
        }
        if (value < 0) {
            return "is-negative";
        }
        return "is-neutral";
    }

    function setStatus(target, message, tone) {
        const element = typeof target === "string" ? document.getElementById(target) : target;
        if (!element) {
            return;
        }

        element.textContent = message || "";
        element.classList.remove("is-error", "is-success");

        if (tone === "error" || tone === "success") {
            element.classList.add("is-" + tone);
        }
    }

    function setFieldState(field, isInvalid) {
        if (!field) {
            return;
        }

        field.classList.toggle("is-invalid", Boolean(isInvalid));
        field.setAttribute("aria-invalid", isInvalid ? "true" : "false");
    }

    function bindValidationReset(form) {
        if (!form) {
            return;
        }

        form.querySelectorAll(".field__control").forEach(function (field) {
            setFieldState(field, false);

            const reset = function () {
                setFieldState(field, false);
            };

            field.addEventListener("input", reset);
            field.addEventListener("change", reset);
        });
    }

    function setButtonLoading(button, isLoading, loadingText) {
        if (!button) {
            return;
        }

        if (!button.dataset.defaultMarkup) {
            button.dataset.defaultMarkup = button.innerHTML;
        }

        button.classList.toggle("is-loading", Boolean(isLoading));
        button.disabled = Boolean(isLoading);
        button.setAttribute("aria-busy", isLoading ? "true" : "false");

        if (isLoading && loadingText) {
            button.innerHTML = "<span>" + sanitizeText(loadingText) + "</span>";
            return;
        }

        if (!isLoading) {
            button.innerHTML = button.dataset.defaultMarkup;
        }
    }

    function setScoreRing(target, score) {
        const element = typeof target === "string" ? document.getElementById(target) : target;
        if (!element) {
            return;
        }

        const safeScore = clamp(Math.round(Number(score) || 0), 0, 100);
        element.style.setProperty("--score", String(safeScore));
        element.setAttribute("role", "img");
        element.setAttribute("aria-label", "Score " + safeScore + " out of 100");
    }

    function setProgress(target, value) {
        const element = typeof target === "string" ? document.getElementById(target) : target;
        if (!element) {
            return;
        }

        element.style.width = clamp(Number(value) || 0, 0, 100) + "%";
    }

    function createToastContainer() {
        let container = document.querySelector(".toast-stack");
        if (!container) {
            container = document.createElement("div");
            container.className = "toast-stack";
            document.body.appendChild(container);
        }
        return container;
    }

    function showToast(config) {
        const settings = Object.assign({
            tone: "info",
            title: "Notice",
            message: ""
        }, config || {});

        const iconMap = {
            info: "fa-solid fa-sparkles",
            success: "fa-solid fa-circle-check",
            warning: "fa-solid fa-triangle-exclamation",
            error: "fa-solid fa-circle-xmark"
        };

        const container = createToastContainer();
        const toast = document.createElement("article");
        toast.className = "toast toast--" + settings.tone;
        toast.setAttribute("role", "status");
        toast.setAttribute("aria-live", "polite");
        toast.innerHTML = [
            '<div class="toast__icon"><i class="' + sanitizeText(iconMap[settings.tone] || iconMap.info) + '"></i></div>',
            '<div class="toast__content">',
            "<strong>" + sanitizeText(settings.title) + "</strong>",
            "<p>" + sanitizeText(settings.message) + "</p>",
            "</div>",
            '<button class="toast__close" type="button" aria-label="Dismiss notification"><i class="fa-solid fa-xmark"></i></button>'
        ].join("");

        const closeButton = toast.querySelector(".toast__close");
        const removeToast = function () {
            toast.remove();
        };

        closeButton.addEventListener("click", removeToast);
        container.appendChild(toast);
        window.setTimeout(removeToast, 3600);
    }

    function renderEmptyState(target, config) {
        const element = typeof target === "string" ? document.getElementById(target) : target;
        if (!element) {
            return;
        }

        const settings = Object.assign({
            icon: "fa-solid fa-layer-group",
            title: "Nothing here yet",
            description: "Complete a session to populate this area."
        }, config || {});

        element.innerHTML = [
            '<div class="empty-state" role="status">',
            '<div class="empty-state__icon"><i class="' + sanitizeText(settings.icon) + '"></i></div>',
            "<strong>" + sanitizeText(settings.title) + "</strong>",
            "<p>" + sanitizeText(settings.description) + "</p>",
            "</div>"
        ].join("");
    }

    function getCurrentUser() {
        return (window.VaniBootstrap && window.VaniBootstrap.currentUser) || null;
    }

    function initSidebar() {
        const openButton = document.querySelector("[data-sidebar-toggle]");
        const dismissTargets = document.querySelectorAll("[data-sidebar-dismiss], .sidebar-link");
        const sidebar = document.getElementById("app-sidebar");
        let lastFocusedTrigger = null;

        function focusSidebar() {
            if (!sidebar) {
                return;
            }

            const focusTarget = sidebar.querySelector(".sidebar-link, .sidebar-action, a, button");
            if (focusTarget) {
                focusTarget.focus();
            } else {
                sidebar.focus();
            }
        }

        function closeSidebar() {
            document.body.classList.remove("is-nav-open");
            if (openButton) {
                openButton.setAttribute("aria-expanded", "false");
            }

            if (lastFocusedTrigger && window.innerWidth <= 1024) {
                lastFocusedTrigger.focus();
            }
        }

        if (openButton) {
            openButton.addEventListener("click", function () {
                const willOpen = !document.body.classList.contains("is-nav-open");
                lastFocusedTrigger = document.activeElement;
                document.body.classList.toggle("is-nav-open", willOpen);
                openButton.setAttribute("aria-expanded", willOpen ? "true" : "false");

                if (willOpen && window.innerWidth <= 1024) {
                    window.requestAnimationFrame(focusSidebar);
                }
            });
        }

        dismissTargets.forEach(function (element) {
            element.addEventListener("click", function () {
                if (window.innerWidth <= 1024) {
                    closeSidebar();
                }
            });
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                closeSidebar();
            }
        });

        window.addEventListener("resize", function () {
            if (window.innerWidth > 1024) {
                closeSidebar();
            }
        });

        if (sidebar) {
            sidebar.setAttribute("tabindex", "-1");
        }

        document.querySelectorAll("[data-profile-action]").forEach(function (button) {
            button.addEventListener("click", function () {
                const user = getCurrentUser();
                if (!user) {
                    return;
                }
                showToast({
                    tone: "info",
                    title: "Profile",
                    message: user.goal + " | " + user.stage
                });
            });
        });
    }

    function initReveal() {
        const elements = document.querySelectorAll(".reveal");

        if (!("IntersectionObserver" in window)) {
            elements.forEach(function (element) {
                element.classList.add("is-visible");
            });
            return;
        }

        const observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.12
        });

        elements.forEach(function (element) {
            observer.observe(element);
        });
    }

    function applyUserProfile() {
        const user = getCurrentUser();
        if (!user) {
            return;
        }

        const firstName = (user.name || "Learner").trim().split(/\s+/)[0] || "Learner";
        const initial = firstName.slice(0, 1).toUpperCase();

        document.querySelectorAll("[data-user-name]").forEach(function (element) {
            element.textContent = firstName;
        });

        document.querySelectorAll("[data-user-goal]").forEach(function (element) {
            element.textContent = user.goal;
        });

        document.querySelectorAll("[data-user-stage]").forEach(function (element) {
            element.textContent = user.stage;
        });

        document.querySelectorAll("[data-user-initial]").forEach(function (element) {
            element.textContent = initial;
        });
    }

    function buildQuery(params) {
        const searchParams = new URLSearchParams();
        Object.keys(params || {}).forEach(function (key) {
            const value = params[key];
            if (value !== undefined && value !== null && value !== "") {
                searchParams.set(key, value);
            }
        });
        const query = searchParams.toString();
        return query ? "?" + query : "";
    }

    async function apiRequest(url, options) {
        const settings = Object.assign({
            method: "GET",
            headers: {}
        }, options || {});

        settings.headers = Object.assign({}, settings.headers);

        if (settings.body && typeof settings.body !== "string") {
            settings.body = JSON.stringify(settings.body);
            settings.headers["Content-Type"] = "application/json";
        }

        const response = await window.fetch(url, settings);
        const contentType = response.headers.get("content-type") || "";
        const payload = contentType.indexOf("application/json") >= 0 ? await response.json() : null;

        if (!response.ok) {
            const message = payload && payload.error ? payload.error : "Request failed.";
            if (response.status === 401) {
                window.location.href = "/login";
            }
            throw new Error(message);
        }

        return payload;
    }

    document.addEventListener("DOMContentLoaded", function () {
        applyUserProfile();
        initSidebar();
        initReveal();
    });

    window.VaniApp = {
        MODE_LIBRARY: MODE_LIBRARY,
        average: average,
        apiRequest: apiRequest,
        bindValidationReset: bindValidationReset,
        buildQuery: buildQuery,
        formatDate: formatDate,
        formatDuration: formatDuration,
        formatRelativeDate: formatRelativeDate,
        getCurrentUser: getCurrentUser,
        getGoalForMetric: getGoalForMetric,
        getModeById: getModeById,
        getPreviousSession: getPreviousSession,
        getRecommendationForMetric: getRecommendationForMetric,
        getScoreDelta: getScoreDelta,
        getStreak: getStreak,
        getTopMetrics: getTopMetrics,
        getWeakestMetric: getWeakestMetric,
        humanizeNameFromEmail: humanizeNameFromEmail,
        communicationLevel: communicationLevel,
        metricLabel: metricLabel,
        renderEmptyState: renderEmptyState,
        sanitizeText: sanitizeText,
        scoreDeltaClass: scoreDeltaClass,
        setButtonLoading: setButtonLoading,
        setFieldState: setFieldState,
        setProgress: setProgress,
        setScoreRing: setScoreRing,
        setStatus: setStatus,
        showToast: showToast
    };
})();
