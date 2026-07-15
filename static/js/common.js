(function () {
    const MODE_LIBRARY = [
        {
            id: "hr-interview",
            title: "HR Interview",
            tag: "Hiring conversation",
            difficulty: "Intermediate",
            duration: "12 min",
            icon: "fa-solid fa-briefcase",
            scenario: "You are preparing for a calm, structured HR interview where the interviewer is checking confidence, clarity, and fit.",
            description: "Practice introducing yourself, answering behavioral questions, and sounding polished under pressure.",
            objective: "Answer directly, add one concrete example, and finish each response with a confident close.",
            coachTip: "Lead with the answer, support it with one example, and end with a clear takeaway.",
            assistantRole: "HR interviewer",
            openingLine: "Hi, I’m glad you could make it. Let’s begin with a simple one: tell me about yourself and why this role interests you.",
            isOpenEnded: true
        },
        {
            id: "technical-interview",
            title: "Technical Interview",
            tag: "Problem solving",
            difficulty: "Advanced",
            duration: "14 min",
            icon: "fa-solid fa-code",
            scenario: "You are in a technical interview where the interviewer is testing depth, reasoning, and how clearly you explain complex ideas.",
            description: "Practice explaining technical choices in plain language without sounding vague or defensive.",
            objective: "Show your thinking, make tradeoffs explicit, and communicate a solution with confidence.",
            coachTip: "Explain the reasoning, name the tradeoff, then state the decision clearly.",
            assistantRole: "technical interviewer",
            openingLine: "Let’s start with a classic interview prompt. Walk me through a technical project you’re proud of and the choices you made.",
            isOpenEnded: true
        },
        {
            id: "manager-discussion",
            title: "Manager Discussion",
            tag: "Stakeholder alignment",
            difficulty: "Intermediate",
            duration: "11 min",
            icon: "fa-solid fa-user-tie",
            scenario: "You are speaking with your manager about priorities, performance, and how to handle a real workplace situation.",
            description: "Practice sounding organized, honest, and decisive when the stakes are practical and direct.",
            objective: "State the issue clearly, explain the impact, and agree on one next step.",
            coachTip: "Be direct, add one concrete example, and close with a clear ask.",
            assistantRole: "manager",
            openingLine: "Thanks for making time. What do you need from me today, and what outcome are you hoping for?",
            isOpenEnded: true
        },
        {
            id: "client-meeting",
            title: "Client Meeting",
            tag: "Customer trust",
            difficulty: "Advanced",
            duration: "13 min",
            icon: "fa-solid fa-handshake-angle",
            scenario: "You are in a client meeting where the other side wants progress, reassurance, and a clear next step.",
            description: "Practice sounding commercially sharp while still warm, responsive, and trustworthy.",
            objective: "Frame the issue in the client's language, answer concerns clearly, and move the conversation forward.",
            coachTip: "Name the client pain, translate it into outcomes, then invite the next step.",
            assistantRole: "client",
            openingLine: "Good to see you. We need a clear update today, so please walk me through what changed and what it means for us.",
            isOpenEnded: true
        },
        {
            id: "leadership-standup",
            title: "Leadership Standup",
            tag: "Executive presence",
            difficulty: "Advanced",
            duration: "12 min",
            icon: "fa-solid fa-people-group",
            scenario: "You are presenting a concise leadership update that sounds calm, decisive, and outcome-first.",
            description: "Practice high-visibility updates that keep the room aligned without sounding overly detailed.",
            objective: "Lead with the business outcome, support it with one decision, and close with certainty.",
            coachTip: "Lead with the business outcome, then the decision, then the next step.",
            assistantRole: "senior manager",
            openingLine: "Let’s hear the update. Start with the outcome first, then tell me what changed and what you need from the room.",
            isOpenEnded: true
        },
        {
            id: "team-meeting",
            title: "Team Meeting",
            tag: "Collaborative clarity",
            difficulty: "Intermediate",
            duration: "10 min",
            icon: "fa-solid fa-people-arrows",
            scenario: "You are in a team meeting where you need to contribute clearly, listen well, and keep the group moving.",
            description: "Practice sounding collaborative without rambling or hiding the point.",
            objective: "Share your update, ask a useful follow-up, and keep the discussion organized.",
            coachTip: "Be concise, reference the team's goal, and add one helpful next step.",
            assistantRole: "teammate",
            openingLine: "Before we dive in, give me your update and mention anything the team should know right away.",
            isOpenEnded: true
        },
        {
            id: "difficult-conversation",
            title: "Difficult Conversation",
            tag: "Calm candor",
            difficulty: "Advanced",
            duration: "11 min",
            icon: "fa-solid fa-shield-heart",
            scenario: "You are balancing empathy and directness in a sensitive conversation where trust matters.",
            description: "Practice naming the issue clearly while still sounding respectful and constructive.",
            objective: "Acknowledge the relationship, name the issue clearly, and align on one next action.",
            coachTip: "Acknowledge the relationship, name the issue clearly, then move to one next action.",
            assistantRole: "the other person",
            openingLine: "This sounds important. Tell me what happened, and I’ll respond like the other person in the conversation.",
            isOpenEnded: true
        },
        {
            id: "networking",
            title: "Networking",
            tag: "Relationship building",
            difficulty: "Intermediate",
            duration: "9 min",
            icon: "fa-solid fa-user-group",
            scenario: "You are meeting someone new at a networking event and want to sound natural, curious, and memorable.",
            description: "Practice opening a conversation, asking better follow-ups, and leaving a strong impression.",
            objective: "Sound warm, ask useful questions, and keep the exchange easy to follow.",
            coachTip: "Open naturally, show real curiosity, and end with a clear next step.",
            assistantRole: "new contact",
            openingLine: "Nice to meet you. What brought you here today, and what are you hoping to get out of this conversation?",
            isOpenEnded: true
        },
        {
            id: "presentation-practice",
            title: "Presentation Practice",
            tag: "Public speaking",
            difficulty: "Advanced",
            duration: "15 min",
            icon: "fa-solid fa-chalkboard-user",
            scenario: "You are giving a presentation to an audience that wants clarity, confidence, and a clean structure.",
            description: "Practice sounding clear, calm, and persuasive in front of a room.",
            objective: "Open with the point, build it logically, and finish with a memorable close.",
            coachTip: "Tell the audience what matters first, then support it with one clean proof point.",
            assistantRole: "audience member",
            openingLine: "Whenever you’re ready, give me the opening of your presentation and I’ll respond like a real audience member.",
            isOpenEnded: true
        },
        {
            id: "sales-pitch",
            title: "Sales Pitch",
            tag: "Persuasive clarity",
            difficulty: "Advanced",
            duration: "14 min",
            icon: "fa-solid fa-bullhorn",
            scenario: "You are pitching an idea or product to a skeptical buyer who wants relevance, value, and a clear next step.",
            description: "Practice sounding persuasive without sounding pushy or generic.",
            objective: "Frame the problem, prove the value, and ask for the next step confidently.",
            coachTip: "Name the pain, show the payoff, then invite the decision.",
            assistantRole: "skeptical buyer",
            openingLine: "I’m listening. Start with the problem you’re solving and why I should care.",
            isOpenEnded: true
        },
        {
            id: "friendly-conversation",
            title: "Friendly Conversation",
            tag: "Warm connection",
            difficulty: "Open-ended",
            duration: "Flexible",
            icon: "fa-solid fa-comments",
            scenario: "You are having a natural back-and-forth conversation that helps you sound warm, clear, and confident in everyday communication.",
            description: "Practice relaxed conversation that builds fluency, listening, and social confidence without a fixed question limit.",
            objective: "Keep the conversation natural, respond with warmth, and ask or answer follow-ups with clear, easy flow.",
            coachTip: "Stay present, answer directly, add one detail, and keep the exchange moving naturally.",
            assistantRole: "friendly conversation partner",
            openingLine: "Let's start a friendly chat. Tell me something small about your day, your interests, or what's on your mind, and I'll help you sound warm, clear, and natural as we go.",
            isOpenEnded: true
        },
        {
            id: "custom-scenario",
            title: "Create Your Own Scenario",
            tag: "Adaptive roleplay",
            difficulty: "Flexible",
            duration: "Flexible",
            icon: "fa-solid fa-wand-magic-sparkles",
            scenario: "Describe or speak any real situation. The coach will infer the most likely role, keep the other side in character, and adapt the conversation dynamically.",
            description: "Turn any work or life situation into an interactive voice roleplay without needing a preset question list.",
            objective: "Describe the situation clearly, then practice it as a natural roleplay with follow-up questions.",
            coachTip: "Explain the situation in one or two sentences so the roleplay can adapt in real time.",
            assistantRole: "adaptive roleplay partner",
            openingLine: "Tell me the situation you want to practice, and I’ll take the other side in character.",
            isCustomScenario: true,
            isOpenEnded: true
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
        clarity: "technical-interview",
        professionalism: "client-meeting",
        vocabulary: "networking"
    };

    const THEME_STORAGE_KEY = "vani-theme";

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

    function applyTheme(theme) {
        const selectedTheme = theme === "dark" ? "dark" : "light";
        document.body.setAttribute("data-theme", selectedTheme);
        window.localStorage.setItem(THEME_STORAGE_KEY, selectedTheme);

        document.querySelectorAll("[data-theme-toggle]").forEach(function (button) {
            const label = button.querySelector("[data-theme-label]");
            if (label) {
                label.textContent = selectedTheme === "dark" ? "Light mode" : "Dark mode";
            }
            button.setAttribute("aria-pressed", selectedTheme === "dark" ? "true" : "false");
        });
    }

    function initTheme() {
        const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
        const preferredTheme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        applyTheme(savedTheme || preferredTheme);

        document.querySelectorAll("[data-theme-toggle]").forEach(function (button) {
            button.addEventListener("click", function () {
                const nextTheme = document.body.getAttribute("data-theme") === "dark" ? "light" : "dark";
                applyTheme(nextTheme);
            });
        });
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
        initTheme();
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
        applyTheme: applyTheme,
        sanitizeText: sanitizeText,
        scoreDeltaClass: scoreDeltaClass,
        setButtonLoading: setButtonLoading,
        setFieldState: setFieldState,
        setProgress: setProgress,
        setScoreRing: setScoreRing,
        setStatus: setStatus,
        initTheme: initTheme,
        showToast: showToast
    };
})();
