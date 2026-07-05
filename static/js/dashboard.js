document.addEventListener("DOMContentLoaded", function () {
    const app = window.VaniApp;

    if (!app) {
        return;
    }

    const greeting = document.getElementById("dashboardGreeting");
    const narrative = document.getElementById("dashboardNarrative");
    const summary = document.getElementById("dashboardSummary");
    const highlights = document.getElementById("dashboardHighlights");
    const streak = document.getElementById("dashboardStreak");
    const heroScore = document.getElementById("dashboardHeroScore");
    const startPractice = document.getElementById("dashboardStartPractice");
    const recommendationButton = document.getElementById("dashboardRecommendationButton");
    const modesContainer = document.getElementById("practiceModes");
    const sessionsContainer = document.getElementById("recentSessions");

    function practiceUrl(modeId) {
        return "/practice" + app.buildQuery({ mode: modeId, restart: 1 });
    }

    function reportUrl(sessionId) {
        return "/report" + app.buildQuery({ session_id: sessionId });
    }

    function renderModeSkeleton() {
        if (!modesContainer) {
            return;
        }

        modesContainer.innerHTML = new Array((app.MODE_LIBRARY || []).length || 4).fill("").map(function () {
            return [
                '<article class="mode-card is-loading-card">',
                '<div class="skeleton skeleton--icon"></div>',
                '<div class="skeleton skeleton--title"></div>',
                '<div class="skeleton skeleton--text"></div>',
                '<div class="skeleton skeleton--text skeleton--text-short"></div>',
                "</article>"
            ].join("");
        }).join("");
    }

    function renderSessionSkeleton() {
        if (!sessionsContainer) {
            return;
        }

        sessionsContainer.innerHTML = new Array(3).fill("").map(function () {
            return [
                '<article class="timeline-card is-loading-card">',
                '<div class="timeline-card__rail"><span class="timeline-card__dot"></span></div>',
                '<div class="timeline-card__body">',
                '<div class="skeleton skeleton--title"></div>',
                '<div class="skeleton skeleton--text"></div>',
                '<div class="skeleton skeleton--text skeleton--text-short"></div>',
                "</div>",
                "</article>"
            ].join("");
        }).join("");
    }

    function renderModes(recommendation) {
        if (!modesContainer) {
            return;
        }

        modesContainer.innerHTML = app.MODE_LIBRARY.map(function (mode) {
            const isRecommended = recommendation && mode.id === recommendation.modeId;
            return [
                '<article class="mode-card' + (isRecommended ? " is-recommended" : "") + '">',
                '<div class="mode-card__top">',
                '<div class="mode-card__icon"><i class="' + app.sanitizeText(mode.icon) + '"></i></div>',
                '<span class="card-tag">' + app.sanitizeText(mode.tag) + "</span>",
                "</div>",
                "<div>",
                "<h3>" + app.sanitizeText(mode.title) + "</h3>",
                "<p>" + app.sanitizeText(mode.description) + "</p>",
                "</div>",
                '<div class="mode-card__meta">',
                '<span class="meta-chip"><i class="fa-solid fa-layer-group"></i>' + app.sanitizeText(mode.difficulty) + "</span>",
                '<span class="meta-chip"><i class="fa-regular fa-clock"></i>' + app.sanitizeText(mode.duration) + "</span>",
                "</div>",
                '<div class="mode-card__footer">',
                '<p class="micro-copy">' + app.sanitizeText(mode.objective) + "</p>",
                '<button class="button button--primary button--full" type="button" data-start-mode="' + app.sanitizeText(mode.id) + '">Start</button>',
                "</div>",
                "</article>"
            ].join("");
        }).join("");
    }

    function renderRecentSessions(sessions) {
        if (!sessionsContainer) {
            return;
        }

        if (!sessions.length) {
            app.renderEmptyState(sessionsContainer, {
                icon: "fa-solid fa-clock-rotate-left",
                title: "No sessions yet",
                description: "Complete your first practice session to start building history."
            });
            return;
        }

        sessionsContainer.innerHTML = sessions.map(function (session, index) {
            return [
                '<article class="timeline-card">',
                '<div class="timeline-card__rail">',
                '<span class="timeline-card__dot"></span>',
                index < sessions.length - 1 ? '<span class="timeline-card__line"></span>' : "",
                "</div>",
                '<div class="timeline-card__body">',
                '<div class="timeline-card__top">',
                "<div>",
                "<h3>" + app.sanitizeText(session.title) + "</h3>",
                "<p>" + app.sanitizeText(session.summary) + "</p>",
                "</div>",
                '<div class="score-badge">' + app.sanitizeText(session.overall) + "</div>",
                "</div>",
                '<div class="timeline-card__meta">',
                '<span class="meta-chip"><i class="fa-regular fa-calendar"></i>' + app.sanitizeText(app.formatRelativeDate(session.date)) + "</span>",
                '<span class="meta-chip"><i class="fa-regular fa-clock"></i>' + app.sanitizeText(app.formatDuration(session.durationMinutes)) + "</span>",
                "</div>",
                '<div class="timeline-card__actions">',
                '<button class="button button--ghost button--sm" type="button" data-view-report="' + app.sanitizeText(session.id) + '">View Report</button>',
                '<button class="button button--primary button--sm" type="button" data-repeat-mode="' + app.sanitizeText(session.modeId) + '">Practice Again</button>',
                "</div>",
                "</div>",
                "</article>"
            ].join("");
        }).join("");
    }

    if (modesContainer) {
        modesContainer.addEventListener("click", function (event) {
            const startButton = event.target.closest("[data-start-mode]");
            if (startButton) {
                window.location.href = practiceUrl(startButton.getAttribute("data-start-mode"));
            }
        });
    }

    if (sessionsContainer) {
        sessionsContainer.addEventListener("click", function (event) {
            const reportButton = event.target.closest("[data-view-report]");
            const repeatButton = event.target.closest("[data-repeat-mode]");

            if (reportButton) {
                window.location.href = reportUrl(reportButton.getAttribute("data-view-report"));
            }

            if (repeatButton) {
                window.location.href = practiceUrl(repeatButton.getAttribute("data-repeat-mode"));
            }
        });
    }

    renderModeSkeleton();
    renderSessionSkeleton();

    (async function loadDashboard() {
        let recommendation = app.getRecommendationForMetric("confidence");

        try {
            const payload = await app.apiRequest("/api/dashboard");
            const user = payload.user || app.getCurrentUser() || {};
            const sessions = payload.sessions || [];
            const latestSession = payload.latestSession;
            const previousSession = payload.previousSession;
            const weakestMetric = latestSession ? app.getWeakestMetric(latestSession.breakdown) : "confidence";
            const goal = app.getGoalForMetric(weakestMetric);
            const firstName = (user.name || "Learner").trim().split(/\s+/)[0] || "Learner";
            const improvementPercent = payload.improvementPercent || 0;

            recommendation = app.getRecommendationForMetric(weakestMetric);

            if (greeting) {
                greeting.textContent = "Welcome back, " + firstName + ".";
            }

            if (streak) {
                streak.textContent = app.getStreak(sessions) + " day streak";
            }

            if (heroScore) {
                heroScore.textContent = "Overall score " + (latestSession ? latestSession.overall : 0);
            }

            if (latestSession) {
                if (narrative) {
                    narrative.textContent = previousSession
                        ? "Your latest session scored " + latestSession.overall + ". That's " + (improvementPercent >= 0 ? "+" : "") + improvementPercent + "% versus the previous report."
                        : "Your first completed session is ready. Keep building from one focused improvement at a time.";
                }

                if (summary) {
                    summary.textContent = latestSession.summary;
                }

                app.setScoreRing("dashboardScoreRing", latestSession.overall);

                const scoreValue = document.getElementById("dashboardScoreValue");
                if (scoreValue) {
                    scoreValue.textContent = String(latestSession.overall);
                }

                if (highlights) {
                    const strongestMetric = app.getTopMetrics(latestSession.breakdown, 1)[0];
                    highlights.innerHTML = [
                        '<div class="metric-pill"><span>Previous score</span><strong>' + (previousSession ? previousSession.overall : "--") + "</strong></div>",
                        '<div class="metric-pill"><span>Improvement</span><strong class="' + app.scoreDeltaClass(improvementPercent) + '">' + (previousSession ? ((improvementPercent >= 0 ? "+" : "") + improvementPercent + "%") : "--") + "</strong></div>",
                        '<div class="metric-pill"><span>Focus area</span><strong>' + app.metricLabel(weakestMetric) + " " + latestSession.breakdown[weakestMetric] + "</strong></div>",
                        '<div class="metric-pill"><span>Strongest signal</span><strong>' + app.metricLabel(strongestMetric) + " " + latestSession.breakdown[strongestMetric] + "</strong></div>"
                    ].join("");
                }

                const goalText = document.getElementById("todayGoalText");
                const goalMeta = document.getElementById("todayGoalMeta");
                const recommendationMode = document.getElementById("todayRecommendationMode");
                const recommendationCopy = document.getElementById("todayRecommendationCopy");
                const coachCopy = document.getElementById("dashboardCoachCopy");

                if (goalText) {
                    goalText.textContent = goal.title;
                }
                if (goalMeta) {
                    goalMeta.textContent = goal.detail;
                }
                if (recommendationMode) {
                    recommendationMode.textContent = recommendation.title;
                }
                if (recommendationCopy) {
                    recommendationCopy.textContent = recommendation.copy;
                }
                if (coachCopy) {
                    coachCopy.textContent = latestSession.coachSummary;
                }
            } else {
                if (narrative) {
                    narrative.textContent = "Start your first practice session to establish a communication baseline.";
                }
                if (summary) {
                    summary.textContent = "Once you complete a session, your latest coaching summary will appear here.";
                }
                if (highlights) {
                    highlights.innerHTML = [
                        '<div class="metric-pill"><span>Previous score</span><strong>--</strong></div>',
                        '<div class="metric-pill"><span>Improvement</span><strong>--</strong></div>',
                        '<div class="metric-pill"><span>Focus area</span><strong>Confidence</strong></div>',
                        '<div class="metric-pill"><span>Strongest signal</span><strong>Awaiting session</strong></div>'
                    ].join("");
                }
                app.setScoreRing("dashboardScoreRing", 0);
                const scoreValue = document.getElementById("dashboardScoreValue");
                if (scoreValue) {
                    scoreValue.textContent = "0";
                }
            }

            renderModes(recommendation);
            renderRecentSessions(payload.recentSessions || []);
        } catch (error) {
            if (narrative) {
                narrative.textContent = error.message || "The dashboard could not load right now.";
            }
            app.showToast({
                tone: "error",
                title: "Dashboard unavailable",
                message: error.message || "Please refresh and try again."
            });
        }

        if (startPractice) {
            startPractice.addEventListener("click", function (event) {
                event.preventDefault();
                window.location.href = practiceUrl(recommendation.modeId);
            });
        }

        if (recommendationButton) {
            recommendationButton.addEventListener("click", function () {
                window.location.href = practiceUrl(recommendation.modeId);
            });
        }
    })();
});
