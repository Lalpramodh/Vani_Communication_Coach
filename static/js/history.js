document.addEventListener("DOMContentLoaded", function () {
    const app = window.VaniApp;
    const searchInput = document.getElementById("historySearch");
    const modeFilter = document.getElementById("historyModeFilter");
    const scoreFilter = document.getElementById("historyScoreFilter");
    const countLabel = document.getElementById("historyCountLabel");
    const list = document.getElementById("historySessionList");

    if (!app || !searchInput || !modeFilter || !scoreFilter || !countLabel || !list) {
        return;
    }

    let sessions = [];

    modeFilter.innerHTML += app.MODE_LIBRARY.map(function (mode) {
        return '<option value="' + app.sanitizeText(mode.id) + '">' + app.sanitizeText(mode.title) + "</option>";
    }).join("");

    function matchesScore(session, filterValue) {
        if (filterValue === "all") {
            return true;
        }

        if (filterValue === "80") {
            return session.overall >= 80;
        }

        if (filterValue === "70") {
            return session.overall >= 70 && session.overall < 80;
        }

        return session.overall < 70;
    }

    function render() {
        const query = searchInput.value.trim().toLowerCase();
        const selectedMode = modeFilter.value;
        const selectedScore = scoreFilter.value;

        const filteredSessions = sessions.filter(function (session) {
            const haystack = [session.title, session.summary, session.scenario].join(" ").toLowerCase();
            const matchesQuery = !query || haystack.indexOf(query) >= 0;
            const matchesMode = selectedMode === "all" || session.modeId === selectedMode;
            return matchesQuery && matchesMode && matchesScore(session, selectedScore);
        });

        countLabel.textContent = filteredSessions.length + (filteredSessions.length === 1 ? " session" : " sessions");

        if (!filteredSessions.length) {
            app.renderEmptyState(list, {
                icon: "fa-solid fa-magnifying-glass",
                title: "No sessions match this search",
                description: "Adjust the search or filter to see more of your coaching history."
            });
            return;
        }

        list.innerHTML = filteredSessions.map(function (session) {
            return [
                '<article class="history-card">',
                '<div class="history-card__top">',
                "<div>",
                "<h3>" + app.sanitizeText(session.title) + "</h3>",
                "<p>" + app.sanitizeText(session.summary) + "</p>",
                '<div class="history-card__meta">',
                '<span class="meta-chip"><i class="fa-regular fa-calendar"></i>' + app.sanitizeText(app.formatDate(session.date, { month: "short", day: "numeric" })) + "</span>",
                '<span class="meta-chip"><i class="fa-regular fa-clock"></i>' + app.sanitizeText(app.formatDuration(session.durationMinutes)) + "</span>",
                "</div>",
                "</div>",
                '<div class="score-badge">' + session.overall + "</div>",
                "</div>",
                '<div class="history-card__actions">',
                '<button class="button button--ghost" type="button" data-history-report="' + app.sanitizeText(session.id) + '">View Report</button>',
                '<button class="button button--primary" type="button" data-history-practice="' + app.sanitizeText(session.modeId) + '">Practice Again</button>',
                "</div>",
                "</article>"
            ].join("");
        }).join("");
    }

    list.addEventListener("click", function (event) {
        const reportButton = event.target.closest("[data-history-report]");
        const practiceButton = event.target.closest("[data-history-practice]");

        if (reportButton) {
            window.location.href = "/report" + app.buildQuery({
                session_id: reportButton.getAttribute("data-history-report")
            });
        }

        if (practiceButton) {
            window.location.href = "/practice" + app.buildQuery({
                mode: practiceButton.getAttribute("data-history-practice"),
                restart: 1
            });
        }
    });

    [searchInput, modeFilter, scoreFilter].forEach(function (element) {
        element.addEventListener("input", render);
        element.addEventListener("change", render);
    });

    (async function loadHistory() {
        try {
            const payload = await app.apiRequest("/api/history");
            sessions = payload.sessions || [];
            render();
        } catch (error) {
            app.renderEmptyState(list, {
                icon: "fa-solid fa-triangle-exclamation",
                title: "History unavailable",
                description: error.message || "The session history could not be loaded."
            });
            countLabel.textContent = "0 sessions";
            app.showToast({
                tone: "error",
                title: "History unavailable",
                message: error.message || "Please refresh and try again."
            });
        }
    })();
});
