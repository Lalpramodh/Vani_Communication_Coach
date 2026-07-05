document.addEventListener("DOMContentLoaded", function () {
    const app = window.VaniApp;
    const METRICS = [
        { key: "clarity", label: "Clarity" },
        { key: "grammar", label: "Grammar" },
        { key: "confidence", label: "Confidence" },
        { key: "professionalism", label: "Professionalism" },
        { key: "vocabulary", label: "Vocabulary" }
    ];

    if (!app) {
        return;
    }

    const practiceAgain = document.getElementById("reportPracticeAgain");
    const downloadButton = document.getElementById("downloadReportButton");
    const title = document.getElementById("reportTitle");
    const subtitle = document.getElementById("reportSubtitle");
    const modeHeading = document.getElementById("reportModeHeading");
    const dateLabel = document.getElementById("reportDateLabel");
    const scoreValue = document.getElementById("reportScoreValue");
    const previousScore = document.getElementById("reportPreviousScore");
    const improvement = document.getElementById("reportImprovement");
    const practiceType = document.getElementById("reportPracticeType");
    const summary = document.getElementById("reportCoachSummary");
    const longSummary = document.getElementById("reportLongSummary");
    const strengths = document.getElementById("reportStrengths");
    const growthAreas = document.getElementById("reportGrowthAreas");
    const topImprovements = document.getElementById("reportTopImprovements");
    const grammarIssues = document.getElementById("reportGrammarIssues");
    const clarityIssues = document.getElementById("reportClarityIssues");
    const professionalismNote = document.getElementById("reportProfessionalismNote");
    const improvedVersion = document.getElementById("reportImprovedVersion");
    const coachingTip = document.getElementById("reportCoachingTip");
    const nextPrompt = document.getElementById("reportNextPrompt");
    const communicationLevel = document.getElementById("reportCommunicationLevel");
    const radarChart = document.getElementById("reportRadarChart");
    const grammarScore = document.getElementById("reportGrammarScore");
    const vocabularyScore = document.getElementById("reportVocabularyScore");
    const confidenceScore = document.getElementById("reportConfidenceScore");
    const clarityScore = document.getElementById("reportClarityScore");
    const professionalismScore = document.getElementById("reportProfessionalismScore");

    function pointForIndex(index, radius, center, total) {
        const angle = ((Math.PI * 2) / total) * index - Math.PI / 2;
        return {
            x: center + Math.cos(angle) * radius,
            y: center + Math.sin(angle) * radius
        };
    }

    function buildPolygon(scale, total, radius, center) {
        return new Array(total).fill("").map(function (_, index) {
            const point = pointForIndex(index, radius * scale, center, total);
            return point.x.toFixed(2) + "," + point.y.toFixed(2);
        }).join(" ");
    }

    function renderRadar(breakdown) {
        if (!radarChart) {
            return;
        }

        const center = 140;
        const radius = 96;
        const total = METRICS.length;
        const dataPolygon = METRICS.map(function (metric, index) {
            const point = pointForIndex(index, radius * ((breakdown[metric.key] || 0) / 100), center, total);
            return point.x.toFixed(2) + "," + point.y.toFixed(2);
        }).join(" ");

        const labels = METRICS.map(function (metric, index) {
            const point = pointForIndex(index, radius + 24, center, total);
            return '<text x="' + point.x.toFixed(2) + '" y="' + point.y.toFixed(2) + '" class="radar-card__label" text-anchor="middle">' + app.sanitizeText(metric.label) + "</text>";
        }).join("");

        const grid = [0.25, 0.5, 0.75, 1].map(function (scale) {
            return '<polygon class="radar-card__grid" points="' + buildPolygon(scale, total, radius, center) + '"></polygon>';
        }).join("");

        const axes = METRICS.map(function (_, index) {
            const point = pointForIndex(index, radius, center, total);
            return '<line class="radar-card__axis" x1="' + center + '" y1="' + center + '" x2="' + point.x.toFixed(2) + '" y2="' + point.y.toFixed(2) + '"></line>';
        }).join("");

        radarChart.innerHTML = [
            '<svg class="radar-card__svg" viewBox="0 0 280 280" role="img" aria-label="Radar chart of communication metrics">',
            grid,
            axes,
            '<polygon class="radar-card__shape" points="' + dataPolygon + '"></polygon>',
            labels,
            "</svg>"
        ].join("");
    }

    function renderInsightList(target, items) {
        if (!target) {
            return;
        }

        target.innerHTML = (items || []).map(function (item) {
            return [
                '<article class="insight-card">',
                '<i class="fa-solid fa-check"></i>',
                "<p>" + app.sanitizeText(item) + "</p>",
                "</article>"
            ].join("");
        }).join("");
    }

    function renderRecommendations(target, items) {
        if (!target) {
            return;
        }

        target.innerHTML = (items || []).map(function (item, index) {
            return [
                '<article class="recommendation-card">',
                '<span class="stack-card__label">Priority ' + (index + 1) + "</span>",
                "<strong>" + app.sanitizeText(item) + "</strong>",
                "</article>"
            ].join("");
        }).join("");
    }

    function renderLoadingState() {
        if (topImprovements) {
            topImprovements.innerHTML = new Array(3).fill("").map(function () {
                return '<article class="recommendation-card is-loading-card"><div class="skeleton skeleton--title"></div><div class="skeleton skeleton--text"></div></article>';
            }).join("");
        }
        if (strengths) {
            strengths.innerHTML = new Array(2).fill("").map(function () {
                return '<article class="insight-card is-loading-card"><div class="skeleton skeleton--title"></div></article>';
            }).join("");
        }
        if (growthAreas) {
            growthAreas.innerHTML = new Array(2).fill("").map(function () {
                return '<article class="insight-card is-loading-card"><div class="skeleton skeleton--title"></div></article>';
            }).join("");
        }
    }

    renderLoadingState();

    (async function loadReport() {
        try {
            const params = new URLSearchParams(window.location.search);
            const payload = await app.apiRequest("/api/report" + app.buildQuery({
                session_id: params.get("session_id")
            }));
            const session = payload.session;
            const previous = payload.previousSession;
            const delta = app.getScoreDelta(session, previous);

            if (title) {
                title.textContent = session.title + " report";
            }
            if (subtitle) {
                subtitle.textContent = session.scenario;
            }
            if (modeHeading) {
                modeHeading.textContent = session.title;
            }
            if (dateLabel) {
                dateLabel.textContent = app.formatDate(session.date, {
                    month: "short",
                    day: "numeric"
                }) + " | " + app.formatDuration(session.durationMinutes);
            }
            if (scoreValue) {
                scoreValue.textContent = String(session.overall);
            }
            if (communicationLevel) {
                communicationLevel.textContent = session.communicationLevel || app.communicationLevel(session.overall);
            }
            if (previousScore) {
                previousScore.textContent = previous ? String(previous.overall) : "--";
            }
            if (improvement) {
                improvement.textContent = previous ? (delta > 0 ? "+" + delta : String(delta)) : "--";
                improvement.className = " " + app.scoreDeltaClass(delta);
                improvement.classList.add(app.scoreDeltaClass(delta));
            }
            if (practiceType) {
                practiceType.textContent = session.title;
            }
            if (summary) {
                summary.textContent = session.summary;
            }
            if (longSummary) {
                longSummary.textContent = session.coachSummary;
            }
            if (coachingTip) {
                coachingTip.textContent = session.coachingTip || "Your next coaching tip will appear here.";
            }
            if (nextPrompt) {
                nextPrompt.textContent = session.nextPrompt || "The next targeted prompt will appear here.";
            }
            if (professionalismNote) {
                professionalismNote.textContent = session.professionalismNotes || "Professionalism notes will appear here.";
            }
            if (improvedVersion) {
                improvedVersion.textContent = session.improvedVersion || "Your improved version will appear here.";
            }

            if (grammarScore) {
                grammarScore.textContent = String(session.breakdown.grammar || 0);
            }
            if (vocabularyScore) {
                vocabularyScore.textContent = String(session.breakdown.vocabulary || 0);
            }
            if (confidenceScore) {
                confidenceScore.textContent = String(session.breakdown.confidence || 0);
            }
            if (clarityScore) {
                clarityScore.textContent = String(session.breakdown.clarity || 0);
            }
            if (professionalismScore) {
                professionalismScore.textContent = String(session.breakdown.professionalism || 0);
            }

            app.setScoreRing("reportScoreRing", session.overall);
            renderRadar(session.breakdown || {});
            renderInsightList(strengths, session.strengths);
            renderInsightList(growthAreas, session.growthAreas);
            renderInsightList(grammarIssues, session.grammarIssues);
            renderInsightList(clarityIssues, session.clarityIssues);
            renderRecommendations(topImprovements, session.topImprovements || session.recommendations);

            if (practiceAgain) {
                practiceAgain.addEventListener("click", function (event) {
                    event.preventDefault();
                    window.location.href = "/practice" + app.buildQuery({
                        mode: session.modeId,
                        restart: 1
                    });
                });
            }

            if (downloadButton) {
                downloadButton.addEventListener("click", function () {
                    window.print();
                    app.showToast({
                        tone: "success",
                        title: "Print dialog opened",
                        message: "Save the report as a PDF from your browser's print dialog."
                    });
                });
            }
        } catch (error) {
            if (longSummary) {
                longSummary.textContent = error.message || "No report is available yet.";
            }
            app.showToast({
                tone: "error",
                title: "Report unavailable",
                message: error.message || "Please complete a session first."
            });
        }
    })();
});
